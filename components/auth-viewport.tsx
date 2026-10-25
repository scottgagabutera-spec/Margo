'use client'

import { useEffect } from 'react'

/** Keeps auth panels scrollable above the software keyboard via visualViewport. */
export function AuthViewportKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const apply = () => {
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      const keyboardOpen = gap > 80
      document.documentElement.style.setProperty(
        '--auth-keyboard-inset',
        keyboardOpen ? `${gap}px` : '0px',
      )
    }

    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      document.documentElement.style.setProperty('--auth-keyboard-inset', '0px')
    }
  }, [])

  return null
}

export function scrollAuthFieldIntoView(el: HTMLElement | null) {
  if (!el) return
  window.requestAnimationFrame(() => {
    el.scrollIntoView({ block: 'center', behavior: 'auto' })
  })
}
