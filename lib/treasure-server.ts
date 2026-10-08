import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TREASURE_HEADERS, type TreasureState } from '@/lib/treasure'

export function treasureJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: TREASURE_HEADERS })
}
export function mutationOriginError(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (req.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== req.nextUrl.origin)) return treasureJson({ error: 'Solicitud no permitida.' }, 403)
  return null
}
export async function readTreasureState(db: SupabaseClient): Promise<TreasureState> {
  const { data, error } = await db.rpc('treasure_state')
  if (error || !data) throw new Error('No pudimos cargar tu progreso. Inténtalo de nuevo.')
  return data as TreasureState
}
export function notificationConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.TREASURE_EMAIL_FROM
}
export function rpcError(error: { code?: string; message?: string }) {
  // Database messages are never returned verbatim: they may contain private input.
  const status = error.message?.startsWith('TREASURE_') && error.code === 'P0001' ? 409 : error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : error.code === '55000' ? 409 : 503
  return treasureJson({ error: status === 503 ? 'La sorpresa aún no está disponible. Tu progreso está guardado.' : 'No se pudo completar esta acción. Recarga e inténtalo de nuevo.' }, status)
}
