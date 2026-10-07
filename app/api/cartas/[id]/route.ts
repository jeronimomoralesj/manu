import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { publicCarta, isCartaLocked } from '@/lib/cartas'

const headers = { 'Cache-Control': 'no-store' }
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await getServerClient().from('cartas').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo cargar la carta.' }, { status: 500, headers })
  if (!data) return NextResponse.json({ error: 'Carta no encontrada.' }, { status: 404, headers })
  if (isCartaLocked(data)) return NextResponse.json({ error: 'Esta carta todavía está cerrada.' }, { status: 423, headers })
  return NextResponse.json(publicCarta(data), { headers })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400, headers }) }
  if (body?.is_read !== true || Object.keys(body).some(key => key !== 'is_read')) return NextResponse.json({ error: 'Solo se puede marcar una carta como leída.' }, { status: 400, headers })
  // The time condition is part of the update so locked letters cannot be changed.
  const { data, error } = await getServerClient().from('cartas').update({ is_read: true }).eq('id', id)
    .or(`unlock_at.is.null,unlock_at.lte.${new Date().toISOString()}`).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo marcar la carta como leída.' }, { status: 500, headers })
  if (!data) return NextResponse.json({ error: 'La carta está cerrada o no existe.' }, { status: 423, headers })
  // Never return letter content from the public write endpoint.
  return NextResponse.json({ ok: true }, { headers })
}
