'use client'

import { useEffect, useRef, useState } from 'react'
import { useAtmosphereRoomState } from '@/hooks/useAudioEngine'
import {
  isLivingAtmosphere,
  parseAtmosphere,
  type AtmosphereId,
} from '@/lib/atmosphere'

type AtmosphereVariant = 'card' | 'karaoke'

/**
 * Single Atmosphere room layer. Card and karaoke share the five personalities;
 * variant only changes scale tokens in CSS. Reads engine.atmosphere — do not
 * pass a second copy of the song field.
 */
export function AtmosphereLayer({
  variant,
  active,
}: {
  variant: AtmosphereVariant
  /** True when this surface is the current room (this Moment / this karaoke song). */
  active: boolean
}) {
  const engine = useAtmosphereRoomState()
  const rootRef = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(variant === 'karaoke')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [holdCard, setHoldCard] = useState(false)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const personality: AtmosphereId = parseAtmosphere(engine.atmosphere)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const visible = () => {
      let node: HTMLElement | null = el
      while (node) {
        if (node.getAttribute('data-margo-primary-tab-active') === '0') return false
        const st = getComputedStyle(node)
        if (st.display === 'none' || st.visibility === 'hidden') return false
        node = node.parentElement
      }
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.bottom > 8 && rect.top < window.innerHeight - 8
    }

    const obs = new IntersectionObserver(
      () => setOnScreen(visible()),
      { threshold: [0, 0.12, 0.4], rootMargin: '-8px' },
    )
    obs.observe(el)
    setOnScreen(visible())
    return () => obs.disconnect()
  }, [variant, active])

  const live =
    active &&
    engine.playing &&
    isLivingAtmosphere(personality) &&
    !reducedMotion &&
    onScreen

  useEffect(() => {
    if (live) {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
      setHoldCard(true)
      return
    }
    if (variant !== 'card' || !holdCard) return
    fadeTimerRef.current = setTimeout(() => {
      setHoldCard(false)
      fadeTimerRef.current = null
    }, 420)
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [live, variant, holdCard])

  const showOrb = variant === 'karaoke' || live || holdCard
  const orbClass = [
    'margo-atmosphere',
    `margo-atmosphere--${variant}`,
    live ? `margo-atmosphere--${personality}` : 'margo-atmosphere--still',
    live ? 'is-live' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`margo-atmosphere-clip margo-atmosphere-clip--${variant}`}
      data-atmosphere={personality}
    >
      {showOrb ? <div className={orbClass} /> : null}
    </div>
  )
}
