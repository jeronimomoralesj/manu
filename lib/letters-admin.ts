import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' }

export async function requireLettersAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) return { response: NextResponse.json({ error: 'Inicia sesión para administrar las cartas.' }, { status: 401, headers: PRIVATE_HEADERS }) }
  const db = getServerClient()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return { response: NextResponse.json({ error: 'Tu sesión venció. Vuelve a iniciar sesión.' }, { status: 401, headers: PRIVATE_HEADERS }) }
  // app_metadata is controlled by the server, unlike user_metadata.
  if (data.user.app_metadata?.letters_admin !== true) return { response: NextResponse.json({ error: 'Esta cuenta no tiene permiso para administrar cartas.' }, { status: 403, headers: PRIVATE_HEADERS }) }
  return { db, user: data.user }
}
