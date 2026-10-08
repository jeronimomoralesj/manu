'use client'

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import styles from './TreasureHunt.module.css'

type Crack = {
  index: number
  revealed_at: string | null
  opened_at: string | null
  solved_at: string | null
}

type TreasureState = {
  enabled: boolean
  cracks: Crack[]
  completed_at: string | null
  completion_seen_at: string | null
}

type Reward = { title: string; message: string; audio_url: string }
type Panel = { kind: 'crack'; index: number } | { kind: 'reward' } | null
type Mutation = { state: unknown; correct?: boolean; error?: string }

const CORNERS = [
  { position: styles.topLeft, color: '#ff927e', name: 'coral', location: 'superior izquierda' },
  { position: styles.topRight, color: '#82ceff', name: 'azul', location: 'superior derecha' },
  { position: styles.bottomLeft, color: '#c4a1ff', name: 'violeta', location: 'inferior izquierda' },
  { position: styles.bottomRight, color: '#f8d57e', name: 'dorada', location: 'inferior derecha' },
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readState(value: unknown): TreasureState {
  if (!isRecord(value) || typeof value.enabled !== 'boolean') throw new Error('No pudimos actualizar las pistas.')
  if (!value.enabled) return { enabled: false, cracks: [], completed_at: null, completion_seen_at: null }
  const isDate = (date: unknown) => date === null || typeof date === 'string'
  if (!Array.isArray(value.cracks) || value.cracks.length !== 4 ||
    !value.cracks.every(crack => isRecord(crack) && Number.isInteger(crack.index) &&
      Number(crack.index) >= 0 && Number(crack.index) < 4 &&
      isDate(crack.revealed_at) && isDate(crack.opened_at) && isDate(crack.solved_at)) ||
    new Set(value.cracks.map(crack => crack.index)).size !== 4 ||
    !isDate(value.completed_at) || !isDate(value.completion_seen_at)) {
    throw new Error('No pudimos actualizar las pistas.')
  }
  return value as TreasureState
}

function isComplete(state: TreasureState | null) {
  return Boolean(state?.enabled && state.completed_at && state.cracks.length === 4 &&
    state.cracks.every(crack => crack.solved_at))
}

async function request<T>(url: string, signal: AbortSignal, body?: object): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const cancel = () => controller.abort()
  signal.addEventListener('abort', cancel, { once: true })
  if (signal.aborted) controller.abort()
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 15000)
  try {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
    const data: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 429) throw new Error('Espera un momento antes de intentarlo de nuevo.')
      throw new Error(isRecord(data) && typeof data.error === 'string'
        ? data.error : 'No pudimos conectar. Inténtalo de nuevo.')
    }
    return data as T
  } catch (error) {
    if (timedOut) throw new Error('La conexión tardó demasiado. Inténtalo de nuevo.')
    throw error
  } finally {
    window.clearTimeout(timeout)
    signal.removeEventListener('abort', cancel)
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.name !== 'TypeError'
    ? error.message : 'No pudimos conectar. Inténtalo de nuevo.'
}

function CrackArt({ solved }: { solved: boolean }) {
  return (
    <>
      <svg className={styles.art} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M3 2 11 10 8 14 17 19 15 26M11 10 18 7 24 10M17 19 24 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m8 14-5 4m15-11 2-5m-3 17 5 7" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      {solved && <span className={styles.check} aria-hidden="true">
        <svg viewBox="0 0 12 12" fill="none"><path d="m2.5 6 2.3 2.3 4.7-4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>}
    </>
  )
}

export default function TreasureHunt() {
  const [state, setState] = useState<TreasureState | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openFailed, setOpenFailed] = useState(false)
  const [reward, setReward] = useState<Reward | null>(null)
  const [rewardLoading, setRewardLoading] = useState(false)
  const [rewardError, setRewardError] = useState<string | null>(null)
  const stateRef = useRef<TreasureState | null>(null)
  const panelRef = useRef<Panel>(null)
  const mounted = useRef(false)
  const actionBusy = useRef(false)
  const refreshQueued = useRef(false)
  const stateVersion = useRef(0)
  const autoPresented = useRef(false)
  const readController = useRef<AbortController | null>(null)
  const actionController = useRef<AbortController | null>(null)
  const rewardController = useRef<AbortController | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dismissRef = useRef<HTMLButtonElement>(null)
  const id = useId()

  const changePanel = useCallback((next: Panel) => {
    panelRef.current = next
    setPanel(next)
  }, [])

  const loadReward = useCallback(async () => {
    rewardController.current?.abort()
    const controller = new AbortController()
    rewardController.current = controller
    setReward(null)
    setRewardLoading(true)
    setRewardError(null)
    try {
      const data = await request<unknown>('/api/treasure/reward', controller.signal)
      if (controller.signal.aborted || !mounted.current) return
      if (!isRecord(data) || typeof data.title !== 'string' || typeof data.message !== 'string' ||
        data.audio_url !== '/api/treasure/audio') throw new Error('No pudimos abrir la sorpresa. Inténtalo de nuevo.')
      setReward(data as Reward)
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current) setRewardError(errorMessage(cause))
    } finally {
      if (!controller.signal.aborted && mounted.current) setRewardLoading(false)
    }
  }, [])

  const showReward = useCallback(() => {
    autoPresented.current = true
    setError(null)
    changePanel({ kind: 'reward' })
    void loadReward()
  }, [changePanel, loadReward])

  const applyState = useCallback((next: TreasureState) => {
    stateRef.current = next
    setState(next)
    if (!next.enabled) {
      rewardController.current?.abort()
      setReward(null)
      changePanel(null)
      return
    }
    if (isComplete(next) && !next.completion_seen_at && !autoPresented.current) showReward()
  }, [changePanel, showReward])

  const refresh = useCallback(async () => {
    if (actionBusy.current) { refreshQueued.current = true; return }
    readController.current?.abort()
    const controller = new AbortController()
    readController.current = controller
    const version = ++stateVersion.current
    try {
      const data = await request<unknown>('/api/treasure', controller.signal)
      if (mounted.current && !controller.signal.aborted && version === stateVersion.current) applyState(readState(data))
    } catch {
      // Background reads stay quiet; dialog actions provide a visible retry path.
    }
  }, [applyState])

  useEffect(() => {
    mounted.current = true
    const onRefresh = () => { void refresh() }
    const initialRead = window.setTimeout(onRefresh, 0)
    window.addEventListener('treasure:refresh', onRefresh)
    window.addEventListener('focus', onRefresh)
    return () => {
      mounted.current = false
      window.clearTimeout(initialRead)
      readController.current?.abort()
      actionController.current?.abort()
      rewardController.current?.abort()
      window.removeEventListener('treasure:refresh', onRefresh)
      window.removeEventListener('focus', onRefresh)
    }
  }, [refresh])

  const dialogOpen = panel !== null && Boolean(state?.enabled)
  useEffect(() => {
    if (!dialogOpen) return
    const dialog = dialogRef.current
    if (!dialog) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // The native modal supplies background inertness and a keyboard focus trap.
    dialog.showModal()
    dialog.focus()
    return () => {
      dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [dialogOpen])

  useEffect(() => {
    if (!dialogOpen || busy) return
    if (panel?.kind === 'crack' && !openFailed && !state?.cracks.find(crack => crack.index === panel.index)?.solved_at) {
      inputRef.current?.focus({ preventScroll: true })
    } else {
      dismissRef.current?.focus({ preventScroll: true })
    }
  }, [dialogOpen, panel, busy, openFailed, state])

  async function mutate(body: object): Promise<Mutation | null> {
    if (actionBusy.current) return null
    actionBusy.current = true
    setBusy(true)
    setError(null)
    readController.current?.abort()
    ++stateVersion.current
    const controller = new AbortController()
    actionController.current = controller
    try {
      const data = await request<Mutation>('/api/treasure', controller.signal, body)
      if (controller.signal.aborted || !mounted.current) return null
      if (!isRecord(data)) throw new Error('No pudimos actualizar las pistas.')
      applyState(readState(data.state))
      return data
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current) setError(errorMessage(cause))
      return null
    } finally {
      actionBusy.current = false
      if (mounted.current) {
        setBusy(false)
        if (refreshQueued.current) { refreshQueued.current = false; void refresh() }
      }
    }
  }

  async function openCrack(index: number) {
    if (actionBusy.current || panelRef.current) return
    const crack = stateRef.current?.cracks.find(item => item.index === index)
    if (!crack?.revealed_at) return
    if (isComplete(stateRef.current)) { showReward(); return }
    setCode('')
    setError(null)
    setOpenFailed(false)
    changePanel({ kind: 'crack', index })
    if (crack.solved_at) return
    const result = await mutate({ action: 'open', index })
    if (mounted.current) setOpenFailed(!result)
  }

  async function retryOpen() {
    if (panel?.kind !== 'crack' || actionBusy.current) return
    const result = await mutate({ action: 'open', index: panel.index })
    if (mounted.current && panelRef.current?.kind === 'crack') setOpenFailed(!result)
  }

  async function validateCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (panel?.kind !== 'crack' || actionBusy.current || openFailed || !code.trim()) return
    const result = await mutate({ action: 'validate', index: panel.index, code: code.trim() })
    if (!mounted.current || !result) return
    if (result.correct) setCode('')
    else setError(result.error || 'Ese código no coincide. Revisa tu pista e inténtalo de nuevo.')
  }

  async function dismiss() {
    if (actionBusy.current) return
    if (panelRef.current?.kind === 'reward' && !stateRef.current?.completion_seen_at) {
      // Acknowledgement follows an explicit dismissal, never merely rendering the popup.
      const result = await mutate({ action: 'ack' })
      if (!result) return
    }
    rewardController.current?.abort()
    setReward(null)
    changePanel(null)
    setError(null)
    setCode('')
  }

  if (!state?.enabled) return null

  const revealed = state.cracks.filter(crack => crack.revealed_at).sort((a, b) => a.index - b.index)
  const solvedCount = state.cracks.filter(crack => crack.solved_at).length
  const activeCrack = panel?.kind === 'crack' ? state.cracks.find(crack => crack.index === panel.index) : null
  const activeCorner = panel?.kind === 'crack' ? CORNERS[panel.index] : null
  const colorStyle = { '--crack-color': activeCorner?.color ?? '#ff927e' } as CSSProperties

  return (
    <>
      <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {revealed.length > 0 ? `${revealed.length} de 4 grietas descubiertas. ${solvedCount} de 4 pistas resueltas.` : ''}
      </span>
      {revealed.map(crack => {
        const corner = CORNERS[crack.index]
        const label = `Grieta ${corner.name}, esquina ${corner.location}. Pista ${crack.index + 1}${crack.solved_at ? ' resuelta' : ''}${isComplete(state) ? '. Abrir sorpresa' : ''}`
        return <button
          key={crack.index}
          type="button"
          className={`${styles.corner} ${corner.position} ${crack.solved_at ? styles.solved : ''}`}
          style={{ '--crack-color': corner.color } as CSSProperties}
          onClick={() => { void openCrack(crack.index) }}
          aria-label={label}
          title={label}
          aria-haspopup="dialog"
        ><CrackArt solved={Boolean(crack.solved_at)} /></button>
      })}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        style={colorStyle}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        tabIndex={-1}
        onCancel={event => { event.preventDefault(); void dismiss() }}
      >
        <div className={styles.header}>
          <span className={styles.eyebrow}>{panel?.kind === 'crack' ? `Pista ${(panel.index ?? 0) + 1} de 4` : 'Tu sorpresa'}</span>
          <button ref={dismissRef} type="button" className={styles.close} aria-label="Cerrar" disabled={busy} onClick={() => { void dismiss() }}>×</button>
        </div>
        {panel?.kind === 'crack' ? <>
          <div className={styles.dialogArt}><CrackArt solved={Boolean(activeCrack?.solved_at)} /></div>
          <h2 id={`${id}-title`} className={styles.title}>{activeCrack?.solved_at ? 'Una pista más, contigo' : `La grieta ${activeCorner?.name}`}</h2>
          <p id={`${id}-description`} className={styles.description}>
            {activeCrack?.solved_at
              ? 'Esta pista ya está resuelta. Tu progreso está guardado; sigue descubriendo las demás.'
              : 'Busca la pista física que corresponde a esta grieta e introduce su código.'}
          </p>
          {!activeCrack?.solved_at && !openFailed && <form className={styles.form} onSubmit={validateCode} aria-busy={busy}>
            <label htmlFor={`${id}-code`} className={styles.label}>Código de la pista</label>
            <input ref={inputRef} id={`${id}-code`} className={styles.input} value={code} onChange={event => { setCode(event.target.value); setError(null) }} disabled={busy} maxLength={128} autoComplete="off" autoCapitalize="none" spellCheck={false} required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
            <button className={styles.primary} type="submit" disabled={busy || !code.trim()}>{busy ? 'Comprobando…' : 'Comprobar código'}</button>
          </form>}
          {openFailed && <button type="button" className={styles.primary} disabled={busy} onClick={() => { void retryOpen() }}>{busy ? 'Abriendo…' : 'Volver a abrir la pista'}</button>}
          <div className={styles.progress} aria-label={`${solvedCount} de 4 pistas resueltas`}>
            <span className={styles.progressDots} aria-hidden="true">{CORNERS.map((corner, index) => <span key={index} className={state.cracks.find(crack => crack.index === index)?.solved_at ? styles.filledDot : styles.dot} style={{ '--crack-color': corner.color } as CSSProperties} />)}</span>
            <span>{solvedCount} de 4 resueltas</span>
          </div>
        </> : <>
          <h2 id={`${id}-title`} className={styles.title}>{reward?.title ?? 'Hay algo para ti'}</h2>
          <p id={`${id}-description`} className={styles.description}>{rewardLoading ? 'Abriendo tu sorpresa…' : rewardError ? 'Tu progreso está guardado. Podemos volver a intentarlo.' : 'Las cuatro pistas nos trajeron hasta aquí.'}</p>
          {reward && <>
            <audio className={styles.audio} controls preload="none" src={reward.audio_url} aria-label={reward.title} onError={() => { setRewardError('No pudimos cargar el audio. Inténtalo de nuevo.') }} />
            <div className={styles.gift}><span className={styles.giftMark} aria-hidden="true">✦</span><p>{reward.message}</p></div>
          </>}
          {rewardError && <div className={styles.retryArea}><p className={styles.error} role="alert">{rewardError}</p><button type="button" className={styles.secondary} disabled={rewardLoading || busy} onClick={() => { void loadReward() }}>Volver a intentar</button></div>}
          <button className={styles.primary} type="button" disabled={busy} onClick={() => { void dismiss() }}>{busy ? 'Guardando…' : 'Guardar este momento'}</button>
        </>}
        {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
      </dialog>
    </>
  )
}
