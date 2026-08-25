import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db
    .from('user_gamification')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-init row if missing
  if (!data) {
    const { data: init, error: initErr } = await db
      .from('user_gamification')
      .insert([{ id: 1 }])
      .select()
      .single()
    if (initErr) return NextResponse.json({ error: initErr.message }, { status: 500 })
    return NextResponse.json(init)
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()
  const { data, error } = await db
    .from('user_gamification')
    .upsert({ id: 1, ...body })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Add points
export async function POST(req: NextRequest) {
  const { points } = await req.json()
  const db = getServerClient()

  const { data: current } = await db.from('user_gamification').select('*').eq('id', 1).maybeSingle()
  const currentPts = current?.total_points ?? 0
  const newPts = currentPts + (points ?? 0)
  const newLevel = Math.floor(newPts / 100) + 1

  const { data, error } = await db
    .from('user_gamification')
    .upsert({ id: 1, total_points: newPts, unlocked_level: newLevel })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
