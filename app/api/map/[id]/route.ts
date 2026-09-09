import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = getServerClient()
  const { data, error } = await db
    .from('map_locations')
    .update({
      city_name: body.city_name,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      visit_date: body.visit_date,
      trip_title: body.trip_title,
      trip_story: body.trip_story || null,
      photo_urls: body.photo_urls || null,
      trip_song_spotify_uri: body.trip_song_spotify_uri || null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
