import { timingSafeEqual } from 'node:crypto'
import { NextRequest } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { deliverTreasureNotification } from '@/lib/treasure-notifications'
import { treasureJson } from '@/lib/treasure-server'
export async function GET(req: NextRequest) {
  const configured = process.env.CRON_SECRET
  const authorization = req.headers.get('authorization') ?? ''
  const expected = configured ? `Bearer ${configured}` : ''
  if (!expected || Buffer.byteLength(authorization) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) return treasureJson({ error: 'No autorizado.' }, 401)
  return treasureJson(await deliverTreasureNotification(getServerClient()))
}
