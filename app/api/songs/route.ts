import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db
    .from('music_library')
    .select('*')
    .order('title')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()
  const { data, error } = await db
    .from('music_library')
    .insert([{
      title: body.title,
      artist: body.artist,
      spotify_uri: body.spotify_uri,
      cover_url: body.cover_url || null,
      mood_mode: body.mood_mode,
      valence: Number(body.valence),
      energy: Number(body.energy),
      acousticness: Number(body.acousticness),
      personal_note: body.personal_note || null,
      photo_base64: body.photo_base64 || null,
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
  const { error } = await db.from('music_library').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
