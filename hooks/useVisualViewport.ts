'use client'

import { useEffect, useRef, useState } from 'react'
import { attachSettledVisualViewportListener } from '@/lib/settled-visual-viewport'
import {
  publishComposeViewportCss,
  readComposeViewportMetrics,
  scheduleComposeViewportBurst,
  type ComposeViewportMetrics,
} from '@/lib/compose-viewport-metrics'

export interface VisualViewportMetrics {
  height: number
  offsetTop: number
  keyboardInset: number
  keyboardOpen: boolean
  compact: boolean
}

const KEYBOARD_OPEN_INSET_PX = 36

function toPublicMetrics(m: ComposeViewportMetrics, textFocused: boolean): VisualViewportMetrics {
  const keyboardOpen =
    textFocused && (m.keyboardLikely || m.keyboardInset >= KEYBOARD_OPEN_INSET_PX)
  return {
    height: m.height,
    offsetTop: m.offsetTop,
    keyboardInset: m.keyboardInset,
    keyboardOpen,
    compact: m.compact,
  }
}

/**
 * Tracks the Visual Viewport (keyboard-aware on iOS Safari + Android Chrome).
 * Publishes CSS vars on <html> for sticky CTAs / Compose overlays.
 */
export function useVisualViewport(options?: { publishCssVars?: boolean }) {
  const publish = options?.publishCssVars ?? true
  const [metrics, setMetrics] = useState<VisualViewportMetrics>(() =>
    typeof window === 'undefined'
      ? { height: 800, offsetTop: 0, keyboardInset: 0, keyboardOpen: false, compact: false }
      : toPublicMetrics(readComposeViewportMetrics(), false),
  )

  useEffect(() => {
    const textFocusedRef = { current: false }
    let burstCancel: (() => void) | null = null

    const sync = () => {
      const raw = readComposeViewportMetrics()
      const next = toPublicMetrics(raw, textFocusedRef.current)
      setMetrics(next)
      if (publish) publishComposeViewportCss(raw, document.documentElement)
    }

    const scheduleBurst = () => {
      burstCancel?.()
      burstCancel = scheduleComposeViewportBurst(sync)
    }

    const onFocusIn = () => {
      textFocusedRef.current = true
      sync()
      scheduleBurst()
    }
    const onFocusOut = () => {
      textFocusedRef.current = false
      scheduleBurst()
    }
    const onOrientation = () => scheduleBurst()

    sync()
    const detachSettled = attachSettledVisualViewportListener({ onSettled: sync })

    window.addEventListener('orientationchange', onOrientation)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    return () => {
      detachSettled()
      burstCancel?.()
      window.removeEventListener('orientationchange', onOrientation)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      if (publish) {
        const root = document.documentElement
        root.style.removeProperty('--margo-vv-height')
        root.style.removeProperty('--margo-vv-offset-top')
        root.style.removeProperty('--margo-keyboard-inset')
        root.style.removeProperty('--margo-compose-available-h')
        root.removeAttribute('data-margo-compose-compact')
      }
    }
  }, [publish])

  return metrics
}

export function useTextFieldFocus() {
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName
      if (tag === 'TEXTAREA') return true
      if (tag === 'INPUT') {
        const type = (el as HTMLInputElement).type
        return !['button', 'submit', 'checkbox', 'radio', 'file', 'hidden', 'reset', 'image'].includes(type)
      }
      return el.isContentEditable
    }

    const sync = () => setFocused(isEditable(document.activeElement))
    sync()
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', sync)
    return () => {
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', sync)
    }
  }, [])

  return focused
}

export function useKeyboardSafeChrome(enabled = true) {
  const metrics = useVisualViewport({ publishCssVars: enabled })
  const textFocused = useTextFieldFocus()
  const keyboardOpen = enabled && (metrics.keyboardOpen || textFocused)

  useEffect(() => {
    const root = document.documentElement
    if (keyboardOpen) root.setAttribute('data-margo-keyboard', '1')
    else root.removeAttribute('data-margo-keyboard')
    return () => root.removeAttribute('data-margo-keyboard')
  }, [keyboardOpen])

  return {
    ...metrics,
    textFocused,
    keyboardOpen,
    chromeHidden: keyboardOpen,
    compact: metrics.compact,
  }
}
