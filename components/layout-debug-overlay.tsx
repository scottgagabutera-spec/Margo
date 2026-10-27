'use client'

import { useEffect, useState } from 'react'
import { measureMargoHeaderBottom } from '@/lib/margo-header-band'
import { readVisualBand } from '@/lib/margo-keyboard-geometry'

type DebugSnapshot = {
  innerHeight: number
  vvHeight: number
  offsetTop: number
  headerBottom: number
  headerSource: string
  tabTop: number
  shift: string
  keyboardTop: number
  songRowTop: number | null
  clearTop: number | null
  clearHit: string
}

export default function LayoutDebugOverlay() {
  const [snap, setSnap] = useState<DebugSnapshot | null>(null)

  useEffect(() => {
    const tick = () => {
      const band = readVisualBand()
      const header = measureMargoHeaderBottom()
      const tab = document.querySelector('.margo-mobile-tabbar') as HTMLElement | null
      const tabTop = tab?.getBoundingClientRect().top ?? window.innerHeight
      const shift = getComputedStyle(document.documentElement).getPropertyValue('--margo-landing-hero-shift').trim() || '0'
      const row = document.querySelector('[data-testid="compose-song-row"]')
      const clear = document.querySelector('[data-testid="compose-song-clear"]')
      let clearHit = 'n/a'
      if (clear) {
        const r = clear.getBoundingClientRect()
        const topEl = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        clearHit = topEl instanceof Element ? topEl.tagName : 'null'
      }
      setSnap({
        innerHeight: band.innerHeight,
        vvHeight: band.vvHeight,
        offsetTop: band.offsetTop,
        headerBottom: header.bottom,
        headerSource: header.source,
        tabTop,
        shift,
        keyboardTop: band.keyboardTop,
        songRowTop: row?.getBoundingClientRect().top ?? null,
        clearTop: clear?.getBoundingClientRect().top ?? null,
        clearHit,
      })
    }
    tick()
    const id = window.setInterval(tick, 400)
    window.visualViewport?.addEventListener('resize', tick)
    return () => {
      clearInterval(id)
      window.visualViewport?.removeEventListener('resize', tick)
    }
  }, [])

  if (!snap) return null

  return (
    <pre
      aria-hidden
      style={{
        position: 'fixed',
        left: 8,
        right: 8,
        bottom: 'calc(var(--margo-keyboard-inset, 0px) + 8px)',
        zIndex: 9999,
        margin: 0,
        padding: '8px 10px',
        fontSize: '10px',
        lineHeight: 1.35,
        fontFamily: 'ui-monospace, monospace',
        background: 'rgba(0,0,0,0.82)',
        color: '#b8f0c8',
        borderRadius: 8,
        pointerEvents: 'none',
        maxHeight: '40vh',
        overflow: 'auto',
      }}
    >
      {`innerH ${snap.innerHeight}
vvH ${snap.vvHeight} off ${snap.offsetTop}
headerBottom ${snap.headerBottom} (${snap.headerSource})
tabTop ${snap.tabTop}
keyboardTop ${snap.keyboardTop}
heroShift ${snap.shift}px
songRowTop ${snap.songRowTop ?? '-'}
clearTop ${snap.clearTop ?? '-'} hit ${snap.clearHit}`}
    </pre>
  )
}
