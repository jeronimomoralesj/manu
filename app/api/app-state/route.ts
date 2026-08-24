import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from "@/lib/supabase"

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db
    .from('current_app_state')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()
  const { data, error } = await db
    .from('current_app_state')
    .upsert({ id: 1, updated_at: new Date().toISOString(), ...body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
