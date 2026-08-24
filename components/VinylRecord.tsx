'use client'
import { useState } from 'react'
import { Song } from '@/types'
import { Play } from 'lucide-react'

interface Props {
  song: Song
  isActive?: boolean
  onPlay?: (song: Song) => void
}

export default function VinylRecord({ song, isActive, onPlay }: Props) {
  const [hovered, setHovered] = useState(false)
  const spinning = isActive || hovered

  return (
    <div
      className="flex flex-col items-center gap-3 cursor-pointer group w-36 flex-shrink-0"
      onClick={() => onPlay?.(song)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative w-32 h-32">
        {/* Vinyl disk */}
        <div
          className={`w-32 h-32 rounded-full border-4 border-gray-900 shadow-xl overflow-hidden transition-transform duration-500 ${spinning ? 'animate-spin-slow' : ''}`}
          style={{ animationDuration: '4s' }}
        >
          {song.cover_url ? (
            <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-gray-600" />
            </div>
          )}
          {/* Center hole */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-6 h-6 rounded-full bg-white/90 shadow-inner" />
          </div>
        </div>
        {/* Play overlay */}
        <div className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <Play className="w-8 h-8 text-white fill-white" />
        </div>
        {isActive && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FF5722] rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800 truncate w-32">{song.title}</p>
        <p className="text-xs text-gray-500 truncate w-32">{song.artist}</p>
      </div>
    </div>
  )
}
