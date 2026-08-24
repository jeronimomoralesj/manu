'use client'
import { useState, useEffect, useCallback } from 'react'
import RadioPlayer from '@/components/RadioPlayer'
import Dashboard from '@/components/Dashboard'
import AudioPlayerBar from '@/components/AudioPlayerBar'
import { RecommendationResult, Song } from '@/types'

const FALLBACK: RecommendationResult = {
  songs: [],
  mood: 'cozy_comfort',
  frequency: 89.2,
  message: 'Loading your personalized station...',
  notePrefix: 'Just for you —',
}

export default function Home() {
  const [data, setData] = useState<RecommendationResult>(FALLBACK)
  const [vibeScore, setVibeScore] = useState(3)
  const [activeSong, setActiveSong] = useState<Song | null>(null)
  const [songIndex, setSongIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchRecommendations = useCallback(async (vibe?: number) => {
    const url = vibe ? `/api/recommendations?vibe=${vibe}` : '/api/recommendations'
    const res = await fetch(url)
    if (!res.ok) return
    const json: RecommendationResult = await res.json()
    setData(json)
    if (json.songs.length > 0 && !activeSong) {
      setActiveSong(json.songs[0])
    }
    setLoading(false)
  }, [activeSong])

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const handleVibeChange = (v: number) => {
    setVibeScore(v)
    fetchRecommendations(v)
  }

  const handlePlay = (song: Song) => {
    setActiveSong(song)
    const idx = data.songs.findIndex((s) => s.id === song.id)
    if (idx !== -1) setSongIndex(idx)
  }

  const handleNext = () => {
    if (!data.songs.length) return
    const next = (songIndex + 1) % data.songs.length
    setSongIndex(next)
    setActiveSong(data.songs[next])
  }

  const handlePrev = () => {
    if (!data.songs.length) return
    const prev = (songIndex - 1 + data.songs.length) % data.songs.length
    setSongIndex(prev)
    setActiveSong(data.songs[prev])
  }

  return (
    <main className="flex h-screen overflow-hidden" style={{ background: '#F4F5F7', fontFamily: "'Inter', sans-serif" }}>
      {/* Left sidebar nav */}
      <div
        className="w-16 h-full flex-shrink-0 flex flex-col items-center py-6 gap-5"
        style={{
          background: '#fff',
          boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
          style={{ background: '#FF5722' }}
        >
          ♪
        </div>
        {['🏠', '🎵', '🎼', '❤️', '📊', '⚙️'].map((icon, i) => (
          <button
            key={i}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg hover:bg-gray-100 transition-colors"
          >
            {icon}
          </button>
        ))}
        <div className="mt-auto">
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-lg hover:bg-gray-100 transition-colors">
            ☆
          </button>
        </div>
      </div>

      {/* Radio player */}
      <div className="w-80 flex-shrink-0 p-4 h-full">
        <RadioPlayer
          frequency={data.frequency}
          mood={data.mood}
          nowPlaying={activeSong?.title ?? '...'}
          vibeScore={vibeScore}
          onVibeChange={handleVibeChange}
        />
      </div>

      {/* Main dashboard */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full border-4 border-t-[#FF5722] animate-spin mx-auto mb-4"
              style={{ borderColor: '#e5e7eb', borderTopColor: '#FF5722' }}
            />
            <p className="text-gray-500 text-sm">Tuning your frequency...</p>
          </div>
        </div>
      ) : (
        <Dashboard
          songs={data.songs}
          mood={data.mood}
          message={data.message}
          notePrefix={data.notePrefix}
          photoUrl={null}
          activeSong={activeSong}
          onPlay={handlePlay}
        />
      )}

      {/* Fixed audio player */}
      <AudioPlayerBar
        song={activeSong}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </main>
  )
}
