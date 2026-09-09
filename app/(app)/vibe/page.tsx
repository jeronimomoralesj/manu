'use client'
import { useState, useEffect } from 'react'
import {
  Lock, Check, Ticket, Sparkles, HelpCircle,
  MapPin, Music2, Archive, Trophy, ChevronRight,
} from 'lucide-react'
import { Gamification } from '@/types'

const ACCENT = '#FF5722'

const PALETTE = [
  '#FF5722', '#6366f1', '#ec4899',
  '#10b981', '#f59e0b', '#0284c7',
]

const AVATARS = [
  { id: 'horse',   emoji: '🐴', name: 'Horsey',  pts: 0    },
  { id: 'carrot',  emoji: '🥕', name: 'Carrot',  pts: 50   },
  { id: 'car',     emoji: '🚗', name: 'Speedy',  pts: 100  },
  { id: 'robot',   emoji: '🤖', name: 'Roboto',  pts: 200  },
  { id: 'cactus',  emoji: '🌵', name: 'Spiky',   pts: 300  },
  { id: 'pizza',   emoji: '🍕', name: 'Slicey',  pts: 500  },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn', pts: 750  },
  { id: 'legend',  emoji: '👑', name: 'Royalty', pts: 1000 },
]

const POINT_SOURCES = [
  { icon: HelpCircle, label: 'Trivia',    sub: 'Respuesta correcta', value: '+15 – 40', color: '#7c3aed' },
  { icon: MapPin,     label: 'Mapa',      sub: 'Por lugar visitado',  value: '+10',     color: '#0ea5e9' },
  { icon: Music2,     label: 'Playlists', sub: 'Por canción',         value: '+2',      color: '#10b981' },
  { icon: Archive,    label: 'Recuerdos', sub: 'Puntos especiales',   value: 'Hito',    color: '#f59e0b' },
]

const LEVEL_NAMES = ['', 'Starter', 'Rising', 'Pro', 'Plus', 'Elite', 'Legend']

const DATE_MESSAGES = [
  'Una noche especial te espera.',
  'Prepárate para algo que no olvidarás.',
  'Te lo mereces y mucho más.',
  'Yo lo cumplo, tú solo disfruta.',
  'Algo mágico está por venir.',
]

type RedeemedTicket = { date: string }

const CARD = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' } as const
const SEP  = 'rgba(255,255,255,0.08)'

export default function VibePage() {
  const [gami, setGami]   = useState<Gamification | null>(null)
  const [saving, setSaving] = useState(false)
  const [accentColor, setAccentColor] = useState(PALETTE[0])
  const [redeemedTickets, setRedeemedTickets] = useState<RedeemedTicket[]>([])
  const [redeemModal, setRedeemModal] = useState<number | null>(null)
  const [justRedeemed, setJustRedeemed] = useState(false)

  useEffect(() => {
    fetch('/api/gamification').then(r => r.json()).then(setGami)
    try {
      const a = localStorage.getItem('vibe-accent-color')
      if (a) setAccentColor(a)
    } catch {}
    try {
      const t = localStorage.getItem('surprise-date-tickets')
      if (t) setRedeemedTickets(JSON.parse(t))
    } catch {}
  }, [])

  function pickAccent(c: string) {
    setAccentColor(c)
    try { localStorage.setItem('vibe-accent-color', c) } catch {}
  }

  async function selectAvatar(id: string) {
    if (!gami) return
    const av = AVATARS.find(a => a.id === id)
    if (!av || gami.total_points < av.pts) return
    setSaving(true)
    const unlocked = Array.from(new Set([...(gami.unlocked_avatars ?? []), id]))
    const res = await fetch('/api/gamification', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_avatar: id, unlocked_avatars: unlocked }),
    })
    setGami(await res.json())
    setSaving(false)
  }

  function openRedeemModal(idx: number) { setJustRedeemed(false); setRedeemModal(idx) }
  function confirmRedeem() {
    if (redeemModal === null) return
    const list: RedeemedTicket[] = [...redeemedTickets, { date: new Date().toISOString() }]
    setRedeemedTickets(list)
    try { localStorage.setItem('surprise-date-tickets', JSON.stringify(list)) } catch {}
    setJustRedeemed(true)
  }
  function closeModal() { setRedeemModal(null); setJustRedeemed(false) }

  const pts           = gami?.total_points ?? 0
  const level         = gami?.unlocked_level ?? 1
  const levelName     = LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)]
  const progress      = Math.min(100, ((pts % 100) / 100) * 100)
  const selectedId    = gami?.selected_avatar ?? 'horse'
  const selectedAv    = AVATARS.find(a => a.id === selectedId) ?? AVATARS[0]
  const ticketsEarned = level
  const ticketsUsed   = redeemedTickets.length
  const ticketsLeft   = ticketsEarned - ticketsUsed
  const modalMsg      = redeemModal !== null ? DATE_MESSAGES[redeemModal % DATE_MESSAGES.length] : ''

  return (
    <div className="flex-1 overflow-y-auto pb-28 md:pb-8" style={{ background: '#0a0a0a' }}>

      {/* ── Page title ── */}
      <div className="px-5 pt-7 pb-4">
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#ffffff' }}>
          Perfil
        </h1>
      </div>

      <div className="px-4 space-y-3">

        {/* ── Level card ── */}
        <div className="rounded-2xl p-5" style={CARD}>
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <span className="text-[26px] leading-none select-none">{selectedAv.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                Nivel {level}
              </p>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                {levelName}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{pts}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: 2 }}>puntos</p>
            </div>
          </div>

          {/* XP bar */}
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{pts % 100} / 100 XP</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{100 - (pts % 100)} para Nivel {level + 1}</span>
            </div>
            <div className="w-full rounded-full" style={{ height: 4, background: 'rgba(255,255,255,0.12)' }}>
              <div
                className="rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, height: 4, background: accentColor }}
              />
            </div>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-2.5">
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Color
            </span>
            {PALETTE.map(c => (
              <button
                key={c}
                onClick={() => pickAccent(c)}
                className="rounded-full transition-all flex-shrink-0"
                style={{
                  width: c === accentColor ? 20 : 16,
                  height: c === accentColor ? 20 : 16,
                  background: c,
                  outline: c === accentColor ? '2px solid rgba(255,255,255,0.8)' : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Personaje ── */}
        <div className="rounded-2xl overflow-hidden" style={CARD}>
          <div className="px-4 pt-4 pb-3">
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Personaje
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 px-4 pb-4">
            {AVATARS.map(av => {
              const isUnlocked = pts >= av.pts
              const isSelected = selectedId === av.id
              return (
                <button
                  key={av.id}
                  onClick={() => selectAvatar(av.id)}
                  disabled={!isUnlocked || saving}
                  className="relative flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                  style={{
                    background: isSelected ? `${accentColor}18` : 'rgba(255,255,255,0.05)',
                    outline: isSelected ? `2px solid ${accentColor}` : 'none',
                  }}
                >
                  {!isUnlocked && (
                    <div
                      className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                      <Lock style={{ width: 8, height: 8, color: 'rgba(255,255,255,0.3)' }} />
                    </div>
                  )}
                  {isSelected && (
                    <div
                      className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={{ background: accentColor }}
                    >
                      <Check style={{ width: 8, height: 8, color: '#fff' }} />
                    </div>
                  )}
                  <span
                    className="text-2xl leading-none select-none"
                    style={{ filter: isUnlocked ? 'none' : 'grayscale(1) opacity(0.25)' }}
                  >
                    {av.emoji}
                  </span>
                  <p
                    className="text-center truncate w-full px-1"
                    style={{ fontSize: 9, fontWeight: 600, color: isSelected ? accentColor : isUnlocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}
                  >
                    {isUnlocked ? av.name : `${av.pts} pts`}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Cómo ganar puntos ── */}
        <div className="rounded-2xl overflow-hidden" style={CARD}>
          <div className="px-4 pt-4 pb-1">
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Cómo ganar puntos
            </p>
          </div>
          {POINT_SOURCES.map(({ icon: Icon, label, sub, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: `1px solid ${SEP}` }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 rounded-[10px]"
                style={{ width: 34, height: 34, background: color }}
              >
                <Icon style={{ width: 17, height: 17, color: '#fff' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 15, fontWeight: 500, color: '#ffffff' }}>{label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Niveles ── */}
        <div className="rounded-2xl overflow-hidden" style={CARD}>
          <div className="px-4 pt-4 pb-1">
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Niveles
            </p>
          </div>
          {LEVEL_NAMES.slice(1).map((name, i) => {
            const lvl       = i + 1
            const isCurrent = level === lvl
            const isPast    = level > lvl
            return (
              <div
                key={name}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: `1px solid ${SEP}` }}
              >
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 28, height: 28,
                    background: isCurrent ? accentColor : isPast ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {isPast
                    ? <Check style={{ width: 13, height: 13, color: '#34C759' }} />
                    : <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#fff' : 'rgba(255,255,255,0.25)' }}>{lvl}</span>
                  }
                </div>
                <p
                  className="flex-1"
                  style={{
                    fontSize: 15,
                    fontWeight: isCurrent ? 600 : 400,
                    color: isCurrent ? '#ffffff' : isPast ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {name}
                </p>
                <p style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? accentColor : 'rgba(255,255,255,0.2)' }}>
                  {(lvl - 1) * 100 === 0 ? 'Inicio' : `${(lvl - 1) * 100}+ pts`}
                </p>
              </div>
            )
          })}
        </div>

        {/* ── Citas Sorpresa ── */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2.5">
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Citas Sorpresa
            </p>
            {ticketsLeft > 0 && (
              <span
                className="rounded-full px-2 py-0.5"
                style={{ fontSize: 11, fontWeight: 600, color: ACCENT, background: `${ACCENT}18` }}
              >
                {ticketsLeft} disponible{ticketsLeft !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {ticketsEarned === 0 ? (
            <div
              className="rounded-2xl p-6 flex flex-col items-center gap-2.5 text-center"
              style={CARD}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.06)' }}
              >
                <Ticket style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.25)' }} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>Sin tickets aún</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                  Sube de nivel para ganar tu primera cita
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {Array.from({ length: ticketsEarned }).map((_, i) => {
                const isRedeemed = i < ticketsUsed
                const dateStr    = isRedeemed
                  ? new Date(redeemedTickets[i].date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                  : null
                return (
                  <div
                    key={i}
                    className="rounded-2xl overflow-hidden flex items-stretch"
                    style={{
                      background:  isRedeemed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
                      border:      `1px solid ${isRedeemed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                      backdropFilter: 'blur(16px)',
                      opacity:     isRedeemed ? 0.6 : 1,
                    }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 52,
                        borderRight: `1.5px dashed ${isRedeemed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)'}`,
                      }}
                    >
                      <Ticket style={{ width: 16, height: 16, color: isRedeemed ? 'rgba(255,255,255,0.2)' : ACCENT }} />
                    </div>
                    <div className="flex-1 flex items-center justify-between px-4 py-4">
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>
                          Cita Sorpresa
                        </p>
                        <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1, color: isRedeemed ? 'rgba(255,255,255,0.25)' : '#fff' }}>
                          #{String(i + 1).padStart(2, '0')}
                        </p>
                        {isRedeemed && dateStr && (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Canjeada el {dateStr}</p>
                        )}
                      </div>
                      {isRedeemed ? (
                        <div
                          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                          <Check style={{ width: 12, height: 12, color: '#34C759' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Usada</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => openRedeemModal(i)}
                          className="flex items-center gap-1.5 rounded-xl px-4 py-2 transition-all active:scale-95"
                          style={{ background: ACCENT, color: '#fff' }}
                        >
                          <Sparkles style={{ width: 13, height: 13 }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>Canjear</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Next locked ticket */}
              <div
                className="rounded-2xl overflow-hidden flex items-stretch"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.45 }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 52, borderRight: '1.5px dashed rgba(255,255,255,0.1)' }}
                >
                  <Lock style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.2)' }} />
                </div>
                <div className="flex-1 flex items-center justify-between px-4 py-4">
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 3 }}>
                      Próxima cita
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1, color: 'rgba(255,255,255,0.2)' }}>
                      #{String(ticketsEarned + 1).padStart(2, '0')}
                    </p>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>
                    {100 - (pts % 100)} pts
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ height: 8 }} />
      </div>

      {/* ── Redeem modal ── */}
      {redeemModal !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }}
          onClick={justRedeemed ? closeModal : undefined}
        >
          <div
            className="w-full max-w-sm mx-4 mb-4 md:mb-0 rounded-3xl overflow-hidden"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            {justRedeemed ? (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{ width: 64, height: 64, background: 'rgba(52,199,89,0.15)' }}
                >
                  <Check style={{ width: 32, height: 32, color: '#34C759' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.4px' }}>Canjeada</h2>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{modalMsg}</p>
                </div>
                <div
                  className="w-full rounded-2xl py-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>Cita Sorpresa</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: ACCENT, letterSpacing: '-0.5px' }}>
                    #{String(redeemModal + 1).padStart(2, '0')}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full py-3.5 rounded-2xl"
                  style={{ background: ACCENT, color: '#fff', fontSize: 15, fontWeight: 600 }}
                >
                  Perfecto
                </button>
              </div>
            ) : (
              <>
                <div className="p-6 flex flex-col items-center gap-3 text-center" style={{ borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
                  <div
                    className="rounded-2xl flex items-center justify-center"
                    style={{ width: 56, height: 56, background: `${ACCENT}18` }}
                  >
                    <Ticket style={{ width: 26, height: 26, color: ACCENT }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>Canjear Ticket</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                      Cita Sorpresa #{String(redeemModal + 1).padStart(2, '0')}
                    </p>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.5 }}>
                    ¿Estás segura?<br />
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>Te mereces esta cita y mucho más.</span>
                  </p>
                  <button
                    onClick={confirmRedeem}
                    className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{ background: ACCENT, color: '#fff', fontSize: 15, fontWeight: 600 }}
                  >
                    <Ticket style={{ width: 16, height: 16 }} />
                    Canjear mi cita
                  </button>
                  <button
                    onClick={closeModal}
                    className="w-full py-3 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 500 }}
                  >
                    Guardar para después
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
