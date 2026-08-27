import type { StageCardThemeId } from '@/lib/moment/stage-theme'

export type MomentPhase = 'find' | 'select' | 'moment' | 'refine' | 'action' | 'success'

export type ComposePendingAction = 'send' | 'post' | 'private' | 'add-line'

export type ComposePendingSendRecipient = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export type ComposeLineDraft = {
  lyric: string
  songName: string
  artistName: string
  linkedSongId?: string | null
  linkedAudioUrl?: string | null
  artwork?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  source?: string | null
  geniusId?: string | null
  externalListenUrl?: string | null
}

export type ComposeSearchSnapshot = {
  id: string
  title: string
  artist: string
  artwork: string
  source: 'margo' | 'genius' | 'apple'
  margoSongId?: string
  audioUrl?: string | null
  externalListenUrl?: string | null
}

/** Serializable compose workspace state — single source of truth for the interaction contract. */
export type MomentDraft = {
  version: 1
  entryPoint: string
  phase: MomentPhase
  selectMode: 'picker' | 'write' | null
  committedLines: ComposeLineDraft[]
  lyric: string
  songName: string
  artistName: string
  selectedSong: ComposeSearchSnapshot | null
  linkedSongId: string | null
  linkedAudioUrl: string | null
  snippetStart: number | null
  snippetEnd: number | null
  linePickComplete: boolean
  vibe: string | null
  vibeSuggested: string | null
  vibeUserPicked: boolean
  themeId: StageCardThemeId
  parentPostId?: string | null
  pendingAction: ComposePendingAction | null
  pendingSendRecipient?: ComposePendingSendRecipient | null
  persistedPostId?: string | null
  searchQuery?: string
}

const STORAGE_KEY = 'margo_compose_draft_v1'
const PENDING_ACTION_KEY = 'margo_compose_pending_action'
const PENDING_SEND_RECIPIENT_KEY = 'margo_compose_pending_send_recipient'

export function createEmptyMomentDraft(entryPoint = 'pen'): MomentDraft {
  return {
    version: 1,
    entryPoint,
    phase: 'find',
    selectMode: null,
    committedLines: [],
    lyric: '',
    songName: '',
    artistName: '',
    selectedSong: null,
    linkedSongId: null,
    linkedAudioUrl: null,
    snippetStart: null,
    snippetEnd: null,
    linePickComplete: false,
    vibe: null,
    vibeSuggested: null,
    vibeUserPicked: false,
    themeId: 'gold',
    parentPostId: null,
    pendingAction: null,
    persistedPostId: null,
    searchQuery: '',
  }
}

export function hasMeaningfulDraftWork(draft: MomentDraft): boolean {
  if (draft.committedLines.length > 0) return true
  if (draft.lyric.trim()) return true
  if (draft.selectedSong) return true
  if (draft.songName.trim() || draft.artistName.trim()) return true
  if (draft.vibe) return true
  return false
}

export function saveMomentDraft(draft: MomentDraft): void {
  if (typeof window === 'undefined') return
  if (draft.phase === 'success') {
    clearMomentDraft()
    return
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Quota or private mode — non-fatal.
  }
}

export function loadMomentDraft(): MomentDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MomentDraft
    if (parsed?.version !== 1) return null
    if (parsed.phase === 'success') return null
    return parsed
  } catch {
    return null
  }
}

export function clearMomentDraft(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(PENDING_ACTION_KEY)
    sessionStorage.removeItem(PENDING_SEND_RECIPIENT_KEY)
  } catch {
    // ignore
  }
}

/** Clears armed pending action (and send recipient) without discarding the Moment draft. */
export function disarmComposePendingAction(): void {
  if (typeof window === 'undefined') return
  setComposePendingAction(null)
  setComposePendingSendRecipient(null)
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as MomentDraft
    if (parsed?.version !== 1) return
    parsed.pendingAction = null
    parsed.pendingSendRecipient = null
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // ignore
  }
}

export function setComposePendingAction(action: ComposePendingAction | null): void {
  if (typeof window === 'undefined') return
  try {
    if (!action) sessionStorage.removeItem(PENDING_ACTION_KEY)
    else sessionStorage.setItem(PENDING_ACTION_KEY, action)
  } catch {
    // ignore
  }
}

export function peekComposePendingAction(): ComposePendingAction | null {
  if (typeof window === 'undefined') return null
  try {
    const v = sessionStorage.getItem(PENDING_ACTION_KEY)
    if (v === 'send' || v === 'post' || v === 'private' || v === 'add-line') return v
    return null
  } catch {
    return null
  }
}

export function consumeComposePendingAction(): ComposePendingAction | null {
  const action = peekComposePendingAction()
  setComposePendingAction(null)
  return action
}

export function setComposePendingSendRecipient(
  recipient: ComposePendingSendRecipient | null,
): void {
  if (typeof window === 'undefined') return
  try {
    if (!recipient) {
      sessionStorage.removeItem(PENDING_SEND_RECIPIENT_KEY)
      return
    }
    sessionStorage.setItem(PENDING_SEND_RECIPIENT_KEY, JSON.stringify(recipient))
  } catch {
    // ignore
  }
}

export function peekComposePendingSendRecipient(): ComposePendingSendRecipient | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PENDING_SEND_RECIPIENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ComposePendingSendRecipient
    if (!parsed?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function consumeComposePendingSendRecipient(): ComposePendingSendRecipient | null {
  const recipient = peekComposePendingSendRecipient()
  setComposePendingSendRecipient(null)
  return recipient
}
