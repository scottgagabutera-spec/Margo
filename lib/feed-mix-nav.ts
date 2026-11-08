import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { alignFeedPrimaryFrozenScroll } from '@/components/primary-tab-shell'
import { applyFeedContentTab, parseFeedContentTab, type FeedContentTab } from './feed-content-tab.ts'
import { persistFeedReturnBeforeLeave, readFeedReturnSnapshot } from './margo-feed-return.ts'
import type { MemoryPromoKind } from './feed-memory-card.ts'

/** Query keys that open an in-feed mix overlay. Clearing them is Back. */
export const FEED_MIX_PARAM_KEYS = [
  'create',
  'focus',
  'memory',
  'echoesAnswer',
  'questionId',
  'setId',
  'echoesSet',
  'echoesPerson',
] as const

export type FeedMixSurface =
  | { kind: 'create'; entry: 'media' | 'words' | 'memory'; focusStory: boolean }
  | { kind: 'echoes-answer'; questionId: string; setId: string }
  | { kind: 'echoes-set'; setId: string }
  | { kind: 'echoes-person'; setId: string; profileId: string }

export type FeedMixPaint = FeedMixSurface | null | undefined

let paintedMix: FeedMixPaint = undefined
const mixPaintListeners = new Set<(next: FeedMixPaint) => void>()

export function paintFeedMix(surface: FeedMixPaint) {
  paintedMix = surface
  mixPaintListeners.forEach((listener) => listener(surface))
}

export function readPaintedFeedMix(): FeedMixPaint {
  return paintedMix
}

export function subscribeFeedMixPaint(listener: (next: FeedMixPaint) => void) {
  mixPaintListeners.add(listener)
  return () => {
    mixPaintListeners.delete(listener)
  }
}

export function resolveFeedMixSurface(
  fromUrl: FeedMixSurface | null,
  painted: FeedMixPaint,
): FeedMixSurface | null {
  if (painted === undefined) return fromUrl
  return painted
}

export function stripFeedMixParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params.toString())
  for (const key of FEED_MIX_PARAM_KEYS) next.delete(key)
  return next
}

export function parseFeedMixSurface(search: URLSearchParams): FeedMixSurface | null {
  const create = search.get('create')
  if (create === 'media' || create === 'words' || create === 'memory') {
    return { kind: 'create', entry: create, focusStory: search.get('focus') === 'story' }
  }
  if (search.get('echoesAnswer') === '1') {
    const questionId = search.get('questionId')?.trim() || ''
    const setId = search.get('setId')?.trim() || ''
    if (questionId && setId) return { kind: 'echoes-answer', questionId, setId }
  }
  const echoesPerson = search.get('echoesPerson')?.trim()
  const echoesSet = search.get('echoesSet')?.trim()
  if (echoesPerson && echoesSet) return { kind: 'echoes-person', setId: echoesSet, profileId: echoesPerson }
  if (echoesSet) return { kind: 'echoes-set', setId: echoesSet }
  return null
}

function currentFeedSearch(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

function pushFeedSearch(router: AppRouterInstance, params: URLSearchParams) {
  persistFeedReturnBeforeLeave(parseFeedContentTab(currentFeedSearch().get('tab')))
  const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
  const y = scroller instanceof HTMLElement ? scroller.scrollTop : 0
  alignFeedPrimaryFrozenScroll(y)
  try {
    sessionStorage.setItem('margo-feed-return-pending', '1')
  } catch {
    /* */
  }
  const qs = params.toString()
  // A repeat tap on the same target must not stack a duplicate history
  // entry (which would make Back need two presses).
  if (qs === currentFeedSearch().toString()) return
  router.push(qs ? `/feed?${qs}` : '/feed', { scroll: false })
}

function pushMix(router: AppRouterInstance, params: URLSearchParams) {
  paintFeedMix(parseFeedMixSurface(params))
  pushFeedSearch(router, params)
}

/** Same mechanism as Shorts: stay on /feed, push query, lyrics pane stays mounted. */
export function openFeedTab(
  router: AppRouterInstance,
  tab: FeedContentTab,
  extra?: Record<string, string | number | null | undefined>,
) {
  paintFeedMix(null)
  const params = stripFeedMixParams(applyFeedContentTab(currentFeedSearch(), tab))
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value == null || value === '') params.delete(key)
      else params.set(key, String(value))
    }
  }
  // pushFeedSearch saves the current pose first; only then move the pane.
  pushFeedSearch(router, params)
  if (typeof document !== 'undefined') {
    const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
    if (scroller instanceof HTMLElement) {
      // New sector starts at its top; Lyrics (a return) restores its pose.
      scroller.scrollTop = tab === 'lyrics' ? (readFeedReturnSnapshot()?.y ?? 0) : 0
    }
  }
}

export function openFeedCreate(router: AppRouterInstance, kind: MemoryPromoKind) {
  const params = stripFeedMixParams(currentFeedSearch())
  if (kind === 'pictures') params.set('create', 'media')
  else if (kind === 'story') {
    params.set('create', 'words')
    params.set('focus', 'story')
  } else params.set('create', 'memory')
  pushMix(router, params)
}

/** Memories row tiles open the memories tab (grid + see more), not a single overlay. */
export function openFeedMemory(router: AppRouterInstance, memoryId: string) {
  openFeedTab(router, 'memories', { openMemory: memoryId })
}

export function openFeedEchoesAnswer(router: AppRouterInstance, questionId: string, setId: string) {
  const params = stripFeedMixParams(currentFeedSearch())
  params.set('echoesAnswer', '1')
  params.set('questionId', questionId)
  params.set('setId', setId)
  pushMix(router, params)
}

export function openFeedEchoesSet(router: AppRouterInstance, setId: string) {
  const params = stripFeedMixParams(currentFeedSearch())
  params.set('echoesSet', setId)
  pushMix(router, params)
}

export function openFeedEchoesPerson(router: AppRouterInstance, setId: string, profileId: string) {
  const params = stripFeedMixParams(currentFeedSearch())
  params.set('echoesSet', setId)
  params.set('echoesPerson', profileId)
  pushMix(router, params)
}

export function closeFeedMix() {
  paintFeedMix(null)
  if (typeof window === 'undefined') return
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  const params = stripFeedMixParams(currentFeedSearch())
  const qs = params.toString()
  window.location.replace(qs ? `/feed?${qs}` : '/feed')
}
