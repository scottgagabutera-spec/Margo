'use client'

import { useLayoutEffect, useRef } from 'react'
import {
  landingHeroAnchorTopPx,
  searchFieldTopGoalPx,
} from '@/lib/search-viewport-layout'
import { useVisualViewport } from '@/hooks/useVisualViewport'

const ACTIVE_ATTR = 'data-margo-landing-search-active'

/**
 * While landing search is active, pin the hero anchor so the field sits under
 * max(16px, 12% of visual viewport height) and publish dropdown max-height.
 */
export function useLandingHeroSearchLayout(active: boolean) {
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const metrics = useVisualViewport({ publishCssVars: active })

  useLayoutEffect(() => {
    const root = document.documentElement
    if (active) root.setAttribute(ACTIVE_ATTR, '1')
    else root.removeAttribute(ACTIVE_ATTR)

    if (!active) {
      root.style.removeProperty('--margo-landing-hero-active-top')
      root.style.removeProperty('--margo-landing-search-dropdown-max-h')
      return () => root.removeAttribute(ACTIVE_ATTR)
    }

    const shell = document.querySelector('.margo-landing-page-shell') as HTMLElement | null
    const anchor = document.querySelector('.margo-landing-hero-anchor') as HTMLElement | null
    const wrap = searchWrapRef.current
    const input = wrap?.querySelector('.margo-search-wrap--standard') as HTMLElement | null

    const apply = () => {
      if (!shell || !anchor || !input) return
      const vv = window.visualViewport
      const offsetTop = vv?.offsetTop ?? 0
      const height = vv?.height ?? window.innerHeight
      const goal = searchFieldTopGoalPx({ offsetTop, viewportHeight: height })
      const shellRect = shell.getBoundingClientRect()
      const anchorRect = anchor.getBoundingClientRect()
      const searchRect = input.getBoundingClientRect()
      const topPx = landingHeroAnchorTopPx({
        shellTop: shellRect.top,
        anchorTop: anchorRect.top,
        searchTop: searchRect.top,
        goalSearchTop: goal,
      })
      root.style.setProperty('--margo-landing-hero-active-top', `${Math.round(topPx)}px`)
      const visibleBottom = offsetTop + height
      const maxH = Math.max(0, Math.round(visibleBottom - searchRect.bottom - 8))
      root.style.setProperty('--margo-landing-search-dropdown-max-h', `${maxH}px`)
    }

    apply()
    const raf = requestAnimationFrame(apply)
    const vv = window.visualViewport
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    if (wrap) ro?.observe(wrap)
    if (anchor) ro?.observe(anchor)

    return () => {
      cancelAnimationFrame(raf)
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      ro?.disconnect()
      root.removeAttribute(ACTIVE_ATTR)
      root.style.removeProperty('--margo-landing-hero-active-top')
      root.style.removeProperty('--margo-landing-search-dropdown-max-h')
    }
  }, [active, metrics.height, metrics.offsetTop, metrics.keyboardInset])

  return searchWrapRef
}
