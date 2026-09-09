'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Calendar, Music, X } from 'lucide-react'
import { MapLocation } from '@/types'
import { getEmbedUrl } from '@/lib/spotify'

const ACCENT = '#FF5722'

const GLASS = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(28px) saturate(1.8)',
  border: '1px solid rgba(255,255,255,0.14)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.22)',
} as const

const GLASS_DARK = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(28px) saturate(1.5)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
} as const

const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full rounded-3xl flex items-center justify-center"
      style={GLASS_DARK}
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className="rounded-full animate-spin"
          style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: ACCENT }}
        />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Cargando mapa…</span>
      </div>
    </div>
  ),
})

export default function MapPage() {
  const [locations, setLocations] = useState<MapLocation[]>([])
  const [active, setActive] = useState<MapLocation | null>(null)
  const visitedRef = useRef<Set<string>>(new Set())

  async function load() {
    const data = await fetch('/api/map').then(r => r.json())
    setLocations(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  function toggle(loc: MapLocation) {
    const isOpening = active?.id !== loc.id
    if (isOpening && !visitedRef.current.has(loc.id)) {
      visitedRef.current.add(loc.id)
      fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: 10 }),
      }).catch(() => {})
    }
    setActive(prev => prev?.id === loc.id ? null : loc)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0" style={{ background: '#0a0a0a' }}>

      {/* Ambient */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,87,34,0.1) 0%, transparent 70%)', zIndex: 0 }}
      />

      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <div className="px-4 md:px-8 pt-6 pb-4 flex-shrink-0">
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#ffffff' }} className="flex items-center gap-2.5">
            <div
              className="rounded-2xl flex items-center justify-center"
              style={{ width: 36, height: 36, background: `${ACCENT}20`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
            >
              <MapPin style={{ width: 18, height: 18, color: ACCENT }} />
            </div>
            Nuestro Mapa
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Lugares que hemos explorado juntos</p>
        </div>

        {/* Map */}
        <div className="mx-4 md:mx-8 mb-4 flex-shrink-0" style={{ height: 320 }}>
          <MapClient locations={locations} active={active} onSelect={toggle} />
        </div>

        {/* Scrollable bottom */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 space-y-3 pb-4">

          {/* Detail card */}
          {active && (
            <div className="rounded-3xl overflow-hidden relative" style={GLASS}>
              {/* Specular */}
              <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 45%)' }} />

              {active.photo_urls?.[0] ? (
                <div className="relative w-full" style={{ height: 200 }}>
                  <img src={active.photo_urls[0]} alt={active.trip_title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)' }} />
                  <button
                    onClick={() => setActive(null)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <X style={{ width: 15, height: 15, color: '#fff' }} />
                  </button>
                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 style={{ fontWeight: 800, color: '#fff', fontSize: 18, lineHeight: 1.2 }}>{active.trip_title}</h3>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{active.city_name}</p>
                  </div>
                </div>
              ) : (
                <div
                  className="relative w-full flex items-end p-4"
                  style={{ height: 90, background: 'linear-gradient(135deg, #FF8A65, #FF5722)' }}
                >
                  <div className="absolute inset-0 rounded-tl-3xl rounded-tr-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)' }} />
                  <button
                    onClick={() => setActive(null)}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
                  >
                    <X style={{ width: 13, height: 13, color: '#fff' }} />
                  </button>
                  <div className="relative">
                    <h3 style={{ fontWeight: 800, color: '#fff', fontSize: 18, lineHeight: 1.2 }}>{active.trip_title}</h3>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{active.city_name}</p>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3 relative">
                {active.visit_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.35)' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(active.visit_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {active.trip_story && (
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{active.trip_story}</p>
                )}
                {active.trip_song_spotify_uri && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Music style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.35)' }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>La canción de este viaje</span>
                    </div>
                    <iframe
                      src={getEmbedUrl(active.trip_song_spotify_uri) ?? ''}
                      width="100%" height="80"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      style={{ border: 'none', display: 'block', borderRadius: 12 }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location list */}
          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="rounded-3xl flex items-center justify-center"
                style={{ width: 60, height: 60, ...GLASS_DARK }}
              >
                <MapPin style={{ width: 26, height: 26, color: 'rgba(255,255,255,0.2)' }} />
              </div>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Sin lugares todavía</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>Añade lugares desde Admin</p>
            </div>
          ) : (
            locations.map((loc, i) => {
              const isActive = active?.id === loc.id
              return (
                <button
                  key={loc.id}
                  onClick={() => toggle(loc)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-3xl text-left transition-all active:scale-[0.98] relative"
                  style={isActive
                    ? { ...GLASS, border: `1px solid ${ACCENT}50`, boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${ACCENT}18, inset 0 1px 0 rgba(255,255,255,0.22)` }
                    : GLASS_DARK
                  }
                >
                  {/* Specular */}
                  <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 45%)' }} />

                  <div className="w-13 h-13 rounded-2xl overflow-hidden flex-shrink-0" style={{ width: 52, height: 52 }}>
                    {loc.photo_urls?.[0] ? (
                      <img src={loc.photo_urls[0]} alt={loc.trip_title} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white font-black"
                        style={{ background: `hsl(${i * 47}, 55%, 30%)`, fontSize: 16, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
                      >
                        {i + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }} className="truncate">{loc.trip_title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }} className="truncate">{loc.city_name}</p>
                    {loc.visit_date && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }} className="truncate">
                        {new Date(loc.visit_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex-shrink-0 rounded-xl flex items-center justify-center relative"
                    style={{ width: 32, height: 32, background: isActive ? `${ACCENT}25` : 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
                  >
                    <MapPin style={{ width: 15, height: 15, color: isActive ? ACCENT : 'rgba(255,255,255,0.25)' }} />
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
