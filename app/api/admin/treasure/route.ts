import { NextRequest } from 'next/server'
import { requireLettersAdmin } from '@/lib/letters-admin'
import { parseTreasureConfig } from '@/lib/treasure'
import { notificationConfigured, readTreasureState, rpcError, treasureJson } from '@/lib/treasure-server'

export async function GET(req: NextRequest) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  const [config, cracks, events, questions, answers] = await Promise.all([
    auth.db.from('treasure_config').select('enabled,reward_title,reward_message,audio_path,notification_email').eq('id', 1).single(),
    auth.db.from('treasure_cracks').select('crack_index,code_hash').order('crack_index'),
    auth.db.from('treasure_completion_outbox').select('id,created_at,sent_at,last_error').order('created_at', { ascending: false }),
    auth.db.from('trivia_questions').select('id').eq('is_answered', false),
    auth.db.from('treasure_answers').select('question_id'),
  ])
  if (config.error || cracks.error || events.error || questions.error || answers.error) return treasureJson({ error: 'Falta aplicar la migración de la sorpresa o no se pudo cargar.' }, 503)
  try {
    const state = await readTreasureState(auth.db)
    const answered = new Set(answers.data.map(row => row.question_id))
    const eligible = questions.data.filter(row => !answered.has(row.id)).length
    return treasureJson({ enabled: config.data.enabled, title: config.data.reward_title, message: config.data.reward_message,
      codes_configured: [0, 1, 2, 3].map(index => !!cracks.data.find(c => c.crack_index === index)?.code_hash),
      audio_configured: !!config.data.audio_path, notification_email: config.data.notification_email ?? auth.user.email,
      notification_configured: notificationConfigured() && !!(config.data.notification_email || (auth.user.email_confirmed_at && auth.user.email)), events: events.data,
      state, eligible_questions: eligible, questions_needed: state.cracks.filter(crack => !crack.revealed_at).length })
  } catch { return treasureJson({ error: 'No pudimos cargar el progreso.' }, 503) }
}
export async function PATCH(req: NextRequest) {
  const auth = await requireLettersAdmin(req)
  if (auth.response) return auth.response
  try {
    const input = parseTreasureConfig(await req.json())
    if (!auth.user.email_confirmed_at || !auth.user.email) return treasureJson({ error: 'Verifica el correo de tu cuenta antes de configurar el aviso.' }, 409)
    if (input.enabled && !notificationConfigured()) return treasureJson({ error: 'Configura primero el envío de correo en el servidor. La sorpresa sigue desactivada.' }, 409)
    const { error } = await auth.db.rpc('treasure_configure', { p_enabled: input.enabled, p_reward_title: input.title, p_reward_message: input.message, p_codes: input.codes, p_notification_email: auth.user.email })
    if (error) return rpcError(error)
    return GET(req)
  } catch (error) { return treasureJson({ error: error instanceof Error ? error.message : 'Configuración inválida.' }, 400) }
}
