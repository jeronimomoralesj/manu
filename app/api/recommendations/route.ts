import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { runRecommendationAlgorithm } from '@/lib/algorithm'
import { Song, DailyLog } from '@/types'
import { extractTrackId } from '@/lib/spotify'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vibeOverride = searchParams.get('vibe') ? Number(searchParams.get('vibe')) : undefined

  const db = getServerClient()
  const [songsRes, logRes] = await Promise.all([
    db.from('music_library').select('*').order('title'),
    db.from('daily_logs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (songsRes.error) return NextResponse.json({ error: songsRes.error.message }, { status: 500 })

  let songs = (songsRes.data ?? []) as Song[]

  // Auto-fetch Spotify covers for any song missing one
  const needsCovers = songs.filter(s => !s.cover_url && extractTrackId(s.spotify_uri))
  if (needsCovers.length > 0) {
    const fetched = await Promise.all(
      needsCovers.map(async s => {
        const trackId = extractTrackId(s.spotify_uri)!
        try {
          const res = await fetch(
            `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
            { next: { revalidate: 86400 } }
          )
          if (!res.ok) return null
          const data = await res.json()
          const cover_url = (data.thumbnail_url as string) ?? null
          return cover_url ? { id: s.id, cover_url } : null
        } catch {
          return null
        }
      })
    )

    const coverMap = new Map(
      fetched.filter((x): x is { id: string; cover_url: string } => x !== null)
             .map(x => [x.id, x.cover_url])
    )

    // Enrich songs in-memory so this response already has covers
    songs = songs.map(s => ({
      ...s,
      cover_url: s.cover_url ?? coverMap.get(s.id) ?? null,
    }))

    // Persist to DB in background so next load is instant
    for (const [id, cover_url] of coverMap.entries()) {
      Promise.resolve(
        db.from('music_library').update({ cover_url }).eq('id', id)
      ).catch(() => {})
    }
  }

  const result = runRecommendationAlgorithm(
    logRes.data as DailyLog | null,
    songs,
    vibeOverride
  )

  return NextResponse.json(result)
}
