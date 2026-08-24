'use client'
import { Play, Heart } from 'lucide-react'
import { Song } from '@/types'

interface Props {
  song: Song
  rating?: number
  onPlay: (song: Song) => void
}

export default function AlbumCard({ song, rating = 4.9, onPlay }: Props) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
        {song.cover_url ? (
          <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rose-300 to-purple-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{song.title}</p>
        <p className="text-xs text-gray-400 truncate">{song.artist}</p>
        <button
          onClick={() => onPlay(song)}
          className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-white px-2 py-0.5 rounded-full"
          style={{ background: '#FF5722' }}
        >
          <Play className="w-2.5 h-2.5 fill-white" />
          Play
        </button>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <span className="text-yellow-400 text-xs">★</span>
          <span className="text-xs font-semibold text-gray-600">{rating}</span>
        </div>
        <Heart className="w-4 h-4 text-gray-300 cursor-pointer hover:text-[#FF5722] hover:fill-[#FF5722] transition-colors" />
      </div>
    </div>
  )
}
