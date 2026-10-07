import { NextRequest, NextResponse } from 'next/server'
import { requireLettersAdmin, PRIVATE_HEADERS } from '@/lib/letters-admin'
import { parseCartaInput, isCartaLocked } from '@/lib/cartas'
import type { Carta } from '@/types'

export async function GET(req: NextRequest) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  const { data, error } = await auth.db.from('cartas').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las cartas.' }, { status: 500, headers: PRIVATE_HEADERS })
  return NextResponse.json((data ?? []).map((c: Carta) => ({ ...c, is_locked: isCartaLocked(c) })), { headers: PRIVATE_HEADERS })
}

export async function POST(req: NextRequest) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  let fields
  try { fields = parseCartaInput(await req.json()) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Datos inválidos.' }, { status: 400, headers: PRIVATE_HEADERS }) }
  const { data, error } = await auth.db.from('cartas').insert({ ...fields, is_read: false }).select().single()
  if (error) return NextResponse.json({ error: 'No se pudo guardar la carta.' }, { status: 500, headers: PRIVATE_HEADERS })
  return NextResponse.json({ ...data, is_locked: isCartaLocked(data) }, { status: 201, headers: PRIVATE_HEADERS })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta la carta.' }, { status: 400, headers: PRIVATE_HEADERS })
  const { error } = await auth.db.from('cartas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo eliminar la carta.' }, { status: 500, headers: PRIVATE_HEADERS })
  return NextResponse.json({ ok: true }, { headers: PRIVATE_HEADERS })
}
