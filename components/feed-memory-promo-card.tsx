'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { PlusIcon } from '@/components/icons'
import { memoryCardCopy, type MemoryPromoKind } from '@/lib/feed-memory-card'
import { openFeedCreate } from '@/lib/feed-mix-nav'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

function PromoArt({ kind }: { kind: MemoryPromoKind }) {
  if (kind === 'pictures') {
    return (
      <div className="margo-feed-memory-card__art-fan" aria-hidden>
        <span className="margo-feed-memory-card__fan-card margo-feed-memory-card__fan-card--1" />
        <span className="margo-feed-memory-card__fan-card margo-feed-memory-card__fan-card--2" />
        <span className="margo-feed-memory-card__fan-add">
          <PlusIcon size={14} color="var(--gold)" />
        </span>
      </div>
    )
  }
  if (kind === 'story') {
    return (
      <svg className="margo-feed-memory-card__art-svg" viewBox="0 0 48 48" aria-hidden>
        <rect x="10" y="8" width="28" height="32" rx="6" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
        <text x="16" y="22" fill="var(--gold)" fontSize="18" fontFamily="Georgia, serif">
          "
        </text>
        <path d="M16 28 H34 M16 33 H30" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      </svg>
    )
  }
  return (
    <div className="margo-feed-memory-card__art-composite" aria-hidden>
      <span className="margo-feed-memory-card__composite-photo" />
      <span className="margo-feed-memory-card__composite-song" />
      <span className="margo-feed-memory-card__composite-date" />
    </div>
  )
}

export function FeedMemoryPromoCard({ promoKind }: { promoKind: MemoryPromoKind }) {
  const router = useRouter()
  const copy = memoryCardCopy(promoKind, { videosSupported: true })

  const open = useCallback(() => {
    openFeedCreate(router, promoKind)
  }, [promoKind, router])

  return (
    <article
      className="margo-feed-memory-card margo-mix-press"
      data-feed-exit={`create-${promoKind}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
    >
      <div className="margo-feed-memory-card__art" aria-hidden>
        <PromoArt kind={promoKind} />
      </div>
      <div className="margo-feed-memory-card__copy">
        <p className="margo-feed-memory-card__title" style={{ fontFamily: font }}>
          {copy.title}
        </p>
        <p className="margo-feed-memory-card__subtitle" style={{ fontFamily: font }}>
          {copy.subtitle}
        </p>
      </div>
      <div className="margo-feed-memory-card__action-wrap">
        <span className="margo-feed-memory-card__action" aria-hidden>
          <PlusIcon size={18} color="var(--bg)" />
        </span>
      </div>
    </article>
  )
}
