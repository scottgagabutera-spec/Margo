'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { CloseIcon, PlusIcon } from '@/components/icons'
import { memoryCardCopy, type MemoryCardKind } from '@/lib/feed-memory-card'
import { weekRangeContaining } from '@/lib/memory/listening-period'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

function FeedMemoryCardArt({ kind }: { kind: MemoryCardKind }) {
  if (kind === 'media') {
    return (
      <svg className="margo-feed-memory-card__art-svg" viewBox="0 0 48 48" aria-hidden>
        <rect x="6" y="10" width="36" height="28" rx="6" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
        <circle cx="18" cy="22" r="4" fill="var(--gold)" opacity="0.85" />
        <path d="M10 34 L22 24 L32 30 L40 20" stroke="var(--gold)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <circle cx="36" cy="34" r="7" fill="var(--gold)" />
        <path d="M34 34 L34 30 L38 32 Z" fill="var(--bg)" />
      </svg>
    )
  }
  if (kind === 'story') {
    return (
      <svg className="margo-feed-memory-card__art-svg" viewBox="0 0 48 48" aria-hidden>
        <rect x="8" y="8" width="32" height="32" rx="8" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
        <path d="M16 18 H32 M16 24 H28 M16 30 H24" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
        <text x="30" y="20" fill="var(--gold)" fontSize="14" fontFamily="Georgia, serif">"</text>
      </svg>
    )
  }
  if (kind === 'listening') {
    return (
      <svg className="margo-feed-memory-card__art-svg" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r="14" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="5" fill="var(--gold)" />
        <rect x="32" y="14" width="3" height="14" rx="1" fill="var(--gold)" />
        <rect x="37" y="10" width="3" height="22" rx="1" fill="var(--gold)" opacity="0.7" />
      </svg>
    )
  }
  return (
    <svg className="margo-feed-memory-card__art-svg" viewBox="0 0 48 48" aria-hidden>
      <rect x="10" y="12" width="28" height="24" rx="6" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
      <circle cx="20" cy="22" r="3" fill="var(--gold)" opacity="0.9" />
      <path d="M14 32 L24 24 L34 28" stroke="var(--gold)" strokeWidth="1.2" fill="none" />
      <circle cx="34" cy="34" r="6" fill="var(--gold)" opacity="0.85" />
    </svg>
  )
}

export function FeedMemoryPromoCard({
  cardKind,
  ownMemoryCount,
  onDismiss,
  onOpenListening,
}: {
  cardKind: MemoryCardKind
  ownMemoryCount: number
  onDismiss?: () => void
  onOpenListening?: () => void
}) {
  const router = useRouter()
  const copy = memoryCardCopy(cardKind, { ownMemoryCount, videosSupported: true })
  const week = weekRangeContaining(new Date())
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const listeningPill =
    cardKind === 'listening'
      ? `This week, ${week.start.getDate()} to ${week.end.getDate()} ${months[week.end.getMonth()]}`
      : null

  const primary = useCallback(() => {
    if (cardKind === 'listening') {
      onOpenListening?.()
      return
    }
    if (cardKind === 'media') {
      router.push('/memories/new?entry=media')
      return
    }
    if (cardKind === 'story') {
      router.push('/memories/new?entry=words&focus=story')
      return
    }
    router.push('/memories/new')
  }, [cardKind, onOpenListening, router])

  const today = new Date()
  const todayLabel = `Today, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`

  const action =
    cardKind === 'create' ? (
      <Link href="/memories/new" className="margo-feed-memory-card__action" aria-label={copy.title}>
        <PlusIcon size={18} color="var(--bg)" />
      </Link>
    ) : (
      <button type="button" className="margo-feed-memory-card__action" aria-label={copy.title} onClick={primary}>
        <PlusIcon size={18} color="var(--bg)" />
      </button>
    )

  return (
    <article className="margo-feed-memory-card">
      <div className="margo-feed-memory-card__art" aria-hidden>
        <FeedMemoryCardArt kind={cardKind} />
      </div>
      <div className="margo-feed-memory-card__copy">
        <p className="margo-feed-memory-card__title" style={{ fontFamily: font }}>
          {copy.title}
        </p>
        <p className="margo-feed-memory-card__subtitle" style={{ fontFamily: font }}>
          {copy.subtitle}
        </p>
        {cardKind === 'create' ? (
          <span className="margo-feed-memory-card__pill" style={{ fontFamily: font }}>
            {todayLabel}
          </span>
        ) : null}
        {listeningPill ? (
          <span className="margo-feed-memory-card__pill" style={{ fontFamily: font }}>
            {listeningPill}
          </span>
        ) : null}
      </div>
      <div className="margo-feed-memory-card__actions">
        <button
          type="button"
          className="margo-feed-memory-card__dismiss"
          aria-label="Dismiss"
          onClick={() => onDismiss?.()}
        >
          <CloseIcon size={14} color="var(--text-muted)" />
        </button>
        {action}
      </div>
    </article>
  )
}
