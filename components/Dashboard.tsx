'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Music, Play, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Song, MoodMode } from '@/types'
import VinylRecord from './VinylRecord'
import { extractTrackId } from '@/lib/spotify'

interface Props {
  allSongs: Song[]
  suggestedMood: MoodMode
  message: string
  notePrefix: string
  photoUrl: string | null
  activeSong: Song | null
  onPlay: (song: Song) => void
}

const ACCENT = '#FF5722'

const MOOD_PLAYLIST_TITLE: Record<MoodMode, string> = {
  playful_connection: 'Tu Playlist de Hoy ✨',
  cozy_comfort: 'Playlist Acogedora ☕',
  missing_you: 'Te Extraño — Para Ti 💙',
  wind_down: 'Para Descansar Esta Noche 🌙',
}

const MOOD_GRADIENT: Record<MoodMode, string> = {
  playful_connection: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
  cozy_comfort: 'linear-gradient(135deg, #FF8F00 0%, #FFA726 100%)',
  missing_you: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)',
  wind_down: 'linear-gradient(135deg, #6A1B9A 0%, #AB47BC 100%)',
}

const MOOD_COLOR: Record<MoodMode, string> = {
  playful_connection: '#FF5722',
  cozy_comfort: '#FF8F00',
  missing_you: '#1565C0',
  wind_down: '#6A1B9A',
}

const MOOD_PICKER: { id: MoodMode; emoji: string; label: string }[] = [
  { id: 'playful_connection', emoji: '✨', label: 'Especial' },
  { id: 'cozy_comfort',       emoji: '☕', label: 'Acogedor' },
  { id: 'missing_you',        emoji: '💙', label: 'Te Extraño' },
  { id: 'wind_down',          emoji: '🌙', label: 'Descansar' },
]

const AVATAR_COLORS = ['#FFB347', '#FF7AA2', '#7EC8E3', '#B5EAD7', '#C7CEEA', '#DDA0DD', '#98FB98']

interface Artist { name: string; count: number; cover: string | null }

function spotifyOpenUrl(uri: string): string | null {
  const id = extractTrackId(uri)
  return id ? `https://open.spotify.com/track/${id}` : null
}

export default function Dashboard({ allSongs, suggestedMood, message, notePrefix, activeSong, onPlay }: Props) {
  const router = useRouter()
  const [artists, setArtists] = useState<Artist[]>([])
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Song[]>([])
  const [showResults, setShowResults] = useState(false)
  const [activeMood, setActiveMood] = useState<MoodMode>(suggestedMood)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setActiveMood(suggestedMood) }, [suggestedMood])

  useEffect(() => {
    fetch('/api/artists').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setArtists(data)
    })
  }, [])

  const moodSongs = allSongs.filter(s => s.mood_mode === activeMood)
  const vinylSongs = moodSongs.slice(0, 5)
  const featured = moodSongs[0] ?? null

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const q = query.toLowerCase()
      setSearchResults(allSongs.filter(s =>
        s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      ).slice(0, 6))
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
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0a' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 md:px-6 pt-5 pb-4 flex-shrink-0">
        <div ref={searchRef} className="relative flex-1">
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}
          >
            <Search style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => query && setShowResults(true)}
              placeholder="Buscar canciones..."
              className="flex-1 bg-transparent outline-none min-w-0"
              style={{ fontSize: 14, color: '#ffffff' }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setShowResults(false) }}>
                <X style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.4)' }} />
              </button>
            )}
          </div>

          {showResults && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-40 py-2"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)' }}
            >
              {searchResults.length === 0
                ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '12px 16px' }}>No se encontraron canciones.</p>
                : searchResults.map(song => (
                  <button
                    key={song.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => { router.push(`/song/${song.id}`); setShowResults(false); setQuery('') }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                      {song.cover_url
                        ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Music style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)' }} /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }} className="truncate">{song.title}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }} className="truncate">{song.artist}</p>
                    </div>
                    {song.personal_note && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ACCENT }} />}
                  </button>
                ))
              }
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 shadow-md" />
          <span className="text-sm font-semibold hidden sm:block" style={{ color: 'rgba(255,255,255,0.7)' }}>Manuli</span>
        </div>
      </div>

      {/* ── Mood picker ── */}
      <div className="flex gap-2 px-4 md:px-6 pb-3 overflow-x-auto scrollbar-hide flex-shrink-0">
        {MOOD_PICKER.map(({ id, emoji, label }) => {
          const isActive = activeMood === id
          const color = MOOD_COLOR[id]
          return (
            <button
              key={id}
              onClick={() => setActiveMood(id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0"
              style={isActive
                ? { background: color, color: '#fff', boxShadow: `0 4px 14px ${color}55` }
                : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-36 space-y-6">

        {/* Vinyl row */}
        {vinylSongs.length > 0 && (
          <section>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>Recomendado para Ti</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {vinylSongs.map(song => (
                <VinylRecord key={song.id} song={song} isActive={activeSong?.id === song.id} onPlay={onPlay} />
              ))}
            </div>
          </section>
        )}

        {/* ── Featured Track ── */}
        {featured && (
          <section
            className="rounded-3xl overflow-hidden relative"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <div className="absolute inset-0" style={{ background: MOOD_GRADIENT[activeMood] }} />
            {featured.cover_url && (
              <img
                src={featured.cover_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20"
                style={{ filter: 'blur(24px)', transform: 'scale(1.1)' }}
              />
            )}

            <div className="relative flex items-center gap-4 p-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-xl">
                {featured.cover_url
                  ? <img src={featured.cover_url} alt={featured.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center bg-white/10"><Music className="w-8 h-8 text-white/60" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Destacada ahora</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.2 }} className="truncate">{featured.title}</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} className="truncate">{featured.artist}</p>
                {featured.personal_note && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, fontStyle: 'italic' }} className="line-clamp-1">"{featured.personal_note}"</p>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => onPlay(featured)}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                >
                  <Play style={{ width: 16, height: 16, fill: ACCENT, color: ACCENT }} />
                </button>
                {featured.spotify_uri && spotifyOpenUrl(featured.spotify_uri) && (
                  <a
                    href={spotifyOpenUrl(featured.spotify_uri)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                    title="Abrir en Spotify"
                  >
                    <ExternalLink style={{ width: 16, height: 16, color: '#fff' }} />
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Playlist rows ── */}
        <section
          className="rounded-3xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}
        >
          <div
            className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: MOOD_GRADIENT[activeMood] }}
            >
              <Music style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <div className="flex-1">
              <h3 style={{ fontWeight: 700, color: '#ffffff', fontSize: 15 }}>{MOOD_PLAYLIST_TITLE[activeMood]}</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{moodSongs.length} canciones</p>
            </div>
          </div>

          {moodSongs.length === 0 ? (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', padding: '24px 20px', textAlign: 'center' }}>
              Aún no hay canciones aquí.{' '}
              <a href="/admin" style={{ color: ACCENT, textDecoration: 'underline' }}>Agrega en Admin →</a>
            </p>
          ) : (
            <div>
              {moodSongs.map((song, i) => {
                const isActive = activeSong?.id === song.id
                const spotifyUrl = song.spotify_uri ? spotifyOpenUrl(song.spotify_uri) : null

                return (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 px-4 py-3 group transition-colors"
                    style={{
                      borderBottom: i < moodSongs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      background: isActive ? 'rgba(255,87,34,0.08)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div className="w-7 flex-shrink-0 flex items-center justify-center">
                      {isActive
                        ? <div className="flex gap-0.5 items-end h-4">
                            {[1,2,3].map(b => (
                              <div
                                key={b}
                                className="w-0.5 rounded-full animate-pulse"
                                style={{ height: `${[60,100,80][b-1]}%`, background: ACCENT, animationDelay: `${b * 0.1}s` }}
                              />
                            ))}
                          </div>
                        : <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }} className="group-hover:hidden">{i + 1}</span>
                      }
                      {!isActive && (
                        <button
                          onClick={() => onPlay(song)}
                          className="hidden group-hover:flex items-center justify-center"
                        >
                          <Play style={{ width: 14, height: 14, fill: ACCENT, color: ACCENT }} />
                        </button>
                      )}
                    </div>

                    <div
                      className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                      onClick={() => onPlay(song)}
                    >
                      {song.cover_url
                        ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <Music style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.3)' }} />
                          </div>}
                    </div>

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/song/${song.id}`)}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: isActive ? ACCENT : '#ffffff', letterSpacing: '-0.2px' }} className="truncate">
                        {song.title}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }} className="truncate">{song.artist}</p>
                      {song.personal_note && (
                        <p style={{ fontSize: 12, color: `${ACCENT}99`, fontStyle: 'italic', marginTop: 2 }} className="truncate">"{song.personal_note}"</p>
                      )}
                    </div>

                    {spotifyUrl && (
                      <a
                        href={spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: '#1DB95420', color: '#1DB954', fontSize: 10, fontWeight: 700 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink style={{ width: 12, height: 12 }} />
                        Spotify
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Artistas Favoritos ── */}
        {artists.length > 0 && (
          <section
            className="rounded-3xl p-5"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}
          >
            <h3 style={{ fontWeight: 700, color: '#ffffff', marginBottom: 16, fontSize: 15 }}>Artistas Favoritos</h3>
            <div className="flex gap-5 overflow-x-auto pb-1 scrollbar-hide">
              {artists.slice(0, 8).map((artist, i) => (
                <div key={artist.name} className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: 72 }}>
                  <div
                    className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${AVATAR_COLORS[i % AVATAR_COLORS.length]}, ${AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length]})`,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                      border: '2px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {artist.cover
                      ? <img src={artist.cover} alt={artist.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                          {artist.name[0]}
                        </div>}
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.7)',
                      textAlign: 'center',
                      lineHeight: 1.3,
                      width: '100%',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {artist.name}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: -4 }}>
                    {artist.count} {artist.count === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
