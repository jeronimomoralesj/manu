'use client'
import { Play, Pause } from 'lucide-react'
import { Song } from '@/types'

interface Props {
  song: Song
  isPlaying?: boolean
  onPlay: (song: Song) => void
}

export default function PlaylistItem({ song, isPlaying, onPlay }: Props) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
      onClick={() => onPlay(song)}
    >
      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
        {song.cover_url ? (
          <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{song.title}</p>
        <p className="text-xs text-gray-400 truncate">{song.artist}</p>
      </div>
      <button
        className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: '#FF5722' }}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
      </button>
    </div>
  )
}
