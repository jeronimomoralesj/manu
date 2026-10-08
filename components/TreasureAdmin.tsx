'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Check, Gift, KeyRound, LockKeyhole, Mail, Music, RefreshCw, Upload } from 'lucide-react'
import { MAX_AUDIO_BYTES } from '@/lib/treasure'

type NotificationEvent = {
  id: string
  created_at: string
  sent_at: string | null
  last_error: string | null
}

type TreasureConfig = {
  enabled: boolean
  eligible_questions: number
  questions_needed: number
  codes_configured: boolean[]
  audio_configured: boolean
  title: string
  message: string
  notification_configured: boolean
  notification_email: string | null
  events: NotificationEvent[]
}

const EMPTY_CODES = ['', '', '', '']
const INPUT = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-[#FF5722] focus:ring-2 focus:ring-orange-100 disabled:opacity-50'
const BUTTON = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const ACCEPT_AUDIO = 'audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm,.mp3,.m4a,.ogg,.wav,.webm'

function normalizedCode(code: string) { return code.trim().toUpperCase() }
function validCode(code: string) { return /^[A-Z0-9 -]{4,64}$/.test(normalizedCode(code)) }
function errorText(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback }

function audioContentType(file: File): string | null {
  const aliases: Record<string, string> = { 'audio/mp3': 'audio/mpeg', 'audio/x-m4a': 'audio/mp4', 'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav' }
  const type = file.type.split(';')[0].toLowerCase()
  const contentType = aliases[type] ?? type
  if (['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'].includes(contentType)) return contentType
  if (type) return null
  const extensions: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm' }
  return extensions[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? null
}

function readConfig(value: unknown): TreasureConfig {
  if (!value || typeof value !== 'object') throw new Error('No pudimos leer la configuración de la sorpresa. Inténtalo de nuevo.')
  const result = value as Partial<TreasureConfig>
  if (typeof result.enabled !== 'boolean' || !Array.isArray(result.codes_configured) || result.codes_configured.length !== 4 || result.codes_configured.some(code => typeof code !== 'boolean') || typeof result.audio_configured !== 'boolean' || typeof result.notification_configured !== 'boolean' || typeof result.title !== 'string' || typeof result.message !== 'string' || !Array.isArray(result.events)) {
    throw new Error('La configuración recibida no es válida. Recarga para intentarlo de nuevo.')
  }
  return result as TreasureConfig
}

function eventDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function Readiness({ ready, children }: { ready: boolean; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${ready ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
    {ready ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}{children}
  </span>
}

export default function TreasureAdmin({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [config, setConfig] = useState<TreasureConfig | null>(null)
  const [codes, setCodes] = useState<string[]>(EMPTY_CODES)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const audioInput = useRef<HTMLInputElement>(null)
  const loadId = useRef(0)
  const invalidateLoads = useCallback(() => { loadId.current++ }, [])

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const { data, error: authError } = await client.auth.getSession()
    if (authError || !data.session || data.session.user.id !== userId || data.session.user.app_metadata.letters_admin !== true) {
      setBlocked(true); setConfig(null); setCodes(EMPTY_CODES)
      throw new Error('Tu sesión ya no permite administrar la sorpresa. Cierra la sesión y vuelve a entrar con una cuenta autorizada.')
    }
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    const response = await fetch(path, { ...init, headers, cache: 'no-store' })
    const result = await response.json().catch(() => null)
    if (response.status === 401 || response.status === 403) {
      setBlocked(true); setConfig(null); setCodes(EMPTY_CODES)
      throw new Error('Tu sesión no es válida o no tiene permiso. Cierra la sesión y vuelve a entrar con una cuenta autorizada.')
    }
    if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : 'No pudimos completar la solicitud. Inténtalo de nuevo.')
    return result
  }, [client, userId])

  const load = useCallback(async (fillForm = false) => {
    const id = ++loadId.current
    const result = readConfig(await request('/api/admin/treasure'))
    if (id !== loadId.current) return
    setConfig(result)
    if (fillForm) {
      setEnabled(result.enabled); setTitle(result.title); setMessage(result.message); setCodes(EMPTY_CODES)
    }
  }, [request])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      void load(true).catch(err => {
        if (active) setError(errorText(err, 'No pudimos cargar la sorpresa. Revisa tu conexión.'))
      }).finally(() => { if (active) setLoading(false) })
    })
    return () => { active = false; invalidateLoads() }
  }, [load, invalidateLoads])

  const busy = saving || uploading || retrying || loading
  const codesReady = codes.every((code, index) => normalizedCode(code) ? validCode(code) : config?.codes_configured[index] === true)
  const canEnable = codesReady && config?.audio_configured === true && config?.notification_configured === true
  const pendingEvents = config?.events.filter(event => !event.sent_at) ?? []

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setError(''); setNotice('')
    const nextCodes = codes.map(normalizedCode)
    const invalid = nextCodes.findIndex(code => code !== '' && !validCode(code))
    if (invalid !== -1) { setError(`El código ${invalid + 1} debe tener entre 4 y 64 caracteres: letras A–Z, números, espacios o guiones.`); return }
    if (enabled && !canEnable) { setError('Completa los cuatro códigos, la canción y la configuración del aviso por correo antes de activar la sorpresa.'); return }
    if (!title.trim() || !message.trim()) { setError('Escribe el título y el mensaje de la sorpresa.'); return }
    setSaving(true)
    let saved = false
    try {
      await request('/api/admin/treasure', { method: 'PATCH', body: JSON.stringify({ enabled, codes: nextCodes, title: title.trim(), message: message.trim() }) })
      saved = true
      setCodes(EMPTY_CODES)
      await load(true)
      setNotice(enabled ? 'Sorpresa guardada y activada. Las cuatro llaves ya están listas.' : 'Configuración guardada. La sorpresa permanece desactivada.')
    } catch (err) {
      setError(saved ? 'Los cambios se guardaron, pero no pudimos actualizar el estado. Recarga antes de hacer otro cambio.' : errorText(err, 'No pudimos guardar la sorpresa.'))
    } finally { setSaving(false) }
  }

  async function uploadAudio(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(''); setNotice('')
    const contentType = audioContentType(file)
    if (!contentType) { setError('Elige un archivo MP3, M4A, OGG, WAV o WebM.'); return }
    if (file.size === 0 || file.size > MAX_AUDIO_BYTES) { setError('El audio debe pesar como máximo 4 MB y no puede estar vacío.'); return }
    setUploading(true)
    let uploaded = false
    try {
      await request('/api/admin/treasure/audio', { method: 'POST', headers: { 'Content-Type': contentType }, body: file })
      uploaded = true
      await load()
      setNotice('Canción subida y guardada. Solo se podrá escuchar al abrir la sorpresa.')
    } catch (err) {
      setError(uploaded ? 'La canción se subió, pero no pudimos actualizar el estado. Recarga para comprobarla antes de volver a subirla.' : errorText(err, 'No pudimos subir la canción. Inténtalo de nuevo.'))
    } finally { setUploading(false) }
  }

  async function retryNotification() {
    setRetrying(true); setError(''); setNotice('')
    try {
      const result = await request('/api/admin/treasure/notify', { method: 'POST' })
      await load()
      if (result?.status === 'unconfigured') throw new Error('Falta configurar el servicio de correo y su remitente en el servidor.')
      if (result?.status === 'unavailable') throw new Error('No pudimos consultar el aviso pendiente. Inténtalo de nuevo en un momento.')
      if (result?.status === 'retry_pending') throw new Error('El servicio aún no confirmó el envío. El aviso sigue pendiente para un nuevo intento sin duplicarlo.')
      if (result?.status === 'accepted') setNotice('El servicio de correo aceptó el aviso. Puedes comprobar el registro a continuación.')
      else if (result?.status === 'pending_confirmation') setNotice('El servicio aceptó el aviso; falta confirmar su registro. El estado sigue pendiente de confirmación.')
      else if (result?.status === 'no_pending_delivery') setNotice('No hay un aviso listo para enviar ahora. Revisa el estado a continuación; si hay un intento en curso, espera antes de reintentar.')
      else setNotice('Reintento solicitado. Revisa el estado del aviso a continuación.')
    } catch (err) { setError(errorText(err, 'No pudimos reintentar el aviso.')) }
    finally { setRetrying(false) }
  }

  async function reload() {
    setLoading(true); setError(''); setNotice('')
    try { await load(true) }
    catch (err) { setError(errorText(err, 'No pudimos cargar la sorpresa.')) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}
      {loading && <p role="status" className="py-4 text-sm text-gray-500">Cargando la sorpresa…</p>}
      {!config && !loading && !blocked && <button onClick={reload} className={`${BUTTON} border border-gray-200 bg-white text-gray-700`}><RefreshCw className="h-4 w-4" />Volver a cargar</button>}
      {config && !blocked && <>
        <section className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-rose-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#FF5722] shadow-sm"><Gift className="h-5 w-5" aria-hidden="true" /></div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700">Solo para ustedes</p>
              <h2 className="text-lg font-bold text-gray-900">Una sorpresa, cuatro llaves</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">Prepara los códigos y esa canción especial. Cada código correcto abre una grieta; el cuarto revela el regalo.</p>
            </div>
          </div>
          {config.eligible_questions < config.questions_needed && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Quedan {config.eligible_questions} preguntas nuevas disponibles y hacen falta {config.questions_needed} aciertos para revelar las grietas restantes. Añade preguntas en Trivia antes de empezar; restablecer preguntas antiguas no cuenta.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Readiness ready={config.enabled}>{config.enabled ? 'Sorpresa activa' : 'Sorpresa desactivada'}</Readiness>
            <Readiness ready={config.codes_configured.every(Boolean)}>{config.codes_configured.filter(Boolean).length}/4 códigos guardados</Readiness>
            <Readiness ready={config.audio_configured}>{config.audio_configured ? 'Canción lista' : 'Falta la canción'}</Readiness>
          </div>
        </section>

        <form onSubmit={save} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
            <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-gray-800"><KeyRound className="h-4 w-4 text-[#FF5722]" aria-hidden="true" />Las cuatro llaves</h3>
              <p id="treasure-codes-help" className="text-sm leading-relaxed text-gray-500">Deja un campo vacío para conservar su código. Los códigos guardados nunca se muestran. Usa de 4 a 64 caracteres: letras A–Z, números, espacios o guiones; se guardarán en mayúsculas.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {codes.map((code, index) => <label key={index} className="block text-sm font-medium text-gray-700">
                  <span className="mb-1.5 flex items-center justify-between gap-2">Código {index + 1}<span className={`text-xs font-normal ${config.codes_configured[index] ? 'text-green-700' : 'text-amber-700'}`}>{config.codes_configured[index] ? 'Guardado' : 'Pendiente'}</span></span>
                  <input type="password" value={code} maxLength={64} autoComplete="new-password" spellCheck={false} autoCapitalize="characters" aria-describedby="treasure-codes-help" onChange={event => setCodes(current => current.map((value, i) => i === index ? event.target.value : value))} className={INPUT} placeholder={config.codes_configured[index] ? 'Vacío conserva el código' : 'Escribe una llave secreta'} />
                </label>)}
              </div>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Cambiar los códigos no reinicia las grietas ni vuelve a entregar el regalo.</p>
            </section>

            <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-gray-800"><Music className="h-4 w-4 text-[#FF5722]" aria-hidden="true" />La canción del regalo</h3>
              <p className="text-sm leading-relaxed text-gray-500">Sube el audio que se escuchará al abrir el tesoro. MP3, M4A, OGG, WAV o WebM, de hasta 4 MB.</p>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => audioInput.current?.click()} className={`${BUTTON} border border-dashed border-orange-200 bg-orange-50 text-orange-800`}><Upload className="h-4 w-4" aria-hidden="true" />{uploading ? 'Subiendo canción…' : config.audio_configured ? 'Reemplazar canción' : 'Subir canción'}</button>
                <Readiness ready={config.audio_configured}>{config.audio_configured ? 'Audio guardado' : 'Aún sin audio'}</Readiness>
                <input ref={audioInput} type="file" accept={ACCEPT_AUDIO} onChange={uploadAudio} className="hidden" aria-label="Archivo de la canción" />
              </div>
              <p className="text-xs leading-relaxed text-gray-500">La canción se guarda al subirla. Si ya hay una, la nueva la reemplaza de inmediato.</p>
            </section>

            <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-gray-800">El momento de abrirlo</h3>
              <label className="block text-sm font-medium text-gray-700">Título del regalo
                <input required value={title} maxLength={160} onChange={event => setTitle(event.target.value)} className={`${INPUT} mt-1.5`} placeholder="Una canción, solo para ti" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Mensaje al descubrirlo
                <textarea required value={message} maxLength={2000} rows={4} onChange={event => setMessage(event.target.value)} className={`${INPUT} mt-1.5 resize-y`} placeholder="El mensaje que encontrará después de la cuarta llave…" />
              </label>
            </section>

            <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="treasure-enabled" className="text-sm font-bold text-gray-800">Activar la sorpresa</label>
                <input id="treasure-enabled" type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} disabled={!canEnable && !enabled} aria-describedby="treasure-enable-help" className="h-5 w-5 accent-[#FF5722] disabled:cursor-not-allowed" />
              </div>
              <p id="treasure-enable-help" className="text-sm leading-relaxed text-gray-500">{canEnable ? 'Todo está listo. Actívala y guarda los cambios cuando quieras que pueda descubrirla.' : 'Para activarla necesitas los cuatro códigos, la canción y el aviso por correo configurado.'}</p>
              <button type="submit" className={`${BUTTON} w-full bg-[#FF5722] text-white hover:bg-orange-600`}><Check className="h-4 w-4" aria-hidden="true" />{saving ? 'Guardando…' : 'Guardar sorpresa'}</button>
            </section>
          </fieldset>
        </form>

        <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-bold text-gray-800"><Mail className="h-4 w-4 text-[#FF5722]" aria-hidden="true" />Aviso al abrir el tesoro</h3>
            <Readiness ready={config.notification_configured}>{config.notification_configured ? 'Configurado' : 'Falta configurar'}</Readiness>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">Al completar las cuatro llaves se prepara un único aviso para el correo verificado del administrador.</p>
          {config.notification_email ? <p className="break-all rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">Destino: {config.notification_email}</p> : <p className="text-sm text-amber-800">Falta un correo de administrador verificado para recibir el aviso.</p>}
          {!config.notification_configured && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">La sorpresa no se puede activar todavía. Quien administra el servidor debe configurar el servicio de correo y su remitente. Las credenciales se guardan en el servidor, nunca en este formulario.</p>}
          {config.events.length === 0 ? <p className="text-sm text-gray-500">Todavía no se ha registrado una apertura del tesoro.</p> : <ul className="space-y-2">
            {config.events.map(event => <li key={event.id} className="space-y-1 rounded-xl border border-gray-100 p-3">
              <p className={`text-sm font-semibold ${event.sent_at ? 'text-green-700' : event.last_error ? 'text-amber-800' : 'text-gray-700'}`}>{event.sent_at ? 'Aviso aceptado por el servicio de correo' : event.last_error ? 'El aviso necesita revisión' : 'Aviso pendiente de envío'}</p>
              <p className="text-xs text-gray-500">Tesoro abierto: {eventDate(event.created_at)}</p>
              {event.sent_at && <p className="text-xs text-gray-500">Enviado al servicio: {eventDate(event.sent_at)}</p>}
              {!event.sent_at && event.last_error && <p className="text-xs text-amber-800">El servicio no confirmó el envío. Revisa la configuración y vuelve a intentarlo.</p>}
            </li>)}
          </ul>}
          {pendingEvents.length > 0 && <button type="button" onClick={retryNotification} disabled={busy || !config.notification_configured} className={`${BUTTON} border border-gray-200 text-gray-700 hover:bg-gray-50`}><RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />{retrying ? 'Reintentando…' : 'Reintentar aviso pendiente'}</button>}
        </section>
      </>}
    </div>
  )
}
