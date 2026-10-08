import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { requireLettersAdmin } from '@/lib/letters-admin'
import { parseQuestion } from '@/lib/treasure'
import { mutationOriginError, rpcError, treasureJson } from '@/lib/treasure-server'

export async function GET(req: NextRequest) {
  const admin = req.nextUrl.searchParams.get('admin') === '1'
  if (admin) {
    const auth = await requireLettersAdmin(req)
    if (auth.response) return auth.response
  }
  const db = getServerClient()
  const [questionsRes, datesRes] = await Promise.all([
    db.from('trivia_questions').select(admin ? '*' : 'id,question,options,points_reward,is_answered,created_at').order('created_at', { ascending: true }),
    db.from('secret_dates').select('*').order('required_score'),
  ])
  if (questionsRes.error || datesRes.error) return treasureJson({ error: 'No pudimos cargar la trivia.' }, 503)
  return treasureJson({ questions: questionsRes.data ?? [], secretDates: datesRes.data ?? [] })
}

export async function POST(req: NextRequest) {
  const denied = mutationOriginError(req)
  if (denied) return denied
  let body
  try { body = await req.json(); if (!body || typeof body !== 'object') throw new Error() }
  catch { return treasureJson({ error: 'Solicitud inválida.' }, 400) }
  const db = getServerClient()

  if (body._action === 'answer') {
    if (typeof body.questionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.questionId) || !Number.isInteger(body.selectedIndex)) return treasureJson({ error: 'Respuesta inválida.' }, 400)
    const { data, error } = await db.rpc('treasure_answer', { p_question_id: body.questionId, p_selected_index: body.selectedIndex })
    if (error) return rpcError(error)
    return treasureJson(data)
  }

  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response

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

  let fields
  try { fields = parseQuestion(body) }
  catch (error) { return treasureJson({ error: error instanceof Error ? error.message : 'Pregunta inválida.' }, 400) }
  const { data, error } = await db.from('trivia_questions').insert([{ ...fields, is_answered: false }]).select().single()
  if (error) return treasureJson({ error: 'No pudimos guardar la pregunta.' }, 503)
  return treasureJson(data, 201)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  let body
  try { body = await req.json(); if (!body || typeof body !== 'object') throw new Error() }
  catch { return treasureJson({ error: 'Solicitud inválida.' }, 400) }
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

  let fields
  try { fields = parseQuestion(body) }
  catch (error) { return treasureJson({ error: error instanceof Error ? error.message : 'Pregunta inválida.' }, 400) }
  const { data, error } = await db.from('trivia_questions').update(fields).eq('id', body.id).select().single()
  if (error) return treasureJson({ error: 'No pudimos guardar la pregunta.' }, 503)
  return treasureJson(data)
}

export async function DELETE(req: NextRequest) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getServerClient()
  const { error } = await db.from('trivia_questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
