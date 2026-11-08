'use client'

import { useRouter } from 'next/navigation'
import { MusicNoteIcon, PlusIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function FeedListeningPromptCard() {
  const router = useRouter()

  return (
    <article className="margo-feed-listening-prompt">
      <div className="margo-feed-listening-prompt__art" aria-hidden>
        <MusicNoteIcon size={20} color="var(--gold)" />
      </div>
      <div className="margo-feed-listening-prompt__copy">
        <p className="margo-feed-listening-prompt__title" style={{ fontFamily: font }}>
          What are you listening to?
        </p>
        <p className="margo-feed-listening-prompt__line" style={{ fontFamily: font }}>
          Tell us what you are playing.
        </p>
      </div>
      <button
        type="button"
        className="margo-feed-memory-card__action"
        aria-label="What are you listening to?"
        onClick={() => router.push('/memories/new?listening=1')}
      >
        <PlusIcon size={18} color="var(--bg)" />
      </button>
    </article>
  )
}
