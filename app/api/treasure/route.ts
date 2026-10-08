import { after, NextRequest } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { crackIndex, normalizeCode } from '@/lib/treasure'
import { mutationOriginError, readTreasureState, rpcError, treasureJson } from '@/lib/treasure-server'
import { deliverTreasureNotification } from '@/lib/treasure-notifications'

export async function GET() {
  try { return treasureJson(await readTreasureState(getServerClient())) }
  catch { return treasureJson({ error: 'No pudimos cargar tu progreso. Inténtalo de nuevo.' }, 503) }
}
export async function POST(req: NextRequest) {
  const denied = mutationOriginError(req)
  if (denied) return denied
  try {
    const body = await req.json()
    const db = getServerClient()
    if (body.action === 'ack') {
      const { data, error } = await db.rpc('treasure_ack_completion')
      if (error) return rpcError(error)
      after(async () => { await deliverTreasureNotification(db) })
      return treasureJson({ state: data })
    }
    const index = crackIndex(body.index)
    if (body.action === 'open') {
      const { data, error } = await db.rpc('treasure_open', { p_index: index })
      return error ? rpcError(error) : treasureJson({ state: data })
    }
    if (body.action !== 'validate') return treasureJson({ error: 'Acción inválida.' }, 400)
    const { data, error } = await db.rpc('treasure_validate', { p_index: index, p_code: normalizeCode(body.code) })
    if (error) return rpcError(error)
    if (data.state?.completed_at) after(async () => { await deliverTreasureNotification(db) })
    return treasureJson({ state: data.state, correct: data.ok, ...(data.error ? { error: data.error === 'rate_limited' ? 'Espera un minuto antes de probar de nuevo.' : 'Ese código no coincide. Revisa tu pista.' } : {}), ...(data.retry_after_seconds ? { retry_after_seconds: data.retry_after_seconds } : {}) }, data.retry_after_seconds ? 429 : 200)
  } catch (error) {
    return treasureJson({ error: error instanceof SyntaxError ? 'Solicitud inválida.' : error instanceof Error ? error.message : 'No pudimos guardar el progreso.' }, 400)
  }
}
