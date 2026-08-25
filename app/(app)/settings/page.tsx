'use client'
import { useState } from 'react'
import { Settings, AlertTriangle, RotateCcw, Check } from 'lucide-react'

export default function SettingsPage() {
  const [resetting, setResetting] = useState(false)
  const [resetStep, setResetStep] = useState(0)
  const [done, setDone] = useState(false)

  async function handleReset() {
    if (resetStep === 0) { setResetStep(1); return }
    if (resetStep === 1) { setResetStep(2); return }
    // Step 2: actually reset
    setResetting(true)
    try {
      await Promise.all([
        fetch('/api/gamification', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ total_points: 0, unlocked_level: 1, selected_avatar: 'classic_retro', unlocked_avatars: ['classic_retro'] }) }),
        // Reset trivia via seed re-run is handled manually; for now just reload
      ])
    } finally {
      setResetting(false)
      setResetStep(0)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6" style={{ background: '#F4F5F7' }}>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#FF5722]" /> Configuración
        </h1>
        <p className="text-sm text-gray-400 mt-1">Ajustes de la app</p>
      </div>

      {/* Links */}
      <div className="rounded-3xl overflow-hidden" style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06)' }}>
        {[
          { label: 'Panel de Admin', href: '/admin', desc: 'Gestionar canciones, recuerdos y más' },
          { label: 'Baúl de Recuerdos', href: '/vault', desc: 'Ver y desbloquear memorias' },
          { label: 'Trivia del Amor', href: '/trivia', desc: 'Ganar puntos respondiendo preguntas' },
          { label: 'Nuestro Mapa', href: '/map', desc: 'Explorar lugares que hemos visitado' },
        ].map(({ label, href, desc }) => (
          <a
            key={href}
            href={href}
            className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <span className="text-gray-300">›</span>
          </a>
        ))}
      </div>

      {/* SQL reminder */}
      <div
        className="rounded-2xl p-4 text-xs"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
      >
        <p className="font-bold mb-1">⚠️ Recuerda ejecutar en Supabase:</p>
        <pre className="font-mono whitespace-pre-wrap overflow-x-auto text-[11px]">{`-- Tablas nuevas (si no existen)
CREATE TABLE IF NOT EXISTS user_gamification (...);
CREATE TABLE IF NOT EXISTS memory_vault (...);
CREATE TABLE IF NOT EXISTS trivia_questions (...);
CREATE TABLE IF NOT EXISTS secret_dates (...);
CREATE TABLE IF NOT EXISTS map_locations (...);
ALTER TABLE music_library ADD COLUMN IF NOT EXISTS photo_base64 TEXT;

-- Ver schema completo en: supabase/schema.sql`}</pre>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-3xl p-5 space-y-4"
        style={{ background: '#fff', border: '1px solid #FEE2E2', boxShadow: '4px 4px 16px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="font-bold text-sm">Zona de peligro</h3>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700">Reiniciar puntos y nivel</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">Esto restablece los puntos a 0, el nivel a 1 y el avatar al clásico. No elimina canciones ni recuerdos.</p>

          {done && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-2">
              <Check className="w-4 h-4" /> Reiniciado correctamente
            </div>
          )}

          {resetStep === 0 && (
            <button onClick={handleReset} className="px-4 py-2 rounded-xl text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50 transition-colors">
              Reiniciar puntos
            </button>
          )}
          {resetStep === 1 && (
            <div className="space-y-2">
              <p className="text-xs text-red-500 font-medium">¿Estás segura? Esto borrará todos tus puntos acumulados.</p>
              <div className="flex gap-2">
                <button onClick={handleReset} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  Sí, reiniciar
                </button>
                <button onClick={() => setResetStep(0)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {resetStep === 2 && (
            <div className="space-y-2">
              <p className="text-xs text-red-600 font-bold">⚠️ Última confirmación — esto no se puede deshacer.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {resetting ? 'Reiniciando...' : 'Confirmar reinicio'}
                </button>
                <button onClick={() => setResetStep(0)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 border border-gray-200">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-300 pb-4">Love Frequency · Hecho con ❤️ para Manuli</p>
    </div>
  )
}
