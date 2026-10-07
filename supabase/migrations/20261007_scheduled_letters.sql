-- Non-destructive. Existing letters stay available; no policy/access changes.
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMPTZ;
COMMENT ON COLUMN public.cartas.unlock_at IS 'Opening instant. Admin calendar dates are midnight America/Bogota. NULL preserves legacy published letters.';
CREATE INDEX IF NOT EXISTS cartas_unlock_at_idx ON public.cartas (unlock_at);
