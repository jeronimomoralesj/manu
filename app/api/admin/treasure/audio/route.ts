import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { requireLettersAdmin } from '@/lib/letters-admin'
import { AUDIO_TYPES, MAX_AUDIO_BYTES, audioMatchesType } from '@/lib/treasure'
import { rpcError, treasureJson } from '@/lib/treasure-server'

export async function POST(req: NextRequest) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  const type = req.headers.get('content-type')?.split(';')[0] ?? ''
  if (!AUDIO_TYPES.includes(type)) return treasureJson({ error: 'Elige un archivo MP3, M4A, OGG, WAV o WebM.' }, 415)
  if (Number(req.headers.get('content-length')) > MAX_AUDIO_BYTES) return treasureJson({ error: 'El audio debe pesar como máximo 4 MB.' }, 413)
  const buffer = await req.arrayBuffer()
  if (!buffer.byteLength || buffer.byteLength > MAX_AUDIO_BYTES) return treasureJson({ error: 'El audio debe pesar entre 1 byte y 4 MB.' }, 413)
  if (!audioMatchesType(new Uint8Array(buffer), type)) return treasureJson({ error: 'El archivo no parece contener audio del formato indicado. Prueba con un MP3 válido.' }, 415)
  const { data: bucket } = await auth.db.storage.getBucket('treasure-audio')
  if (!bucket || bucket.public) return treasureJson({ error: 'Configura primero el almacenamiento privado de audio.' }, 409)
  const path = `${randomUUID()}/song`
  const { error } = await auth.db.storage.from('treasure-audio').upload(path, buffer, { contentType: type, upsert: false })
  if (error) return treasureJson({ error: 'No pudimos guardar el audio privado.' }, 503)
  const { error: saveError } = await auth.db.rpc('treasure_set_audio', { p_audio_path: path, p_audio_content_type: type })
  if (saveError) {
    // Remove only this failed request's fresh upload, never an existing song.
    await auth.db.storage.from('treasure-audio').remove([path])
    return rpcError(saveError)
  }
  return treasureJson({ audio_configured: true })
}
