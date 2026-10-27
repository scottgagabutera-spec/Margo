'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { computeLandingSearchBump } from '@/lib/landing-search-bump'
import { resetLandingSearchLayoutState } from '@/lib/landing-search-layout-reset'
import { useVisualViewport } from '@/hooks/useVisualViewport'

const ACTIVE_ATTR = 'data-margo-landing-search-active'
const HIDE_TAGLINE = 'data-margo-landing-hide-tagline'
const HIDE_WORDMARK = 'data-margo-landing-hide-wordmark'

/**
 * Landing search: small bump above keyboard; tagline/wordmark fade only when needed.
 */
export function useLandingHeroSearchLayout(active: boolean) {
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const metrics = useVisualViewport({ publishCssVars: active })

  useEffect(() => {
    if (active) return
    resetLandingSearchLayoutState()
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
      return
    }
    root.setAttribute(ACTIVE_ATTR, '1')

    const apply = () => {
      const nav = document.querySelector('.margo-landing-nav') as HTMLElement | null
      const intro = document.querySelector('.margo-stage-hero__intro') as HTMLElement | null
      const input = searchWrapRef.current?.querySelector('.margo-search-wrap--standard') as HTMLElement | null
      if (!nav || !intro || !input) return

      const vv = window.visualViewport
      const offsetTop = vv?.offsetTop ?? 0
      const height = vv?.height ?? window.innerHeight
      const headerBottom = nav.getBoundingClientRect().bottom
      const blockTop = intro.getBoundingClientRect().top

      const plan = computeLandingSearchBump({
        offsetTop,
        viewportHeight: height,
        headerBottom,
        blockTop,
      })

      root.style.setProperty('--margo-landing-hero-shift', `${plan.shiftPx}px`)
      root.style.setProperty('--margo-landing-search-dropdown-max-h', `${plan.dropdownMaxPx}px`)
      if (plan.hideTagline) root.setAttribute(HIDE_TAGLINE, '1')
      else root.removeAttribute(HIDE_TAGLINE)
      if (plan.hideWordmark) root.setAttribute(HIDE_WORDMARK, '1')
      else root.removeAttribute(HIDE_WORDMARK)
    }

    apply()
    const raf = requestAnimationFrame(apply)
    const vv = window.visualViewport
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    window.addEventListener('focusin', apply)
    window.addEventListener('focusout', apply)

    return () => {
      cancelAnimationFrame(raf)
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      window.removeEventListener('focusin', apply)
      window.removeEventListener('focusout', apply)
      resetLandingSearchLayoutState()
    }
  }, [active, metrics.height, metrics.offsetTop, metrics.keyboardInset])

  return searchWrapRef
}
