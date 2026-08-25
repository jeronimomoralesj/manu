'use client'
import { useState, useEffect } from 'react'
import { Archive, Lock, Unlock, Heart, Music } from 'lucide-react'
import { MemoryVault, Gamification } from '@/types'
import { getEmbedUrl } from '@/lib/spotify'

export default function VaultPage() {
  const [memories, setMemories] = useState<MemoryVault[]>([])
  const [gami, setGami] = useState<Gamification | null>(null)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [active, setActive] = useState<MemoryVault | null>(null)
  const [seeding, setSeeding] = useState(false)

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
      { title: 'El día que nos conocimos', date_happened: '2024-01-15', required_points: 0, is_unlocked: true, description: 'Ese día que cambió todo. Había algo en tus ojos que me dijo que ibas a ser especial para mí.' },
      { title: 'Nuestra primera cita', date_happened: '2024-02-10', required_points: 50, is_unlocked: false, description: 'Nerviosa, bonita, perfecta. Cada detalle de esa noche está guardado en mi corazón.' },
      { title: 'La primera vez que te dije "te quiero"', date_happened: '2024-04-03', required_points: 150, is_unlocked: false, description: 'Un momento que no planeé, pero que sentí con toda el alma.' },
      { title: 'Nuestro primer viaje', date_happened: '2024-06-20', required_points: 250, is_unlocked: false, description: 'Ver el mundo contigo es diferente. Todo se ve más bonito.' },
      { title: 'Una sorpresa que te tengo guardada 🎁', date_happened: null, required_points: 400, is_unlocked: false, description: 'Para cuando llegues hasta aquí, tendré algo muy especial esperándote...' },
    ]
    await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entries[0] }),
    })
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

  const pts = gami?.total_points ?? 0

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6" style={{ background: '#F4F5F7' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Archive className="w-6 h-6 text-[#FF5722]" /> Baúl de Recuerdos
          </h1>
          <p className="text-sm text-gray-400 mt-1">Desbloquea memorias con tus puntos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: '#FF572215', color: '#FF5722' }}>
            {pts} pts
          </div>
          {memories.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: '#374151' }}
            >
              {seeding ? '...' : 'Seed'}
            </button>
          )}
        </div>
      </div>

      {/* Memory grid */}
      {memories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay recuerdos aún. Pulsa Seed para agregar algunos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map(memory => {
            const canUnlock = pts >= memory.required_points
            const isLocked = !memory.is_unlocked

            return (
              <div
                key={memory.id}
                className={`rounded-3xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] ${isLocked ? 'opacity-90' : ''}`}
                style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.07)' }}
                onClick={() => !isLocked && setActive(memory)}
              >
                {/* Photo / placeholder */}
                <div className="relative w-full h-40" style={{ background: isLocked ? '#1f2937' : 'linear-gradient(135deg, #FF8A65, #FF5722)' }}>
                  {memory.photo_urls?.[0] && !isLocked && (
                    <img src={memory.photo_urls[0]} alt={memory.title} className="w-full h-full object-cover" />
                  )}
                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Lock className="w-10 h-10 text-white/40" />
                      <p className="text-white/50 text-sm font-medium">Recuerdo bloqueado</p>
                    </div>
                  )}
                  {!isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Heart className="w-12 h-12 text-white/60 fill-white/40" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className={`font-bold text-base mb-1 ${isLocked ? 'text-gray-400' : 'text-gray-800'}`}>
                    {isLocked ? '???????????????????' : memory.title}
                  </h3>
                  {memory.date_happened && !isLocked && (
                    <p className="text-xs text-gray-400 mb-2">
                      {new Date(memory.date_happened).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {isLocked ? (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">Necesitas {memory.required_points} pts</span>
                      {canUnlock && (
                        <button
                          onClick={e => { e.stopPropagation(); handleUnlock(memory) }}
                          disabled={unlocking === memory.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                          style={{ background: '#FF5722' }}
                        >
                          <Unlock className="w-3 h-3" />
                          {unlocking === memory.id ? 'Desbloqueando...' : 'Desbloquear'}
                        </button>
                      )}
                      {!canUnlock && (
                        <span className="text-xs font-bold text-[#FF5722]">
                          Te faltan {memory.required_points - pts} pts
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{memory.description}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{ background: '#fff' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full h-48" style={{ background: 'linear-gradient(135deg, #FF8A65, #FF5722)' }}>
              {active.photo_urls?.[0] && (
                <img src={active.photo_urls[0]} alt={active.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-6 space-y-3">
              <h2 className="text-xl font-black text-gray-900">{active.title}</h2>
              {active.date_happened && (
                <p className="text-xs text-[#FF5722] font-semibold">
                  {new Date(active.date_happened).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              <p className="text-sm text-gray-600 leading-relaxed">{active.description}</p>
              {active.spotify_uri && (
                <div className="rounded-2xl overflow-hidden">
                  <iframe
                    src={getEmbedUrl(active.spotify_uri) ?? ''}
                    width="100%" height="80"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    style={{ border: 'none', display: 'block' }}
                  />
                </div>
              )}
              <button
                onClick={() => setActive(null)}
                className="w-full py-2.5 rounded-2xl text-sm font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
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
