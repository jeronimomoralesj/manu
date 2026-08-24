import { MoodMode, DailyLog, RecommendationResult, Song } from '@/types'

interface AlgorithmInput {
  vibeScore: number
  sawEachOther: boolean
  hourOfDay: number
  dayOfWeek: number
}

function calculateFrequency(input: AlgorithmInput): number {
  const { vibeScore, sawEachOther, hourOfDay, dayOfWeek } = input
  const base = 87.5
  const vibeBoost = vibeScore * 1.8
  const togetherBoost = sawEachOther ? 3.2 : 0
  const eveningBoost = hourOfDay >= 18 ? 1.1 : hourOfDay <= 9 ? 0.6 : 0
  const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 0
  const raw = base + vibeBoost + togetherBoost + eveningBoost + weekendBoost
  return Math.min(107.9, Math.max(87.5, Math.round(raw * 10) / 10))
}

function determineMood(input: AlgorithmInput): MoodMode {
  const { vibeScore, sawEachOther, hourOfDay } = input
  if (vibeScore >= 4 && sawEachOther) return 'playful_connection'
  if (vibeScore >= 4 && !sawEachOther) return 'missing_you'
  if (vibeScore <= 2 || hourOfDay >= 21) return 'wind_down'
  return 'cozy_comfort'
}

const MOOD_MESSAGES: Record<MoodMode, string[]> = {
  playful_connection: [
    "Today felt like the beginning of something forever",
    "Every moment with you is my favorite song on repeat",
    "You light up every room, including every corner of my heart",
  ],
  missing_you: [
    "Distance is just a reminder of how much I want to be there",
    "Counting hours until I can hear your laugh again",
    "You're my favorite thought even when you're far away",
  ],
  cozy_comfort: [
    "Soft days are better when I imagine them with you",
    "These songs are a warm hug from me to you",
    "Let the music wrap around you like I would if I could",
  ],
  wind_down: [
    "End the day gently — you deserve all the rest",
    "Let tonight be soft, quiet, and full of peace",
    "Close your eyes to these songs and dream of good things",
  ],
}

const NOTE_PREFIXES: Record<MoodMode, string> = {
  playful_connection: "Made you something playful —",
  missing_you: "Thinking of you, always —",
  cozy_comfort: "Sending you warmth —",
  wind_down: "Rest easy, my love —",
}

export function runRecommendationAlgorithm(
  log: DailyLog | null,
  songs: Song[],
  manualVibeOverride?: number
): RecommendationResult {
  const now = new Date()
  const input: AlgorithmInput = {
    vibeScore: manualVibeOverride ?? log?.vibe_score ?? 3,
    sawEachOther: log?.saw_each_other ?? false,
    hourOfDay: now.getHours(),
    dayOfWeek: now.getDay(),
  }

  const mood = determineMood(input)
  const frequency = calculateFrequency(input)
  const messages = MOOD_MESSAGES[mood]
  const message = log?.custom_message ?? messages[Math.floor(Math.random() * messages.length)]

  const filtered = songs.filter((s) => s.mood_mode === mood)
  const sorted = filtered.sort((a, b) => {
    const scoreA = Math.abs(a.valence - 0.7) + Math.abs(a.energy - input.vibeScore / 5)
    const scoreB = Math.abs(b.valence - 0.7) + Math.abs(b.energy - input.vibeScore / 5)
    return scoreA - scoreB
  })

  return {
    songs: sorted.length >= 4 ? sorted : songs.slice(0, 6),
    mood,
    frequency,
    message,
    notePrefix: NOTE_PREFIXES[mood],
  }
}
