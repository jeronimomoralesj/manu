import { getServerClient } from '@/lib/supabase'
import { AUDIO_TYPES, isComplete, TREASURE_HEADERS } from '@/lib/treasure'
import { readTreasureState, treasureJson } from '@/lib/treasure-server'
export async function GET() {
  try {
    const db = getServerClient()
    if (!isComplete(await readTreasureState(db))) return treasureJson({ error: 'Todavía quedan pistas por resolver.' }, 423)
    const { data: config, error } = await db.from('treasure_config').select('audio_path,audio_content_type').eq('id', 1).single()
    if (error || !config?.audio_path) return treasureJson({ error: 'El audio se está preparando.' }, 503)
    const { data: audio, error: storageError } = await db.storage.from('treasure-audio').download(config.audio_path)
    if (storageError || !audio) return treasureJson({ error: 'No pudimos cargar el audio. Inténtalo de nuevo.' }, 503)
    return new Response(audio, { headers: { ...TREASURE_HEADERS, 'Content-Type': AUDIO_TYPES.includes(config.audio_content_type) ? config.audio_content_type : 'application/octet-stream', 'Content-Disposition': 'inline', 'Content-Length': String(audio.size) } })
  } catch { return treasureJson({ error: 'No pudimos cargar el audio.' }, 503) }
}
