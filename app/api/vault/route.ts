import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db
    .from('memory_vault')
    .select('*')
    .order('required_points', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()

  if (body._action === 'unlock') {
    // Check if user has enough points
    const { data: gami } = await db.from('user_gamification').select('total_points').eq('id', 1).maybeSingle()
    const { data: memory } = await db.from('memory_vault').select('required_points').eq('id', body.id).single()
    if (!memory || !gami) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (gami.total_points < memory.required_points)
      return NextResponse.json({ error: 'Not enough points' }, { status: 403 })
    const { data, error } = await db
      .from('memory_vault')
      .update({ is_unlocked: true })
      .eq('id', body.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Create new memory
  const { data, error } = await db
    .from('memory_vault')
    .insert([{
      title: body.title,
      date_happened: body.date_happened || null,
      required_points: body.required_points ?? 100,
      is_unlocked: body.is_unlocked ?? false,
      description: body.description,
      photo_urls: body.photo_urls || null,
      spotify_uri: body.spotify_uri || null,
    }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getServerClient()
  const { error } = await db.from('memory_vault').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
