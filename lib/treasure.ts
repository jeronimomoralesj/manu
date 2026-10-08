/** Public shapes and input validation only. No codes, hashes or reward data here. */
export interface CrackState { index: number; revealed_at: string | null; opened_at: string | null; solved_at: string | null }
export interface TreasureState { enabled: boolean; cracks: CrackState[]; completed_at: string | null; completion_seen_at: string | null }
export const TREASURE_HEADERS = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Authorization' }
export const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm']
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024
export function crackIndex(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 3) throw new Error('Elige una de las cuatro grietas.')
  return Number(value)
}
export function normalizeCode(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Escribe el código de tu pista.')
  const code = value.trim().toUpperCase()
  if (!/^[A-Z0-9 -]{4,64}$/.test(code)) throw new Error('Usa entre 4 y 64 letras, números, espacios o guiones.')
  return code
}
export function parseTreasureConfig(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Configuración inválida.')
  const body = input as Record<string, unknown>
  if (typeof body.enabled !== 'boolean') throw new Error('Indica si la sorpresa está activa.')
  if (!Array.isArray(body.codes) || body.codes.length !== 4) throw new Error('Configura exactamente cuatro códigos.')
  const codes = body.codes.map(value => typeof value === 'string' && !value.trim() ? '' : normalizeCode(value))
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 160) throw new Error('Escribe un título de hasta 160 caracteres.')
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 2000) throw new Error('Escribe un mensaje de hasta 2000 caracteres.')
  return { enabled: body.enabled, codes, title: body.title.trim(), message: body.message.trim() }
}
export function isComplete(state: TreasureState | null | undefined): boolean {
  return state?.enabled === true && !!state.completed_at && state.cracks.length === 4 && state.cracks.every((crack, index) => crack.index === index && !!crack.solved_at)
}
export function parseQuestion(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Pregunta inválida.')
  const body = input as Record<string, unknown>
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 1000) throw new Error('Escribe una pregunta de hasta 1000 caracteres.')
  if (!Array.isArray(body.options) || body.options.length < 2 || body.options.length > 6 || body.options.some(o => typeof o !== 'string' || !o.trim() || o.length > 500)) throw new Error('Agrega entre 2 y 6 opciones válidas.')
  const index = Number(body.correct_option_index)
  const points = Number(body.points_reward)
  if (!Number.isInteger(index) || index < 0 || index >= body.options.length) throw new Error('Selecciona la respuesta correcta.')
  if (!Number.isInteger(points) || points < 1 || points > 1000) throw new Error('Los puntos deben estar entre 1 y 1000.')
  return { question: body.question.trim(), options: body.options.map(o => (o as string).trim()), correct_option_index: index, points_reward: points }
}

/** Lightweight container checks, not a promise that the full audio decodes. */
export function audioMatchesType(bytes: Uint8Array, type: string) {
  const text = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length))
  if (type === 'audio/mpeg') return text(0, 3) === 'ID3' || (bytes.length >= 4 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x18) !== 0x08 && (bytes[1] & 0x06) !== 0)
  if (type === 'audio/mp4') return text(4, 4) === 'ftyp'
  if (type === 'audio/ogg') return text(0, 4) === 'OggS'
  if (type === 'audio/wav') return text(0, 4) === 'RIFF' && text(8, 4) === 'WAVE'
  if (type === 'audio/webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  return false
}
