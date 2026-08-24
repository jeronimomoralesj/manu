'use client'
import { useState, useEffect } from 'react'
import { Trash2, Plus, Database, Music } from 'lucide-react'
import { Song, MoodMode } from '@/types'

const MOOD_OPTIONS: MoodMode[] = ['cozy_comfort', 'playful_connection', 'missing_you', 'wind_down']
const MOOD_LABELS: Record<MoodMode, string> = {
  cozy_comfort: 'Cozy Comfort',
  playful_connection: 'Playful Connection',
  missing_you: 'Missing You',
  wind_down: 'Wind Down',
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
}

export default function AdminPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [msg, setMsg] = useState('')

  async function loadSongs() {
    const res = await fetch('/api/songs')
    const data = await res.json()
    setSongs(Array.isArray(data) ? data : [])
  }

  useEffect(() => { loadSongs() }, [])

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (res.ok) {
      setForm(EMPTY_FORM)
      flash('Song added!')
      loadSongs()
    } else {
      const err = await res.json()
      flash(`Error: ${err.error}`)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this song?')) return
    await fetch(`/api/songs?id=${id}`, { method: 'DELETE' })
    loadSongs()
  }

  async function handleSeed() {
    if (!confirm('This will add 10 seed songs + a sample daily log. Continue?')) return
    setSeeding(true)
    const res = await fetch('/api/seed', { method: 'POST' })
    const data = await res.json()
    setSeeding(false)
    flash(res.ok ? `Seeded ${data.seeded} songs!` : `Error: ${data.error}`)
    loadSongs()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF5722] flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Love Frequency Admin</h1>
              <p className="text-sm text-gray-400">Manage the music library</p>
            </div>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#374151' }}
          >
            <Database className="w-4 h-4" />
            {seeding ? 'Seeding...' : 'Seed 10 Songs'}
          </button>
        </div>

        {msg && (
          <div className="px-4 py-3 rounded-xl text-sm font-medium bg-green-50 text-green-700 border border-green-200">
            {msg}
          </div>
        )}

        {/* Add Song Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#FF5722]" /> Add a Song
          </h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            {[
              { key: 'title', label: 'Title', placeholder: 'Fall in Love Alone', required: true },
              { key: 'artist', label: 'Artist', placeholder: 'Stacey Ryan', required: true },
              { key: 'spotify_uri', label: 'Spotify URI', placeholder: 'spotify:track:2Fxmhks0...', required: true },
              { key: 'cover_url', label: 'Cover URL', placeholder: 'https://i.scdn.co/...', required: false },
              { key: 'personal_note', label: 'Personal Note', placeholder: 'This reminds me of...', required: false },
            ].map(({ key, label, placeholder, required }) => (
              <div key={key} className={key === 'personal_note' ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                <input
                  required={required}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>
            ))}

            {/* Mood Mode */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Mood Mode</label>
              <div className="flex gap-2 flex-wrap">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, mood_mode: m }))}
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
              { key: 'valence', label: 'Valence (happiness)' },
              { key: 'energy', label: 'Energy' },
              { key: 'acousticness', label: 'Acousticness' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {label} — <span className="text-[#FF5722]">{(form as Record<string, string>)[key]}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full"
                  style={{ accentColor: '#FF5722' }}
                />
              </div>
            ))}

            <div className="col-span-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition-opacity"
                style={{ background: '#FF5722' }}
              >
                {loading ? 'Adding...' : 'Add Song'}
              </button>
            </div>
          </form>
        </div>

        {/* Songs Table */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4">
            Library ({songs.length} songs)
          </h2>
          {songs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No songs yet — add one above or click Seed.</p>
          ) : (
            <div className="space-y-2">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    {song.cover_url && (
                      <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{song.title}</p>
                    <p className="text-xs text-gray-400">{song.artist}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                    {song.mood_mode ? MOOD_LABELS[song.mood_mode] : '—'}
                  </span>
                  <button
                    onClick={() => handleDelete(song.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
