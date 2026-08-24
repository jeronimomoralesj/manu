'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { Song } from '@/types'

interface Props {
  song: Song | null
  onNext?: () => void
  onPrev?: () => void
}

const SONG_DURATION = 209 // 3:29 in seconds

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function AudioPlayerBar({ song, onNext, onPrev }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0) // timestamp when play started
  const offsetRef = useRef<number>(0)    // seconds already elapsed before pause

  const clearTick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const startTick = useCallback(() => {
    clearTick()
    startedAtRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      const totalElapsed = offsetRef.current + (Date.now() - startedAtRef.current) / 1000
      if (totalElapsed >= SONG_DURATION) {
        setElapsed(SONG_DURATION)
        clearTick()
        setIsPlaying(false)
        onNext?.()
      } else {
        setElapsed(totalElapsed)
      }
    }, 250)
  }, [onNext])

  // New song → reset and auto-play
  useEffect(() => {
    if (!song) return
    clearTick()
    offsetRef.current = 0
    setElapsed(0)
    setIsPlaying(true)
  }, [song?.id])

  // React to play/pause toggle
  useEffect(() => {
    if (isPlaying) {
      startTick()
    } else {
      // Save how far we got before pausing
      if (intervalRef.current) {
        offsetRef.current += (Date.now() - startedAtRef.current) / 1000
      }
      clearTick()
    }
    return clearTick
  }, [isPlaying, startTick])

  if (!song) return null

  const progress = Math.min(100, (elapsed / SONG_DURATION) * 100)

  return (
    <div
      className="fixed bottom-4 right-4 left-4 md:left-auto md:w-80 rounded-2xl overflow-hidden z-50"
      style={{
        background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
      }}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
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
            onClick={() => setIsPlaying(p => !p)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ background: '#FF5722' }}
          >
            {isPlaying
              ? <Pause className="w-3.5 h-3.5 fill-white" />
              : <Play className="w-3.5 h-3.5 fill-white" />}
          </button>
          <button onClick={onNext}>
            <SkipForward className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-3 pb-3">
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: '#FF5722' }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-500">{formatTime(elapsed)}</span>
          <span className="text-[10px] text-gray-500">{formatTime(SONG_DURATION)}</span>
        </div>
      </div>
    </div>
  )
}
