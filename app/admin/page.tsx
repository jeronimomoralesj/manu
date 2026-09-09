'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Plus, Database, Image as ImageIcon, Pencil, X, Check, MapPin, Archive, Music, HelpCircle, Star, RotateCcw, Gift, Mail } from 'lucide-react'
import { Song, MoodMode, MapLocation, MemoryVault, TriviaQuestion, Carta } from '@/types'
import { extractTrackId } from '@/lib/spotify'

// ─── Shared helpers ───────────────────────────────────────────────────────────

const ACCENT = '#FF5722'

function field(label: string, children: React.ReactNode) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors"
    />
  )
}

function Flash({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="px-4 py-3 rounded-xl text-sm font-medium bg-green-50 text-green-700 border border-green-200">
      {msg}
    </div>
  )
}

// ─── SONGS ────────────────────────────────────────────────────────────────────

const MOOD_OPTIONS: MoodMode[] = ['cozy_comfort', 'playful_connection', 'missing_you', 'wind_down']
const MOOD_LABELS: Record<MoodMode, string> = {
  cozy_comfort: '☕ Acogedor',
  playful_connection: '✨ Especial',
  missing_you: '💙 Te Extraño',
  wind_down: '🌙 Descansar',
}

const EMPTY_SONG = {
  title: '', artist: '', spotify_uri: '', cover_url: '',
  mood_mode: 'cozy_comfort' as MoodMode,
  valence: '0.5', energy: '0.5', acousticness: '0.5',
  personal_note: '', photo_base64: '',
}
type SongForm = typeof EMPTY_SONG

function SongsTab() {
  const [songs, setSongs] = useState<Song[]>([])
  const [form, setForm] = useState<SongForm>(EMPTY_SONG)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [fetchingCover, setFetchingCover] = useState(false)
  const [fetchingAll, setFetchingAll] = useState(false)
  const [msg, setMsg] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const uriDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    const res = await fetch('/api/songs')
    const data = await res.json()
    setSongs(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(''), 3500) }

  const fetchCover = useCallback(async (uri: string) => {
    if (!extractTrackId(uri)) return
    setFetchingCover(true)
    const res = await fetch(`/api/spotify-cover?uri=${encodeURIComponent(uri)}`)
    const data = await res.json()
    setFetchingCover(false)
    if (data.cover_url) setForm(f => ({ ...f, cover_url: data.cover_url }))
  }, [])

  async function fetchAllMissingCovers() {
    const missing = songs.filter(s => !s.cover_url && extractTrackId(s.spotify_uri))
    if (!missing.length) { flash('Todas las canciones ya tienen portada ✓'); return }
    setFetchingAll(true)
    let updated = 0
    for (const song of missing) {
      const res = await fetch(`/api/spotify-cover?uri=${encodeURIComponent(song.spotify_uri)}`)
      const data = await res.json()
      if (data.cover_url) {
        await fetch(`/api/songs/${song.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cover_url: data.cover_url }),
        })
        updated++
      }
    }
    setFetchingAll(false)
    flash(`${updated} de ${missing.length} portadas actualizadas ✓`)
    load()
  }

  function handleUri(val: string) {
    setForm(f => ({ ...f, spotify_uri: val }))
    if (uriDebounce.current) clearTimeout(uriDebounce.current)
    uriDebounce.current = setTimeout(() => fetchCover(val), 600)
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { const r = ev.target?.result as string; setForm(f => ({ ...f, photo_base64: r.split(',')[1] })) }
    reader.readAsDataURL(file)
  }

  function startEdit(song: Song) {
    setEditingId(song.id)
    setForm({ title: song.title, artist: song.artist, spotify_uri: song.spotify_uri, cover_url: song.cover_url ?? '', mood_mode: song.mood_mode ?? 'cozy_comfort', valence: String(song.valence), energy: String(song.energy), acousticness: String(song.acousticness), personal_note: song.personal_note ?? '', photo_base64: song.photo_base64 ?? '' })
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function cancelEdit() { setEditingId(null); setForm(EMPTY_SONG) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const payload = { ...form, valence: Number(form.valence), energy: Number(form.energy), acousticness: Number(form.acousticness), cover_url: form.cover_url || null, personal_note: form.personal_note || null, photo_base64: form.photo_base64 || null }
    const url = editingId ? `/api/songs/${editingId}` : '/api/songs'
    const res = await fetch(url, { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setLoading(false)
    if (res.ok) { setForm(EMPTY_SONG); setEditingId(null); flash(editingId ? 'Canción actualizada ✓' : 'Canción agregada ✓'); load() }
    else { const err = await res.json(); flash(`Error: ${err.error}`) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta canción?')) return
    await fetch(`/api/songs?id=${id}`, { method: 'DELETE' })
    if (editingId === id) cancelEdit()
    load()
  }

  async function handleSeed() {
    if (!confirm('Agregar 10 canciones de ejemplo. ¿Continuar?')) return
    setSeeding(true)
    const res = await fetch('/api/seed', { method: 'POST' })
    const data = await res.json()
    setSeeding(false)
    flash(res.ok ? `${data.seeded} canciones añadidas ✓` : `Error: ${data.error}`)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-400">{songs.length} canciones en la biblioteca</p>
        <div className="flex gap-2">
          <button onClick={fetchAllMissingCovers} disabled={fetchingAll || songs.length === 0} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#1DB954' }}>
            <ImageIcon className="w-4 h-4" /> {fetchingAll ? 'Buscando...' : 'Fetch portadas Spotify'}
          </button>
          <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#374151' }}>
            <Database className="w-4 h-4" /> {seeding ? 'Cargando...' : 'Seed 10 canciones'}
          </button>
        </div>
      </div>

      <Flash msg={msg} />

      {/* Form */}
      <div ref={formRef} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
          {editingId ? <><Pencil className="w-4 h-4 text-[#FF5722]" /> Editando canción</> : <><Plus className="w-4 h-4 text-[#FF5722]" /> Agregar Canción</>}
          {editingId && <button onClick={cancelEdit} className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancelar</button>}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{ key: 'title', label: 'Título', placeholder: 'Fall in Love Alone', required: true }, { key: 'artist', label: 'Artista', placeholder: 'Stacey Ryan', required: true }].map(({ key, label, placeholder, required }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              {inp({ required, value: (form as Record<string, string>)[key], onChange: e => setForm(f => ({ ...f, [key]: e.target.value })), placeholder })}
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Link de Spotify <span className="font-normal text-gray-400">(URL o URI)</span></label>
            <div className="flex gap-2 items-center">
              {inp({ required: true, value: form.spotify_uri, onChange: e => handleUri(e.target.value), placeholder: 'https://open.spotify.com/track/...', className: 'flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors' })}
              {fetchingCover && <div className="w-5 h-5 border-2 border-t-green-500 border-gray-200 rounded-full animate-spin flex-shrink-0" />}
              {form.cover_url && !fetchingCover && <img src={form.cover_url} alt="cover" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow" />}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nota personal</label>
            <textarea value={form.personal_note} onChange={e => setForm(f => ({ ...f, personal_note: e.target.value }))} placeholder="Esta canción me recuerda de ti porque..." rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors resize-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Foto de recuerdo</label>
            <div className="flex gap-3 items-center">
              <button type="button" onClick={() => photoInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors">
                <ImageIcon className="w-4 h-4" /> {form.photo_base64 ? 'Cambiar foto' : 'Subir foto'}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              {form.photo_base64 && (
                <div className="relative">
                  <img src={`data:image/jpeg;base64,${form.photo_base64}`} alt="preview" className="w-14 h-14 rounded-xl object-cover shadow" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, photo_base64: '' }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">×</button>
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-2">Categoría</label>
            <div className="flex gap-2 flex-wrap">
              {MOOD_OPTIONS.map(m => (
                <button key={m} type="button" onClick={() => setForm(f => ({ ...f, mood_mode: m }))} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${form.mood_mode === m ? 'bg-[#FF5722] text-white border-[#FF5722]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF5722]'}`}>{MOOD_LABELS[m]}</button>
              ))}
            </div>
          </div>
          {[{ key: 'valence', label: 'Valencia (alegría)' }, { key: 'energy', label: 'Energía' }, { key: 'acousticness', label: 'Acústica' }].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label} — <span style={{ color: ACCENT }}>{(form as Record<string, string>)[key]}</span></label>
              <input type="range" min="0" max="1" step="0.05" value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full" style={{ accentColor: ACCENT }} />
            </div>
          ))}
          <div className="md:col-span-2 pt-1">
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: ACCENT }}>
              {loading ? 'Guardando...' : editingId ? <><Check className="w-4 h-4" /> Guardar Cambios</> : <><Plus className="w-4 h-4" /> Agregar Canción</>}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4">Biblioteca ({songs.length} canciones)</h2>
        {songs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin canciones — agrega una o usa Seed.</p>
        ) : (
          <div className="space-y-2">
            {songs.map(song => (
              <div key={song.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${editingId === song.id ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}>
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {song.cover_url && <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{song.title}</p>
                  <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                  {song.personal_note && <p className="text-xs truncate italic" style={{ color: ACCENT }}>"{song.personal_note}"</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {song.photo_base64 && <img src={`data:image/jpeg;base64,${song.photo_base64}`} alt="foto" className="w-7 h-7 rounded-lg object-cover" />}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hidden sm:block whitespace-nowrap">{song.mood_mode ? MOOD_LABELS[song.mood_mode as MoodMode] : '—'}</span>
                  <button onClick={() => startEdit(song)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(song.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MAP LOCATIONS ────────────────────────────────────────────────────────────

const EMPTY_LOC = { city_name: '', latitude: '', longitude: '', visit_date: '', trip_title: '', trip_story: '', trip_song_spotify_uri: '', photo_data_url: '' }
type LocForm = typeof EMPTY_LOC

function PlacesTab() {
  const [locations, setLocations] = useState<MapLocation[]>([])
  const [form, setForm] = useState<LocForm>(EMPTY_LOC)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const formRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const data = await fetch('/api/map').then(r => r.json())
    setLocations(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(''), 3500) }

  function startAdd() {
    setEditingId(null)
    setForm(EMPTY_LOC)
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function handleLocPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, photo_data_url: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  function startEdit(loc: MapLocation) {
    setEditingId(loc.id)
    setForm({ city_name: loc.city_name, latitude: String(loc.latitude), longitude: String(loc.longitude), visit_date: loc.visit_date, trip_title: loc.trip_title, trip_story: loc.trip_story ?? '', trip_song_spotify_uri: loc.trip_song_spotify_uri ?? '', photo_data_url: loc.photo_urls?.[0] ?? '' })
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function cancelForm() { setShowForm(false); setEditingId(null); setForm(EMPTY_LOC) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), photo_urls: form.photo_data_url ? [form.photo_data_url] : null }
    const url = editingId ? `/api/map/${editingId}` : '/api/map'
    const method = editingId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setLoading(false)
    if (res.ok) { cancelForm(); flash(editingId ? 'Lugar actualizado ✓' : 'Lugar añadido ✓'); load() }
    else { const err = await res.json(); flash(`Error: ${err.error}`) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este lugar?')) return
    await fetch(`/api/map?id=${id}`, { method: 'DELETE' })
    if (editingId === id) cancelForm()
    load(); flash('Lugar eliminado')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{locations.length} lugar{locations.length !== 1 ? 'es' : ''} en el mapa</p>
        <button onClick={startAdd} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: ACCENT }}>
          <Plus className="w-4 h-4" /> Añadir lugar
        </button>
      </div>

      <Flash msg={msg} />

      {/* Form */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            {editingId ? <><Pencil className="w-4 h-4 text-[#FF5722]" /> Editando lugar</> : <><Plus className="w-4 h-4 text-[#FF5722]" /> Nuevo lugar</>}
            <button onClick={cancelForm} className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancelar</button>
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {field('Ciudad *', inp({ required: true, value: form.city_name, onChange: e => setForm(f => ({ ...f, city_name: e.target.value })), placeholder: 'Bogotá' }))}
            </div>
            <div>
              {field('Fecha de visita *', inp({ required: true, type: 'date', value: form.visit_date, onChange: e => setForm(f => ({ ...f, visit_date: e.target.value })) }))}
            </div>
            <div>
              {field('Latitud *', inp({ required: true, type: 'number', step: '0.0001', value: form.latitude, onChange: e => setForm(f => ({ ...f, latitude: e.target.value })), placeholder: '4.711' }))}
            </div>
            <div>
              {field('Longitud *', inp({ required: true, type: 'number', step: '0.0001', value: form.longitude, onChange: e => setForm(f => ({ ...f, longitude: e.target.value })), placeholder: '-74.0721' }))}
            </div>
            <div className="md:col-span-2">
              {field('Título del viaje *', inp({ required: true, value: form.trip_title, onChange: e => setForm(f => ({ ...f, trip_title: e.target.value })), placeholder: 'Nuestro primer mar juntos 🌊' }))}
            </div>
            <div className="md:col-span-2">
              {field('Historia (opcional)', (
                <textarea value={form.trip_story} onChange={e => setForm(f => ({ ...f, trip_story: e.target.value }))} placeholder="Lo que vivimos allí..." rows={3} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors resize-none" />
              ))}
            </div>
            <div className="md:col-span-2">
              {field('Canción del viaje (URL Spotify, opcional)', inp({ value: form.trip_song_spotify_uri, onChange: e => setForm(f => ({ ...f, trip_song_spotify_uri: e.target.value })), placeholder: 'https://open.spotify.com/track/...' }))}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Foto del lugar (opcional)</label>
              <div className="flex gap-3 items-center">
                <button type="button" onClick={() => photoInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors">
                  <ImageIcon className="w-4 h-4" /> {form.photo_data_url ? 'Cambiar foto' : 'Subir foto'}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLocPhoto} />
                {form.photo_data_url && (
                  <div className="relative">
                    <img src={form.photo_data_url} alt="preview" className="w-14 h-14 rounded-xl object-cover shadow" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, photo_data_url: '' }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">×</button>
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: ACCENT }}>
                {loading ? 'Guardando...' : editingId ? <><Check className="w-4 h-4" /> Guardar cambios</> : <><Plus className="w-4 h-4" /> Añadir lugar</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4">Lugares ({locations.length})</h2>
        {locations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin lugares. Añade el primero.</p>
        ) : (
          <div className="space-y-2">
            {locations.map((loc, i) => (
              <div key={loc.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${editingId === loc.id ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}>
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {loc.photo_urls?.[0]
                    ? <img src={loc.photo_urls[0]} alt={loc.trip_title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white text-sm font-black" style={{ background: `hsl(${i * 47}, 70%, 60%)` }}>{i + 1}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{loc.trip_title}</p>
                  <p className="text-xs text-gray-400">{loc.city_name} · {loc.visit_date}</p>
                  <p className="text-xs text-gray-300 font-mono">{loc.latitude}, {loc.longitude}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => startEdit(loc)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(loc.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MEMORIES / VAULT ─────────────────────────────────────────────────────────

const EMPTY_MEM = { title: '', date_happened: '', required_points: '100', is_unlocked: false, description: '', spotify_uri: '', photo_data_url: '' }
type MemForm = typeof EMPTY_MEM

function MemoriesTab() {
  const [memories, setMemories] = useState<MemoryVault[]>([])
  const [form, setForm] = useState<MemForm>(EMPTY_MEM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const formRef = useRef<HTMLDivElement>(null)
  const memPhotoRef = useRef<HTMLInputElement>(null)

  async function load() {
    const data = await fetch('/api/vault').then(r => r.json())
    setMemories(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(''), 3500) }

  function startAdd() {
    setEditingId(null)
    setForm(EMPTY_MEM)
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function handleMemPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, photo_data_url: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  function startEdit(mem: MemoryVault) {
    setEditingId(mem.id)
    setForm({ title: mem.title, date_happened: mem.date_happened ?? '', required_points: String(mem.required_points), is_unlocked: mem.is_unlocked, description: mem.description, spotify_uri: mem.spotify_uri ?? '', photo_data_url: mem.photo_urls?.[0] ?? '' })
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function cancelForm() { setShowForm(false); setEditingId(null); setForm(EMPTY_MEM) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const payload = { ...form, required_points: Number(form.required_points), photo_urls: form.photo_data_url ? [form.photo_data_url] : null }
    const url = editingId ? `/api/vault/${editingId}` : '/api/vault'
    const method = editingId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setLoading(false)
    if (res.ok) { cancelForm(); flash(editingId ? 'Recuerdo actualizado ✓' : 'Recuerdo añadido ✓'); load() }
    else { const err = await res.json(); flash(`Error: ${err.error}`) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este recuerdo?')) return
    await fetch(`/api/vault?id=${id}`, { method: 'DELETE' })
    if (editingId === id) cancelForm()
    load(); flash('Recuerdo eliminado')
  }

  async function handleUnlock(id: string, current: boolean) {
    await fetch(`/api/vault/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...memories.find(m => m.id === id), is_unlocked: !current }) })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{memories.length} recuerdo{memories.length !== 1 ? 's' : ''} en el baúl</p>
        <button onClick={startAdd} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: ACCENT }}>
          <Plus className="w-4 h-4" /> Añadir recuerdo
        </button>
      </div>

      <Flash msg={msg} />

      {/* Form */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            {editingId ? <><Pencil className="w-4 h-4 text-[#FF5722]" /> Editando recuerdo</> : <><Plus className="w-4 h-4 text-[#FF5722]" /> Nuevo recuerdo</>}
            <button onClick={cancelForm} className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancelar</button>
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              {field('Título *', inp({ required: true, value: form.title, onChange: e => setForm(f => ({ ...f, title: e.target.value })), placeholder: 'Nuestra primera cita' }))}
            </div>
            <div>
              {field('Fecha (opcional)', inp({ type: 'date', value: form.date_happened, onChange: e => setForm(f => ({ ...f, date_happened: e.target.value })) }))}
            </div>
            <div>
              {field('Puntos requeridos para desbloquear', inp({ required: true, type: 'number', min: '0', value: form.required_points, onChange: e => setForm(f => ({ ...f, required_points: e.target.value })), placeholder: '100' }))}
            </div>
            <div className="md:col-span-2">
              {field('Descripción', (
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Lo que significa este momento para mí..." rows={3} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors resize-none" />
              ))}
            </div>
            <div className="md:col-span-2">
              {field('Canción de este recuerdo (URL Spotify, opcional)', inp({ value: form.spotify_uri, onChange: e => setForm(f => ({ ...f, spotify_uri: e.target.value })), placeholder: 'https://open.spotify.com/track/...' }))}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Foto del recuerdo (opcional)</label>
              <div className="flex gap-3 items-center">
                <button type="button" onClick={() => memPhotoRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors">
                  <ImageIcon className="w-4 h-4" /> {form.photo_data_url ? 'Cambiar foto' : 'Subir foto'}
                </button>
                <input ref={memPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleMemPhoto} />
                {form.photo_data_url && (
                  <div className="relative">
                    <img src={form.photo_data_url} alt="preview" className="w-14 h-14 rounded-xl object-cover shadow" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, photo_data_url: '' }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">×</button>
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_unlocked} onChange={e => setForm(f => ({ ...f, is_unlocked: e.target.checked }))} className="w-4 h-4 rounded accent-[#FF5722]" />
                <span className="text-sm font-semibold text-gray-700">Desbloqueado desde el inicio</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: ACCENT }}>
                {loading ? 'Guardando...' : editingId ? <><Check className="w-4 h-4" /> Guardar cambios</> : <><Plus className="w-4 h-4" /> Añadir recuerdo</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4">Baúl ({memories.length})</h2>
        {memories.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin recuerdos. Añade el primero.</p>
        ) : (
          <div className="space-y-2">
            {memories.map(mem => (
              <div key={mem.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${editingId === mem.id ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}>
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {mem.photo_urls?.[0]
                    ? <img src={mem.photo_urls[0]} alt={mem.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg" style={{ background: mem.is_unlocked ? '#FF572215' : '#f3f4f6' }}>{mem.is_unlocked ? '💝' : '🔒'}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{mem.title}</p>
                  <p className="text-xs text-gray-400">{mem.required_points} pts · {mem.date_happened || 'Sin fecha'}</p>
                  {mem.description && <p className="text-xs text-gray-400 truncate">{mem.description}</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0 items-center">
                  <button
                    onClick={() => handleUnlock(mem.id, mem.is_unlocked)}
                    className="text-[10px] px-2 py-1 rounded-lg font-semibold border"
                    style={mem.is_unlocked ? { background: '#dcfce7', color: '#16a34a', borderColor: '#86efac' } : { background: '#f3f4f6', color: '#9ca3af', borderColor: '#e5e7eb' }}
                  >
                    {mem.is_unlocked ? 'Bloq.' : 'Desbloq.'}
                  </button>
                  <button onClick={() => startEdit(mem)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(mem.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TRIVIA ───────────────────────────────────────────────────────────────────

const EMPTY_Q = { question: '', opt0: '', opt1: '', opt2: '', opt3: '', correct: '0', points_reward: '20' }
type QForm = typeof EMPTY_Q

function TriviaTab() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([])
  const [pts, setPts] = useState(0)
  const [form, setForm] = useState<QForm>(EMPTY_Q)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [addPts, setAddPts] = useState('')
  const [addingPts, setAddingPts] = useState(false)
  const [msg, setMsg] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  async function load() {
    const [triviaRes, gamiRes] = await Promise.all([
      fetch('/api/trivia').then(r => r.json()),
      fetch('/api/gamification').then(r => r.json()),
    ])
    setQuestions(triviaRes.questions ?? [])
    setPts(gamiRes?.total_points ?? 0)
  }
  useEffect(() => { load() }, [])

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(''), 3500) }

  function startAdd() {
    setEditingId(null); setForm(EMPTY_Q); setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function startEdit(q: TriviaQuestion) {
    setEditingId(q.id)
    setForm({
      question: q.question,
      opt0: q.options[0] ?? '', opt1: q.options[1] ?? '',
      opt2: q.options[2] ?? '', opt3: q.options[3] ?? '',
      correct: String(q.correct_option_index),
      points_reward: String(q.points_reward),
    })
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function cancelForm() { setShowForm(false); setEditingId(null); setForm(EMPTY_Q) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const payload = {
      question: form.question,
      options: [form.opt0, form.opt1, form.opt2, form.opt3],
      correct_option_index: Number(form.correct),
      points_reward: Number(form.points_reward),
    }
    let res: Response
    if (editingId) {
      res = await fetch('/api/trivia', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id: editingId }) })
    } else {
      res = await fetch('/api/trivia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setLoading(false)
    if (res.ok) { cancelForm(); flash(editingId ? 'Pregunta actualizada ✓' : 'Pregunta añadida ✓'); load() }
    else { const err = await res.json(); flash(`Error: ${err.error}`) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta pregunta?')) return
    await fetch(`/api/trivia?id=${id}`, { method: 'DELETE' })
    if (editingId === id) cancelForm()
    load(); flash('Pregunta eliminada')
  }

  async function handleReset(id: string) {
    await fetch('/api/trivia', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'reset', id }) })
    load(); flash('Pregunta restablecida')
  }

  async function handleAddPoints(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(addPts)
    if (!n) return
    setAddingPts(true)
    await fetch('/api/gamification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ points: n }) })
    setAddPts(''); setAddingPts(false); load()
    flash(`${n > 0 ? '+' : ''}${n} puntos aplicados ✓`)
  }

  const answered = questions.filter(q => q.is_answered).length

  return (
    <div className="space-y-6">
      <Flash msg={msg} />

      {/* Points widget */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-[#FF5722]" /> Puntos
        </h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 text-center py-4 rounded-2xl" style={{ background: '#FF572210' }}>
            <p className="text-3xl font-black" style={{ color: '#FF5722' }}>{pts}</p>
            <p className="text-xs text-gray-400 mt-0.5">puntos totales</p>
          </div>
          <div className="flex-1 text-center py-4 rounded-2xl bg-gray-50">
            <p className="text-3xl font-black text-gray-700">{answered}/{questions.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">preguntas respondidas</p>
          </div>
        </div>
        <form onSubmit={handleAddPoints} className="flex gap-2">
          <input
            type="number"
            value={addPts}
            onChange={e => setAddPts(e.target.value)}
            placeholder="Añadir o quitar puntos (ej: 50 o -20)"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors"
          />
          <button type="submit" disabled={addingPts || !addPts} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>
            {addingPts ? '...' : <Gift className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* Questions list header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{questions.length} pregunta{questions.length !== 1 ? 's' : ''} en la trivia</p>
        <button onClick={startAdd} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: ACCENT }}>
          <Plus className="w-4 h-4" /> Nueva pregunta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            {editingId ? <><Pencil className="w-4 h-4 text-[#FF5722]" /> Editando pregunta</> : <><Plus className="w-4 h-4 text-[#FF5722]" /> Nueva pregunta</>}
            <button onClick={cancelForm} className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancelar</button>
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Pregunta *</label>
              <textarea
                required value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="¿Cuál es la canción que nos recuerda a los dos?"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(['opt0', 'opt1', 'opt2', 'opt3'] as const).map((key, i) => (
                <div key={key} className="relative">
                  <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center ${form.correct === String(i) ? 'text-white' : 'bg-gray-100 text-gray-500'}`} style={form.correct === String(i) ? { background: ACCENT } : {}}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    Opción {String.fromCharCode(65 + i)} {form.correct === String(i) && <span className="text-green-600 font-semibold">(correcta)</span>}
                  </label>
                  <input
                    required value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-colors"
                    style={{ borderColor: form.correct === String(i) ? '#22c55e' : '#e5e7eb' }}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Respuesta correcta</label>
                <select
                  value={form.correct}
                  onChange={e => setForm(f => ({ ...f, correct: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] bg-white"
                >
                  {[0, 1, 2, 3].map(i => (
                    <option key={i} value={String(i)}>Opción {String.fromCharCode(65 + i)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Puntos al acertar</label>
                {inp({ required: true, type: 'number', min: '1', value: form.points_reward, onChange: e => setForm(f => ({ ...f, points_reward: e.target.value })), placeholder: '20' })}
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: ACCENT }}>
              {loading ? 'Guardando...' : editingId ? <><Check className="w-4 h-4" /> Guardar cambios</> : <><Plus className="w-4 h-4" /> Añadir pregunta</>}
            </button>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4">Preguntas ({questions.length})</h2>
        {questions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin preguntas. Añade la primera.</p>
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={q.id} className={`rounded-xl p-3 transition-colors ${editingId === q.id ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5" style={{ background: q.is_answered ? '#9ca3af' : ACCENT }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{q.question}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {q.options.map((opt, oi) => (
                        <span key={oi} className="text-xs px-2 py-0.5 rounded-lg font-medium" style={oi === q.correct_option_index ? { background: '#dcfce7', color: '#16a34a' } : { background: '#f3f4f6', color: '#6b7280' }}>
                          {String.fromCharCode(65 + oi)}: {opt}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-bold" style={{ color: ACCENT }}>+{q.points_reward} pts</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${q.is_answered ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600'}`}>
                        {q.is_answered ? 'Respondida' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {q.is_answered && (
                      <button onClick={() => handleReset(q.id)} title="Restablecer" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-yellow-50 hover:text-yellow-500">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => startEdit(q)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(q.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CARTAS ───────────────────────────────────────────────────────────────────

const EMPTY_CARTA = { title: '', body: '', sent_at: '', image_base64: '' }
type CartaForm = typeof EMPTY_CARTA

function CartasTab() {
  const [cartas, setCartas]   = useState<Carta[]>([])
  const [form, setForm]       = useState<CartaForm>(EMPTY_CARTA)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const imgRef                = useRef<HTMLInputElement>(null)
  const formRef               = useRef<HTMLDivElement>(null)

  async function load() {
    const res  = await fetch('/api/cartas')
    const data = await res.json()
    setCartas(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(''), 3500) }

  function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const r = ev.target?.result as string
      setForm(f => ({ ...f, image_base64: r.split(',')[1] }))
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const res = await fetch('/api/cartas', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        title:        form.title,
        body:         form.body         || null,
        image_base64: form.image_base64 || null,
        sent_at:      form.sent_at      || null,
      }),
    })
    setLoading(false)
    if (res.ok) { setForm(EMPTY_CARTA); setShowForm(false); flash('Carta enviada ✓'); load() }
    else { const err = await res.json(); flash(`Error: ${err.error}`) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta carta?')) return
    await fetch(`/api/cartas?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{cartas.length} cartas guardadas</p>
        <button
          onClick={() => { setShowForm(s => !s); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50) }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: ACCENT }}
        >
          <Plus className="w-4 h-4" /> Nueva carta
        </button>
      </div>

      <Flash msg={msg} />

      {showForm && (
        <div ref={formRef} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#FF5722]" /> Escribir una carta
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Título / Asunto</label>
              {inp({ required: true, value: form.title, onChange: e => setForm(f => ({ ...f, title: e.target.value })), placeholder: 'Para cuando menos lo esperes…' })}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha de envío</label>
              {inp({ type: 'date', value: form.sent_at, onChange: e => setForm(f => ({ ...f, sent_at: e.target.value })) })}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Mensaje digital</label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Escribe aquí tu carta…"
                rows={6}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Foto de la carta escrita a mano</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => imgRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  {form.image_base64 ? 'Cambiar imagen' : 'Subir imagen'}
                </button>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
                {form.image_base64 && (
                  <div className="relative">
                    <img
                      src={`data:image/jpeg;base64,${form.image_base64}`}
                      alt="preview"
                      className="w-16 h-16 rounded-xl object-cover shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_base64: '' }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                    >×</button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: ACCENT }}
              >
                {loading ? 'Enviando…' : <><Mail className="w-4 h-4" /> Enviar carta</>}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4">Cartas ({cartas.length})</h2>
        {cartas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin cartas. Escribe la primera.</p>
        ) : (
          <div className="space-y-2">
            {cartas.map(carta => (
              <div key={carta.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div
                  className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: carta.is_read ? '#f3f4f6' : '#FF572215' }}
                >
                  {carta.image_base64
                    ? <img src={`data:image/jpeg;base64,${carta.image_base64}`} alt={carta.title} className="w-full h-full object-cover" />
                    : <Mail className="w-4 h-4" style={{ color: carta.is_read ? '#9ca3af' : ACCENT }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{carta.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {carta.sent_at && <p className="text-xs text-gray-400">{carta.sent_at}</p>}
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={carta.is_read
                        ? { background: '#f3f4f6', color: '#9ca3af' }
                        : { background: '#fff7ed', color: ACCENT }}
                    >
                      {carta.is_read ? 'Leída' : 'Sin leer'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(carta.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

const ADMIN_TABS = [
  { id: 'songs', label: 'Canciones', icon: Music },
  { id: 'places', label: 'Lugares', icon: MapPin },
  { id: 'memories', label: 'Recuerdos', icon: Archive },
  { id: 'trivia', label: 'Trivia', icon: HelpCircle },
  { id: 'cartas', label: 'Cartas', icon: Mail },
]

export default function AdminPage() {
  const [tab, setTab] = useState('songs')

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Panel de Admin</h1>
            <p className="text-xs text-gray-400">Love Frequency · gestiona el contenido</p>
          </div>
          <a href="/" className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 flex items-center gap-1">
            ← App
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl bg-white shadow-sm border border-gray-100">
          {ADMIN_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all"
              style={tab === id ? { background: ACCENT, color: '#fff' } : { color: '#9ca3af' }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {tab === 'songs'    && <SongsTab />}
        {tab === 'places'   && <PlacesTab />}
        {tab === 'memories' && <MemoriesTab />}
        {tab === 'trivia'   && <TriviaTab />}
        {tab === 'cartas'   && <CartasTab />}

      </div>
    </div>
  )
}
