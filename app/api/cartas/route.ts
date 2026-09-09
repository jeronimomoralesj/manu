import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db
    .from('cartas')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getServerClient()
  const { data, error } = await db
    .from('cartas')
    .insert({
      title:        body.title,
      body:         body.body         || null,
      image_base64: body.image_base64 || null,
      sent_at:      body.sent_at      || null,
      is_read:      false,
    })
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
  const { error } = await db.from('cartas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
