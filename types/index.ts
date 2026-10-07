export type MoodMode = 'cozy_comfort' | 'playful_connection' | 'missing_you' | 'wind_down'

export interface Song {
  id: string
  title: string
  artist: string
  spotify_uri: string
  cover_url: string | null
  mood_mode: MoodMode | null
  valence: number
  energy: number
  acousticness: number
  personal_note: string | null
  photo_base64: string | null
}

export interface DailyLog {
  id: string
  created_at: string
  saw_each_other: boolean
  vibe_score: number
  custom_message: string | null
  photo_url: string | null
}

export interface AppState {
  id: number
  updated_at: string
  active_mood: MoodMode
  calculated_frequency: number
  active_song_id: string | null
  note_prefix: string
}

export interface RecommendationResult {
  allSongs: Song[]
  moodSongs: Song[]
  mood: MoodMode
  frequency: number
  message: string
  notePrefix: string
}

export interface Gamification {
  id: number
  total_points: number
  unlocked_level: number
  selected_avatar: string
  unlocked_avatars: string[]
}

export interface MemoryVault {
  id: string
  title: string
  date_happened: string | null
  required_points: number
  is_unlocked: boolean
  description: string
  photo_urls: string[] | null
  spotify_uri: string | null
  created_at: string
}

export interface TriviaQuestion {
  id: string
  question: string
  options: string[]
  correct_option_index: number
  points_reward: number
  is_answered: boolean
}

export interface SecretDate {
  id: string
  required_score: number
  ticket_number: string
  title: string
  is_claimed: boolean
}

export interface Carta {
  unlock_at: string | null
  is_locked: boolean
  id: string
  title: string
  body: string | null
  image_base64: string | null
  sent_at: string | null
  is_read: boolean
  created_at: string
}

export interface MapLocation {
  id: string
  city_name: string
  latitude: number
  longitude: number
  visit_date: string
  trip_title: string
  trip_story: string | null
  photo_urls: string[] | null
  trip_song_spotify_uri: string | null
}
