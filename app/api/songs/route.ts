import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { extractTrackId } from '@/lib/spotify'

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db
    .from('music_library')
    .select('*')
    .order('title')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const songs = data ?? []

  // Auto-fetch and persist missing Spotify covers in background
  const needsCovers = songs.filter((s: { cover_url: string | null; spotify_uri: string }) => !s.cover_url && extractTrackId(s.spotify_uri))
  if (needsCovers.length > 0) {
    Promise.all(
      needsCovers.map(async (s: { id: string; spotify_uri: string }) => {
        const trackId = extractTrackId(s.spotify_uri)!
        try {
          const res = await fetch(
            `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
            { next: { revalidate: 86400 } }
          )
          if (!res.ok) return
          const json = await res.json()
          const cover_url = json.thumbnail_url as string | undefined
          if (cover_url) {
            await db.from('music_library').update({ cover_url }).eq('id', s.id)
          }
        } catch {}
      })
    ).catch(() => {})
  }

  return NextResponse.json(songs)
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
