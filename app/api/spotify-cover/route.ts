import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uri = searchParams.get('uri') // e.g. spotify:track:2Fxmhks0...

  if (!uri) return NextResponse.json({ error: 'uri required' }, { status: 400 })

  const trackId = uri.split(':').pop()
  if (!trackId) return NextResponse.json({ error: 'invalid uri' }, { status: 400 })

  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`
    const res = await fetch(oembedUrl, { next: { revalidate: 86400 } })
    if (!res.ok) return NextResponse.json({ cover_url: null })
    const data = await res.json()
    return NextResponse.json({ cover_url: data.thumbnail_url ?? null })
  } catch {
    return NextResponse.json({ cover_url: null })
  }
}
