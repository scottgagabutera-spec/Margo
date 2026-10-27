'use client'

import { useEffect, useState } from 'react'
import { readVisualBand } from '@/lib/margo-keyboard-geometry'

export interface VisualViewportMetrics {
  height: number
  offsetTop: number
  keyboardInset: number
  keyboardOpen: boolean
  keyboardTop: number
  innerHeight: number
}

const KEYBOARD_OPEN_PX = 80

function readMetrics(): VisualViewportMetrics {
  if (typeof window === 'undefined') {
    return {
      height: 800,
      offsetTop: 0,
      keyboardInset: 0,
      keyboardOpen: false,
      keyboardTop: 800,
      innerHeight: 800,
    }
  }
  const band = readVisualBand()
  return {
    height: band.vvHeight,
    offsetTop: band.offsetTop,
    keyboardInset: band.keyboardInset,
    keyboardOpen: band.keyboardInset >= KEYBOARD_OPEN_PX,
    keyboardTop: band.keyboardTop,
    innerHeight: band.innerHeight,
  }
}

export function useVisualViewport(options?: { publishCssVars?: boolean }) {
  const publish = options?.publishCssVars ?? true
  const [metrics, setMetrics] = useState<VisualViewportMetrics>(() => readMetrics())

  useEffect(() => {
    const update = () => {
      const next = readMetrics()
      setMetrics(next)
      if (publish && typeof document !== 'undefined') {
        const root = document.documentElement
        root.style.setProperty('--margo-vv-height', `${Math.round(next.height)}px`)
        root.style.setProperty('--margo-keyboard-inset', `${Math.round(next.keyboardInset)}px`)
        root.style.setProperty('--margo-keyboard-top', `${Math.round(next.keyboardTop)}px`)
      }
    }

    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    let raf = 0
    const poll = () => {
      update()
      raf = window.requestAnimationFrame(poll)
    }
    const startPoll = () => {
      window.cancelAnimationFrame(raf)
      let n = 0
      const tick = () => {
        update()
        n += 1
        if (n < 24) raf = window.requestAnimationFrame(tick)
      }
      raf = window.requestAnimationFrame(tick)
    }
    document.addEventListener('focusin', startPoll)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
      document.removeEventListener('focusin', startPoll)
      window.cancelAnimationFrame(raf)
      if (publish) {
        document.documentElement.style.removeProperty('--margo-vv-height')
        document.documentElement.style.removeProperty('--margo-keyboard-inset')
        document.documentElement.style.removeProperty('--margo-keyboard-top')
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
  const active = enabled && (textFocused || metrics.keyboardOpen)

  useEffect(() => {
    const root = document.documentElement
    if (active) root.setAttribute('data-margo-keyboard', '1')
    else root.removeAttribute('data-margo-keyboard')
    return () => root.removeAttribute('data-margo-keyboard')
  }, [active])

  return { ...metrics, textFocused, chromeHidden: active, keyboardOpen: active }
}
