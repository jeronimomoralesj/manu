import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = getServerClient()
  const { data, error } = await db
    .from('memory_vault')
    .update({
      title: body.title,
      date_happened: body.date_happened || null,
      required_points: Number(body.required_points),
      is_unlocked: Boolean(body.is_unlocked),
      description: body.description,
      photo_urls: body.photo_urls || null,
      spotify_uri: body.spotify_uri || null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
