'use client'
import { useState, useEffect } from 'react'
import { Archive, Lock, Unlock, Music, X, Calendar } from 'lucide-react'
import { MemoryVault, Gamification } from '@/types'
import { getEmbedUrl } from '@/lib/spotify'

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
  boxShadow: '0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
} as const

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function VaultPage() {
  const [memories, setMemories] = useState<MemoryVault[]>([])
  const [gami, setGami]         = useState<Gamification | null>(null)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [active, setActive]     = useState<MemoryVault | null>(null)
  const [seeding, setSeeding]   = useState(false)

  async function load() {
    const [vaultRes, gamiRes] = await Promise.all([
      fetch('/api/vault').then(r => r.json()),
      fetch('/api/gamification').then(r => r.json()),
    ])
    setMemories(Array.isArray(vaultRes) ? vaultRes : [])
    setGami(gamiRes)
  }

  useEffect(() => { load() }, [])

  async function handleUnlock(memory: MemoryVault) {
    if (unlocking) return
    setUnlocking(memory.id)
    await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'unlock', id: memory.id }),
    })
    setUnlocking(null)
    load()
  }

  async function handleSeed() {
    setSeeding(true)
    const entries = [
      { title: 'El día que nos conocimos',               date_happened: '2024-01-15', required_points: 0,   is_unlocked: true,  description: 'Ese día que cambió todo. Había algo en tus ojos que me dijo que ibas a ser especial para mí.' },
      { title: 'Nuestra primera cita',                   date_happened: '2024-02-10', required_points: 50,  is_unlocked: false, description: 'Nerviosa, bonita, perfecta. Cada detalle de esa noche está guardado en mi corazón.' },
      { title: 'La primera vez que te dije "te quiero"', date_happened: '2024-04-03', required_points: 150, is_unlocked: false, description: 'Un momento que no planeé, pero que sentí con toda el alma.' },
      { title: 'Nuestro primer viaje',                   date_happened: '2024-06-20', required_points: 250, is_unlocked: false, description: 'Ver el mundo contigo es diferente. Todo se ve más bonito.' },
      { title: 'Una sorpresa que te tengo guardada',     date_happened: null,         required_points: 400, is_unlocked: false, description: 'Para cuando llegues hasta aquí, tendré algo muy especial esperándote.' },
    ]
    for (const e of entries) {
      await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(e),
      })
    }
    setSeeding(false)
    load()
  }

  const pts      = gami?.total_points ?? 0
  const unlocked = memories.filter(m => m.is_unlocked).length
  const total    = memories.length

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8" style={{ background: '#0a0a0a' }}>

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,87,34,0.12) 0%, transparent 70%)', zIndex: 0 }}
      />

      <div className="relative z-10">
        {/* ── Header ── */}
        <div className="px-5 pt-7 pb-2 flex items-end justify-between">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#ffffff' }}>Recuerdos</h1>
            {total > 0 && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {unlocked} de {total} desbloqueados
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {memories.length === 0 && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="rounded-2xl px-3.5 py-1.5 disabled:opacity-50 transition-all active:scale-95"
                style={{ ...GLASS_DARK, color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600 }}
              >
                {seeding ? 'Cargando...' : 'Seed'}
              </button>
            )}
            <span
              className="rounded-2xl px-3 py-1.5"
              style={{ ...GLASS_DARK, color: ACCENT, fontSize: 13, fontWeight: 700 }}
            >
              {pts} pts
            </span>
          </div>
        </div>

        {/* ── Progress strip ── */}
        {total > 0 && (
          <div className="px-5 pt-3 pb-5">
            <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(unlocked / total) * 100}%`, background: `linear-gradient(90deg, ${ACCENT}, #FF8A65)` }}
              />
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {memories.length === 0 && (
          <div className="mx-4 rounded-3xl p-10 flex flex-col items-center gap-3 text-center" style={GLASS}>
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
            >
              <Archive style={{ width: 26, height: 26, color: 'rgba(255,255,255,0.25)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Sin recuerdos aún</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Pulsa Seed para agregar ejemplos.</p>
          </div>
        )}

        {/* ── Memory grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-4">
          {memories.map(memory => {
            const canUnlock = pts >= memory.required_points
            const isLocked  = !memory.is_unlocked
            const photo     = memory.photo_urls?.[0]

            return (
              <div
                key={memory.id}
                className="rounded-3xl overflow-hidden relative transition-all active:scale-[0.97]"
                style={{
                  aspectRatio: '1 / 1',
                  cursor: isLocked ? 'default' : 'pointer',
                  ...(isLocked ? GLASS_DARK : GLASS),
                }}
                onClick={() => !isLocked && setActive(memory)}
              >
                {/* Specular shimmer */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-3xl"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)' }}
                />

                {isLocked ? (
                  /* Locked card */
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                    <div
                      className="rounded-2xl flex items-center justify-center"
                      style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                    >
                      <Lock style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.25)' }} />
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>
                      {memory.required_points} pts
                    </p>
                    {canUnlock && (
                      <button
                        onClick={e => { e.stopPropagation(); handleUnlock(memory) }}
                        disabled={unlocking === memory.id}
                        className="mt-1 flex items-center gap-1 rounded-xl px-2.5 py-1.5 disabled:opacity-50 transition-all active:scale-95"
                        style={{ background: ACCENT, color: '#fff', fontSize: 11, fontWeight: 700 }}
                      >
                        <Unlock style={{ width: 10, height: 10 }} />
                        {unlocking === memory.id ? '...' : 'Abrir'}
                      </button>
                    )}
                  </div>
                ) : photo ? (
                  /* Photo card */
                  <>
                    <img src={photo} alt={memory.title} className="w-full h-full object-cover absolute inset-0" />
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3 }} className="line-clamp-2">
                        {memory.title}
                      </p>
                      {memory.date_happened && (
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                          {new Date(memory.date_happened).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  /* Unlocked, no photo */
                  <div className="w-full h-full flex flex-col items-start justify-between p-4">
                    <div
                      className="rounded-xl flex items-center justify-center"
                      style={{ width: 32, height: 32, background: `${ACCENT}20` }}
                    >
                      <Archive style={{ width: 15, height: 15, color: ACCENT }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }} className="line-clamp-3">
                        {memory.title}
                      </p>
                      {memory.date_happened && (
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                          {new Date(memory.date_happened).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* ── Detail modal ── */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(24px) saturate(1.5)' }}
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(18,18,18,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 -24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {active.photo_urls?.[0] ? (
              <div className="relative w-full" style={{ height: 260 }}>
                <img src={active.photo_urls[0]} alt={active.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)' }} />
                <button
                  onClick={() => setActive(null)}
                  className="absolute top-4 right-4 rounded-full flex items-center justify-center"
                  style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <X style={{ width: 14, height: 14, color: '#fff' }} />
                </button>
                <div className="absolute bottom-0 left-0 px-5 pb-5">
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.2 }}>{active.title}</p>
                  {active.date_happened && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{fmt(active.date_happened)}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex-1 min-w-0 pr-4">
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.4px', lineHeight: 1.2 }}>{active.title}</p>
                  {active.date_happened && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Calendar style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.3)' }} />
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{fmt(active.date_happened)}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setActive(null)}
                  className="flex-shrink-0 rounded-full flex items-center justify-center"
                  style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <X style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} />
                </button>
              </div>
            )}

            <div className="p-5 space-y-4">
              {active.description && (
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>{active.description}</p>
              )}
              {active.spotify_uri && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-lg flex items-center justify-center" style={{ width: 28, height: 28, background: '#1DB95420' }}>
                      <Music style={{ width: 14, height: 14, color: '#1DB954' }} />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Canción de este recuerdo</p>
                  </div>
                  <iframe
                    src={getEmbedUrl(active.spotify_uri) ?? ''}
                    width="100%" height="80"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    style={{ border: 'none', display: 'block', borderRadius: 12 }}
                  />
                </div>
              )}
              <button
                onClick={() => setActive(null)}
                className="w-full py-3.5 rounded-2xl transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
