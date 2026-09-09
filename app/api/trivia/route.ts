import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET() {
  const db = getServerClient()
  const [questionsRes, datesRes] = await Promise.all([
    db.from('trivia_questions').select('*').order('created_at', { ascending: true }),
    db.from('secret_dates').select('*').order('required_score'),
  ])
  return NextResponse.json({
    questions: questionsRes.data ?? [],
    secretDates: datesRes.data ?? [],
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()

  if (body._action === 'answer') {
    const { questionId, selectedIndex } = body
    const { data: q } = await db.from('trivia_questions').select('*').eq('id', questionId).single()
    if (!q) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    if (q.is_answered) return NextResponse.json({ error: 'Already answered' }, { status: 400 })

    const correct = selectedIndex === q.correct_option_index
    await db.from('trivia_questions').update({ is_answered: true }).eq('id', questionId)

    if (correct) {
      const { data: gami } = await db.from('user_gamification').select('total_points').eq('id', 1).maybeSingle()
      const newPts = (gami?.total_points ?? 0) + q.points_reward
      const newLevel = Math.floor(newPts / 100) + 1
      await db.from('user_gamification').upsert({ id: 1, total_points: newPts, unlocked_level: newLevel })
    }

    return NextResponse.json({ correct, points_earned: correct ? q.points_reward : 0 })
  }

  if (body._action === 'seed') {
    const questions = [
      { question: '¿Cuál fue el primer lugar al que fuimos juntos en una cita?', options: ['Cine', 'Restaurante', 'Parque', 'Centro comercial'], correct_option_index: 1, points_reward: 30 },
      { question: '¿En qué mes nos conocimos?', options: ['Enero', 'Marzo', 'Junio', 'Septiembre'], correct_option_index: 2, points_reward: 25 },
      { question: '¿Cuál es la canción que más nos recuerda a los dos?', options: ['Shape of You', 'Fall in Love Alone', 'Stay', 'Submarine'], correct_option_index: 1, points_reward: 20 },
      { question: '¿Cuál es mi comida favorita para compartir contigo?', options: ['Pizza', 'Sushi', 'Tacos', 'Pasta'], correct_option_index: 0, points_reward: 15 },
      { question: '¿Cuántos meses llevamos juntos?', options: ['6', '12', '18', '24'], correct_option_index: 1, points_reward: 40 },
    ]
    const { error } = await db.from('trivia_questions').insert(questions)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const dates = [
      { required_score: 100, ticket_number: 'SECRET-DATE-#0001', title: 'Una noche de películas en casa 🍿', is_claimed: false },
      { required_score: 200, ticket_number: 'SECRET-DATE-#0002', title: 'Cena sorpresa en tu restaurante favorito 🕯️', is_claimed: false },
      { required_score: 350, ticket_number: 'SECRET-DATE-#0003', title: 'Un viaje de fin de semana juntos ✈️', is_claimed: false },
    ]
    await db.from('secret_dates').insert(dates)
    return NextResponse.json({ ok: true })
  }

  // Create a new question
  const { data, error } = await db
    .from('trivia_questions')
    .insert([{
      question: body.question,
      options: body.options,
      correct_option_index: Number(body.correct_option_index),
      points_reward: Number(body.points_reward) || 20,
      is_answered: false,
    }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()

  if (body._action === 'reset') {
    const { data, error } = await db
      .from('trivia_questions')
      .update({ is_answered: false })
      .eq('id', body.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await db
    .from('trivia_questions')
    .update({
      question: body.question,
      options: body.options,
      correct_option_index: Number(body.correct_option_index),
      points_reward: Number(body.points_reward),
    })
    .eq('id', body.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getServerClient()
  const { error } = await db.from('trivia_questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
