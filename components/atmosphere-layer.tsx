'use client'

import { useEffect, useId, useRef, useState } from 'react'
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

const WEIGHT_DROPS = [
  { left: '8%', duration: '5.8s', delay: '0s', w: 11, h: 15 },
  { left: '18%', duration: '7.2s', delay: '1.1s', w: 8, h: 11 },
  { left: '27%', duration: '6.4s', delay: '2.4s', w: 11, h: 15 },
  { left: '36%', duration: '8.1s', delay: '0.6s', w: 9, h: 13 },
  { left: '46%', duration: '5.5s', delay: '3.2s', w: 11, h: 15 },
  { left: '55%', duration: '6.9s', delay: '1.8s', w: 8, h: 11 },
  { left: '64%', duration: '7.6s', delay: '4.1s', w: 11, h: 15 },
  { left: '73%', duration: '5.2s', delay: '2.8s', w: 10, h: 14 },
  { left: '82%', duration: '8.4s', delay: '0.3s', w: 11, h: 15 },
  { left: '90%', duration: '6.1s', delay: '3.7s', w: 8, h: 11 },
  { left: '13%', duration: '9s', delay: '5.2s', w: 7, h: 10 },
  { left: '69%', duration: '7.8s', delay: '4.8s', w: 7, h: 10 },
] as const

/**
 * Full-card Atmosphere room. Extra nodes mount only while this room is live
 * (or during the card hold fade). Personality is `still` whenever the room
 * is not live. Reads engine.atmosphere — do not pass a second copy.
 *
 * Weight is 13 visual nodes by design (floor + 12 drops). The old 8-node
 * cap does not apply to this grammar — intentional, not a regression.
 */
export function AtmosphereLayer({
  variant,
  songId = null,
  lineText = null,
  rooms,
}: {
  variant: AtmosphereVariant
  songId?: string | null
  lineText?: string | null
  rooms?: AtmosphereRoomMatch[]
}) {
  const engine = useAtmosphereRoomState()
  const rootRef = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(variant === 'karaoke')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [holdCard, setHoldCard] = useState(false)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLivingRef = useRef<AtmosphereId | null>(null)

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

  if (live) lastLivingRef.current = personality

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

  const roomPersonality = live ? personality : lastLivingRef.current
  const showLiving =
    (live || (variant === 'card' && holdCard)) &&
    roomPersonality != null &&
    isLivingAtmosphere(roomPersonality)

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`margo-atmosphere-clip margo-atmosphere-clip--${variant}`}
      data-atmosphere={live ? personality : 'still'}
    >
      {variant === 'karaoke' && !showLiving ? (
        <div className="margo-atm-still-wash" />
      ) : null}
      {showLiving && roomPersonality ? (
        <AtmosphereRoom
          personality={roomPersonality}
          variant={variant}
          live={live}
        />
      ) : null}
    </div>
  )
}

function AtmosphereRoom({
  personality,
  variant,
  live,
}: {
  personality: AtmosphereId
  variant: AtmosphereVariant
  live: boolean
}) {
  const dropFillId = useId().replace(/:/g, '')
  const room = [
    'margo-atm-room',
    `margo-atm-room--${variant}`,
    live ? 'is-live' : 'is-hold',
  ].join(' ')

  if (personality === 'weight') {
    return (
      <div className={room}>
        <div className="margo-atm-weight-well">
          <svg width="0" height="0" aria-hidden className="margo-atm-drop-defs">
            <defs>
              <radialGradient id={dropFillId} cx="36%" cy="30%" r="72%">
                <stop offset="0%" stopColor="var(--gold-warm)" />
                <stop offset="42%" stopColor="var(--gold)" />
                <stop offset="100%" stopColor="color-mix(in srgb, var(--gold) 38%, black)" />
              </radialGradient>
            </defs>
          </svg>
          <div className="margo-atm-weight-floor" />
          {WEIGHT_DROPS.map((d, i) => (
            <span
              key={i}
              className="margo-atm-drop"
              style={{
                left: d.left,
                width: variant === 'karaoke' ? d.w + 4 : d.w,
                height: variant === 'karaoke' ? d.h + 5 : d.h,
                animationDuration: d.duration,
                animationDelay: d.delay,
              }}
            >
              <WeightDropSvg fillId={dropFillId} />
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (personality === 'breath') {
    return (
      <div className={room}>
        <div className="margo-atm-breath-wash" />
        <div className="margo-atm-breath-stretch" />
      </div>
    )
  }

  if (personality === 'drift') {
    return (
      <div className={room}>
        <div className="margo-atm-drift-well">
          <div className="margo-atm-drift-band" />
          <div className="margo-atm-drift-band margo-atm-drift-band--b" />
          <div className="margo-atm-drift-band margo-atm-drift-band--c" />
        </div>
      </div>
    )
  }

  if (personality === 'pulse') {
    return (
      <div className={room}>
        <div className="margo-atm-pulse-wash" />
        <div className="margo-atm-pulse-edge" />
      </div>
    )
  }

  return null
}

function WeightDropSvg({ fillId }: { fillId: string }) {
  return (
    <svg viewBox="0 0 14 18" aria-hidden>
      <ellipse className="margo-atm-drop-shade" cx="7.6" cy="10.4" rx="3.3" ry="4.4" />
      <ellipse cx="7" cy="9" rx="3.1" ry="4.2" fill={`url(#${fillId})`} />
      <ellipse className="margo-atm-drop-shine" cx="5.7" cy="6.8" rx="1.15" ry="1.45" />
    </svg>
  )
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
