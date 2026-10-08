import { NextRequest } from 'next/server'
import { requireLettersAdmin } from '@/lib/letters-admin'
import { deliverTreasureNotification } from '@/lib/treasure-notifications'
import { treasureJson } from '@/lib/treasure-server'
export async function POST(req: NextRequest) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  return treasureJson(await deliverTreasureNotification(auth.db))
}
