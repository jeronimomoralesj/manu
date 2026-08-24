-- 1. Music Library
CREATE TABLE IF NOT EXISTS music_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  spotify_uri TEXT NOT NULL,
  cover_url TEXT,
  mood_mode TEXT CHECK (mood_mode IN ('cozy_comfort', 'playful_connection', 'missing_you', 'wind_down')),
  valence FLOAT DEFAULT 0.5,
  energy FLOAT DEFAULT 0.5,
  acousticness FLOAT DEFAULT 0.5,
  personal_note TEXT,
  photo_base64 TEXT
);

-- 2. Daily Logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  saw_each_other BOOLEAN DEFAULT FALSE,
  vibe_score INT CHECK (vibe_score BETWEEN 1 AND 5),
  custom_message TEXT,
  photo_url TEXT
);

-- 3. App State
CREATE TABLE IF NOT EXISTS current_app_state (
  id INT PRIMARY KEY DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  active_mood TEXT NOT NULL DEFAULT 'cozy_comfort',
  calculated_frequency FLOAT NOT NULL DEFAULT 89.2,
  active_song_id UUID REFERENCES music_library(id),
  note_prefix TEXT NOT NULL DEFAULT 'Just for you —'
);

-- RLS: deny all direct client access — the service role key (used server-side only)
-- bypasses RLS, so no policies are needed for our app.
-- This ensures nothing leaks even if the anon key were ever exposed.
ALTER TABLE music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_app_state ENABLE ROW LEVEL SECURITY;
