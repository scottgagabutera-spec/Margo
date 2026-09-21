'use client'

import { StoryAvatarRing } from '@/components/stories/story-avatar-ring'
import { useStoryRingContext } from '@/components/stories/story-ring-context'
import { UI_FONT } from '@/lib/fonts'
import { toast } from 'sonner'

const font = UI_FONT

/**
 * Mobile Stories entry — Vercel preview-toolbar size class.
 * 44×44px min (brand touch) in a 40px-visual floating pill, bottom-left
 * above tab bar / mini-player. Feed-only; desktop keeps the top tray.
 */
export function StoriesDock({ onAddStory }: { onAddStory?: () => void }) {
  const ctx = useStoryRingContext()
  if (!ctx?.signedIn) return null

  const { authors, openStory, warmStory } = ctx
  const unseen = authors.find((a) => a.hasUnseen) ?? authors[0] ?? null
  const hasUnseen = authors.some((a) => a.hasUnseen)

  const handleClick = () => {
    if (unseen) {
      openStory(unseen.profileId)
      return
    }
    if (onAddStory) {
      onAddStory()
      return
    }
    toast('Open a Moment and tap Add to Story in the export sheet.')
  }

  return (
    <button
      type="button"
      className="margo-stories-dock"
      onClick={handleClick}
      onPointerDown={() => {
        if (unseen) warmStory(unseen.profileId)
      }}
      aria-label={hasUnseen ? 'Open new Stories' : 'Open Stories'}
      style={{
        position: 'fixed',
        zIndex: 70,
        left: '16px',
        bottom: 'calc(var(--margo-page-bottom) + 12px)',
        minWidth: 'var(--margo-touch-min)',
        minHeight: 'var(--margo-touch-min)',
        height: 'var(--margo-touch-min)',
        padding: unseen ? '2px 10px 2px 2px' : '0 12px',
        display: 'none',
        alignItems: 'center',
        gap: '8px',
        borderRadius: '999px',
        border: '1px solid var(--gold-border)',
        background: 'var(--margo-bar)',
        boxShadow: '0 8px 24px color-mix(in srgb, var(--bg) 55%, transparent)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        boxSizing: 'border-box',
      }}
    >
      {unseen ? (
        <StoryAvatarRing size={32} hasUnseen={hasUnseen}>
          {unseen.avatarUrl ? (
            <img
              src={unseen.avatarUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="10" cy="7" r="3" stroke="var(--gold)" strokeWidth="1.5" />
              <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </StoryAvatarRing>
      ) : (
        <span style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '1.5px dashed var(--gold-border)',
          background: 'var(--gold-faint)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gold)',
          fontFamily: font,
          fontSize: '1.1rem',
          fontWeight: 300,
          lineHeight: 1,
        }}>+</span>
      )}
      <span style={{
        fontFamily: font,
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        color: hasUnseen ? 'var(--gold)' : 'var(--text-secondary)',
        paddingRight: unseen ? 0 : undefined,
      }}>
        Stories
      </span>
    </button>
  )
}
