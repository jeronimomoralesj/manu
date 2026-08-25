'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Music } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Song, MoodMode } from '@/types'
import VinylRecord from './VinylRecord'
import PlaylistItem from './PlaylistItem'
import AlbumCard from './AlbumCard'
import PolaroidCard from './PolaroidCard'

interface Props {
  allSongs: Song[]
  suggestedMood: MoodMode
  message: string
  notePrefix: string
  photoUrl: string | null
  activeSong: Song | null
  onPlay: (song: Song) => void
}

const MOOD_LABELS: Record<MoodMode, string> = {
  cozy_comfort: '☕ Acogedor',
  playful_connection: '✨ Especial',
  missing_you: '💙 Te Extraño',
  wind_down: '🌙 Descansar',
}

const MOOD_PLAYLIST_TITLE: Record<MoodMode, string> = {
  playful_connection: 'Tu Playlist de Hoy ✨',
  cozy_comfort: 'Playlist Acogedora ☕',
  missing_you: 'Te Extraño — Para Ti 💙',
  wind_down: 'Para Descansar Esta Noche 🌙',
}

const MOOD_ARTIST_LISTS: Record<MoodMode, string[]> = {
  playful_connection: ['Bad Bunny', 'Harry Styles', 'Doja Cat', 'Sabrina'],
  cozy_comfort: ['Adele', 'Lorde', 'Bon Iver', 'Phoebe'],
  missing_you: ['Alex Turner', 'Lana', 'Nick Drake', 'Sufjan'],
  wind_down: ['Norah Jones', 'Corinne', 'Sade', 'Air'],
}

const AVATAR_COLORS = ['#FFB347', '#FF7AA2', '#7EC8E3', '#B5EAD7', '#C7CEEA']
const ALL_MOODS: MoodMode[] = ['cozy_comfort', 'playful_connection', 'missing_you', 'wind_down']

export default function Dashboard({ allSongs, suggestedMood, message, notePrefix, photoUrl, activeSong, onPlay }: Props) {
  const router = useRouter()
  const [selectedMood, setSelectedMood] = useState<MoodMode>(suggestedMood)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Song[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep selectedMood in sync when algorithm changes suggestedMood
  useEffect(() => { setSelectedMood(suggestedMood) }, [suggestedMood])

  // Filter songs by selected mood
  const moodSongs = allSongs.filter(s => s.mood_mode === selectedMood)
  const vinylSongs = moodSongs.slice(0, 5)
  const topAlbums = moodSongs.slice(0, 3)
  const artists = MOOD_ARTIST_LISTS[selectedMood]

  // Debounced search across all songs
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const q = query.toLowerCase()
      const results = allSongs
        .filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
        .slice(0, 6)
      setSearchResults(results)
      setShowResults(true)
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, allSongs])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#F4F5F7' }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 md:px-6 pt-5 pb-3 flex-shrink-0">
        <div ref={searchRef} className="relative flex-1">
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: '#fff', boxShadow: '2px 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => query && setShowResults(true)}
              placeholder="Buscar canciones..."
              className="flex-1 bg-transparent text-sm text-gray-600 outline-none placeholder-gray-400 min-w-0"
            />
            {query && (
              <button onClick={() => { setQuery(''); setShowResults(false) }}>
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          {showResults && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-40 py-2"
              style={{ background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
            >
              {searchResults.length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-3">No se encontraron canciones.</p>
              ) : searchResults.map(song => (
                <button
                  key={song.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => { router.push(`/song/${song.id}`); setShowResults(false); setQuery('') }}
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    {song.cover_url
                      ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-gray-400" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                  </div>
                  {song.personal_note && <span className="w-2 h-2 rounded-full bg-[#FF5722] flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 shadow-md" />
          <span className="text-sm font-semibold text-gray-700 hidden sm:block">Manuli</span>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 px-4 md:px-6 pb-3 flex-shrink-0 overflow-x-auto scrollbar-hide">
        {ALL_MOODS.map(mood => (
          <button
            key={mood}
            onClick={() => setSelectedMood(mood)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              selectedMood === mood
                ? 'text-white shadow-md scale-105'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={selectedMood === mood
              ? { background: '#FF5722' }
              : { background: '#fff', boxShadow: '2px 2px 6px rgba(0,0,0,0.06)' }
            }
          >
            {MOOD_LABELS[mood]}
            {mood === suggestedMood && (
              <span className="ml-1.5 text-[9px] opacity-70">(sugerido)</span>
            )}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-36 space-y-5">

        {/* Vinyl row */}
        {vinylSongs.length > 0 && (
          <section>
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3">Recomendado para Ti</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {vinylSongs.map(song => (
                <VinylRecord key={song.id} song={song} isActive={activeSong?.id === song.id} onPlay={onPlay} />
              ))}
            </div>
          </section>
        )}

        {/* Personal message */}
        <section
          className="rounded-3xl p-4 md:p-5"
          style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06)' }}
        >
          <PolaroidCard photoUrl={photoUrl} message={message} notePrefix={notePrefix} mood={selectedMood} />
        </section>

        {/* Playlist for selected mood */}
        <section
          className="rounded-3xl p-4 md:p-5"
          style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06)' }}
        >
          <h3 className="font-bold text-gray-800 text-base md:text-lg mb-4">
            {MOOD_PLAYLIST_TITLE[selectedMood]}
          </h3>
          {moodSongs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              Aún no hay canciones en esta categoría. Agrega algunas en{' '}
              <a href="/admin" className="text-[#FF5722] underline">Admin</a>.
            </p>
          ) : (
            <div className="space-y-1">
              {moodSongs.map(song => (
                <PlaylistItem
                  key={song.id}
                  song={song}
                  isPlaying={activeSong?.id === song.id}
                  onPlay={onPlay}
                  onDetail={() => router.push(`/song/${song.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="rounded-3xl p-4"
            style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06)' }}
          >
            <h3 className="font-bold text-gray-800 mb-3">Artistas Favoritos</h3>
            <div className="flex gap-3 justify-around">
              {artists.map((name, i) => (
                <div key={name} className="flex flex-col items-center gap-1">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                    style={{ background: `linear-gradient(135deg, ${AVATAR_COLORS[i]}, ${AVATAR_COLORS[(i + 2) % 5]})` }}
                  >
                    {name[0]}
                  </div>
                  <span className="text-[10px] text-gray-500 text-center w-11 truncate">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {topAlbums.length > 0 && (
            <div
              className="rounded-3xl p-4"
              style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06)' }}
            >
              <h3 className="font-bold text-gray-800 mb-3">Álbumes Destacados</h3>
              <div className="space-y-2">
                {topAlbums.map((song, i) => (
                  <AlbumCard key={song.id} song={song} rating={[4.9, 4.8, 4.7][i]} onPlay={onPlay} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
