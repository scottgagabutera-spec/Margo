'use client'

import { useEffect, useRef, useState } from 'react'
import { useAtmosphereRoomState } from '@/hooks/useAudioEngine'
import {
  isLivingAtmosphere,
  parseAtmosphere,
  type AtmosphereId,
} from '@/lib/atmosphere'

type AtmosphereVariant = 'card' | 'karaoke'

export type AtmosphereRoomMatch = {
  songId: string
  lineText: string
}

/**
 * Single Atmosphere room layer. Card and karaoke share the five personalities;
 * variant only changes scale. Grammar is shape + path + entrance in CSS.
 * Extra nodes (mound lumps / shells / threads / rings) mount only while `live`.
 * Reads engine.atmosphere — do not pass a second copy of the song field.
 *
 * Personality class is `still` whenever this room is not live, so switching
 * to a NULL/Still song cannot leave Breath/Drift/Pulse/Weight behind.
 */
export function AtmosphereLayer({
  variant,
  songId = null,
  lineText = null,
  rooms,
}: {
  variant: AtmosphereVariant
  /** Karaoke: this page's song. Card: single-line Moment when `rooms` omitted. */
  songId?: string | null
  lineText?: string | null
  /** Multi-line Feed Moments — any matching line owns this room. */
  rooms?: AtmosphereRoomMatch[]
}) {
  const engine = useAtmosphereRoomState()
  const rootRef = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(variant === 'karaoke')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [holdCard, setHoldCard] = useState(false)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const personality: AtmosphereId = parseAtmosphere(engine.atmosphere)
  const active = isThisRoom(variant, engine, songId, lineText, rooms)

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
      data-atmosphere={live ? personality : 'still'}
    >
      {showOrb ? <div className={orbClass} /> : null}
      {live ? (
        <AtmosphereLiveExtras personality={personality} variant={variant} />
      ) : null}
    </div>
  )
}

/** Extra compositor layers — only while live. Cap 5 (Weight); others 3. */
function AtmosphereLiveExtras({
  personality,
  variant,
}: {
  personality: AtmosphereId
  variant: AtmosphereVariant
}) {
  const extra = `margo-atmosphere-extra margo-atmosphere-extra--${variant} is-live`
  if (personality === 'weight') {
    return (
      <>
        <div className={`${extra} margo-atmosphere-veil margo-atmosphere--weight`} />
        <div className={`${extra} margo-atmosphere-slab margo-atmosphere-slab--a`} />
        <div className={`${extra} margo-atmosphere-slab margo-atmosphere-slab--b`} />
        <div className={`${extra} margo-atmosphere-slab margo-atmosphere-slab--c`} />
      </>
    )
  }
  if (personality === 'breath') {
    return (
      <>
        <div className={`${extra} margo-atmosphere-shell margo-atmosphere-shell--1`} />
        <div className={`${extra} margo-atmosphere-shell margo-atmosphere-shell--2`} />
      </>
    )
  }
  if (personality === 'drift') {
    return (
      <>
        <div className={`${extra} margo-atmosphere-thread margo-atmosphere-thread--b`} />
        <div className={`${extra} margo-atmosphere-thread margo-atmosphere-thread--c`} />
      </>
    )
  }
  if (personality === 'pulse') {
    return (
      <>
        <div className={`${extra} margo-atmosphere-ring margo-atmosphere-ring--1`} />
        <div className={`${extra} margo-atmosphere-ring margo-atmosphere-ring--2`} />
      </>
    )
  }
  return null
}

function isThisRoom(
  variant: AtmosphereVariant,
  engine: { mode: string; songId: string | null; lineText: string | null },
  songId: string | null,
  lineText: string | null,
  rooms: AtmosphereRoomMatch[] | undefined,
): boolean {
  if (!engine.songId) return false
  if (variant === 'karaoke') {
    return engine.mode === 'full' && engine.songId === songId
  }
  if (engine.mode !== 'snippet') return false
  const matches = rooms && rooms.length > 0
    ? rooms
    : (songId ? [{ songId, lineText: lineText || '' }] : [])
  return matches.some((r) => (
    r.songId === engine.songId &&
    (r.lineText ? engine.lineText === r.lineText : true)
  ))
}
