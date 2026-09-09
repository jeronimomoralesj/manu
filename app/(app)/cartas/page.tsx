'use client'
import { useState, useEffect, useCallback } from 'react'
import { Mail, MailOpen, X, Calendar, Inbox } from 'lucide-react'
import { Carta } from '@/types'

const ACCENT = '#FF5722'

const GLASS = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(28px) saturate(1.8)',
  border: '1px solid rgba(255,255,255,0.14)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.22)',
} as const

const GLASS_DARK = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(28px) saturate(1.5)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
} as const

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ReadingView({ carta, onClose }: { carta: Carta; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#080808' }}>
      {/* Ambient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,87,34,0.08) 0%, transparent 70%)' }}
      />

      {/* Top bar */}
      <div
        className="relative flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: 3 }}>
            Para ti
          </p>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#ffffff', fontFamily: 'Georgia, serif', lineHeight: 1.25 }}>
            {carta.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-4 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ width: 34, height: 34, ...GLASS_DARK }}
        >
          <X style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.5)' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-lg mx-auto px-6 py-8 space-y-7">
          {carta.sent_at && (
            <div className="flex items-center gap-2">
              <Calendar style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'system-ui' }}>{fmt(carta.sent_at)}</span>
            </div>
          )}
          {carta.image_base64 && (
            <div className="rounded-3xl overflow-hidden" style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img
                src={`data:image/jpeg;base64,${carta.image_base64}`}
                alt="Carta"
                className="w-full object-contain"
                style={{ display: 'block', maxHeight: 520, background: 'rgba(255,255,255,0.03)' }}
              />
            </div>
          )}
          {carta.body && (
            <div>
              <p style={{ fontSize: 17, lineHeight: 1.9, color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>
                {carta.body}
              </p>
              <div className="flex justify-end mt-6">
                <span style={{ fontSize: 15, color: ACCENT, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  Con amor ♡
                </span>
              </div>
            </div>
          )}
          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  )
}

export default function CartasPage() {
  const [cartas, setCartas]   = useState<Carta[]>([])
  const [active, setActive]   = useState<Carta | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const res  = await fetch('/api/cartas')
    const data = await res.json()
    setCartas(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCarta = useCallback(async (carta: Carta) => {
    setActive(carta)
    if (!carta.is_read) {
      await fetch(`/api/cartas/${carta.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_read: true }),
      })
      setCartas(prev => prev.map(c => c.id === carta.id ? { ...c, is_read: true } : c))
    }
  }, [])

  const unread = cartas.filter(c => !c.is_read).length

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8" style={{ background: '#0a0a0a' }}>

        {/* Ambient glow */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,87,34,0.1) 0%, transparent 70%)', zIndex: 0 }}
        />

        <div className="relative z-10">
          {/* ── Header ── */}
          <div className="px-5 pt-7 pb-5 flex items-end justify-between">
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#ffffff' }}>Cartas</h1>
              {unread > 0 && (
                <p style={{ fontSize: 13, color: ACCENT, fontWeight: 500, marginTop: 2 }}>{unread} sin leer</p>
              )}
            </div>
            <div
              className="rounded-2xl flex items-center justify-center"
              style={{ width: 42, height: 42, ...GLASS, background: `${ACCENT}18` }}
            >
              <Mail style={{ width: 18, height: 18, color: ACCENT }} />
            </div>
          </div>

          <div className="px-4 space-y-2.5">
            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-16">
                <div
                  className="rounded-full animate-spin"
                  style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: ACCENT }}
                />
              </div>
            )}

            {/* Empty state */}
            {!loading && cartas.length === 0 && (
              <div className="rounded-3xl p-10 flex flex-col items-center gap-3 text-center" style={GLASS}>
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
                >
                  <Inbox style={{ width: 26, height: 26, color: 'rgba(255,255,255,0.25)' }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Sin cartas aún</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Pronto llegará algo especial.</p>
              </div>
            )}

            {/* Letter cards */}
            {cartas.map(carta => {
              const isUnread = !carta.is_read
              return (
                <button
                  key={carta.id}
                  onClick={() => openCarta(carta)}
                  className="w-full text-left rounded-3xl overflow-hidden flex items-center gap-4 px-5 py-4 transition-all active:scale-[0.98]"
                  style={{
                    ...(isUnread ? GLASS : GLASS_DARK),
                    borderLeft: isUnread ? `3px solid ${ACCENT}` : undefined,
                    boxShadow: isUnread
                      ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 0 transparent, inset 0 1px 0 rgba(255,255,255,0.22), 0 0 20px ${ACCENT}14`
                      : GLASS_DARK.boxShadow,
                  }}
                >
                  {/* Specular shimmer */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-3xl"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%)' }}
                  />

                  {/* Icon */}
                  <div
                    className="flex-shrink-0 rounded-2xl flex items-center justify-center"
                    style={{
                      width: 44, height: 44,
                      background: isUnread ? `${ACCENT}20` : 'rgba(255,255,255,0.05)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                    }}
                  >
                    {isUnread
                      ? <Mail     style={{ width: 18, height: 18, color: ACCENT }} />
                      : <MailOpen style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.3)' }} />
                    }
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 relative">
                    <div className="flex items-center gap-2">
                      <p
                        style={{ fontSize: 15, fontWeight: isUnread ? 700 : 500, color: isUnread ? '#ffffff' : 'rgba(255,255,255,0.5)', letterSpacing: '-0.2px' }}
                        className="truncate"
                      >
                        {carta.title}
                      </p>
                      {isUnread && (
                        <span className="flex-shrink-0 rounded-full" style={{ width: 6, height: 6, background: ACCENT }} />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {carta.sent_at && (
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{fmt(carta.sent_at)}</span>
                      )}
                      {carta.body && (
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)' }} className="truncate">
                          {carta.sent_at ? '· ' : ''}{carta.body.slice(0, 55)}…
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex-shrink-0 rounded-xl flex items-center justify-center"
                    style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.06)' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3.5 2L6.5 5L3.5 8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              )
            })}

            <div style={{ height: 8 }} />
          </div>
        </div>
      </div>

      {active && <ReadingView carta={active} onClose={() => setActive(null)} />}
    </>
  )
}
