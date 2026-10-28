'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { computeLandingSearchBump } from '@/lib/landing-search-bump'
import { resetLandingSearchLayoutState } from '@/lib/landing-search-layout-reset'
import {
  LANDING_SHIFT_TRANSITION_MS,
  prefersReducedMotion,
  shouldAnimateLandingShift,
} from '@/lib/landing-search-shift-motion'
import { measureMargoHeaderBottom } from '@/lib/margo-header-band'
import { readVisualBand } from '@/lib/margo-keyboard-geometry'
import { applyMonotonicLandingShift } from '@/lib/landing-search-shift-apply'
import { attachSettledVisualViewportListener } from '@/lib/settled-visual-viewport'
import { useVisualViewport } from '@/hooks/useVisualViewport'

const ACTIVE_ATTR = 'data-margo-landing-search-active'
const HIDE_TAGLINE = 'data-margo-landing-hide-tagline'
const HIDE_WORDMARK = 'data-margo-landing-hide-wordmark'
const ANIMATE_ATTR = 'data-margo-landing-shift-animate'

const CLIENT_HERO = '.margo-stage-hero:not(.margo-stage-hero--ssr)'

/**
 * Landing search: keyboard bump commits once visualViewport settles; one ease-out move.
 */
export function useLandingHeroSearchLayout(active: boolean) {
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const metrics = useVisualViewport({ publishCssVars: active })
  const lastShiftRef = useRef(0)
  const activeRef = useRef(active)
  const closingRef = useRef(false)
  const lastKeyboardInsetRef = useRef(0)
  activeRef.current = active

  useEffect(() => {
    const onPageShow = () => {
      if (!activeRef.current) resetLandingSearchLayoutState()
    }
    const onPop = () => {
      if (!activeRef.current) resetLandingSearchLayoutState()
    }
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    if (active) {
      closingRef.current = false
      root.setAttribute(ACTIVE_ATTR, '1')
      root.setAttribute(HIDE_TAGLINE, '1')
      return
    }
    if (lastShiftRef.current > 0) {
      closingRef.current = true
      return
    }
    resetLandingSearchLayoutState()
    root.removeAttribute(ANIMATE_ATTR)
  }, [active])

  useLayoutEffect(() => {
    const root = document.documentElement
    const layoutActive = active || closingRef.current

    const measurePlan = () => {
      const wordmark = document.querySelector(`${CLIENT_HERO} .margo-stage-hero__wordmark-wrap`) as HTMLElement | null
      const input = searchWrapRef.current?.querySelector('.margo-search-wrap--standard') as HTMLElement | null
      if (!wordmark || !input) return null

      const { bottom: headerBottom } = measureMargoHeaderBottom()
      const band = readVisualBand()
      const blockTop = wordmark.getBoundingClientRect().top

      return computeLandingSearchBump({
        keyboardTop: band.keyboardTop,
        headerBottom,
        blockTop,
      })
    }

    const applyPlan = (plan: ReturnType<typeof computeLandingSearchBump>) => {
      const band = readVisualBand()
      lastKeyboardInsetRef.current = band.keyboardInset

      const prevShift = lastShiftRef.current
      let nextShift = !activeRef.current && !closingRef.current ? 0 : plan.shiftPx
      if (activeRef.current) {
        nextShift = applyMonotonicLandingShift(prevShift, plan.shiftPx, 'open')
      } else if (closingRef.current) {
        nextShift = applyMonotonicLandingShift(prevShift, plan.shiftPx, 'close')
      }
      const animate =
        !prefersReducedMotion() && shouldAnimateLandingShift(prevShift, nextShift)

      if (animate) root.setAttribute(ANIMATE_ATTR, '1')
      else root.removeAttribute(ANIMATE_ATTR)

      lastShiftRef.current = nextShift
      root.style.setProperty('--margo-landing-hero-shift', `${nextShift}px`)
      root.style.setProperty('--margo-landing-search-dropdown-max-h', `${plan.dropdownMaxPx}px`)

      if (activeRef.current) {
        if (plan.hideTagline) root.setAttribute(HIDE_TAGLINE, '1')
        else root.removeAttribute(HIDE_TAGLINE)
        if (plan.hideWordmark) root.setAttribute(HIDE_WORDMARK, '1')
        else root.removeAttribute(HIDE_WORDMARK)
      }

      if (nextShift === 0 && (!activeRef.current || closingRef.current)) {
        closingRef.current = false
        const finish = () => {
          resetLandingSearchLayoutState()
          root.removeAttribute(ANIMATE_ATTR)
        }
        if (animate && !prefersReducedMotion()) {
          window.setTimeout(finish, LANDING_SHIFT_TRANSITION_MS + 20)
        } else {
          finish()
        }
      }
    }

    if (!layoutActive) {
      return
    }

    const detach = attachSettledVisualViewportListener({
      onSettled: () => {
        if (!activeRef.current && !closingRef.current) return
        const plan = measurePlan()
        if (!plan) return
        applyPlan(plan)
      },
    })

    return () => {
      detach()
      if (!activeRef.current && !closingRef.current) {
        resetLandingSearchLayoutState()
        root.removeAttribute(ANIMATE_ATTR)
      }
    }
  }, [active, metrics.height, metrics.offsetTop, metrics.keyboardInset])

  return searchWrapRef
}
