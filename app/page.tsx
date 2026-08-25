'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import RadioPlayer from '@/components/RadioPlayer'
import Dashboard from '@/components/Dashboard'
import AudioPlayerBar from '@/components/AudioPlayerBar'
import { RecommendationResult, Song } from '@/types'

const FALLBACK: RecommendationResult = {
  allSongs: [],
  moodSongs: [],
  mood: 'cozy_comfort',
  frequency: 89.2,
  message: 'Cargando tu estación personalizada...',
  notePrefix: 'Solo para ti —',
}

function HomeInner() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<RecommendationResult>(FALLBACK)
  const [vibeScore, setVibeScore] = useState(3)
  const [activeSong, setActiveSong] = useState<Song | null>(null)
  const [songIndex, setSongIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showRadio, setShowRadio] = useState(false)

  const fetchRecommendations = useCallback(async (vibe?: number) => {
    const url = vibe ? `/api/recommendations?vibe=${vibe}` : '/api/recommendations'
    const res = await fetch(url)
    if (!res.ok) return null
    const json: RecommendationResult = await res.json()
    setData(json)
    setLoading(false)
    return json
  }, [])

  useEffect(() => {
    fetchRecommendations().then(json => {
      if (!json) return
      const playId = searchParams.get('play')
      if (playId) {
        const target = json.allSongs.find(s => s.id === playId)
        if (target) { setActiveSong(target); return }
      }
      if (json.moodSongs.length > 0) setActiveSong(json.moodSongs[0])
      else if (json.allSongs.length > 0) setActiveSong(json.allSongs[0])
    })
  }, [])

  const handleVibeChange = (v: number) => {
    setVibeScore(v)
    fetchRecommendations(v)
  }

  const handlePlay = (song: Song) => {
    setActiveSong(song)
    const idx = data.allSongs.findIndex(s => s.id === song.id)
    if (idx !== -1) setSongIndex(idx)
  }

  const handleNext = () => {
    if (!data.allSongs.length) return
    const next = (songIndex + 1) % data.allSongs.length
    setSongIndex(next)
    setActiveSong(data.allSongs[next])
  }

  const handlePrev = () => {
    if (!data.allSongs.length) return
    const prev = (songIndex - 1 + data.allSongs.length) % data.allSongs.length
    setSongIndex(prev)
    setActiveSong(data.allSongs[prev])
  }

  return (
    <main
      className="flex h-screen overflow-hidden relative"
      style={{ background: '#F4F5F7', fontFamily: "'Inter', sans-serif" }}
    >
      {/* Radio panel */}
      <div
        className={`flex-shrink-0 h-full p-3 md:p-4 transition-all duration-300 overflow-hidden
          ${showRadio ? 'w-72' : 'w-0'} md:w-80`}
      >
        <div className="w-64 md:w-full h-full">
          <RadioPlayer
            frequency={data.frequency}
            mood={data.mood}
            nowPlaying={activeSong?.title ?? '...'}
            vibeScore={vibeScore}
            onVibeChange={handleVibeChange}
          />
        </div>
      </div>

      {/* Mobile radio toggle */}
      <button
        className="md:hidden absolute top-4 left-4 z-30 w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg"
        style={{ background: '#FF5722' }}
        onClick={() => setShowRadio(s => !s)}
      >
        <span className="text-sm">♪</span>
      </button>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-full border-4 animate-spin mx-auto mb-3"
              style={{ borderColor: '#e5e7eb', borderTopColor: '#FF5722' }}
            />
            <p className="text-gray-400 text-sm">Sintonizando tu frecuencia...</p>
          </div>
        </div>
      ) : (
        <Dashboard
          allSongs={data.allSongs}
          suggestedMood={data.mood}
          message={data.message}
          notePrefix={data.notePrefix}
          photoUrl={null}
          activeSong={activeSong}
          onPlay={handlePlay}
        />
      )}

      <AudioPlayerBar song={activeSong} onNext={handleNext} onPrev={handlePrev} />
    </main>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  )
}
