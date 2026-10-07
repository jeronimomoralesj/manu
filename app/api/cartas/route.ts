import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { publicCarta } from '@/lib/cartas'
import type { Carta } from '@/types'

export async function GET() {
  const { data, error } = await getServerClient().from('cartas').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las cartas.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  const now = Date.now()
  return NextResponse.json((data ?? []).map((c: Carta) => publicCarta(c, now)), { headers: { 'Cache-Control': 'no-store' } })
}
// Legacy write paths also require the verified letters-admin session.
export { POST, DELETE } from '@/app/api/admin/cartas/route'
