/**
 * Real, disposable PostgreSQL integration tests, including independent sessions.
 * Run: bash tests/treasure-db.sh
 * No DATABASE_URL, Supabase URL, production credential, or external DB is read.
 * Runtime: pinned embedded-postgres + pg from npm, installed outside this repo.
 */
import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:net'

const runtime = process.env.TREASURE_DB_RUNTIME
if (!runtime) throw new Error('Use bash tests/treasure-db.sh to install the isolated test runtime.')
const require = createRequire(join(resolve(runtime), 'package.json'))
const { default: EmbeddedPostgres } = await import(pathToFileURL(require.resolve('embedded-postgres')).href)
const { Client } = require('pg')
const migration = await readFile(new URL('../supabase/migrations/20261008_treasure_hunt.sql', import.meta.url), 'utf8')
const root = await mkdtemp(join(tmpdir(), 'manu-treasure-test-'))
const listener = createServer()
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve))
const port = listener.address().port
await new Promise(resolve => listener.close(resolve))
const localConfig = {
  host: '127.0.0.1', port, user: 'treasure_test',
  password: randomBytes(24).toString('hex'), database: 'postgres',
}
const serverLogs = []
const server = new EmbeddedPostgres({
  databaseDir: join(root, 'db'), port,
  user: localConfig.user, password: localConfig.password, persistent: false,
  postgresFlags: ['-h', '127.0.0.1', '-c', "unix_socket_directories="],
  onLog(message) { serverLogs.push(String(message)) }, onError: console.error,
})
let db
const codes = ['CORNER-A', 'CORNER-B', 'CORNER-C', 'CORNER-D']

async function client(role = 'service_role') {
  const connection = new Client(localConfig)
  await connection.connect()
  if (role) await connection.query(`SET ROLE ${role}`)
  return connection
}
async function scalar(sql, args = [], connection = db) {
  return (await connection.query(sql, args)).rows[0]?.result
}
async function rpc(name, args = [], connection = db) {
  return scalar(`SELECT public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) AS result`, args, connection)
}
async function configure(overrides = {}) {
  const input = {
    enabled: true, title: 'Una sorpresa', message: 'Te quiero',
    audio: 'reward/test.mp3', codes, email: 'fixture@example.com', type: 'audio/mpeg', ...overrides,
  }
  return rpc('treasure_configure', [input.enabled, input.title, input.message, input.audio,
    input.codes === null ? null : JSON.stringify(input.codes), input.email, input.type])
}
async function question({ answered = false, reward = 20, correct = 1 } = {}) {
  const id = randomUUID()
  await db.query(`INSERT INTO public.trivia_questions
    (id, question, options, correct_option_index, points_reward, is_answered)
    VALUES ($1, 'Fixture question', ARRAY['no','yes','maybe','later'], $2, $3, $4)`, [id, correct, reward, answered])
  return id
}
async function revealFour() {
  for (let index = 0; index < 4; index++) {
    const answer = await rpc('treasure_answer', [await question(), 1])
    assert.ok(answer.treasure.cracks[index].revealed_at)
    await rpc('treasure_open', [index])
  }
}
async function solveFour() {
  await revealFour()
  for (let index = 0; index < 4; index++) await rpc('treasure_validate', [index, codes[index]])
}
async function parallel(count, action) {
  const connections = await Promise.all(Array.from({ length: count }, () => client()))
  try { return await Promise.all(connections.map(action)) }
  finally { await Promise.all(connections.map(connection => connection.end())) }
}
function code(error, expected) {
  assert.equal(error.code, expected)
  return true
}

before(async () => {
  try {
    await server.initialise()
    await server.start()
  } catch (error) {
    throw new Error(`Local PostgreSQL startup failed: ${String(error)}\n${serverLogs.join('\n')}`)
  }
  db = await client(null)
  await db.query('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;')
})
after(async () => {
  if (db) await db.end()
  await server.stop()
  await rm(root, { recursive: true, force: true })
})
beforeEach(async () => {
  await db.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE TABLE public.trivia_questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question text NOT NULL,
      options text[] NOT NULL, correct_option_index integer NOT NULL,
      points_reward integer DEFAULT 20, is_answered boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.user_gamification (
      id integer PRIMARY KEY DEFAULT 1, total_points integer DEFAULT 0,
      unlocked_level integer DEFAULT 1, selected_avatar text DEFAULT 'horse',
      unlocked_avatars text[] DEFAULT ARRAY['horse']
    );
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
    );
    TRUNCATE storage.buckets;
  `)
  await db.query(migration)
})

test('migration is idempotent, default-off, private, and preserves legacy answers and points', async () => {
  const old = await question({ answered: true })
  await db.query("INSERT INTO public.user_gamification VALUES (1, 155, 2, 'bird', ARRAY['horse','bird'])")
  await db.query(migration)
  await db.query(migration)
  const state = await rpc('treasure_state')
  assert.equal(state.enabled, false)
  assert.deepEqual(state.cracks.map(c => c.index), [0, 1, 2, 3])
  assert.ok(state.cracks.every(c => c.revealed_at === null && c.opened_at === null && c.solved_at === null))
  assert.equal(state.completed_at, null)
  assert.equal(await scalar('SELECT total_points AS result FROM public.user_gamification'), 155)
  const legacy = (await db.query('SELECT * FROM public.treasure_answers WHERE question_id = $1', [old])).rows[0]
  assert.equal(legacy.correct, null)
  assert.equal(legacy.awarded_crack_index, null)
  assert.equal(legacy.points_earned, 0)
  assert.equal((await db.query('SELECT public, file_size_limit FROM storage.buckets')).rows[0].public, false)
  assert.equal((await db.query('SELECT public, file_size_limit FROM storage.buckets')).rows[0].file_size_limit, '4194304')
  await configure()
  await db.query('UPDATE public.trivia_questions SET is_answered = false WHERE id = $1', [old])
  const replay = await rpc('treasure_answer', [old, 1])
  assert.equal(replay.already_answered, true)
  assert.equal(replay.correct, true)
  assert.equal(replay.points_earned, 0)
  assert.ok(replay.treasure.cracks.every(c => c.revealed_at === null))
  assert.equal(await scalar('SELECT total_points AS result FROM public.user_gamification'), 155)
})

test('migration does not alter existing bucket access, size, or types', async () => {
  await db.query("UPDATE storage.buckets SET public = true, file_size_limit = 1234, allowed_mime_types = ARRAY['fixture/type']")
  await db.query(migration)
  assert.deepEqual((await db.query('SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets')).rows[0], {
    public: true, file_size_limit: '1234', allowed_mime_types: ['fixture/type'],
  })
})

test('RLS and explicit ACLs deny anonymous/authenticated tables, secrets, RPCs, and helpers', async () => {
  for (const role of ['anon', 'authenticated']) {
    const connection = await client(role)
    try {
      for (const table of ['treasure_config', 'treasure_progress', 'treasure_cracks', 'treasure_answers', 'treasure_attempts', 'treasure_completion_outbox']) {
        await assert.rejects(connection.query(`SELECT * FROM public.${table}`), error => code(error, '42501'))
        assert.equal(await scalar('SELECT relrowsecurity AS result FROM pg_class WHERE oid = $1::regclass', [`public.${table}`]), true)
      }
      for (const [name, args] of [
        ['treasure_state', []], ['treasure_set_audio', ['test.mp3', 'audio/mpeg']], ['treasure_open', [0]], ['treasure_validate', [0, codes[0]]],
        ['treasure_answer', [randomUUID(), 1]], ['treasure_ack_completion', []], ['treasure_claim_notification', []],
        ['treasure_configure', [false, 'Fixture', '']], ['_treasure_ready', []],
        ['_treasure_hash_code', ['CODE']], ['_treasure_check_code', ['CODE', 'hash']],
      ]) await assert.rejects(rpc(name, args, connection), error => code(error, '42501'))
    } finally { await connection.end() }
  }
  const service = await client()
  try {
    assert.equal((await rpc('treasure_state', [], service)).enabled, false)
    await assert.rejects(rpc('_treasure_hash_code', ['CODE'], service), error => code(error, '42501'))
  } finally { await service.end() }
})

test('configuration hashes normalized codes, enforces readiness, freezes recipient, and preserves blank edits', async () => {
  await assert.rejects(configure({ audio: null }), /TREASURE_NOT_READY/)
  assert.equal((await rpc('treasure_state')).enabled, false)
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_cracks WHERE code_hash IS NOT NULL'), 0)
  await assert.rejects(configure({ codes: ['AAA', ...codes.slice(1)] }), /TREASURE_INVALID_CONFIG/)
  await assert.rejects(configure({ codes: [codes[0]] }), /TREASURE_INVALID_CONFIG/)
  await assert.rejects(configure({ audio: '../secret.mp3' }), /TREASURE_INVALID_CONFIG/)
  const state = await configure({ codes: codes.map(value => ` ${value.toLowerCase()} `) })
  assert.equal(state.enabled, true)
  const before = (await db.query('SELECT code_hash FROM public.treasure_cracks ORDER BY crack_index')).rows
  assert.ok(before.every(row => row.code_hash.startsWith('$2a$10$')))
  assert.ok(!JSON.stringify(state).includes('code_hash'))
  await configure({ audio: null, codes: ['', '', '', ''], email: null, type: null })
  assert.deepEqual((await db.query('SELECT code_hash FROM public.treasure_cracks ORDER BY crack_index')).rows, before)
  assert.equal(await scalar('SELECT audio_path AS result FROM public.treasure_config'), 'reward/test.mp3')
  await assert.rejects(configure({ email: 'changed@example.com' }), /TREASURE_RECIPIENT_LOCKED/)
  await db.query('UPDATE public.treasure_cracks SET code_hash = NULL WHERE crack_index = 0')
  assert.equal((await rpc('treasure_state')).enabled, false)
})

test('wrong trivia and invalid inputs never advance; one correct answer reveals only earliest corner', async () => {
  await configure()
  const wrong = await question()
  const result = await rpc('treasure_answer', [wrong, 0])
  assert.equal(result.correct, false)
  assert.equal(result.points_earned, 0)
  assert.equal(result.correct_option_index, 1)
  assert.ok(result.treasure.cracks.every(c => c.revealed_at === null))
  await db.query('UPDATE public.trivia_questions SET is_answered = false WHERE id = $1', [wrong])
  const replay = await rpc('treasure_answer', [wrong, 1])
  assert.equal(replay.correct, true)
  assert.equal(replay.already_answered, true)
  await assert.rejects(rpc('treasure_answer', [randomUUID(), 1]), /TREASURE_QUESTION_NOT_FOUND/)
  const right = await question({ reward: 35 })
  for (const value of [-1, 4, null]) await assert.rejects(rpc('treasure_answer', [right, value]), /TREASURE_INVALID_ANSWER/)
  const answer = await rpc('treasure_answer', [right, 1])
  assert.equal(answer.points_earned, 35)
  assert.ok(answer.treasure.cracks[0].revealed_at)
  assert.equal(answer.treasure.cracks[0].opened_at, null)
  assert.equal(answer.treasure.cracks[0].solved_at, null)
  assert.ok(answer.treasure.cracks.slice(1).every(c => c.revealed_at === null))
})

test('disabled hunt preserves normal points and does not retroactively award corners', async () => {
  const id = await question({ reward: 25 })
  const answer = await rpc('treasure_answer', [id, 1])
  assert.equal(answer.correct, true)
  assert.equal(answer.points_earned, 25)
  assert.equal(answer.treasure.enabled, false)
  assert.ok(answer.treasure.cracks.every(c => c.revealed_at === null))
  await configure()
  assert.equal((await rpc('treasure_answer', [id, 1])).already_answered, true)
  assert.ok((await rpc('treasure_state')).cracks.every(c => c.revealed_at === null))
})

test('twenty concurrent submissions for one question award points and a corner exactly once', async () => {
  await configure()
  const id = await question({ reward: 30 })
  const answers = await parallel(20, connection => rpc('treasure_answer', [id, 1], connection))
  assert.equal(answers.filter(answer => !answer.already_answered).length, 1)
  assert.equal(answers.reduce((sum, answer) => sum + answer.points_earned, 0), 30)
  assert.equal(await scalar('SELECT total_points AS result FROM public.user_gamification'), 30)
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_answers'), 1)
  assert.equal((await rpc('treasure_state')).cracks.filter(c => c.revealed_at).length, 1)
})

test('concurrent distinct answers cap cracks at four and preserve existing gamification fields', async () => {
  await configure()
  await db.query("INSERT INTO public.user_gamification VALUES (1, 90, 1, 'bird', ARRAY['horse','bird'])")
  const ids = []
  for (let index = 0; index < 8; index++) ids.push(await question({ reward: 25 }))
  await parallel(8, (connection, index) => rpc('treasure_answer', [ids[index], 1], connection))
  const state = await rpc('treasure_state')
  assert.equal(state.cracks.length, 4)
  assert.ok(state.cracks.every(c => c.revealed_at && c.opened_at === null && c.solved_at === null))
  assert.equal(state.completed_at, null)
  assert.deepEqual((await db.query('SELECT * FROM public.user_gamification')).rows[0], {
    id: 1, total_points: 290, unlocked_level: 3, selected_avatar: 'bird', unlocked_avatars: ['horse', 'bird'],
  })
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_answers WHERE awarded_crack_index IS NOT NULL'), 4)
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_completion_outbox'), 0)
})

test('singleton row lock blocks a separate session until the first award transaction commits', async () => {
  await configure()
  const [first, second] = await Promise.all([client(), client()])
  try {
    const id1 = await question(), id2 = await question()
    await first.query('BEGIN')
    await rpc('treasure_answer', [id1, 1], first)
    const waiting = rpc('treasure_answer', [id2, 1], second)
    let isWaiting = false
    for (let attempt = 0; attempt < 100; attempt++) {
      isWaiting = await scalar("SELECT wait_event_type = 'Lock' AS result FROM pg_stat_activity WHERE pid = $1", [second.processID])
      if (isWaiting) break
      await new Promise(resolve => setTimeout(resolve, 5))
    }
    assert.equal(isWaiting, true)
    assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_answers'), 0)
    await first.query('COMMIT')
    const result = await waiting
    assert.ok(result.treasure.cracks[1].revealed_at)
    assert.equal(await scalar('SELECT total_points AS result FROM public.user_gamification'), 40)
  } finally { await first.query('ROLLBACK'); await first.end(); await second.end() }
})

test('opening and solving are separate persistent, repeat-safe steps', async () => {
  await configure()
  await assert.rejects(rpc('treasure_open', [0]), /TREASURE_NOT_REVEALED/)
  for (const index of [-1, 4, null]) await assert.rejects(rpc('treasure_open', [index]), /TREASURE_INVALID_INDEX/)
  await rpc('treasure_answer', [await question(), 1])
  await assert.rejects(rpc('treasure_validate', [0, codes[0]]), /TREASURE_NOT_OPENED/)
  const first = await rpc('treasure_open', [0])
  assert.ok(first.cracks[0].opened_at)
  assert.equal(first.cracks[0].solved_at, null)
  assert.equal((await rpc('treasure_open', [0])).cracks[0].opened_at, first.cracks[0].opened_at)
  const solved = await rpc('treasure_validate', [0, ` ${codes[0].toLowerCase()} `])
  assert.equal(solved.ok, true)
  assert.ok(solved.state.cracks[0].solved_at)
  const reload = await client()
  try { assert.deepEqual(await rpc('treasure_state', [], reload), solved.state) }
  finally { await reload.end() }
  assert.deepEqual((await rpc('treasure_validate', [0, 'WRONG'])).state, solved.state)
  assert.equal((await rpc('treasure_ack_completion')).completion_seen_at, null)
})

test('wrong and malformed codes persist a per-corner five-attempt sliding rate limit across sessions', async () => {
  await configure()
  await revealFour()
  const before = await rpc('treasure_state')
  for (const value of ['WRONG', '', null, 'x'.repeat(73), 'CORNER-Z']) {
    const failure = await rpc('treasure_validate', [0, value])
    assert.equal(failure.error, 'wrong_code')
    assert.deepEqual(failure.state, before)
  }
  const other = await client()
  try {
    const limited = await rpc('treasure_validate', [0, codes[0]], other)
    assert.equal(limited.error, 'rate_limited')
    assert.ok(limited.retry_after_seconds > 0 && limited.retry_after_seconds <= 60)
    assert.equal((await rpc('treasure_validate', [1, codes[1]], other)).ok, true)
  } finally { await other.end() }
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_attempts WHERE crack_index = 0'), 5)
  await db.query("UPDATE public.treasure_attempts SET attempted_at = clock_timestamp() - interval '61 seconds' WHERE crack_index = 0")
  assert.equal((await rpc('treasure_validate', [0, codes[0]])).ok, true)
})

test('concurrent attempts cannot exceed the persisted rate limit', async () => {
  await configure()
  await rpc('treasure_answer', [await question(), 1])
  await rpc('treasure_open', [0])
  const attempts = await parallel(12, connection => rpc('treasure_validate', [0, 'WRONG'], connection))
  assert.equal(attempts.filter(result => result.error === 'wrong_code').length, 5)
  assert.equal(attempts.filter(result => result.error === 'rate_limited').length, 7)
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_attempts'), 5)
})

test('concurrent fourth-code validation commits exactly one completion/outbox and stable acknowledgement', async () => {
  await configure()
  await revealFour()
  for (let index = 0; index < 3; index++) await rpc('treasure_validate', [index, codes[index]])
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_completion_outbox'), 0)
  const results = await parallel(16, connection => rpc('treasure_validate', [3, codes[3]], connection))
  assert.ok(results.every(result => result.ok))
  assert.equal(new Set(results.map(result => result.state.completed_at)).size, 1)
  assert.ok(results[0].state.completed_at)
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_completion_outbox'), 1)
  const event = (await db.query('SELECT * FROM public.treasure_completion_outbox')).rows[0]
  assert.deepEqual(event.payload, {
    to: 'fixture@example.com', subject: 'Una novedad en Manu',
    text: 'Se completó la sorpresa de Manu. Ya puedes preparar el regalo.',
  })
  assert.ok(!JSON.stringify(event.payload).includes('mp3'))
  const acknowledged = await rpc('treasure_ack_completion')
  assert.ok(acknowledged.completion_seen_at)
  assert.equal((await rpc('treasure_ack_completion')).completion_seen_at, acknowledged.completion_seen_at)
  await configure({ title: 'Changed', message: 'Changed', codes: null, audio: null, email: null })
  assert.deepEqual((await db.query('SELECT payload FROM public.treasure_completion_outbox')).rows[0].payload, event.payload)
})

test('outbox failure rolls fourth solve and completion back atomically, then retry succeeds', async () => {
  await configure()
  await revealFour()
  for (let index = 0; index < 3; index++) await rpc('treasure_validate', [index, codes[index]])
  await db.query(`CREATE FUNCTION public.fixture_reject_event() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN RAISE EXCEPTION 'fixture outbox failure'; END $$;
    CREATE TRIGGER fixture_reject_event BEFORE INSERT ON public.treasure_completion_outbox
    FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_event();`)
  await assert.rejects(rpc('treasure_validate', [3, codes[3]]), /fixture outbox failure/)
  const state = await rpc('treasure_state')
  assert.equal(state.cracks[3].solved_at, null)
  assert.equal(state.completed_at, null)
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_attempts WHERE crack_index = 3'), 0)
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_completion_outbox'), 0)
  await db.query('DROP TRIGGER fixture_reject_event ON public.treasure_completion_outbox')
  assert.equal((await rpc('treasure_validate', [3, codes[3]])).ok, true)
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.treasure_completion_outbox'), 1)
})

test('outbox claim is single-lease, backs off, preserves first attempt, and stops before idempotency expiry', async () => {
  assert.equal(await rpc('treasure_claim_notification'), null)
  await configure()
  await solveFour()
  const claims = await parallel(12, connection => rpc('treasure_claim_notification', [], connection))
  assert.equal(claims.filter(Boolean).length, 1)
  const claimed = claims.find(Boolean)
  assert.ok(claimed.attempt_started_at)
  assert.ok(Date.parse(claimed.lease_until) - Date.parse(claimed.attempt_started_at) >= 119_999)
  assert.equal(await rpc('treasure_claim_notification'), null)
  await db.query('UPDATE public.treasure_completion_outbox SET lease_until = NULL')
  assert.equal(await rpc('treasure_claim_notification'), null, '60 second backoff remains after releasing lease')
  await db.query("UPDATE public.treasure_completion_outbox SET next_attempt_at = now() - interval '1 second'")
  const reclaimed = await rpc('treasure_claim_notification')
  assert.equal(reclaimed.attempt_started_at, claimed.attempt_started_at)
  assert.deepEqual(reclaimed.payload, claimed.payload)
  await db.query(`UPDATE public.treasure_completion_outbox SET lease_until = NULL, next_attempt_at = NULL,
    attempt_started_at = now() - interval '23 hours 1 minute'`)
  assert.equal(await rpc('treasure_claim_notification'), null)
  assert.match(await scalar('SELECT last_error AS result FROM public.treasure_completion_outbox'), /verify provider delivery/)
  await db.query('UPDATE public.treasure_completion_outbox SET sent_at = now(), attempt_started_at = NULL')
  assert.equal(await rpc('treasure_claim_notification'), null)
})


test('audio updates lock and preserve a concurrent config disable, title edit, and recipient', async () => {
  await configure()
  const [settings, upload] = await Promise.all([client(), client()])
  try {
    await settings.query('BEGIN')
    await rpc('treasure_configure', [false, 'New title', 'New message'], settings)
    const settingAudio = rpc('treasure_set_audio', ['reward/new.ogg', 'audio/ogg'], upload)
    let isWaiting = false
    for (let attempt = 0; attempt < 100; attempt++) {
      isWaiting = await scalar("SELECT wait_event_type = 'Lock' AS result FROM pg_stat_activity WHERE pid = $1", [upload.processID])
      if (isWaiting) break
      await new Promise(resolve => setTimeout(resolve, 5))
    }
    assert.equal(isWaiting, true)
    await settings.query('COMMIT')
    assert.equal((await settingAudio).enabled, false)
    const config = (await db.query('SELECT * FROM public.treasure_config')).rows[0]
    assert.equal(config.enabled, false)
    assert.equal(config.reward_title, 'New title')
    assert.equal(config.reward_message, 'New message')
    assert.equal(config.notification_email, 'fixture@example.com')
    assert.equal(config.audio_path, 'reward/new.ogg')
    assert.equal(config.audio_content_type, 'audio/ogg')
  } finally { await settings.query('ROLLBACK'); await settings.end(); await upload.end() }
  for (const values of [[null, 'audio/mpeg'], ['../secret.mp3', 'audio/mpeg'], ['safe.mp3', null], ['safe.mp3', 'text/html']]) {
    await assert.rejects(rpc('treasure_set_audio', values), /TREASURE_INVALID_CONFIG/)
  }
})


test('reset and edited questions give current feedback without rewriting the original ledger or rewarding again', async () => {
  await configure()
  const id = await question()
  const initial = await rpc('treasure_answer', [id, 0])
  assert.equal(initial.correct, false)
  const ledger = (await db.query('SELECT * FROM public.treasure_answers WHERE question_id = $1', [id])).rows[0]
  await db.query('UPDATE public.trivia_questions SET is_answered = false WHERE id = $1', [id])
  const corrected = await rpc('treasure_answer', [id, 1])
  assert.equal(corrected.correct, true)
  assert.equal(corrected.correct_option_index, 1)
  assert.equal(corrected.already_answered, true)
  assert.equal(corrected.points_earned, 0)
  await db.query('UPDATE public.trivia_questions SET correct_option_index = 2, is_answered = false WHERE id = $1', [id])
  const staleAnswer = await rpc('treasure_answer', [id, 1])
  assert.equal(staleAnswer.correct, false)
  assert.equal(staleAnswer.correct_option_index, 2)
  const editedAnswer = await rpc('treasure_answer', [id, 2])
  assert.equal(editedAnswer.correct, true)
  assert.equal(editedAnswer.correct_option_index, 2)
  assert.equal(editedAnswer.points_earned, 0)
  assert.ok(editedAnswer.treasure.cracks.every(c => c.revealed_at === null))
  assert.deepEqual((await db.query('SELECT * FROM public.treasure_answers WHERE question_id = $1', [id])).rows[0], ledger)
  assert.equal(await scalar('SELECT count(*)::int AS result FROM public.user_gamification'), 0)
})

test('outbox sender is frozen on first claim even when a later sender configuration changes', async () => {
  await configure()
  await solveFour()
  const first = await rpc('treasure_claim_notification', ['Manu <first@example.com>'])
  assert.equal(first.payload.from, 'Manu <first@example.com>')
  await db.query('UPDATE public.treasure_completion_outbox SET lease_until = NULL, next_attempt_at = NULL')
  const retry = await rpc('treasure_claim_notification', ['Manu <changed@example.com>'])
  assert.deepEqual(retry.payload, first.payload)
  assert.equal(retry.attempt_started_at, first.attempt_started_at)
  await db.query('UPDATE public.treasure_completion_outbox SET lease_until = NULL, next_attempt_at = NULL')
  assert.deepEqual((await rpc('treasure_claim_notification')).payload, first.payload)
  assert.equal(await scalar("SELECT count(*)::int AS result FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'treasure_claim_notification'"), 1)
})
