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
  songs: Song[]
  mood: MoodMode
  frequency: number
  message: string
  notePrefix: string
}
