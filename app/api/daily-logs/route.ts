import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from "@/lib/supabase"

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db
    .from('daily_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()
  const { data, error } = await db
    .from('daily_logs')
    .insert([{
      saw_each_other: body.saw_each_other ?? false,
      vibe_score: body.vibe_score ?? 3,
      custom_message: body.custom_message ?? null,
      photo_url: body.photo_url ?? null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
