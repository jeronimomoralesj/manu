import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db.from('music_library').select('artist, cover_url')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count songs per artist, pick the cover from the first song found
  const map = new Map<string, { count: number; cover: string | null }>()
  for (const row of data ?? []) {
    const prev = map.get(row.artist)
    map.set(row.artist, {
      count: (prev?.count ?? 0) + 1,
      cover: prev?.cover ?? row.cover_url,
    })
  }

  const sorted = Array.from(map.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([name, { count, cover }]) => ({ name, count, cover }))

  return NextResponse.json(sorted)
}
