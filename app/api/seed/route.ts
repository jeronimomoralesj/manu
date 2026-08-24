import { NextResponse } from 'next/server'
import { getServerClient } from "@/lib/supabase"

const SEED_SONGS = [
  { title: 'Fall in Love Alone', artist: 'Stacey Ryan', spotify_uri: 'spotify:track:2Fxmhks0LivefKFGTNzmjo', cover_url: 'https://i.scdn.co/image/ab67616d0000b273e8e28219724c2423afa4d320', mood_mode: 'playful_connection', valence: 0.8, energy: 0.6, acousticness: 0.4 },
  { title: 'Submarine', artist: 'Alex Turner', spotify_uri: 'spotify:track:3F3GvWwPhGYvdVSxLHPeZ3', cover_url: 'https://i.scdn.co/image/ab67616d0000b2737fcccebe1da07b1eba87bbff', mood_mode: 'missing_you', valence: 0.45, energy: 0.35, acousticness: 0.7 },
  { title: 'Shape of You', artist: 'Ed Sheeran', spotify_uri: 'spotify:track:7qiZfU4dY1lWllzX7mPBI3', cover_url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96', mood_mode: 'playful_connection', valence: 0.93, energy: 0.82, acousticness: 0.08 },
  { title: 'Stay', artist: 'Zedd, Alessia Cara', spotify_uri: 'spotify:track:4h9wh7iOZ0GGn8QVp4RAOB', cover_url: 'https://i.scdn.co/image/ab67616d0000b2730f1e66b5f00e12e6e5e0b05e', mood_mode: 'cozy_comfort', valence: 0.71, energy: 0.75, acousticness: 0.1 },
  { title: 'Midnight Rain', artist: 'Taylor Swift', spotify_uri: 'spotify:track:6tNQ70jh4OwmPGpYy6R2o9', cover_url: 'https://i.scdn.co/image/ab67616d0000b273bb54dde68cd23e2a268ae0f5', mood_mode: 'wind_down', valence: 0.38, energy: 0.42, acousticness: 0.5 },
  { title: 'Something Just Like This', artist: 'The Chainsmokers', spotify_uri: 'spotify:track:6RUKPb4LETWmmr3iAEQktW', cover_url: 'https://i.scdn.co/image/ab67616d0000b27322e3ca4e7c8a2e7b1f5e3f7e', mood_mode: 'cozy_comfort', valence: 0.64, energy: 0.68, acousticness: 0.08 },
  { title: 'Starboy', artist: 'The Weeknd, Daft Punk', spotify_uri: 'spotify:track:5aAx2yezTd8zXrkmtKl66Z', cover_url: 'https://i.scdn.co/image/ab67616d0000b2736ed560a208ba5f0766453c19', mood_mode: 'wind_down', valence: 0.55, energy: 0.59, acousticness: 0.06 },
  { title: '8 Letters', artist: "Why Don't We", spotify_uri: 'spotify:track:1kwDR7C9LmjqEfAk0I1OAP', cover_url: null, mood_mode: 'missing_you', valence: 0.52, energy: 0.48, acousticness: 0.32 },
  { title: 'Hypnotized', artist: 'Purple Disco Machine', spotify_uri: 'spotify:track:44h4RGFKkCfwTWPdgxvmhk', cover_url: null, mood_mode: 'playful_connection', valence: 0.87, energy: 0.78, acousticness: 0.05 },
  { title: 'Melodrama', artist: 'Lorde', spotify_uri: 'spotify:track:4lNaOyiMOKhJ0DIPkTK29f', cover_url: null, mood_mode: 'missing_you', valence: 0.31, energy: 0.49, acousticness: 0.18 },
]

export async function POST() {
  const db = getServerClient()
  const { error } = await db.from('music_library').insert(SEED_SONGS)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: logError } = await db.from('daily_logs').insert([{
    saw_each_other: true,
    vibe_score: 4,
    custom_message: null,
    photo_url: null,
  }])

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })
  return NextResponse.json({ ok: true, seeded: SEED_SONGS.length })
}
