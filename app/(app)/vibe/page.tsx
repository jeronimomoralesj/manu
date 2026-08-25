'use client'
import { useState, useEffect } from 'react'
import { Sparkles, Star, Lock } from 'lucide-react'
import { Gamification } from '@/types'

const AVATARS = [
  { id: 'classic_retro', emoji: '🎵', name: 'Clásico', pointsNeeded: 0 },
  { id: 'neon_vibes', emoji: '✨', name: 'Neon', pointsNeeded: 50 },
  { id: 'cozy_soul', emoji: '☕', name: 'Acogedor', pointsNeeded: 100 },
  { id: 'lunar_dream', emoji: '🌙', name: 'Lunar', pointsNeeded: 200 },
  { id: 'love_burst', emoji: '💕', name: 'Amor', pointsNeeded: 300 },
  { id: 'cosmic_wave', emoji: '🌊', name: 'Cosmos', pointsNeeded: 500 },
]

const LEVEL_TITLES = [
  '', 'Amor Naciente', 'Corazón Curioso', 'Alma Romántica',
  'Guardián del Recuerdo', 'Leyenda del Amor',
]

export default function VibePage() {
  const [gami, setGami] = useState<Gamification | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/gamification').then(r => r.json()).then(setGami)
  }, [])

  async function selectAvatar(id: string) {
    if (!gami) return
    const av = AVATARS.find(a => a.id === id)
    if (!av || gami.total_points < av.pointsNeeded) return
    setSaving(true)
    const unlocked = Array.from(new Set([...(gami.unlocked_avatars ?? []), id]))
    const res = await fetch('/api/gamification', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_avatar: id, unlocked_avatars: unlocked }),
    })
    const updated = await res.json()
    setGami(updated)
    setSaving(false)
  }

  const pts = gami?.total_points ?? 0
  const level = gami?.unlocked_level ?? 1
  const levelTitle = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)]
  const nextLevelPts = level * 100
  const progress = Math.min(100, ((pts % 100) / 100) * 100)

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6" style={{ background: '#F4F5F7' }}>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#FF5722]" /> Tus Vibes
        </h1>
        <p className="text-sm text-gray-400 mt-1">Puntos, nivel y tu avatar</p>
      </div>

      {/* Points card */}
      <div
        className="rounded-3xl p-6"
        style={{ background: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)', boxShadow: '0 8px 32px rgba(255,87,34,0.3)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm font-medium">Nivel {level}</p>
            <h2 className="text-white text-2xl font-black">{levelTitle}</h2>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Puntos totales</p>
            <p className="text-white text-4xl font-black">{pts}</p>
          </div>
        </div>
        {/* Level progress bar */}
        <div>
          <div className="flex justify-between text-white/60 text-xs mb-1.5">
            <span>{pts % 100} / 100 pts para nivel {level + 1}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* How to earn points */}
      <div
        className="rounded-3xl p-5"
        style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06)' }}
      >
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-[#FF5722]" /> Cómo ganar puntos
        </h3>
        <div className="space-y-2">
          {[
            ['🎵', 'Responder Trivia', '+15–40 pts por pregunta'],
            ['🔓', 'Desbloquear recuerdos', '—'],
            ['📍', 'Registrar lugares', '+10 pts automático'],
            ['❤️', 'Escuchar playlists', 'Próximamente'],
          ].map(([emoji, action, pts]) => (
            <div key={action} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-lg">{emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{action}</p>
              </div>
              <span className="text-xs font-bold text-[#FF5722]">{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Avatar selector */}
      <div
        className="rounded-3xl p-5"
        style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06)' }}
      >
        <h3 className="font-bold text-gray-800 mb-4">Tu Avatar</h3>
        <div className="grid grid-cols-3 gap-3">
          {AVATARS.map(av => {
            const unlocked = pts >= av.pointsNeeded
            const selected = gami?.selected_avatar === av.id
            return (
              <button
                key={av.id}
                onClick={() => selectAvatar(av.id)}
                disabled={!unlocked || saving}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  selected
                    ? 'border-[#FF5722] bg-orange-50 scale-105'
                    : unlocked
                      ? 'border-gray-100 hover:border-[#FF5722] hover:scale-102'
                      : 'border-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="text-3xl">{av.emoji}</span>
                <span className="text-xs font-semibold text-gray-600">{av.name}</span>
                {!unlocked && (
                  <div className="flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5 text-gray-400" />
                    <span className="text-[9px] text-gray-400">{av.pointsNeeded} pts</span>
                  </div>
                )}
                {selected && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#FF5722] rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px]">✓</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
