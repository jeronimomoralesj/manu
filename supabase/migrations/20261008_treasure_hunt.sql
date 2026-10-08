-- Four-corner treasure, using the existing singleton participant (id = 1).
-- Apply once through the normal Supabase migration process; safe to re-run.
-- Never infers old trivia correctness, resets points, or changes unrelated tables.
BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.treasure_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  reward_title text NOT NULL DEFAULT 'Encontraste el tesoro',
  reward_message text NOT NULL DEFAULT 'También hay un regalo secreto para ti. 💛',
  audio_path text,
  audio_content_type text,
  notification_email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.treasure_progress (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  completed_at timestamptz,
  completion_seen_at timestamptz,
  CHECK (completion_seen_at IS NULL OR completed_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.treasure_cracks (
  crack_index integer PRIMARY KEY CHECK (crack_index BETWEEN 0 AND 3),
  code_hash text,
  revealed_at timestamptz,
  opened_at timestamptz,
  solved_at timestamptz,
  CHECK (opened_at IS NULL OR revealed_at IS NOT NULL),
  CHECK (solved_at IS NULL OR opened_at IS NOT NULL)
);
-- No cascading question FK: deletion/reset must never erase the award ledger.
CREATE TABLE IF NOT EXISTS public.treasure_answers (
  question_id uuid PRIMARY KEY,
  selected_index integer,
  correct_option_index integer,
  correct boolean,
  points_earned integer NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  answered_at timestamptz NOT NULL DEFAULT now(),
  awarded_crack_index integer UNIQUE REFERENCES public.treasure_cracks(crack_index)
);
CREATE TABLE IF NOT EXISTS public.treasure_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  crack_index integer NOT NULL REFERENCES public.treasure_cracks(crack_index),
  attempted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS treasure_attempts_window_idx
  ON public.treasure_attempts (crack_index, attempted_at);
CREATE TABLE IF NOT EXISTS public.treasure_completion_outbox (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  event_type text NOT NULL DEFAULT 'treasure.completed' CHECK (event_type = 'treasure.completed'),
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  sent_at timestamptz,
  last_error text,
  provider_id text,
  lease_until timestamptz,
  attempt_started_at timestamptz,
  next_attempt_at timestamptz
);

INSERT INTO public.treasure_config (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.treasure_progress (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.treasure_cracks (crack_index)
  SELECT generate_series(0, 3) ON CONFLICT DO NOTHING;
-- A previous answer might have been wrong. Preserve that uncertainty and give
-- no retroactive corner or points. Re-running never replaces the original ledger.
INSERT INTO public.treasure_answers (question_id, correct_option_index)
  SELECT id, correct_option_index FROM public.trivia_questions WHERE is_answered = true
  ON CONFLICT (question_id) DO NOTHING;

-- This bucket is private. Do not modify an existing bucket or its policies.
-- The conditional also permits local PostgreSQL fixtures without Supabase Storage.
DO $migration$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('treasure-audio', 'treasure-audio', false, 4194304,
        ARRAY['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'])
      ON CONFLICT (id) DO NOTHING;
  END IF;
END
$migration$;

-- pgcrypto can already live in a different schema on an existing Supabase
-- project. Bind to its actual trusted extension schema without relocating it.
DO $migration$
DECLARE crypto_schema text;
BEGIN
  SELECT n.nspname INTO crypto_schema
    FROM pg_catalog.pg_extension e JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgcrypto';
  EXECUTE format($definition$
    CREATE OR REPLACE FUNCTION public._treasure_hash_code(p_code text) RETURNS text
    LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog
    AS 'SELECT %I.crypt($1, %I.gen_salt(''bf'', 10))'
  $definition$, crypto_schema, crypto_schema);
  EXECUTE format($definition$
    CREATE OR REPLACE FUNCTION public._treasure_check_code(p_code text, p_hash text) RETURNS boolean
    LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog
    AS 'SELECT %I.crypt($1, $2) = $2'
  $definition$, crypto_schema);
END
$migration$;

CREATE OR REPLACE FUNCTION public._treasure_ready() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT coalesce((SELECT c.enabled
    AND nullif(btrim(c.audio_path), '') IS NOT NULL
    AND nullif(btrim(c.notification_email), '') IS NOT NULL
    AND (SELECT count(*) = 4 FROM public.treasure_cracks WHERE code_hash IS NOT NULL)
    FROM public.treasure_config c WHERE c.id = 1), false)
$$;

CREATE OR REPLACE FUNCTION public.treasure_state() RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT jsonb_build_object(
    'enabled', public._treasure_ready(),
    'cracks', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'index', c.crack_index, 'revealed_at', c.revealed_at,
      'opened_at', c.opened_at, 'solved_at', c.solved_at
    ) ORDER BY c.crack_index), '[]'::jsonb) FROM public.treasure_cracks c),
    'completed_at', p.completed_at,
    'completion_seen_at', p.completion_seen_at
  ) FROM public.treasure_progress p WHERE p.id = 1
$$;

CREATE OR REPLACE FUNCTION public.treasure_configure(
  p_enabled boolean,
  p_reward_title text,
  p_reward_message text,
  p_audio_path text DEFAULT NULL,
  p_codes jsonb DEFAULT NULL,
  p_notification_email text DEFAULT NULL,
  p_audio_content_type text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_config public.treasure_config%ROWTYPE;
  v_code text;
  v_index integer;
BEGIN
  PERFORM 1 FROM public.treasure_progress WHERE id = 1 FOR UPDATE;
  SELECT * INTO STRICT v_config FROM public.treasure_config WHERE id = 1 FOR UPDATE;
  IF p_enabled IS NULL OR nullif(btrim(p_reward_title), '') IS NULL
      OR length(p_reward_title) > 160 OR p_reward_message IS NULL
      OR length(p_reward_message) > 5000 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_CONFIG';
  END IF;
  IF p_notification_email IS NOT NULL AND (
      length(p_notification_email) > 254 OR p_notification_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_CONFIG';
  END IF;
  IF v_config.notification_email IS NOT NULL AND p_notification_email IS NOT NULL
      AND v_config.notification_email <> p_notification_email THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_RECIPIENT_LOCKED';
  END IF;
  IF p_audio_path IS NOT NULL AND (nullif(btrim(p_audio_path), '') IS NULL
      OR length(p_audio_path) > 512 OR p_audio_path ~ '(^/|\.\.|://)') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_CONFIG';
  END IF;
  IF p_audio_content_type IS NOT NULL AND p_audio_content_type NOT IN
      ('audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_CONFIG';
  END IF;
  IF p_codes IS NOT NULL THEN
    IF jsonb_typeof(p_codes) <> 'array' OR jsonb_array_length(p_codes) <> 4 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_CONFIG';
    END IF;
    FOR v_index IN 0..3 LOOP
      IF jsonb_typeof(p_codes -> v_index) <> 'string' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_CONFIG';
      END IF;
      v_code := upper(btrim(p_codes ->> v_index));
      -- ASCII avoids Unicode/collation discrepancies and bcrypt's 72-byte cutoff.
      IF v_code <> '' THEN
        IF v_code !~ '^[A-Z0-9 -]{4,64}$' THEN
          RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_CONFIG';
        END IF;
        UPDATE public.treasure_cracks SET code_hash = public._treasure_hash_code(v_code)
          WHERE crack_index = v_index;
      END IF;
    END LOOP;
  END IF;
  UPDATE public.treasure_config SET
    enabled = p_enabled, reward_title = btrim(p_reward_title), reward_message = p_reward_message,
    audio_path = coalesce(p_audio_path, audio_path),
    audio_content_type = coalesce(p_audio_content_type, audio_content_type),
    notification_email = coalesce(notification_email, p_notification_email),
    updated_at = clock_timestamp()
    WHERE id = 1;
  IF p_enabled AND NOT public._treasure_ready() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_NOT_READY';
  END IF;
  RETURN public.treasure_state();
END
$$;

-- Uploads must not replay an earlier config snapshot after storage I/O. Updating
-- only these columns preserves a simultaneous disable, title edit, or code save.
CREATE OR REPLACE FUNCTION public.treasure_set_audio(p_audio_path text, p_audio_content_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  PERFORM 1 FROM public.treasure_progress WHERE id = 1 FOR UPDATE;
  PERFORM 1 FROM public.treasure_config WHERE id = 1 FOR UPDATE;
  IF p_audio_path IS NULL OR nullif(btrim(p_audio_path), '') IS NULL
      OR length(p_audio_path) > 512 OR p_audio_path ~ '(^/|\.\.|://)'
      OR p_audio_content_type IS NULL OR p_audio_content_type NOT IN
        ('audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_CONFIG';
  END IF;
  UPDATE public.treasure_config SET audio_path = p_audio_path,
    audio_content_type = p_audio_content_type, updated_at = clock_timestamp()
    WHERE id = 1;
  RETURN public.treasure_state();
END
$$;

CREATE OR REPLACE FUNCTION public.treasure_answer(p_question_id uuid, p_selected_index integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_question public.trivia_questions%ROWTYPE;
  v_answer public.treasure_answers%ROWTYPE;
  v_correct boolean;
  v_points integer;
  v_crack integer;
  v_now timestamptz;
BEGIN
  -- Shared singleton lock serializes every award, solve, and configuration change.
  PERFORM 1 FROM public.treasure_progress WHERE id = 1 FOR UPDATE;
  SELECT * INTO v_question FROM public.trivia_questions WHERE id = p_question_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'TREASURE_QUESTION_NOT_FOUND';
  END IF;
  IF p_selected_index IS NULL OR p_selected_index < 0
      OR p_selected_index >= cardinality(v_question.options) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TREASURE_INVALID_ANSWER';
  END IF;
  -- Also catches legacy answers made between an earlier rollout and this RPC.
  IF v_question.is_answered THEN
    INSERT INTO public.treasure_answers (question_id, correct_option_index)
      VALUES (v_question.id, v_question.correct_option_index) ON CONFLICT DO NOTHING;
  END IF;
  SELECT * INTO v_answer FROM public.treasure_answers WHERE question_id = p_question_id;
  IF FOUND THEN
    UPDATE public.trivia_questions SET is_answered = true WHERE id = p_question_id;
    RETURN jsonb_build_object('correct', p_selected_index = v_question.correct_option_index, 'points_earned', 0,
      'correct_option_index', v_question.correct_option_index, 'already_answered', true,
      'treasure', public.treasure_state());
  END IF;
  v_now := clock_timestamp();
  v_correct := p_selected_index = v_question.correct_option_index;
  v_points := CASE WHEN v_correct THEN greatest(coalesce(v_question.points_reward, 0), 0) ELSE 0 END;
  UPDATE public.trivia_questions SET is_answered = true WHERE id = p_question_id;
  IF v_correct THEN
    INSERT INTO public.user_gamification (id, total_points, unlocked_level)
      VALUES (1, v_points, floor(v_points / 100.0)::integer + 1)
      ON CONFLICT (id) DO UPDATE SET
        total_points = coalesce(user_gamification.total_points, 0) + excluded.total_points,
        unlocked_level = floor((coalesce(user_gamification.total_points, 0) + excluded.total_points) / 100.0)::integer + 1;
    IF public._treasure_ready() THEN
      SELECT crack_index INTO v_crack FROM public.treasure_cracks
        WHERE revealed_at IS NULL ORDER BY crack_index LIMIT 1;
      IF v_crack IS NOT NULL THEN
        UPDATE public.treasure_cracks SET revealed_at = v_now WHERE crack_index = v_crack;
      END IF;
    END IF;
  END IF;
  INSERT INTO public.treasure_answers
    (question_id, selected_index, correct_option_index, correct, points_earned, answered_at, awarded_crack_index)
    VALUES (p_question_id, p_selected_index, v_question.correct_option_index, v_correct, v_points, v_now, v_crack);
  RETURN jsonb_build_object('correct', v_correct, 'points_earned', v_points,
    'correct_option_index', v_question.correct_option_index, 'already_answered', false,
    'treasure', public.treasure_state());
END
$$;

CREATE OR REPLACE FUNCTION public.treasure_open(p_index integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF p_index IS NULL OR p_index NOT BETWEEN 0 AND 3 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_INDEX';
  END IF;
  PERFORM 1 FROM public.treasure_progress WHERE id = 1 FOR UPDATE;
  IF NOT public._treasure_ready() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_NOT_READY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.treasure_cracks WHERE crack_index = p_index AND revealed_at IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_NOT_REVEALED';
  END IF;
  UPDATE public.treasure_cracks SET opened_at = coalesce(opened_at, clock_timestamp()) WHERE crack_index = p_index;
  RETURN public.treasure_state();
END
$$;

CREATE OR REPLACE FUNCTION public.treasure_validate(p_index integer, p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_crack public.treasure_cracks%ROWTYPE;
  v_config public.treasure_config%ROWTYPE;
  v_now timestamptz;
  v_attempts integer;
  v_first_attempt timestamptz;
  v_code text;
BEGIN
  IF p_index IS NULL OR p_index NOT BETWEEN 0 AND 3 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_INVALID_INDEX';
  END IF;
  PERFORM 1 FROM public.treasure_progress WHERE id = 1 FOR UPDATE;
  IF NOT public._treasure_ready() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_NOT_READY';
  END IF;
  SELECT * INTO STRICT v_crack FROM public.treasure_cracks WHERE crack_index = p_index;
  IF v_crack.revealed_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_NOT_REVEALED';
  END IF;
  IF v_crack.opened_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'TREASURE_NOT_OPENED';
  END IF;
  IF v_crack.solved_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'state', public.treasure_state());
  END IF;
  v_now := clock_timestamp();
  -- Server-side sliding window: client IP/session changes cannot reset it.
  DELETE FROM public.treasure_attempts WHERE attempted_at <= v_now - interval '60 seconds';
  SELECT count(*), min(attempted_at) INTO v_attempts, v_first_attempt
    FROM public.treasure_attempts WHERE crack_index = p_index AND attempted_at > v_now - interval '60 seconds';
  IF v_attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited',
      'retry_after_seconds', greatest(1, ceil(extract(epoch FROM v_first_attempt + interval '60 seconds' - v_now))::integer),
      'state', public.treasure_state());
  END IF;
  INSERT INTO public.treasure_attempts (crack_index, attempted_at) VALUES (p_index, v_now);
  v_code := upper(btrim(coalesce(p_code, '')));
  -- Reject oversized input before bcrypt and count malformed attempts too.
  IF v_code !~ '^[A-Z0-9 -]{4,64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_code', 'state', public.treasure_state());
  END IF;
  IF NOT coalesce(public._treasure_check_code(v_code, v_crack.code_hash), false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_code', 'state', public.treasure_state());
  END IF;
  UPDATE public.treasure_cracks SET solved_at = v_now WHERE crack_index = p_index;
  IF (SELECT count(*) = 4 FROM public.treasure_cracks WHERE solved_at IS NOT NULL) THEN
    UPDATE public.treasure_progress SET completed_at = coalesce(completed_at, v_now) WHERE id = 1;
    SELECT * INTO STRICT v_config FROM public.treasure_config WHERE id = 1;
    -- The unique singleton outbox and completion are committed together. Freeze
    -- destination and content so provider idempotency always sees the same payload.
    INSERT INTO public.treasure_completion_outbox (id, created_at, payload)
      VALUES (1, v_now, jsonb_build_object(
        'to', v_config.notification_email,
        'subject', 'Una novedad en Manu',
        'text', 'Se completó la sorpresa de Manu. Ya puedes preparar el regalo.'
      )) ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('ok', true, 'state', public.treasure_state());
END
$$;

CREATE OR REPLACE FUNCTION public.treasure_ack_completion() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  PERFORM 1 FROM public.treasure_progress WHERE id = 1 FOR UPDATE;
  UPDATE public.treasure_progress SET completion_seen_at = coalesce(completion_seen_at, clock_timestamp())
    WHERE id = 1 AND completed_at IS NOT NULL;
  RETURN public.treasure_state();
END
$$;

-- Remove the superseded no-argument overload to keep optional-argument RPC
-- resolution unambiguous on an installation that previously applied this file.
DROP FUNCTION IF EXISTS public.treasure_claim_notification();
CREATE OR REPLACE FUNCTION public.treasure_claim_notification(p_from text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_event public.treasure_completion_outbox%ROWTYPE;
  v_now timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO v_event FROM public.treasure_completion_outbox
    WHERE id = 1 AND sent_at IS NULL
      AND (lease_until IS NULL OR lease_until <= v_now)
      AND (next_attempt_at IS NULL OR next_attempt_at <= v_now)
    FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Stop before Resend's 24h idempotency window expires. An ambiguous delivery
  -- must be reviewed rather than automatically risking a duplicate email.
  IF v_event.attempt_started_at IS NOT NULL
      AND v_event.attempt_started_at <= v_now - interval '23 hours' THEN
    UPDATE public.treasure_completion_outbox
      SET last_error = 'Automatic retry window expired; verify provider delivery before retrying.'
      WHERE id = 1;
    RETURN NULL;
  END IF;
  UPDATE public.treasure_completion_outbox SET
    -- Sender is frozen with the first usable claim, just like recipient/content.
    -- A later environment change cannot invalidate the provider idempotency key.
    payload = CASE WHEN nullif(payload ->> 'from', '') IS NULL
        AND nullif(btrim(p_from), '') IS NOT NULL
      THEN jsonb_set(payload, '{from}', to_jsonb(p_from), true) ELSE payload END,
    attempt_started_at = coalesce(attempt_started_at, v_now),
    lease_until = v_now + interval '2 minutes',
    next_attempt_at = v_now + interval '60 seconds'
    WHERE id = 1 RETURNING * INTO v_event;
  RETURN to_jsonb(v_event);
END
$$;

-- RLS has no client policies; explicit ACL revocation closes default grants too.
-- Service role is held by authenticated server routes only, never the browser.
ALTER TABLE public.treasure_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_cracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_completion_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.treasure_config, public.treasure_progress, public.treasure_cracks,
  public.treasure_answers, public.treasure_attempts, public.treasure_completion_outbox FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.treasure_attempts_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.treasure_config, public.treasure_progress, public.treasure_cracks,
  public.treasure_answers, public.treasure_attempts, public.treasure_completion_outbox TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.treasure_attempts_id_seq TO service_role;

-- PostgreSQL gives PUBLIC execute by default: revoke EVERY helper and RPC.
REVOKE ALL ON FUNCTION public._treasure_hash_code(text), public._treasure_check_code(text, text),
  public._treasure_ready(), public.treasure_state(),
  public.treasure_configure(boolean, text, text, text, jsonb, text, text),
  public.treasure_set_audio(text, text), public.treasure_answer(uuid, integer), public.treasure_open(integer),
  public.treasure_validate(integer, text), public.treasure_ack_completion(),
  public.treasure_claim_notification(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.treasure_state(),
  public.treasure_configure(boolean, text, text, text, jsonb, text, text),
  public.treasure_set_audio(text, text), public.treasure_answer(uuid, integer), public.treasure_open(integer),
  public.treasure_validate(integer, text), public.treasure_ack_completion(),
  public.treasure_claim_notification(text) TO service_role;

COMMENT ON TABLE public.treasure_progress IS 'One shared participant, matching existing trivia and gamification. Row id=1 serializes treasure transactions.';
COMMENT ON TABLE public.treasure_answers IS 'Permanent one-answer ledger. Legacy correctness stays NULL. Do not remove ledger rows when resetting or deleting trivia.';
COMMENT ON TABLE public.treasure_completion_outbox IS 'One transactionally created completion event. Send with a stable provider idempotency key; never retry automatically past 23 hours.';
COMMIT;
