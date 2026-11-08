import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { applyFeedContentTab, type FeedContentTab } from './feed-content-tab.ts'
import { persistFeedReturnBeforeLeave } from './margo-feed-return.ts'
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
  | { kind: 'memory'; id: string }
  | { kind: 'echoes-answer'; questionId: string; setId: string }
  | { kind: 'echoes-set'; setId: string }
  | { kind: 'echoes-person'; setId: string; profileId: string }

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
  const memoryId = search.get('memory')?.trim()
  if (memoryId) return { kind: 'memory', id: memoryId }
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
  persistFeedReturnBeforeLeave('lyrics')
  try {
    sessionStorage.setItem('margo-feed-return-pending', '1')
  } catch {
    /* */
  }
  const qs = params.toString()
  router.push(qs ? `/feed?${qs}` : '/feed', { scroll: false })
}

/** Same mechanism as Shorts: stay on /feed, push query, lyrics pane stays mounted. */
export function openFeedTab(
  router: AppRouterInstance,
  tab: FeedContentTab,
  extra?: Record<string, string | number | null | undefined>,
) {
  const params = stripFeedMixParams(applyFeedContentTab(currentFeedSearch(), tab))
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value == null || value === '') params.delete(key)
      else params.set(key, String(value))
    }
  }
  pushFeedSearch(router, params)
}

export function openFeedCreate(router: AppRouterInstance, kind: MemoryPromoKind) {
  const params = stripFeedMixParams(applyFeedContentTab(currentFeedSearch(), 'lyrics'))
  if (kind === 'pictures') params.set('create', 'media')
  else if (kind === 'story') {
    params.set('create', 'words')
    params.set('focus', 'story')
  } else params.set('create', 'memory')
  pushFeedSearch(router, params)
}

export function openFeedMemory(router: AppRouterInstance, memoryId: string) {
  const params = stripFeedMixParams(applyFeedContentTab(currentFeedSearch(), 'lyrics'))
  params.set('memory', memoryId)
  pushFeedSearch(router, params)
}

export function openFeedEchoesAnswer(router: AppRouterInstance, questionId: string, setId: string) {
  const params = stripFeedMixParams(applyFeedContentTab(currentFeedSearch(), 'lyrics'))
  params.set('echoesAnswer', '1')
  params.set('questionId', questionId)
  params.set('setId', setId)
  pushFeedSearch(router, params)
}

export function openFeedEchoesSet(router: AppRouterInstance, setId: string) {
  const params = stripFeedMixParams(applyFeedContentTab(currentFeedSearch(), 'lyrics'))
  params.set('echoesSet', setId)
  pushFeedSearch(router, params)
}

export function openFeedEchoesPerson(router: AppRouterInstance, setId: string, profileId: string) {
  const params = stripFeedMixParams(applyFeedContentTab(currentFeedSearch(), 'lyrics'))
  params.set('echoesSet', setId)
  params.set('echoesPerson', profileId)
  pushFeedSearch(router, params)
}

export function closeFeedMix() {
  if (typeof window === 'undefined') return
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  const params = stripFeedMixParams(currentFeedSearch())
  const qs = params.toString()
  window.location.replace(qs ? `/feed?${qs}` : '/feed')
}
