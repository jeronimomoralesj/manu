import { getServerClient } from '@/lib/supabase'
import { isComplete } from '@/lib/treasure'
import { readTreasureState, treasureJson } from '@/lib/treasure-server'
export async function GET() {
  try {
    const db = getServerClient()
    if (!isComplete(await readTreasureState(db))) return treasureJson({ error: 'Todavía quedan pistas por resolver.' }, 423)
    const { data, error } = await db.from('treasure_config').select('reward_title,reward_message,audio_path').eq('id', 1).single()
    if (error || !data?.audio_path) return treasureJson({ error: 'La sorpresa se está preparando.' }, 503)
    return treasureJson({ title: data.reward_title, message: data.reward_message, audio_url: '/api/treasure/audio' })
  } catch { return treasureJson({ error: 'No pudimos abrir la sorpresa. Inténtalo de nuevo.' }, 503) }
}
