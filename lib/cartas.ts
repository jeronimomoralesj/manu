import type { Carta } from '../types/index.ts'

export const LETTER_TIME_ZONE = 'America/Bogota'

// Colombia uses UTC-05:00 year-round. Validate calendar dates before conversion.
export function unlockDateToIso(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00-05:00`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  return date.toISOString()
}

export function isCartaLocked(carta: Pick<Carta, 'unlock_at'>, now = Date.now()) {
  if (!carta.unlock_at) return false // Preserve previously published letters.
  const unlock = Date.parse(carta.unlock_at)
  return !Number.isFinite(unlock) || unlock > now // Fail closed for malformed data.
}

export function publicCarta(carta: Carta, now = Date.now()): Carta {
  const locked = isCartaLocked(carta, now)
  // Explicit fields prevent future private columns leaking into the public API.
  return {
    id: carta.id, title: carta.title, created_at: carta.created_at,
    sent_at: carta.sent_at, unlock_at: carta.unlock_at,
    is_locked: locked, is_read: locked ? false : carta.is_read,
    body: locked ? null : carta.body,
    image_base64: locked ? null : carta.image_base64,
  }
}

export function parseCartaInput(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Datos de carta inválidos.')
  const data = input as Record<string, unknown>
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.trim().length > 200) {
    throw new Error('Escribe un título de hasta 200 caracteres.')
  }
  const unlock_at = unlockDateToIso(data.unlock_date)
  if (!unlock_at) throw new Error('Selecciona una fecha válida de apertura.')
  if (data.body != null && typeof data.body !== 'string') throw new Error('Mensaje inválido.')
  if (data.image_base64 != null && typeof data.image_base64 !== 'string') throw new Error('Imagen inválida.')
  const body = typeof data.body === 'string' ? data.body.trim() || null : null
  const image_base64 = typeof data.image_base64 === 'string' ? data.image_base64 || null : null
  if (!body && !image_base64) throw new Error('Escribe un mensaje o añade una imagen.')
  if ((body?.length ?? 0) > 100000 || (image_base64?.length ?? 0) > 8000000) throw new Error('La carta o la imagen es demasiado grande.')
  if (data.sent_at != null && data.sent_at !== '' && (typeof data.sent_at !== 'string' || !Number.isFinite(Date.parse(data.sent_at)))) throw new Error('Fecha de envío inválida.')
  const sent_at = typeof data.sent_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.sent_at)
    ? unlockDateToIso(data.sent_at) : data.sent_at || null
  if (data.sent_at && !sent_at) throw new Error('Fecha de envío inválida.')
  return { title: data.title.trim(), body, image_base64, unlock_at, sent_at }
}
