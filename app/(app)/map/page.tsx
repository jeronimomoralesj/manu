'use client'
import { useState, useEffect } from 'react'
import { MapPin, Calendar, Music, X, Plus } from 'lucide-react'
import { MapLocation } from '@/types'
import { getEmbedUrl } from '@/lib/spotify'

// Equirectangular projection: lat/lng → %
function toPercent(lat: number, lng: number) {
  const x = ((lng + 180) / 360) * 100
  const y = ((90 - lat) / 180) * 100
  return { x, y }
}

export default function MapPage() {
  const [locations, setLocations] = useState<MapLocation[]>([])
  const [active, setActive] = useState<MapLocation | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ city_name: '', latitude: '', longitude: '', visit_date: '', trip_title: '', trip_story: '', trip_song_spotify_uri: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await fetch('/api/map').then(r => r.json())
    setLocations(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  async function handleSeed() {
    setSeeding(true)
    await fetch('/api/map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'seed' }) })
    setSeeding(false)
    load()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    setShowAdd(false)
    setForm({ city_name: '', latitude: '', longitude: '', visit_date: '', trip_title: '', trip_story: '', trip_song_spotify_uri: '' })
    load()
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-0" style={{ background: '#F4F5F7' }}>

      {/* Header */}
      <div className="px-4 md:px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#FF5722]" /> Nuestro Mapa
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Lugares que hemos explorado juntos</p>
        </div>
        <div className="flex gap-2">
          {locations.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: '#374151' }}>
              {seeding ? '...' : 'Seed lugares'}
            </button>
          )}
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: '#FF5722' }}>
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
      </div>

      {/* The Map */}
      <div className="mx-4 md:mx-8 mb-5">
        <div
          className="relative w-full rounded-3xl overflow-hidden"
          style={{
            paddingBottom: '52%',
            background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {/* Grid lines */}
          {[20, 40, 60, 80].map(p => (
            <div key={p} className="absolute inset-x-0 border-t border-white/5" style={{ top: `${p}%` }} />
          ))}
          {[20, 40, 60, 80].map(p => (
            <div key={p} className="absolute inset-y-0 border-l border-white/5" style={{ left: `${p}%` }} />
          ))}

          {/* Pins */}
          {locations.map(loc => {
            const { x, y } = toPercent(loc.latitude, loc.longitude)
            const isActive = active?.id === loc.id
            return (
              <button
                key={loc.id}
                onClick={() => setActive(isActive ? null : loc)}
                className="absolute transform -translate-x-1/2 -translate-y-full transition-transform hover:scale-110"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className={`flex flex-col items-center gap-0.5 transition-all ${isActive ? 'scale-125' : ''}`}>
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
                    style={{ background: isActive ? '#FF5722' : '#FF8A65' }}
                  />
                  <span
                    className="text-white text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-full"
                    style={{ background: isActive ? '#FF5722' : 'rgba(0,0,0,0.6)' }}
                  >
                    {loc.city_name}
                  </span>
                </div>
              </button>
            )
          })}

          {/* Empty state */}
          {locations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/30 text-sm">No hay lugares aún</p>
            </div>
          )}
        </div>
      </div>

      {/* Location detail card */}
      {active && (
        <div className="mx-4 md:mx-8 mb-5">
          <div
            className="rounded-3xl p-5 relative"
            style={{ background: '#fff', boxShadow: '4px 4px 20px rgba(0,0,0,0.08)' }}
          >
            <button
              onClick={() => setActive(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#FF572215' }}>
                <MapPin className="w-5 h-5 text-[#FF5722]" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-lg leading-tight">{active.trip_title}</h3>
                <p className="text-sm text-[#FF5722] font-semibold">{active.city_name}</p>
              </div>
            </div>
            {active.visit_date && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(active.visit_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
            {active.trip_story && (
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{active.trip_story}</p>
            )}
            {active.trip_song_spotify_uri && (
              <div className="rounded-2xl overflow-hidden">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                  <Music className="w-3.5 h-3.5" /> La canción de este viaje
                </div>
                <iframe
                  src={getEmbedUrl(active.trip_song_spotify_uri) ?? ''}
                  width="100%" height="80"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  style={{ border: 'none', display: 'block', borderRadius: '12px' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location list */}
      <div className="px-4 md:px-8 space-y-3">
        {locations.map((loc, i) => (
          <button
            key={loc.id}
            onClick={() => setActive(loc)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors hover:bg-white"
            style={active?.id === loc.id ? { background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06)' } : {}}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
              style={{ background: `hsl(${i * 47}, 70%, 60%)` }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{loc.trip_title}</p>
              <p className="text-xs text-gray-400 truncate">{loc.city_name} · {loc.visit_date}</p>
            </div>
            <MapPin className="w-4 h-4 text-[#FF5722] flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 space-y-4"
            style={{ background: '#fff' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-gray-800">Agregar Lugar</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              {[
                { key: 'city_name', label: 'Ciudad', placeholder: 'Bogotá', required: true },
                { key: 'latitude', label: 'Latitud', placeholder: '4.711', required: true },
                { key: 'longitude', label: 'Longitud', placeholder: '-74.0721', required: true },
                { key: 'visit_date', label: 'Fecha', placeholder: '2024-06-20', required: true },
                { key: 'trip_title', label: 'Título del viaje', placeholder: 'Nuestro primer mar...', required: true },
                { key: 'trip_story', label: 'Historia (opcional)', placeholder: 'Lo que vivimos allí...', required: false },
                { key: 'trip_song_spotify_uri', label: 'Canción del viaje (URL Spotify, opcional)', placeholder: 'https://open.spotify.com/track/...', required: false },
              ].map(({ key, label, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                  <input
                    required={required}
                    value={(form as Record<string, string>)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722]"
                  />
                </div>
              ))}
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                style={{ background: '#FF5722' }}>
                {saving ? 'Guardando...' : 'Guardar lugar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
