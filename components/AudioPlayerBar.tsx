'use client'
import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { Song } from '@/types'

interface Props {
  song: Song | null
  onNext?: () => void
  onPrev?: () => void
}

export default function AudioPlayerBar({ song, onNext, onPrev }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(30)

  useEffect(() => {
    if (!song) return
    setIsPlaying(true)
    setProgress(0)
  }, [song])

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.3))
    }, 200)
    return () => clearInterval(interval)
  }, [isPlaying])

  if (!song) return null

  return (
    <div
      className="fixed bottom-6 right-6 w-80 rounded-2xl overflow-hidden shadow-2xl z-50"
      style={{
        background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
          {song.cover_url ? (
            <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-400 to-orange-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{song.title}</p>
          <p className="text-xs text-gray-400 truncate">{song.artist}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onPrev}>
            <SkipBack className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ background: '#FF5722' }}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
          </button>
          <button onClick={onNext}>
            <SkipForward className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="px-3 pb-3">
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: '#FF5722' }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-500">
            {Math.floor((progress / 100) * 3)}:{String(Math.floor(((progress / 100) * 180) % 60)).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-gray-500">3:29</span>
        </div>
      </div>
    </div>
  )
}
