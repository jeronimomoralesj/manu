'use client'
import { useState, useEffect } from 'react'
import { HelpCircle, Check, X, Star, Ticket } from 'lucide-react'
import { TriviaQuestion, SecretDate, Gamification } from '@/types'

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

  function next() {
    setSelected(null)
    setResult(null)
    setCurrent(c => c + 1)
  }

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
  const answered = questions.filter(q => q.is_answered)
  const q = unanswered[current] ?? null
  const pts = gami?.total_points ?? 0

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8 space-y-6" style={{ background: '#F4F5F7' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#FF5722]" /> Trivia del Amor
          </h1>
          <p className="text-sm text-gray-400 mt-1">Responde y gana puntos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full text-sm font-bold" style={{ background: '#FF572215', color: '#FF5722' }}>
            {pts} pts
          </div>
          {questions.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: '#374151' }}
            >
              {seeding ? '...' : 'Seed preguntas'}
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {questions.length > 0 && (
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.05)' }}
        >
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{answered.length}/{questions.length} respondidas</span>
              <span>{unanswered.length} restantes</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(answered.length / questions.length) * 100}%`, background: '#FF5722' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#FF5722]">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-bold text-sm">{pts}</span>
          </div>
        </div>
      )}

      {/* Current question */}
      {q ? (
        <div
          className="rounded-3xl p-6 space-y-5"
          style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.07)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FF572215] flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-[#FF5722]">{current + 1}</span>
            </div>
            <p className="text-base font-bold text-gray-800 leading-snug">{q.question}</p>
          </div>

          <div className="space-y-2.5">
            {q.options.map((opt, i) => {
              const isSelected = selected === i
              const isCorrect = result && i === q.correct_option_index
              const isWrong = result && isSelected && !result.correct

              let bg = '#F9FAFB'
              let border = '#E5E7EB'
              let text = '#374151'
              if (isCorrect) { bg = '#F0FDF4'; border = '#22C55E'; text = '#166534' }
              else if (isWrong) { bg = '#FEF2F2'; border = '#EF4444'; text = '#991B1B' }
              else if (isSelected) { bg = '#FFF7ED'; border = '#FF5722'; text = '#9A3412' }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={selected !== null}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all disabled:cursor-default"
                  style={{ background: bg, borderColor: border, color: text }}
                >
                  <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ borderColor: border }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm font-medium flex-1">{opt}</span>
                  {isCorrect && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  {isWrong && <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>

          {result && (
            <div className={`rounded-2xl p-4 flex items-center justify-between ${result.correct ? 'bg-green-50' : 'bg-red-50'}`}>
              <div>
                <p className={`font-bold text-sm ${result.correct ? 'text-green-700' : 'text-red-700'}`}>
                  {result.correct ? '¡Correcto! 🎉' : 'No era esa 💙'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {result.correct ? `+${result.points} puntos ganados` : 'La respuesta correcta está resaltada'}
                </p>
              </div>
              {current < unanswered.length - 1 && (
                <button
                  onClick={next}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: '#FF5722' }}
                >
                  Siguiente →
                </button>
              )}
            </div>
          )}
        </div>
      ) : questions.length > 0 ? (
        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: '#fff', boxShadow: '4px 4px 16px rgba(0,0,0,0.06)' }}
        >
          <p className="text-4xl mb-3">🎉</p>
          <h3 className="text-lg font-black text-gray-800">¡Terminaste todas las preguntas!</h3>
          <p className="text-sm text-gray-400 mt-1">Acumulaste {pts} puntos en total</p>
        </div>
      ) : null}

      {/* Secret Date Tickets */}
      {secretDates.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#FF5722]" /> Citas Secretas
          </h2>
          <div className="space-y-3">
            {secretDates.map(date => {
              const earned = pts >= date.required_score
              return (
                <div
                  key={date.id}
                  className={`rounded-2xl p-4 flex items-center gap-4 ${earned ? '' : 'opacity-60'}`}
                  style={{
                    background: earned ? 'linear-gradient(135deg, #FF8A65, #FF5722)' : '#fff',
                    boxShadow: '4px 4px 16px rgba(0,0,0,0.07)',
                  }}
                >
                  <Ticket className={`w-8 h-8 flex-shrink-0 ${earned ? 'text-white' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${earned ? 'text-white' : 'text-gray-700'}`}>{date.title}</p>
                    <p className={`text-xs mt-0.5 ${earned ? 'text-white/70' : 'text-gray-400'}`}>
                      {earned ? date.ticket_number : `Necesitas ${date.required_score} pts`}
                    </p>
                  </div>
                  {earned && !date.is_claimed && (
                    <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
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
  )
}
