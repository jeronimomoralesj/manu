import type { SupabaseClient } from '@supabase/supabase-js'

type Notification = { id: number; payload: { from: string; to: string; subject: string; text: string }; lease_until: string }
export function mailReady(env: Record<string, string | undefined> = process.env) { return !!env.RESEND_API_KEY && !!env.TREASURE_EMAIL_FROM }

// A stable provider key deduplicates retried HTTP requests. The DB stops uncertain
// retries after 23h, before Resend's 24h key expiry; review is then required.
export async function sendCompletionMail(event: Notification, send: typeof fetch = fetch, env: Record<string, string | undefined> = process.env) {
  if (!mailReady(env) || !event.payload.from) throw new Error('Email delivery is not configured.')
  const response = await send('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `manu-treasure-completed-${event.id}` },
    body: JSON.stringify({ from: event.payload.from, to: [event.payload.to], subject: event.payload.subject, text: event.payload.text }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || typeof result?.id !== 'string') throw new Error(`Email provider did not confirm acceptance (${response.status}).`)
  return result.id as string
}

export async function deliverTreasureNotification(db: SupabaseClient) {
  if (!mailReady()) return { status: 'unconfigured' }
  const { data: event, error } = await db.rpc('treasure_claim_notification', { p_from: process.env.TREASURE_EMAIL_FROM })
  if (error) return { status: 'unavailable' }
  if (!event) return { status: 'no_pending_delivery' }
  try {
    const id = await sendCompletionMail(event)
    const { error: saveError } = await db.from('treasure_completion_outbox').update({ sent_at: new Date().toISOString(), provider_id: id, last_error: null, lease_until: null }).eq('id', event.id).eq('lease_until', event.lease_until)
    return { status: saveError ? 'pending_confirmation' : 'accepted' }
  } catch {
    // No provider response bodies, recipient addresses, credentials or private
    // reward content are copied to logs or the public API.
    await db.from('treasure_completion_outbox').update({ last_error: 'No se confirmó la entrega. Se reintentará sin duplicar el aviso.', lease_until: null, next_attempt_at: new Date(Date.now() + 60000).toISOString() }).eq('id', event.id).eq('lease_until', event.lease_until)
    return { status: 'retry_pending' }
  }
}
