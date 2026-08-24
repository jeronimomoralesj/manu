import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { runRecommendationAlgorithm } from '@/lib/algorithm'
import { Song, DailyLog } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vibeOverride = searchParams.get('vibe') ? Number(searchParams.get('vibe')) : undefined

  const db = getSupabase()
  const [songsRes, logRes] = await Promise.all([
    db.from('music_library').select('*'),
    db
      .from('daily_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (songsRes.error) return NextResponse.json({ error: songsRes.error.message }, { status: 500 })

  const result = runRecommendationAlgorithm(
    logRes.data as DailyLog | null,
    (songsRes.data ?? []) as Song[],
    vibeOverride
  )

  return NextResponse.json(result)
}
