'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { computeLandingSearchBump } from '@/lib/landing-search-bump'
import { resetLandingSearchLayoutState } from '@/lib/landing-search-layout-reset'
import { measureMargoHeaderBottom } from '@/lib/margo-header-band'
import { readVisualBand } from '@/lib/margo-keyboard-geometry'
import { useVisualViewport } from '@/hooks/useVisualViewport'

const ACTIVE_ATTR = 'data-margo-landing-search-active'
const HIDE_TAGLINE = 'data-margo-landing-hide-tagline'
const HIDE_WORDMARK = 'data-margo-landing-hide-wordmark'
const ANIMATE_ATTR = 'data-margo-landing-shift-animate'

const CLIENT_HERO = '.margo-stage-hero:not(.margo-stage-hero--ssr)'

/**
 * Landing search: minimal visualViewport bump; smooth only while shift is applied.
 */
export function useLandingHeroSearchLayout(active: boolean) {
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const metrics = useVisualViewport({ publishCssVars: active })
  const lastShiftRef = useRef(0)

  useEffect(() => {
    if (active) return
    resetLandingSearchLayoutState()
    document.documentElement.removeAttribute(ANIMATE_ATTR)
  }, [active])

  useEffect(() => {
    const onPageShow = () => {
      if (!active) resetLandingSearchLayoutState()
    }
    const onPop = () => {
      if (!active) resetLandingSearchLayoutState()
    }
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('popstate', onPop)
    }
  }, [active])

  useLayoutEffect(() => {
    const root = document.documentElement
    if (!active) {
      resetLandingSearchLayoutState()
      root.removeAttribute(ANIMATE_ATTR)
      return
    }
    root.setAttribute(ACTIVE_ATTR, '1')

    const apply = () => {
      const wordmark = document.querySelector(`${CLIENT_HERO} .margo-stage-hero__wordmark-wrap`) as HTMLElement | null
      const input = searchWrapRef.current?.querySelector('.margo-search-wrap--standard') as HTMLElement | null
      if (!wordmark || !input) return

      const { bottom: headerBottom } = measureMargoHeaderBottom()
      const band = readVisualBand()
      const blockTop = wordmark.getBoundingClientRect().top

      const plan = computeLandingSearchBump({
        keyboardTop: band.keyboardTop,
        headerBottom,
        blockTop,
      })

      const prevShift = lastShiftRef.current
      lastShiftRef.current = plan.shiftPx
      if (plan.shiftPx > 0 && Math.abs(plan.shiftPx - prevShift) <= 48) {
        root.setAttribute(ANIMATE_ATTR, '1')
      } else if (plan.shiftPx === 0) {
        root.removeAttribute(ANIMATE_ATTR)
      }

      root.style.setProperty('--margo-landing-hero-shift', `${plan.shiftPx}px`)
      root.style.setProperty('--margo-landing-search-dropdown-max-h', `${plan.dropdownMaxPx}px`)
      if (plan.hideTagline) root.setAttribute(HIDE_TAGLINE, '1')
      else root.removeAttribute(HIDE_TAGLINE)
      if (plan.hideWordmark) root.setAttribute(HIDE_WORDMARK, '1')
      else root.removeAttribute(HIDE_WORDMARK)
    }

    apply()
    const vv = window.visualViewport
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    document.addEventListener('focusin', apply)
    document.addEventListener('focusout', apply)
    document.addEventListener('input', apply)

    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      document.removeEventListener('focusin', apply)
      document.removeEventListener('focusout', apply)
      document.removeEventListener('input', apply)
      resetLandingSearchLayoutState()
      root.removeAttribute(ANIMATE_ATTR)
    }
  }, [active, metrics.height, metrics.offsetTop, metrics.keyboardInset])

  return searchWrapRef
}
