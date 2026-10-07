import { NextRequest, NextResponse } from 'next/server'
import { requireLettersAdmin, PRIVATE_HEADERS } from '@/lib/letters-admin'
import { parseCartaInput, isCartaLocked } from '@/lib/cartas'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  const { id } = await params
  let fields
  try { fields = parseCartaInput(await req.json()) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Datos inválidos.' }, { status: 400, headers: PRIVATE_HEADERS }) }
  const { data, error } = await auth.db.from('cartas').update(fields).eq('id', id).select().maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo guardar la carta.' }, { status: 500, headers: PRIVATE_HEADERS })
  if (!data) return NextResponse.json({ error: 'Carta no encontrada.' }, { status: 404, headers: PRIVATE_HEADERS })
  return NextResponse.json({ ...data, is_locked: isCartaLocked(data) }, { headers: PRIVATE_HEADERS })
}
