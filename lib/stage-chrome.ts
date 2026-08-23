'use client'

import { useLayoutEffect, useSyncExternalStore } from 'react'

const STAGE_ATTR = 'data-margo-stage'

function subscribeStage(onStoreChange: () => void) {
  if (typeof document === 'undefined') return () => {}
  const obs = new MutationObserver(onStoreChange)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: [STAGE_ATTR] })
  return () => obs.disconnect()
}

function getStageActiveSnapshot() {
  if (typeof document === 'undefined') return false
  return document.documentElement.hasAttribute(STAGE_ATTR)
}

/** True while The Stage is in an immersive interaction (hides tab bar + mini player on `/`). */
export function useStageChromeHidden(): boolean {
  return useSyncExternalStore(subscribeStage, getStageActiveSnapshot, () => false)
}

/** Publish immersive Stage chrome while `active` is true. */
export function useStageChromePublisher(active: boolean) {
  useLayoutEffect(() => {
    const root = document.documentElement
    if (active) root.setAttribute(STAGE_ATTR, '1')
    else root.removeAttribute(STAGE_ATTR)
    return () => root.removeAttribute(STAGE_ATTR)
  }, [active])
}

const STAGE_SEARCH_ATTR = 'data-margo-stage-search'

/** Dim/hide footer while Stage search dropdown is open. */
export function useStageSearchPublisher(open: boolean) {
  useLayoutEffect(() => {
    const root = document.documentElement
    if (open) root.setAttribute(STAGE_SEARCH_ATTR, '1')
    else root.removeAttribute(STAGE_SEARCH_ATTR)
    return () => root.removeAttribute(STAGE_SEARCH_ATTR)
  }, [open])
}
