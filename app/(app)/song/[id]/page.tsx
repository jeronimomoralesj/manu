'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Play, Heart, Music } from 'lucide-react'
import { Song } from '@/types'

const MOOD_ES: Record<string, string> = {
  cozy_comfort: 'Momento Acogedor',
  playful_connection: 'Conexión Juguetona',
  missing_you: 'Te Extraño',
  wind_down: 'Para Descansar',
}

export default function SongPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/songs/${id}`)
      .then((r) => r.json())
      .then((data) => { setSong(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5F7' }}>
        <div className="w-10 h-10 rounded-full border-4 border-t-[#FF5722] animate-spin"
          style={{ borderColor: '#e5e7eb', borderTopColor: '#FF5722' }} />
      </div>
    )
  }

  if (!song) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5F7' }}>
        <p className="text-gray-400">Canción no encontrada.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F4F5F7', fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-lg mx-auto px-5 py-8">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-[#FF5722] transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        {/* Cover + info */}
        <div
          className="rounded-3xl overflow-hidden mb-5"
          style={{ background: '#fff', boxShadow: '4px 4px 20px rgba(0,0,0,0.08)' }}
        >
          {/* Album art */}
          <div className="relative w-full aspect-square">
            {song.cover_url ? (
              <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-rose-200 to-purple-300 flex items-center justify-center">
                <Music className="w-20 h-20 text-white/60" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-bold text-2xl leading-tight">{song.title}</p>
              <p className="text-white/80 text-sm mt-1">{song.artist}</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Mood badge */}
            {song.mood_mode && (
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ background: '#FF5722' }}
              >
                {MOOD_ES[song.mood_mode] ?? song.mood_mode}
              </span>
            )}

            {/* Play button */}
            <button
              className="w-full py-3 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
              style={{ background: '#FF5722' }}
              onClick={() => router.push(`/?play=${id}`)}
            >
              <Play className="w-5 h-5 fill-white" /> Reproducir
            </button>
          </div>
        </div>

        {/* Mensaje personal */}
        {song.personal_note && (
          <div
            className="rounded-3xl p-5 mb-5"
            style={{ background: '#fff', boxShadow: '4px 4px 20px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-[#FF5722] fill-[#FF5722]" />
              <p className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">Mi mensaje para ti</p>
            </div>
            <p className="text-gray-700 leading-relaxed italic">"{song.personal_note}"</p>
          </div>
        )}

        {/* Foto del recuerdo */}
        {song.photo_base64 && (
          <div
            className="rounded-3xl overflow-hidden"
            style={{ background: '#fff', boxShadow: '4px 4px 20px rgba(0,0,0,0.06)' }}
          >
            <div className="p-4 pb-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Esta foto me recuerda de ti</p>
            </div>
            <img
              src={`data:image/jpeg;base64,${song.photo_base64}`}
              alt="Recuerdo"
              className="w-full object-cover"
              style={{ maxHeight: '340px' }}
            />
            <div className="p-4 pt-3">
              <div className="flex items-center gap-1">
                {[1,2,3].map(i => <Heart key={i} className="w-3 h-3 text-[#FF5722] fill-[#FF5722]" />)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
