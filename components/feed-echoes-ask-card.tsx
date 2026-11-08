'use client'

import { useRouter } from 'next/navigation'
import { EditIcon } from '@/components/icons'
import type { EchoFeedBlockSnapshot } from '@/lib/echoes/types'
import { openFeedEchoesAnswer } from '@/lib/feed-mix-nav'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function FeedEchoesAskCard({ block, signedIn }: { block: EchoFeedBlockSnapshot; signedIn: boolean }) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()

  const startAnswer = () => {
    if (!requireAuth()) return
    openFeedEchoesAnswer(router, block.questionId, block.setId)
  }

  return (
    <article className="margo-feed-echoes-ask margo-pressable-surface" data-feed-exit="echoes-ask">
      <div className="margo-feed-echoes-ask__body">
        <p className="margo-feed-echoes-ask__title" style={{ fontFamily: font }}>
          {block.title || 'What are you listening to?'}
        </p>
        <p className="margo-feed-echoes-ask__line" style={{ fontFamily: font }}>
          Tell people your songs this week.
        </p>
      </div>
      {signedIn ? (
        <button type="button" className="margo-icon-hit-44" aria-label="Answer" onClick={startAnswer}>
          <span className="margo-gold-square-30">
            <EditIcon size={16} color="var(--bg)" />
          </span>
        </button>
      ) : (
        <p className="margo-feed-echoes-ask__signin" style={{ fontFamily: font }}>
          Sign in to answer
        </p>
      )}
    </article>
  )
}
