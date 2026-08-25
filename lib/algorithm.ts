import { MoodMode, DailyLog, RecommendationResult, Song } from '@/types'

function calculateFrequency(vibeScore: number, sawEachOther: boolean): number {
  const now = new Date()
  const hour = now.getHours()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  const base = 87.5
  const raw =
    base +
    vibeScore * 1.8 +
    (sawEachOther ? 3.2 : 0) +
    (hour >= 18 ? 1.1 : hour <= 9 ? 0.6 : 0) +
    (isWeekend ? 0.7 : 0)
  return Math.min(107.9, Math.max(87.5, Math.round(raw * 10) / 10))
}

function determineMood(vibeScore: number, sawEachOther: boolean): MoodMode {
  const hour = new Date().getHours()
  if (vibeScore >= 4 && sawEachOther) return 'playful_connection'
  if (vibeScore >= 4 && !sawEachOther) return 'missing_you'
  if (vibeScore <= 2 || hour >= 21) return 'wind_down'
  return 'cozy_comfort'
}

const MOOD_MESSAGES: Record<MoodMode, string[]> = {
  playful_connection: [
    "Hoy se sintió como el comienzo de algo para siempre",
    "Cada momento contigo es mi canción favorita en repetición",
    "Iluminas todo cuarto al que entras, incluyendo cada rincón de mi corazón",
  ],
  missing_you: [
    "La distancia solo me recuerda cuánto quiero estar allí",
    "Contando las horas hasta volver a escuchar tu risa",
    "Eres mi pensamiento favorito aunque estés lejos",
  ],
  cozy_comfort: [
    "Los días tranquilos son mejores cuando te imagino en ellos",
    "Estas canciones son un abrazo cálido de mi parte para ti",
    "Deja que la música te envuelva como lo haría yo si pudiera",
  ],
  wind_down: [
    "Termina el día con suavidad — te mereces todo el descanso",
    "Que esta noche sea tranquila, suave y llena de paz",
    "Cierra los ojos con estas canciones y sueña con cosas bonitas",
  ],
}

const NOTE_PREFIXES: Record<MoodMode, string> = {
  playful_connection: "Te hice algo especial —",
  missing_you: "Pensando en ti, siempre —",
  cozy_comfort: "Te mando calorcito —",
  wind_down: "Descansa bien, mi amor —",
}

export function runRecommendationAlgorithm(
  log: DailyLog | null,
  allSongs: Song[],
  manualVibeOverride?: number
): RecommendationResult {
  const vibeScore = manualVibeOverride ?? log?.vibe_score ?? 3
  const sawEachOther = log?.saw_each_other ?? false

  const mood = determineMood(vibeScore, sawEachOther)
  const frequency = calculateFrequency(vibeScore, sawEachOther)
  const messages = MOOD_MESSAGES[mood]
  const message = log?.custom_message ?? messages[Math.floor(Math.random() * messages.length)]

  // Songs for the suggested mood — caller can filter by any mood client-side
  const moodSongs = allSongs.filter(s => s.mood_mode === mood)

  return {
    allSongs,
    moodSongs,
    mood,
    frequency,
    message,
    notePrefix: NOTE_PREFIXES[mood],
  }
}
