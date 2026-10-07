'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { Check, Image as ImageIcon, LogOut, Mail, Pencil, Plus, Trash2, X } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase'
import type { Carta } from '@/types'

type AdminCarta = Carta & { unlock_at: string | null; is_locked: boolean }
const EMPTY_FORM = { title: '', body: '', image_base64: '', sent_at: '', unlock_date: '' }
const INPUT = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#FF5722] transition-colors'
const BUTTON = 'px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed'

function bogotaDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function ErrorMessage({ message }: { message: string }) {
  return message ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null
}

export default function CartasAdmin() {
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    let active = true
    let authChanged = false
    let unsubscribe: (() => void) | undefined
    queueMicrotask(() => {
      if (!active) return
      try {
        const supabase = getBrowserClient()
        setClient(supabase)
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          authChanged = true
          if (active) { setSession(nextSession); setChecking(false) }
        })
        unsubscribe = () => data.subscription.unsubscribe()
        void supabase.auth.getSession().then(({ data, error: authError }) => {
          if (!active || authChanged) return
          setSession(data.session)
          if (authError) setError('No pudimos recuperar tu sesión. Inicia sesión otra vez.')
          setChecking(false)
        }).catch(() => {
          if (active) { setChecking(false); setError('No pudimos comprobar tu sesión. Recarga la página para intentarlo de nuevo.') }
        })
      } catch {
        setChecking(false)
        setError('Falta configurar el acceso seguro a las cartas. Revisa la configuración de Supabase.')
      }
    })
    return () => { active = false; unsubscribe?.() }
  }, [])

  async function login(event: React.FormEvent) {
    event.preventDefault()
    if (!client) return
    setBusy(true); setError('')
    try {
      const { error: loginError } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (loginError) setError('No pudimos iniciar sesión. Revisa tu correo y contraseña e inténtalo de nuevo.')
      else setPassword('')
    } catch { setError('No pudimos conectar. Inténtalo de nuevo en un momento.') }
    finally { setBusy(false) }
  }

  async function logout() {
    if (!client) return
    setBusy(true); setError('')
    try {
      const { error: logoutError } = await client.auth.signOut()
      if (logoutError) setError('No pudimos cerrar la sesión. Inténtalo de nuevo.')
      else { setSession(null); setPassword('') }
    } catch { setError('No pudimos cerrar la sesión. Inténtalo de nuevo.') }
    finally { setBusy(false) }
  }

  if (checking) return <p role="status" className="text-sm text-gray-500 py-6">Comprobando tu sesión…</p>

  return (
    <div className="space-y-5">
      <ErrorMessage message={error} />
      {!session ? (
        <section className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-800">Acceso a las cartas</h2>
          <p className="text-sm text-gray-500">Inicia sesión con una cuenta de administrador autorizada para crear y programar cartas. Si aún no tienes acceso, pídeselo a quien administra esta página.</p>
          <form onSubmit={login} className="space-y-4">
            <label className="block text-sm text-gray-600">Correo electrónico
              <input className={`${INPUT} mt-1`} type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
            </label>
            <label className="block text-sm text-gray-600">Contraseña
              <input className={`${INPUT} mt-1`} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
            </label>
            <button disabled={busy || !client} className={`${BUTTON} bg-[#FF5722] text-white`} type="submit">{busy ? 'Entrando…' : 'Iniciar sesión'}</button>
          </form>
        </section>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500 break-all">{session.user.email}</p>
            <button onClick={logout} disabled={busy} className={`${BUTTON} border border-gray-200 text-gray-600 flex items-center gap-2`}><LogOut className="w-4 h-4" />{busy ? 'Cerrando…' : 'Cerrar sesión'}</button>
          </div>
          {session.user.app_metadata.letters_admin === true && client ? (
            <AuthorizedLetters key={session.user.id} client={client} userId={session.user.id} />
          ) : <ErrorMessage message="Esta cuenta no tiene permiso para administrar cartas. Usa una cuenta autorizada o pide acceso a quien administra esta página." />}
        </>
      )}
    </div>
  )
}

function AuthorizedLetters({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [cartas, setCartas] = useState<AdminCarta[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [readingImage, setReadingImage] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const imageRef = useRef<HTMLInputElement>(null)
  const readerRef = useRef<FileReader | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const loadId = useRef(0)

  useEffect(() => () => { loadId.current++; readerRef.current?.abort() }, [])

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const { data, error: authError } = await client.auth.getSession()
    if (authError || !data.session || data.session.user.id !== userId) {
      setBlocked(true); setCartas([])
      throw new Error('Tu sesión venció. Cierra la sesión y vuelve a entrar para continuar.')
    }
    if (data.session.user.app_metadata.letters_admin !== true) {
      setBlocked(true); setCartas([])
      throw new Error('Esta cuenta ya no tiene permiso para administrar cartas.')
    }
    const response = await fetch(path, {
      ...init, cache: 'no-store', headers: { ...init.headers, Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    })
    if (response.status === 401 || response.status === 403) {
      setBlocked(true); setCartas([])
      throw new Error(response.status === 401 ? 'Tu sesión no es válida. Cierra la sesión y vuelve a entrar.' : 'No tienes permiso para administrar cartas. Pide acceso a quien administra esta página.')
    }
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : 'No pudimos guardar o cargar las cartas. Inténtalo de nuevo.')
    return result
  }, [client, userId])

  const load = useCallback(async () => {
    const id = ++loadId.current
    setLoading(true); setError('')
    try {
      const result = await request('/api/admin/cartas')
      if (!Array.isArray(result)) throw new Error('La respuesta de las cartas no es válida. Inténtalo de nuevo.')
      if (id === loadId.current) setCartas(result)
    } catch (err) {
      if (id === loadId.current) setError(err instanceof Error ? err.message : 'No pudimos cargar las cartas. Revisa tu conexión.')
    } finally { if (id === loadId.current) setLoading(false) }
  }, [request])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void load() })
    return () => { active = false }
  }, [load])

  function cancel() {
    readerRef.current?.abort(); setReadingImage(false)
    setShowForm(false); setEditingId(null); setForm(EMPTY_FORM)
  }

  function edit(carta: AdminCarta) {
    readerRef.current?.abort(); setReadingImage(false)
    setEditingId(carta.id)
    setForm({ title: carta.title, body: carta.body ?? '', image_base64: carta.image_base64 ?? '', sent_at: carta.sent_at ?? '', unlock_date: carta.unlock_at ? bogotaDate(carta.unlock_at) : '' })
    setShowForm(true); setError(''); setMessage('')
  }

  useEffect(() => { if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [showForm, editingId])

  function selectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('Elige una imagen JPG, PNG, WebP o GIF.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen debe pesar menos de 5 MB.'); return }
    readerRef.current?.abort()
    const reader = new FileReader()
    readerRef.current = reader
    setReadingImage(true); setError('')
    reader.onload = () => { setForm(f => ({ ...f, image_base64: String(reader.result).split(',')[1] ?? '' })); setReadingImage(false) }
    reader.onerror = () => { setError('No pudimos leer la imagen. Elige el archivo de nuevo.'); setReadingImage(false) }
    reader.readAsDataURL(file)
  }

  async function remove(carta: AdminCarta) {
    if (!window.confirm(`¿Eliminar la carta «${carta.title}»? Esta acción no se puede deshacer.`)) return
    setSaving(true); setDeletingId(carta.id); setError(''); setMessage('')
    try {
      await request(`/api/admin/cartas?id=${encodeURIComponent(carta.id)}`, { method: 'DELETE' })
      if (editingId === carta.id) cancel()
      setMessage('Carta eliminada ✓')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'No pudimos eliminar la carta. Inténtalo de nuevo.') }
    finally { setSaving(false); setDeletingId(null) }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(''); setMessage('')
    if (!form.title.trim() || !form.unlock_date) { setError('Agrega un título y una fecha de apertura.'); return }
    if (!form.body.trim() && !form.image_base64) { setError('Escribe un mensaje o agrega una imagen para tu carta.'); return }
    setSaving(true)
    try {
      await request(editingId ? `/api/admin/cartas/${encodeURIComponent(editingId)}` : '/api/admin/cartas', {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify({ title: form.title.trim(), body: form.body.trim() || null, image_base64: form.image_base64 || null, sent_at: form.sent_at || null, unlock_date: form.unlock_date }),
      })
      setMessage(editingId ? 'Cambios guardados ✓' : 'Carta guardada ✓')
      cancel()
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'No pudimos guardar la carta. Revisa tu conexión e inténtalo de nuevo.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <ErrorMessage message={error} />
      {message && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}
      {!blocked && <>
        <div className="flex flex-wrap justify-between items-center gap-3">
          <p className="text-sm text-gray-500">{cartas.length} cartas guardadas</p>
          <button disabled={saving || readingImage} onClick={() => { cancel(); setShowForm(true); setError(''); setMessage('') }} className={`${BUTTON} bg-[#FF5722] text-white flex gap-2 items-center`}><Plus className="w-4 h-4" />Nueva carta</button>
        </div>
        {showForm && <section ref={formRef} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-5"><Mail className="w-4 h-4 text-[#FF5722]" />{editingId ? 'Editar carta' : 'Escribir una carta'}</h2>
          <form onSubmit={submit}>
            <fieldset disabled={saving} className="space-y-4">
              <label className="block text-sm text-gray-600">Título / Asunto
                <input required maxLength={200} className={`${INPUT} mt-1`} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Para cuando menos lo esperes…" />
              </label>
              <label className="block text-sm text-gray-600">Fecha de apertura
                <input required type="date" className={`${INPUT} mt-1`} value={form.unlock_date} onChange={e => setForm(f => ({ ...f, unlock_date: e.target.value }))} aria-describedby="letter-unlock-help" />
              </label>
              <p id="letter-unlock-help" className="text-xs text-gray-500">Se abrirá a las 00:00 de la fecha elegida, hora de Bogotá (America/Bogota). Una fecha de hoy o anterior deja la carta disponible de inmediato.</p>
              <label className="block text-sm text-gray-600">Fecha de envío original (opcional)
                <input type="date" className={`${INPUT} mt-1`} value={form.sent_at.slice(0, 10)} onChange={e => setForm(f => ({ ...f, sent_at: e.target.value }))} />
              </label>
              <label className="block text-sm text-gray-600">Mensaje (opcional si agregas una imagen)
                <textarea maxLength={100000} rows={6} className={`${INPUT} mt-1 resize-y`} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Escribe aquí tu carta…" />
              </label>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Foto de la carta (opcional si escribes un mensaje)</p>
                <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={selectImage} className="hidden" aria-label="Subir imagen de la carta" />
                <button type="button" disabled={readingImage} onClick={() => imageRef.current?.click()} className={`${BUTTON} border border-dashed border-gray-300 text-gray-600 flex items-center gap-2`}><ImageIcon className="w-4 h-4" />{readingImage ? 'Cargando imagen…' : form.image_base64 ? 'Cambiar imagen' : 'Subir imagen'}</button>
                <p className="text-xs text-gray-400">JPG, PNG, WebP o GIF. Máximo 5 MB.</p>
                {form.image_base64 && <div className="flex gap-3 items-center">
                  {/* Existing letters store image bytes without a MIME type. Browsers detect the image format. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/jpeg;base64,${form.image_base64}`} alt="Vista previa de la carta" className="w-24 h-24 object-cover rounded-xl" />
                  <button type="button" className={`${BUTTON} text-gray-500 flex gap-1 items-center`} onClick={() => setForm(f => ({ ...f, image_base64: '' }))}><X className="w-4 h-4" />Quitar imagen</button>
                </div>}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" onClick={cancel} className={`${BUTTON} border border-gray-200 text-gray-600`}>Cancelar</button>
                <button type="submit" disabled={saving || readingImage} className={`${BUTTON} bg-[#FF5722] text-white flex gap-2 items-center`}><Check className="w-4 h-4" />{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar carta'}</button>
              </div>
            </fieldset>
          </form>
        </section>}
        <section className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-gray-800">Cartas</h2>
            <button onClick={() => void load()} disabled={loading || saving} className={`${BUTTON} text-gray-500`}>Actualizar</button>
          </div>
          {loading ? <p role="status" className="text-sm text-gray-500 py-6">Cargando cartas…</p> : cartas.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">Aún no hay cartas. Escribe la primera.</p> : <ul className="space-y-3">
            {cartas.map(carta => <li key={carta.id} className={`flex gap-3 items-center rounded-xl p-3 ${editingId === carta.id ? 'bg-orange-50' : 'bg-gray-50'}`}>
              <Mail className="w-5 h-5 text-[#FF5722] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 break-words">{carta.title}</p>
                <p className="text-xs text-gray-500 mt-1">{carta.unlock_at ? `${bogotaDate(carta.unlock_at)} · 00:00 Bogotá` : 'Disponible · sin fecha programada'}</p>
                <p className="text-xs text-gray-500 mt-1">{carta.is_locked ? 'Programada · cerrada' : 'Disponible'} · {carta.is_read ? 'Leída' : 'Sin leer'}</p>
              </div>
              <button disabled={saving || readingImage} onClick={() => edit(carta)} aria-label={`Editar carta: ${carta.title}`} className={`${BUTTON} text-gray-500 hover:text-[#FF5722]`}><Pencil className="w-4 h-4" /></button>
              <button disabled={saving || readingImage} onClick={() => void remove(carta)} aria-label={`Eliminar carta: ${carta.title}`} className={`${BUTTON} text-gray-500 hover:text-red-600`}>{deletingId === carta.id ? <span className="text-xs">Eliminando…</span> : <Trash2 className="w-4 h-4" />}</button>
            </li>)}
          </ul>}
        </section>
      </>}
    </div>
  )
}
