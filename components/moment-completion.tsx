'use client'

import { MomentShareStudio } from '@/components/moment-share-studio'
import type { MargoMoment } from '@/lib/moment/types'
import { trackEvent } from '@/lib/analytics/track'

const font = 'var(--font-lora), serif'

export type MomentCompletionMode = 'send' | 'public' | 'private'

interface MomentCompletionProps {
  mode: MomentCompletionMode
  moment: MargoMoment
  onDone: () => void
  sentToName?: string | null
}

export function MomentCompletion({
  mode,
  moment,
  onDone,
  sentToName,
}: MomentCompletionProps) {
  const isPrivate = mode === 'private'
  const isSendDone = mode === 'send' && !!sentToName

  const title = isSendDone
    ? `Sent to ${sentToName}`
    : isPrivate
      ? 'Saved privately.'
      : 'Posted to Feed.'

  const subtitle = isSendDone
    ? "They'll get it in Messages."
    : isPrivate
      ? 'Only you can see this Moment. Export an image below.'
      : 'Share your Moment or head back to the Feed.'

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '16px 16px var(--margo-page-padding-bottom)' }}>
      <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto', paddingTop: '16px' }}>
        <button
          type="button"
          onClick={onDone}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: font, fontSize: '0.68rem', color: 'var(--text-secondary, var(--text-2))',
            letterSpacing: '0.5px', minHeight: '36px', padding: '0 4px', marginBottom: '12px',
          }}
        >
          Done
        </button>

        <p style={{
          fontFamily: font, fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text)', marginBottom: '6px',
        }}>
          {title}
        </p>
        <p style={{
          fontFamily: font, fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.45,
        }}>
          {subtitle}
        </p>

        {(mode === 'public' || mode === 'private') && (
          <MomentShareStudio
            moment={moment}
            compact
            onShareMenuOpen={() => trackEvent('share_opened', { mode })}
            onShared={() => trackEvent('moment_shared', { mode })}
            onExported={() => trackEvent('moment_exported', { mode })}
          />
        )}

        {isSendDone ? (
          <button
            type="button"
            onClick={onDone}
            style={{
              width: '100%', minHeight: 'var(--margo-touch-min)', borderRadius: '50px', border: 'none',
              background: 'var(--gold)', color: 'var(--text-on-gold, var(--bg))',
              fontFamily: font, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px',
              textTransform: 'uppercase', cursor: 'pointer', marginTop: '8px',
            }}
          >
            Done
          </button>
        ) : null}
      </div>
    </main>
  )
}
