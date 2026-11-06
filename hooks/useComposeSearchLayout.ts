'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { computeComposeSearchBump } from '@/lib/compose-search-bump'
import { resetComposeSearchLayoutState } from '@/lib/compose-search-layout-reset'
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

const ACTIVE = 'data-margo-compose-search-active'
const ANIMATE = 'data-margo-compose-shift-animate'

/**
 * Compose find-step: same keyboard + safe-area contract as landing search,
 * scoped to `.margo-compose-search-shift` (not the whole page).
 */
export function useComposeSearchLayout(active: boolean) {
  const blockRef = useRef<HTMLDivElement | null>(null)
  const [dropdownMaxPx, setDropdownMaxPx] = useState<number | null>(null)
  const metrics = useVisualViewport({ publishCssVars: active })
  const lastShiftRef = useRef(0)
  const activeRef = useRef(active)
  const closingRef = useRef(false)
  activeRef.current = active

  useEffect(() => {
    const onPageShow = () => {
      if (!activeRef.current) resetComposeSearchLayoutState()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    if (active) {
      closingRef.current = false
      root.setAttribute(ACTIVE, '1')
      return
    }
    if (lastShiftRef.current > 0) {
      closingRef.current = true
      return
    }
    if (lastShiftRef.current === 0 && !root.hasAttribute(ACTIVE)) return
    resetComposeSearchLayoutState()
    root.removeAttribute(ANIMATE)
    setDropdownMaxPx(null)
  }, [active])

  useLayoutEffect(() => {
    const root = document.documentElement
    const layoutActive = active || closingRef.current

    const measurePlan = () => {
      const block = blockRef.current
      if (!block) return null
      const { bottom: headerBottom } = measureMargoHeaderBottom()
      const band = readVisualBand()
      const blockTop = block.getBoundingClientRect().top
      return computeComposeSearchBump({
        keyboardTop: band.keyboardTop,
        headerBottom,
        blockTop,
      })
    }

    const applyPlan = (plan: ReturnType<typeof computeComposeSearchBump>) => {
      const prevShift = lastShiftRef.current
      let nextShift = !activeRef.current && !closingRef.current ? 0 : plan.shiftPx
      if (activeRef.current) {
        nextShift = applyMonotonicLandingShift(prevShift, plan.shiftPx, 'open')
      } else if (closingRef.current) {
        nextShift = applyMonotonicLandingShift(prevShift, plan.shiftPx, 'close')
      }
      const animate =
        !prefersReducedMotion() && shouldAnimateLandingShift(prevShift, nextShift)
      if (animate) root.setAttribute(ANIMATE, '1')
      else root.removeAttribute(ANIMATE)

      lastShiftRef.current = nextShift
      root.style.setProperty('--margo-compose-search-shift', `${nextShift}px`)
      root.style.setProperty('--margo-compose-search-dropdown-max-h', `${plan.dropdownMaxPx}px`)
      setDropdownMaxPx(plan.dropdownMaxPx)

      if (nextShift === 0 && (!activeRef.current || closingRef.current)) {
        closingRef.current = false
        const finish = () => {
          resetComposeSearchLayoutState()
          root.removeAttribute(ANIMATE)
          setDropdownMaxPx(null)
        }
        if (animate && !prefersReducedMotion()) {
          window.setTimeout(finish, LANDING_SHIFT_TRANSITION_MS + 20)
        } else {
          finish()
        }
      }
    }

    if (!layoutActive) return

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
        resetComposeSearchLayoutState()
        root.removeAttribute(ANIMATE)
        setDropdownMaxPx(null)
      }
    }
  }, [active, metrics.height, metrics.offsetTop, metrics.keyboardInset])

  return { blockRef, dropdownMaxPx }
}
