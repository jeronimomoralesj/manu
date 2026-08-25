import { NextRequest, NextResponse } from 'next/server'
import { extractTrackId } from '@/lib/spotify'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const input = searchParams.get('uri') ?? ''

  const trackId = extractTrackId(input)
  if (!trackId) return NextResponse.json({ cover_url: null })

  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return NextResponse.json({ cover_url: null })
    const data = await res.json()
    return NextResponse.json({ cover_url: data.thumbnail_url ?? null })
  } catch {
    return NextResponse.json({ cover_url: null })
  }
}
