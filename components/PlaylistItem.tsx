'use client'
import { Play, Pause, ChevronRight } from 'lucide-react'
import { Song } from '@/types'

interface Props {
  song: Song
  isPlaying?: boolean
  onPlay: (song: Song) => void
  onDetail?: () => void
}

export default function PlaylistItem({ song, isPlaying, onPlay, onDetail }: Props) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group">
      {/* Cover */}
      <button onClick={() => onPlay(song)} className="flex-shrink-0">
        <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md">
          {song.cover_url ? (
            <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
          )}
        </div>
      </button>

      {/* Info + note */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{song.title}</p>
        <p className="text-xs text-gray-400 truncate">{song.artist}</p>
        {song.personal_note && (
          <p className="text-xs text-[#FF5722] truncate mt-0.5 italic">"{song.personal_note}"</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onPlay(song)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: '#FF5722' }}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
        </button>
        {onDetail && (
          <button
            onClick={onDetail}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-[#FF5722] opacity-0 group-hover:opacity-100 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
