'use client'

import { useCallback } from 'react'
import { CloseIcon, PlusIcon } from '@/components/icons'
import { MargoCtaButton } from '@/components/margo-cta-button'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function FeedMemoryNudge({ onDismiss }: { onDismiss?: () => void }) {
  const dismiss = useCallback(() => {
    onDismiss?.()
  }, [onDismiss])

  return (
    <div className="margo-feed-memory-nudge">
      <button
        type="button"
        className="margo-feed-memory-nudge__dismiss"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        <CloseIcon size={14} color="var(--text-muted)" />
      </button>
      <p className="margo-feed-memory-nudge__copy" style={{ fontFamily: font }}>
        Share your memories. Link them to a song or a photo and tell the story behind them.
      </p>
      <MargoCtaButton
        href="/memories/new"
        variant="fill"
        density="compact"
        icon={<PlusIcon size={16} color="var(--bg)" />}
        onClick={dismiss}
      >
        Create memory
      </MargoCtaButton>
    </div>
  )
}
