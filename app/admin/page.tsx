'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Plus, Database, Image as ImageIcon, Pencil, X, Check } from 'lucide-react'
import { Song, MoodMode } from '@/types'
import { extractTrackId } from '@/lib/spotify'

const MOOD_OPTIONS: MoodMode[] = ['cozy_comfort', 'playful_connection', 'missing_you', 'wind_down']
const MOOD_LABELS: Record<MoodMode, string> = {
  cozy_comfort: '☕ Acogedor',
  playful_connection: '✨ Especial',
  missing_you: '💙 Te Extraño',
  wind_down: '🌙 Descansar',
}

const EMPTY_FORM = {
  title: '',
  artist: '',
  spotify_uri: '',
  cover_url: '',
  mood_mode: 'cozy_comfort' as MoodMode,
  valence: '0.5',
  energy: '0.5',
  acousticness: '0.5',
  personal_note: '',
  photo_base64: '',
}

type FormState = typeof EMPTY_FORM

export default function AdminPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [fetchingCover, setFetchingCover] = useState(false)
  const [msg, setMsg] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const uriDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadSongs() {
    const res = await fetch('/api/songs')
    const data = await res.json()
    setSongs(Array.isArray(data) ? data : [])
  }
  useEffect(() => { loadSongs() }, [])

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3500)
  }

  const fetchCoverForUri = useCallback(async (uri: string) => {
    if (!extractTrackId(uri)) return
    setFetchingCover(true)
    const res = await fetch(`/api/spotify-cover?uri=${encodeURIComponent(uri)}`)
    const data = await res.json()
    setFetchingCover(false)
    if (data.cover_url) setForm(f => ({ ...f, cover_url: data.cover_url }))
  }, [])

  // Auto-fetch cover when spotify URI changes (debounced)
  function handleUriChange(val: string) {
    setForm(f => ({ ...f, spotify_uri: val }))
    if (uriDebounce.current) clearTimeout(uriDebounce.current)
    uriDebounce.current = setTimeout(() => fetchCoverForUri(val), 600)
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setForm(f => ({ ...f, photo_base64: result.split(',')[1] }))
    }
    reader.readAsDataURL(file)
  }

  function startEdit(song: Song) {
    setEditingId(song.id)
    setForm({
      title: song.title,
      artist: song.artist,
      spotify_uri: song.spotify_uri,
      cover_url: song.cover_url ?? '',
      mood_mode: song.mood_mode ?? 'cozy_comfort',
      valence: String(song.valence),
      energy: String(song.energy),
      acousticness: String(song.acousticness),
      personal_note: song.personal_note ?? '',
      photo_base64: song.photo_base64 ?? '',
    })
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...form,
      valence: Number(form.valence),
      energy: Number(form.energy),
      acousticness: Number(form.acousticness),
      cover_url: form.cover_url || null,
      personal_note: form.personal_note || null,
      photo_base64: form.photo_base64 || null,
    }

    const url = editingId ? `/api/songs/${editingId}` : '/api/songs'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)

    if (res.ok) {
      setForm(EMPTY_FORM)
      setEditingId(null)
      flash(editingId ? 'Canción actualizada ✓' : 'Canción agregada ✓')
      loadSongs()
    } else {
      const err = await res.json()
      flash(`Error: ${err.error}`)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta canción?')) return
    await fetch(`/api/songs?id=${id}`, { method: 'DELETE' })
    if (editingId === id) cancelEdit()
    loadSongs()
  }

  async function handleSeed() {
    if (!confirm('Esto agregará 10 canciones de ejemplo. ¿Continuar?')) return
    setSeeding(true)
    const res = await fetch('/api/seed', { method: 'POST' })
    const data = await res.json()
    setSeeding(false)
    flash(res.ok ? `Se agregaron ${data.seeded} canciones ✓` : `Error: ${data.error}`)
    loadSongs()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin — Love Frequency</h1>
            <p className="text-xs text-gray-400">Biblioteca de canciones</p>
          </div>
          <div className="flex gap-2">
            <a href="/" className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200">
              ← Ver app
            </a>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#374151' }}
            >
              <Database className="w-4 h-4" />
              {seeding ? 'Cargando...' : 'Seed 10 canciones'}
            </button>
          </div>
        </div>

        {msg && (
          <div className="px-4 py-3 rounded-xl text-sm font-medium bg-green-50 text-green-700 border border-green-200">
            {msg}
          </div>
        )}

        {/* Form */}
        <div ref={formRef} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            {editingId
              ? <><Pencil className="w-4 h-4 text-[#FF5722]" /> Editando canción</>
              : <><Plus className="w-4 h-4 text-[#FF5722]" /> Agregar Canción</>
            }
            {editingId && (
              <button onClick={cancelEdit} className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {[
              { key: 'title', label: 'Título', placeholder: 'Fall in Love Alone', required: true },
              { key: 'artist', label: 'Artista', placeholder: 'Stacey Ryan', required: true },
            ].map(({ key, label, placeholder, required }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                <input
                  required={required}
                  value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>
            ))}

            {/* Spotify URL/URI */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Link de Spotify{' '}
                <span className="font-normal text-gray-400">(URL o URI — la portada se obtiene automáticamente)</span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  required
                  value={form.spotify_uri}
                  onChange={e => handleUriChange(e.target.value)}
                  placeholder="https://open.spotify.com/track/... o spotify:track:..."
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors"
                />
                {fetchingCover && (
                  <div className="w-5 h-5 border-2 border-t-green-500 border-gray-200 rounded-full animate-spin flex-shrink-0" />
                )}
                {form.cover_url && !fetchingCover && (
                  <img src={form.cover_url} alt="cover" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow" />
                )}
              </div>
            </div>

            {/* Personal note */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nota personal</label>
              <textarea
                value={form.personal_note}
                onChange={e => setForm(f => ({ ...f, personal_note: e.target.value }))}
                placeholder="Esta canción me recuerda de ti porque..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors resize-none"
              />
            </div>

            {/* Photo upload */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Foto que me recuerda de ti en esta canción
              </label>
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  {form.photo_base64 ? 'Cambiar foto' : 'Subir foto'}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                {form.photo_base64 && (
                  <div className="relative">
                    <img
                      src={`data:image/jpeg;base64,${form.photo_base64}`}
                      alt="preview"
                      className="w-14 h-14 rounded-xl object-cover shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, photo_base64: '' }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                    >×</button>
                  </div>
                )}
              </div>
            </div>

            {/* Mood Mode */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-2">Categoría</label>
              <div className="flex gap-2 flex-wrap">
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, mood_mode: m }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      form.mood_mode === m
                        ? 'bg-[#FF5722] text-white border-[#FF5722]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF5722]'
                    }`}
                  >
                    {MOOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            {[
              { key: 'valence', label: 'Valencia (alegría)' },
              { key: 'energy', label: 'Energía' },
              { key: 'acousticness', label: 'Acústica' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {label} — <span className="text-[#FF5722]">{(form as Record<string, string>)[key]}</span>
                </label>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full"
                  style={{ accentColor: '#FF5722' }}
                />
              </div>
            ))}

            <div className="md:col-span-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#FF5722' }}
              >
                {loading
                  ? 'Guardando...'
                  : editingId
                    ? <><Check className="w-4 h-4" /> Guardar Cambios</>
                    : <><Plus className="w-4 h-4" /> Agregar Canción</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* Songs list */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4">Biblioteca ({songs.length} canciones)</h2>
          {songs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin canciones — agrega una o usa Seed.</p>
          ) : (
            <div className="space-y-2">
              {songs.map(song => (
                <div
                  key={song.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${editingId === song.id ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    {song.cover_url && <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                    {song.personal_note && (
                      <p className="text-xs text-[#FF5722] truncate italic">"{song.personal_note}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {song.photo_base64 && (
                      <img src={`data:image/jpeg;base64,${song.photo_base64}`} alt="foto" className="w-7 h-7 rounded-lg object-cover" />
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hidden sm:block whitespace-nowrap">
                      {song.mood_mode ? MOOD_LABELS[song.mood_mode as MoodMode] : '—'}
                    </span>
                    <button
                      onClick={() => startEdit(song)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(song.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SQL reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700">
          <strong>SQL requerido en Supabase (solo una vez):</strong>
          <pre className="mt-1 font-mono overflow-x-auto whitespace-pre-wrap">ALTER TABLE music_library ADD COLUMN IF NOT EXISTS photo_base64 TEXT;</pre>
        </div>
      </div>
    </div>
  )
}
