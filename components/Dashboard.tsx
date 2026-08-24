'use client'
import { Search, Bell, ChevronRight } from 'lucide-react'
import { Song, MoodMode } from '@/types'
import VinylRecord from './VinylRecord'
import PlaylistItem from './PlaylistItem'
import AlbumCard from './AlbumCard'
import PolaroidCard from './PolaroidCard'

interface Props {
  songs: Song[]
  mood: MoodMode
  message: string
  notePrefix: string
  photoUrl: string | null
  activeSong: Song | null
  onPlay: (song: Song) => void
}

const MOOD_ARTISTS: Record<MoodMode, string[]> = {
  playful_connection: ['Bad Bunny', 'Harry Styles', 'Doja Cat', 'Sabrina'],
  cozy_comfort: ['Adele', 'Lorde', 'Bon Iver', 'Phoebe'],
  missing_you: ['Alex Turner', 'Lana', 'Nick Drake', 'Sufjan'],
  wind_down: ['Norah Jones', 'Corinne', 'Sade', 'Air'],
}

const AVATAR_COLORS = ['#FFB347', '#FF7AA2', '#7EC8E3', '#B5EAD7', '#C7CEEA']

export default function Dashboard({ songs, mood, message, notePrefix, photoUrl, activeSong, onPlay }: Props) {
  const artists = MOOD_ARTISTS[mood]
  const topAlbums = songs.slice(0, 3)
  const playlist = songs.slice(0, 4)
  const recommendations = songs.slice(0, 5)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#F4F5F7' }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 pt-6 pb-4 flex-shrink-0">
        <div
          className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-2xl"
          style={{ background: '#fff', boxShadow: '2px 2px 8px rgba(0,0,0,0.06), -1px -1px 4px rgba(255,255,255,0.8)' }}
        >
          <Search className="w-4 h-4 text-gray-400" />
          <input
            placeholder="Search music"
            className="flex-1 bg-transparent text-sm text-gray-600 outline-none placeholder-gray-400"
          />
        </div>
        <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
          <Bell className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 shadow-md" />
          <span className="text-sm font-semibold text-gray-700 hidden md:block">Mi Amor</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-6">
        {/* Recommendations */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recommendation for You</h2>
            <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#FF5722] transition-colors">
              See All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
            {recommendations.map((song) => (
              <VinylRecord
                key={song.id}
                song={song}
                isActive={activeSong?.id === song.id}
                onPlay={onPlay}
              />
            ))}
          </div>
        </section>

        {/* Personal message */}
        <section
          className="rounded-3xl p-5"
          style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06), -2px -2px 8px rgba(255,255,255,0.9)' }}
        >
          <PolaroidCard
            photoUrl={photoUrl}
            message={message}
            notePrefix={notePrefix}
            mood={mood}
          />
        </section>

        {/* Bottom two-column section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Top Artists + Recent Playlist */}
          <div className="flex flex-col gap-4">
            {/* Top Artists */}
            <div
              className="rounded-3xl p-4"
              style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06), -2px -2px 8px rgba(255,255,255,0.9)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Top Artist</h3>
                <button className="text-xs font-semibold text-[#FF5722]">See All</button>
              </div>
              <div className="flex gap-4 justify-around">
                {artists.map((name, i) => (
                  <div key={name} className="flex flex-col items-center gap-1">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                      style={{ background: `linear-gradient(135deg, ${AVATAR_COLORS[i]}, ${AVATAR_COLORS[(i + 2) % 5]})` }}
                    >
                      {name[0]}
                    </div>
                    <span className="text-[10px] text-gray-500 text-center w-12 truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Playlist */}
            <div
              className="rounded-3xl p-4 flex-1"
              style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06), -2px -2px 8px rgba(255,255,255,0.9)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Recent Playlist</h3>
                <button className="text-xs font-semibold text-[#FF5722]">See All</button>
              </div>
              <div className="space-y-1">
                {playlist.map((song) => (
                  <PlaylistItem
                    key={song.id}
                    song={song}
                    isPlaying={activeSong?.id === song.id}
                    onPlay={onPlay}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Top Albums */}
          <div
            className="rounded-3xl p-4"
            style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06), -2px -2px 8px rgba(255,255,255,0.9)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">Top Album</h3>
              <button className="text-xs font-semibold text-[#FF5722]">See All</button>
            </div>
            <div className="space-y-2">
              {topAlbums.map((song, i) => (
                <AlbumCard
                  key={song.id}
                  song={song}
                  rating={[4.9, 4.8, 4.7][i]}
                  onPlay={onPlay}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
