-- =============================================
-- LOVE FREQUENCY — Full Schema
-- =============================================

-- Music Library
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

-- Daily Logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  saw_each_other BOOLEAN DEFAULT FALSE,
  vibe_score INT CHECK (vibe_score BETWEEN 1 AND 5),
  custom_message TEXT,
  photo_url TEXT
);

-- App State
CREATE TABLE IF NOT EXISTS current_app_state (
  id INT PRIMARY KEY DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  active_mood TEXT NOT NULL DEFAULT 'cozy_comfort',
  calculated_frequency FLOAT NOT NULL DEFAULT 89.2,
  active_song_id UUID REFERENCES music_library(id),
  note_prefix TEXT NOT NULL DEFAULT 'Just for you —'
);

-- Gamification
CREATE TABLE IF NOT EXISTS user_gamification (
  id INT PRIMARY KEY DEFAULT 1,
  total_points INT DEFAULT 0,
  unlocked_level INT DEFAULT 1,
  selected_avatar TEXT DEFAULT 'classic_retro',
  unlocked_avatars TEXT[] DEFAULT ARRAY['classic_retro']
);

-- Memory Vault
CREATE TABLE IF NOT EXISTS memory_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date_happened DATE,
  required_points INT NOT NULL DEFAULT 100,
  is_unlocked BOOLEAN DEFAULT FALSE,
  description TEXT NOT NULL,
  photo_urls TEXT[],
  spotify_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trivia
CREATE TABLE IF NOT EXISTS trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_option_index INT NOT NULL,
  points_reward INT DEFAULT 20,
  is_answered BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS secret_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  required_score INT NOT NULL DEFAULT 200,
  ticket_number TEXT NOT NULL,
  title TEXT NOT NULL,
  is_claimed BOOLEAN DEFAULT FALSE
);

-- Map
CREATE TABLE IF NOT EXISTS map_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  visit_date DATE NOT NULL,
  trip_title TEXT NOT NULL,
  trip_story TEXT,
  photo_urls TEXT[],
  trip_song_spotify_uri TEXT
);

-- RLS — deny direct client access (service role key bypasses RLS)
ALTER TABLE music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_locations ENABLE ROW LEVEL SECURITY;
