import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function GET() {
  const db = getServerClient()
  const { data, error } = await db
    .from('map_locations')
    .select('*')
    .order('visit_date', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body._action === 'seed') {
    const db = getServerClient()
    const locations = [
      { city_name: 'Bogotá', latitude: 4.711, longitude: -74.0721, visit_date: '2024-01-15', trip_title: 'Donde todo comenzó 💕', trip_story: 'La ciudad donde nos conocimos y donde guardo mis recuerdos más bonitos contigo.' },
      { city_name: 'Medellín', latitude: 6.2442, longitude: -75.5812, visit_date: '2024-06-20', trip_title: 'La ciudad de la eterna primavera 🌸', trip_story: 'Ese fin de semana explorando el Poblado juntos, tomando café y perdiéndonos por las calles.' },
      { city_name: 'Cartagena', latitude: 10.391, longitude: -75.4794, visit_date: '2024-12-28', trip_title: 'Nuestro primer mar juntos 🌊', trip_story: 'Ver el atardecer en la muralla, caminando por la ciudad amurallada contigo fue magia.' },
    ]
    const { error } = await db.from('map_locations').insert(locations)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, seeded: locations.length })
  }

  const db = getServerClient()
  const { data, error } = await db
    .from('map_locations')
    .insert([{
      city_name: body.city_name,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      visit_date: body.visit_date,
      trip_title: body.trip_title,
      trip_story: body.trip_story || null,
      photo_urls: body.photo_urls || null,
      trip_song_spotify_uri: body.trip_song_spotify_uri || null,
    }])
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
  const { error } = await db.from('map_locations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
