'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Music, Heart, Zap, Wind, Smile } from 'lucide-react'
import { Song } from '@/types'
import { getEmbedUrl } from '@/lib/spotify'

const ACCENT = '#FF5722'

const MOOD_LABEL: Record<string, string> = {
  cozy_comfort:       'Momento Acogedor',
  playful_connection: 'Conexión Juguetona',
  missing_you:        'Te Extraño',
  wind_down:          'Para Descansar',
}

const MOOD_HUE: Record<string, string> = {
  cozy_comfort:       '#FF9800',
  playful_connection: '#FF5722',
  missing_you:        '#7C3AED',
  wind_down:          '#0EA5E9',
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Zap; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div
        className="rounded-xl flex items-center justify-center"
        style={{ width: 36, height: 36, background: `${color}18` }}
      >
        <Icon style={{ width: 16, height: 16, color }} />
      </div>
      <div className="w-full flex flex-col items-center gap-1">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 3, background: 'rgba(255,255,255,0.15)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.round(value * 100)}%`, background: color }}
          />
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
    </div>
  )
}

export default function SongPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [song, setSong]       = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/songs/${id}`)
      .then(r => r.json())
      .then(d => { setSong(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div
          className="rounded-full animate-spin"
          style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: ACCENT }}
        />
      </div>
    )
  }

  if (!song) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>Canción no encontrada.</p>
      </div>
    )
  }

  const embedUrl   = getEmbedUrl(song.spotify_uri)
  const moodColor  = song.mood_mode ? (MOOD_HUE[song.mood_mode] ?? ACCENT) : ACCENT
  const hasCover   = Boolean(song.cover_url)

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: '#0a0a0a' }}>

      {/* ── Ambient background ── */}
      {hasCover && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${song.cover_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(60px) saturate(1.4)',
              transform: 'scale(1.15)',
              opacity: 0.35,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 60%, #0a0a0a 100%)' }}
          />
        </>
      )}

      <div className="relative z-10 max-w-sm mx-auto px-5 pt-12 pb-16">

        {/* ── Back button ── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-10"
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
            fontWeight: 500,
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: '6px 14px 6px 10px',
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Volver
        </button>

        {/* ── Album art ── */}
        <div className="flex justify-center mb-8">
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              width: 240,
              height: 240,
              boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)`,
            }}
          >
            {hasCover ? (
              <img src={song.cover_url!} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <Music style={{ width: 56, height: 56, color: 'rgba(255,255,255,0.2)' }} />
              </div>
            )}
          </div>
        </div>

        {/* ── Title + mood ── */}
        <div className="text-center mb-6">
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.6px',
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            {song.title}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{song.artist}</p>

          {song.mood_mode && (
            <span
              className="inline-block mt-4 px-3.5 py-1.5 rounded-full"
              style={{ background: `${moodColor}22`, color: moodColor, fontSize: 12, fontWeight: 600, border: `1px solid ${moodColor}44` }}
            >
              {MOOD_LABEL[song.mood_mode] ?? song.mood_mode}
            </span>
          )}
        </div>

        {/* ── Metrics ── */}
        <div
          className="flex items-start gap-4 rounded-2xl px-5 py-4 mb-5"
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Metric icon={Smile} label="Alegría"   value={song.valence}      color="#34C759" />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
          <Metric icon={Zap}   label="Energía"   value={song.energy}       color={ACCENT}  />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
          <Metric icon={Wind}  label="Acústica"  value={song.acousticness} color="#0EA5E9" />
        </div>

        {/* ── Spotify embed ── */}
        {embedUrl && (
          <div className="mb-5 rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
            <iframe
              src={`${embedUrl}?theme=0`}
              width="100%"
              height="80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        )}

        {/* ── Personal note ── */}
        {song.personal_note && (
          <div
            className="rounded-2xl px-5 py-4 mb-5"
            style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart style={{ width: 14, height: 14, color: ACCENT, fill: ACCENT }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Para ti
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, fontStyle: 'italic' }}>
              &ldquo;{song.personal_note}&rdquo;
            </p>
          </div>
        )}

        {/* ── Memory photo ── */}
        {song.photo_base64 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="px-4 pt-4 pb-2">
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Un recuerdo
              </span>
            </div>
            <img
              src={`data:image/jpeg;base64,${song.photo_base64}`}
              alt="Recuerdo"
              className="w-full object-cover"
              style={{ maxHeight: 320 }}
            />
            <div
              className="px-4 py-3 flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              {[0, 1, 2].map(i => (
                <Heart key={i} style={{ width: 10, height: 10, color: ACCENT, fill: ACCENT, opacity: 1 - i * 0.25 }} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
