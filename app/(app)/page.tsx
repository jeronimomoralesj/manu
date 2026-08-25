'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const [activeSong, setActiveSong] = useState<Song | null>(null)
  const [songIndex, setSongIndex] = useState(0)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 animate-spin mx-auto mb-3"
            style={{ borderColor: '#e5e7eb', borderTopColor: '#FF5722' }} />
          <p className="text-gray-400 text-sm">Sintonizando tu frecuencia...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Dashboard
        allSongs={data.allSongs}
        suggestedMood={data.mood}
        message={data.message}
        notePrefix={data.notePrefix}
        photoUrl={null}
        activeSong={activeSong}
        onPlay={handlePlay}
      />
      <AudioPlayerBar song={activeSong} onNext={handleNext} onPrev={handlePrev} />
    </>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  )
}
