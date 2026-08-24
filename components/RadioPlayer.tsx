'use client'
import { useState } from 'react'
import { Wifi, Mic2, SlidersHorizontal, Info, Settings, Volume2 } from 'lucide-react'
import { MoodMode } from '@/types'

interface Props {
  frequency: number
  mood: MoodMode
  nowPlaying: string
  vibeScore: number
  onVibeChange: (v: number) => void
}

const MOOD_LABELS: Record<MoodMode, string> = {
  cozy_comfort: 'Cozy Comfort',
  playful_connection: 'Playful Connection',
  missing_you: 'Missing You',
  wind_down: 'Wind Down',
}

const MOOD_COLORS: Record<MoodMode, string> = {
  cozy_comfort: '#FFB347',
  playful_connection: '#FF5722',
  missing_you: '#7C9EE8',
  wind_down: '#A78BFA',
}

export default function RadioPlayer({ frequency, mood, nowPlaying, vibeScore, onVibeChange }: Props) {
  const [volume, setVolume] = useState(70)

  const moodColor = MOOD_COLORS[mood]

  return (
    <div
      className="relative w-full h-full rounded-3xl overflow-hidden flex flex-col p-6 gap-5"
      style={{
        background: 'linear-gradient(160deg, #3a4560 0%, #2a3248 60%, #1e2535 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Texture overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23fff\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <h2 className="text-white font-bold text-lg tracking-wide">Radio Player</h2>
        <Wifi className="text-gray-400 w-5 h-5" strokeWidth={1.5} />
      </div>

      {/* LCD Display */}
      <div
        className="relative rounded-xl p-4 mx-1"
        style={{
          background: '#1a2208',
          boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.05)',
          border: '1px solid rgba(0,0,0,0.6)',
        }}
      >
        <div className="text-center">
          <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: '#7aad3a', opacity: 0.7 }}>
            NOW PLAYING.....{nowPlaying.toUpperCase()}
          </p>
          <p
            className="font-mono font-black tracking-wider leading-none"
            style={{
              fontSize: '2.2rem',
              color: moodColor,
              textShadow: `0 0 20px ${moodColor}88, 0 0 40px ${moodColor}44`,
            }}
          >
            {frequency.toFixed(1)}MHZ
          </p>
          <div className="flex justify-between mt-2 text-[9px] font-mono opacity-50" style={{ color: '#7aad3a' }}>
            <span>rdS</span>
            <span>{MOOD_LABELS[mood]}</span>
            <span>5 Fm</span>
          </div>
        </div>
      </div>

      {/* Control Buttons Row */}
      <div className="grid grid-cols-4 gap-3 relative z-10">
        {[
          { icon: <span className="text-[9px] font-bold">FM</span>, label: 'Stations' },
          { icon: <Mic2 className="w-4 h-4" />, label: 'Source' },
          { icon: <SlidersHorizontal className="w-4 h-4" />, label: 'Presets' },
          { icon: <Info className="w-4 h-4" />, label: 'Info' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <button
              className="w-12 h-12 rounded-full flex items-center justify-center text-gray-300 transition-all active:scale-95"
              style={{
                background: 'linear-gradient(145deg, #3d4f6e, #2c3a52)',
                boxShadow: '4px 4px 8px rgba(0,0,0,0.4), -2px -2px 6px rgba(255,255,255,0.04)',
              }}
            >
              {icon}
            </button>
            <span className="text-[10px] text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Volume Knob + Vibe Slider */}
      <div className="flex items-center gap-4 relative z-10">
        {/* Big knob */}
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 50%, #1a202c 100%)',
              boxShadow: '6px 6px 16px rgba(0,0,0,0.6), -3px -3px 10px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #3d4a5e, #232c3e)',
                boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.5)',
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-1 h-6 bg-gray-500 rounded-full translate-y-[-8px]" />
              </div>
            </div>
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: volume > 0 ? '#22c55e' : '#374151' }} />
          </div>
        </div>

        {/* Vibe & Volume sliders */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Volume */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400">Volume</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: moodColor }}
            />
          </div>
          {/* Vibe */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400">Your Vibe ({vibeScore}/5)</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={vibeScore}
              onChange={(e) => onVibeChange(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: '#FF5722' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom preset bar */}
      <div
        className="rounded-xl p-3 flex items-center gap-3 relative z-10"
        style={{
          background: '#111827',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
        }}
      >
        <span
          className="text-lg font-mono font-black"
          style={{ color: moodColor, textShadow: `0 0 12px ${moodColor}88` }}
        >
          {frequency.toFixed(1)}MHZ
        </span>
        <div className="flex-1 flex gap-2">
          {['New', 'New'].map((label, i) => (
            <button
              key={i}
              className="flex-1 rounded-lg py-1 text-center"
              style={{
                background: '#1f2937',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              <p className="text-[10px] text-gray-300 font-medium">{label}</p>
              <p className="text-[9px] text-gray-500">Tap to add</p>
            </button>
          ))}
        </div>
        <button
          className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400"
          style={{ background: '#374151' }}
        >
          <span className="text-xs">›</span>
        </button>
      </div>

      {/* Frequency badge */}
      <div
        className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold"
        style={{
          background: `${moodColor}22`,
          border: `1px solid ${moodColor}44`,
          color: moodColor,
        }}
      >
        {frequency.toFixed(1)} FM
      </div>
    </div>
  )
}
