'use client'
import { useState, useEffect } from 'react'
import { HelpCircle, Check, X, Star, Ticket } from 'lucide-react'
import { TriviaQuestion, SecretDate, Gamification } from '@/types'

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

export default function TriviaPage() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([])
  const [secretDates, setSecretDates] = useState<SecretDate[]>([])
  const [gami, setGami] = useState<Gamification | null>(null)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<{ correct: boolean; points: number } | null>(null)
  const [seeding, setSeeding] = useState(false)

  async function load() {
    const [triviaRes, gamiRes] = await Promise.all([
      fetch('/api/trivia').then(r => r.json()),
      fetch('/api/gamification').then(r => r.json()),
    ])
    setQuestions(triviaRes.questions ?? [])
    setSecretDates(triviaRes.secretDates ?? [])
    setGami(gamiRes)
  }

  useEffect(() => { load() }, [])

  async function handleAnswer(idx: number) {
    if (selected !== null || result !== null) return
    setSelected(idx)
    const q = unanswered[current]
    const res = await fetch('/api/trivia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'answer', questionId: q.id, selectedIndex: idx }),
    })
    const data = await res.json()
    setResult({ correct: data.correct, points: data.points_earned })
    load()
  }

  function next() { setSelected(null); setResult(null); setCurrent(c => c + 1) }

  async function handleSeed() {
    setSeeding(true)
    await fetch('/api/trivia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _action: 'seed' }),
    })
    setSeeding(false)
    load()
  }

  const unanswered = questions.filter(q => !q.is_answered)
  const answered   = questions.filter(q => q.is_answered)
  const q          = unanswered[current] ?? null
  const pts        = gami?.total_points ?? 0

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-5" style={{ background: '#0a0a0a' }}>

      {/* Ambient */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,87,34,0.1) 0%, transparent 70%)', zIndex: 0 }}
      />

      <div className="relative z-10 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#ffffff' }}>
              Trivia del Amor
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Responde y gana puntos</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl"
              style={{ ...GLASS, background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}
            >
              <Star style={{ width: 14, height: 14, color: ACCENT, fill: ACCENT }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: ACCENT }}>{pts}</span>
            </div>
            {questions.length === 0 && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-3.5 py-2 rounded-2xl text-xs font-semibold disabled:opacity-50 transition-all active:scale-95"
                style={GLASS_DARK}
              >
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{seeding ? '...' : 'Seed'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        {questions.length > 0 && (
          <div className="rounded-3xl p-4 flex items-center gap-4" style={GLASS_DARK}>
            {/* Specular */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)' }} />
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{answered.length}/{questions.length} respondidas</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{unanswered.length} restantes</span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(answered.length / questions.length) * 100}%`, background: `linear-gradient(90deg, ${ACCENT}, #FF8A65)` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Current question */}
        {q ? (
          <div className="rounded-3xl p-6 space-y-5 relative" style={GLASS}>
            {/* Specular shimmer */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />

            <div className="flex items-start gap-3 relative">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${ACCENT}20`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>{current + 1}</span>
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#ffffff', lineHeight: 1.45, paddingTop: 6 }}>{q.question}</p>
            </div>

            <div className="space-y-2.5 relative">
              {q.options.map((opt, i) => {
                const isSelected = selected === i
                const isCorrect  = result && i === q.correct_option_index
                const isWrong    = result && isSelected && !result.correct

                let bg     = 'rgba(255,255,255,0.06)'
                let border = 'rgba(255,255,255,0.1)'
                let color  = 'rgba(255,255,255,0.75)'
                let shadow = 'inset 0 1px 0 rgba(255,255,255,0.08)'
                if (isCorrect) { bg = 'rgba(34,197,94,0.12)'; border = 'rgba(34,197,94,0.5)'; color = '#4ade80'; shadow = 'inset 0 1px 0 rgba(34,197,94,0.2)' }
                else if (isWrong) { bg = 'rgba(239,68,68,0.1)'; border = 'rgba(239,68,68,0.45)'; color = '#f87171'; shadow = 'inset 0 1px 0 rgba(239,68,68,0.15)' }
                else if (isSelected) { bg = `${ACCENT}14`; border = `${ACCENT}60`; color = '#ffffff'; shadow = `inset 0 1px 0 rgba(255,87,34,0.25)` }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={selected !== null}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all disabled:cursor-default active:scale-[0.98]"
                    style={{ background: bg, borderColor: border, color, boxShadow: shadow, backdropFilter: 'blur(12px)' }}
                  >
                    <span
                      className="w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: border, fontSize: 11, fontWeight: 700, color }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{opt}</span>
                    {isCorrect && <Check style={{ width: 16, height: 16, color: '#4ade80', flexShrink: 0 }} />}
                    {isWrong   && <X    style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>

            {result && (
              <div
                className="rounded-2xl p-4 flex items-center justify-between relative"
                style={{
                  background: result.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  border:     result.correct ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
                  boxShadow:  result.correct ? 'inset 0 1px 0 rgba(34,197,94,0.2)' : 'inset 0 1px 0 rgba(239,68,68,0.15)',
                }}
              >
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: result.correct ? '#4ade80' : '#f87171' }}>
                    {result.correct ? '¡Correcto! 🎉' : 'No era esa 💙'}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    {result.correct ? `+${result.points} puntos ganados` : 'La correcta está resaltada'}
                  </p>
                </div>
                {current < unanswered.length - 1 && (
                  <button
                    onClick={next}
                    className="px-4 py-2 rounded-xl font-bold transition-all active:scale-95"
                    style={{ background: ACCENT, color: '#fff', fontSize: 13 }}
                  >
                    Siguiente →
                  </button>
                )}
              </div>
            )}
          </div>
        ) : questions.length > 0 ? (
          <div className="rounded-3xl p-8 text-center relative" style={GLASS}>
            <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)' }} />
            <p style={{ fontSize: 44, marginBottom: 12 }}>🎉</p>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>¡Terminaste todas!</h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Acumulaste {pts} puntos en total</p>
          </div>
        ) : null}

        {/* Secret dates */}
        {secretDates.length > 0 && (
          <div>
            <h2 style={{ fontWeight: 700, color: '#ffffff', marginBottom: 12, fontSize: 16 }} className="flex items-center gap-2">
              <Ticket style={{ width: 16, height: 16, color: ACCENT }} /> Citas Secretas
            </h2>
            <div className="space-y-3">
              {secretDates.map(date => {
                const earned = pts >= date.required_score
                return (
                  <div
                    key={date.id}
                    className="rounded-3xl p-4 flex items-center gap-4 relative"
                    style={earned
                      ? { background: 'linear-gradient(135deg, #FF8A65, #FF5722)', boxShadow: '0 8px 32px rgba(255,87,34,0.3), inset 0 1px 0 rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.2)' }
                      : { ...GLASS_DARK, opacity: 0.6 }
                    }
                  >
                    {earned && (
                      <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)' }} />
                    )}
                    <Ticket style={{ width: 32, height: 32, flexShrink: 0, color: earned ? '#fff' : 'rgba(255,255,255,0.25)' }} />
                    <div className="flex-1 relative">
                      <p style={{ fontWeight: 700, fontSize: 14, color: earned ? '#fff' : 'rgba(255,255,255,0.55)' }}>{date.title}</p>
                      <p style={{ fontSize: 12, marginTop: 2, color: earned ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>
                        {earned ? date.ticket_number : `Necesitas ${date.required_score} pts`}
                      </p>
                    </div>
                    {earned && !date.is_claimed && (
                      <span className="relative px-2.5 py-1 rounded-xl text-xs font-bold" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }}>
                        ¡Ganado!
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
