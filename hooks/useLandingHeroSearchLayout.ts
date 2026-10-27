'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { computeLandingSearchBump } from '@/lib/landing-search-bump'
import { resetLandingSearchLayoutState } from '@/lib/landing-search-layout-reset'
import { measureMargoHeaderBottom } from '@/lib/margo-header-band'
import { readVisualBand } from '@/lib/margo-keyboard-geometry'
import { useVisualViewport } from '@/hooks/useVisualViewport'

/**
 * Landing search: transform bump from visualViewport keyboard top (not innerHeight / dvh).
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
    root.setAttribute('data-margo-landing-search-active', '1')

    const apply = () => {
      const clientHero = '.margo-stage-hero:not(.margo-stage-hero--ssr)'
      const wordmark = document.querySelector(`${clientHero} .margo-stage-hero__wordmark-wrap`) as HTMLElement | null
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

      root.style.setProperty('--margo-landing-hero-shift', `${plan.shiftPx}px`)
      root.style.setProperty('--margo-landing-search-dropdown-max-h', `${plan.dropdownMaxPx}px`)
      if (plan.hideTagline) root.setAttribute('data-margo-landing-hide-tagline', '1')
      else root.removeAttribute('data-margo-landing-hide-tagline')
      if (plan.hideWordmark) root.setAttribute('data-margo-landing-hide-wordmark', '1')
      else root.removeAttribute('data-margo-landing-hide-wordmark')
    }

    apply()
    let raf = 0
    const loop = () => {
      apply()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const stopLoop = window.setTimeout(() => cancelAnimationFrame(raf), 800)

    const vv = window.visualViewport
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    document.addEventListener('focusin', apply)
    document.addEventListener('focusout', apply)
    document.addEventListener('input', apply)

    return () => {
      clearTimeout(stopLoop)
      cancelAnimationFrame(raf)
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      document.removeEventListener('focusin', apply)
      document.removeEventListener('focusout', apply)
      document.removeEventListener('input', apply)
      resetLandingSearchLayoutState()
    }
  }, [active, metrics.height, metrics.offsetTop, metrics.keyboardInset, metrics.keyboardTop])

  return searchWrapRef
}
