'use client'

import type { CSSProperties } from 'react'
import { StoryAvatarRing } from '@/components/stories/story-avatar-ring'
import { useStoryRingContext } from '@/components/stories/story-ring-context'
import { UI_FONT } from '@/lib/fonts'
import type { StoryRingAuthor } from '@/lib/stories/types'

const font = UI_FONT

interface StoryRingProps {
  onAddStory?: () => void
}

function StoryAvatar({
  author,
  onClick,
}: {
  author: StoryRingAuthor
  onClick: () => void
}) {
  const label = author.isSelf ? 'Your Story' : (author.displayName || author.username)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={author.hasUnseen ? `View ${label}'s new Story` : `View ${label}'s Story`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        minWidth: '64px',
        maxWidth: '72px',
        background: 'none',
        border: 'none',
        padding: '0 2px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <StoryAvatarRing size={52} hasUnseen={author.hasUnseen}>
        {author.avatarUrl ? (
          <img
            src={author.avatarUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="10" cy="7" r="3" stroke="var(--text-muted)" strokeWidth="1.5" />
            <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </StoryAvatarRing>
      <span style={{
        fontFamily: font,
        fontSize: '0.58rem',
        fontWeight: 600,
        letterSpacing: '0.2px',
        color: author.hasUnseen ? 'var(--gold)' : 'var(--text-secondary)',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {author.isSelf ? 'Your Story' : (author.displayName?.split(' ')[0] || author.username)}
      </span>
    </button>
  )
}

function AddStoryChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add to your Story"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        minWidth: '64px',
        maxWidth: '72px',
        background: 'none',
        border: 'none',
        padding: '0 2px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        border: '1.5px dashed var(--gold-border)',
        background: 'var(--gold-faint)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--gold)',
        fontFamily: font,
        fontSize: '1.4rem',
        fontWeight: 300,
        lineHeight: 1,
      }}>
        +
      </span>
      <span style={{
        fontFamily: font,
        fontSize: '0.58rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
      }}>
        Add
      </span>
    </button>
  )
}

export function StoryRing({ onAddStory }: StoryRingProps) {
  const ctx = useStoryRingContext()
  if (!ctx?.signedIn) return null
  const { authors, loading, openStory } = ctx
  if (!loading && authors.length === 0 && !onAddStory) return null

  const scrollerStyle: CSSProperties = {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    padding: '4px 2px 12px',
    scrollSnapType: 'x proximity',
    WebkitOverflowScrolling: 'touch',
  }

  return (
    <div style={scrollerStyle} className="margo-story-ring">
      {onAddStory && <AddStoryChip onClick={onAddStory} />}
      {authors.map((author) => (
        <StoryAvatar
          key={author.profileId}
          author={author}
          onClick={() => openStory(author.profileId)}
        />
      ))}
      <style>{`
        .margo-story-ring::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
