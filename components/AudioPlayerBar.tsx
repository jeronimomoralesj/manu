'use client'
import { SkipBack, SkipForward } from 'lucide-react'
import { Song } from '@/types'
import { getEmbedUrl } from '@/lib/spotify'

interface Props {
  song: Song | null
  onNext?: () => void
  onPrev?: () => void
}

export default function AudioPlayerBar({ song, onNext, onPrev }: Props) {
  if (!song) return null

  const embedUrl = getEmbedUrl(song.spotify_uri)
  if (!embedUrl) return null

  return (
    <div
      className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.45)' }}
    >
      {/* Prev / Next strip */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ background: '#111827' }}
      >
        <p className="text-xs text-gray-400 truncate flex-1 mr-3">{song.title} — {song.artist}</p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={onPrev}>
            <SkipBack className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </button>
          <button onClick={onNext}>
            <SkipForward className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>
      </div>
      {/* Spotify embed — key forces remount on song change so playback resets */}
      <iframe
        key={song.id}
        src={embedUrl}
        width="100%"
        height="80"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ border: 'none', display: 'block' }}
      />
    </div>
  )
}
