'use client'

import { useEffect, useState } from 'react'
import { CloseIcon, MenuIcon, MusicNoteIcon } from '@/components/icons'
import { StoryAvatarRing } from '@/components/stories/story-avatar-ring'
import { useStoryRingContext } from '@/components/stories/story-ring-context'
import { TYPE, UI_FONT } from '@/lib/fonts'
import type { StoryRingAuthor } from '@/lib/stories/types'

const font = UI_FONT
const MOBILE_MQ = '(max-width: 639px)'
/** Vercel sleeping toolbar: 32px circle. Hit area stays 44px. */
const TOOLBAR_VISUAL = 32
const TOOLBAR_HIT = 44

/** Matches Feed / nav mobile breakpoint (tab bar, 639px). null until mounted. */
export function useMargoMobileViewport(): boolean | null {
  const [mobile, setMobile] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

/**
 * Mobile Stories entry — Vercel preview toolbar: 32px hamburger circle,
 * bottom-right above the tab bar. One person opens immediately; many
 * magnify into an avatar stack. No sheet/modal.
 */
export function StoriesDock({ onAddStory }: { onAddStory?: () => void }) {
  const ctx = useStoryRingContext()
  const isMobile = useMargoMobileViewport()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  if (!ctx?.signedIn || isMobile !== true) return null

  const { authors, openStory, warmStory } = ctx
  const unseen = authors.find((a) => a.hasUnseen) ?? authors[0] ?? null
  const hasUnseen = authors.some((a) => a.hasUnseen)

  const openPerson = (profileId: string) => {
    setExpanded(false)
    openStory(profileId)
  }

  const handleDockClick = () => {
    if (expanded) {
      setExpanded(false)
      return
    }
    if (authors.length === 1) {
      openPerson(authors[0].profileId)
      return
    }
    if (authors.length === 0) {
      onAddStory?.()
      return
    }
    setExpanded(true)
  }

  return (
    <>
      {expanded ? (
        <button
          type="button"
          aria-label="Close Stories"
          onClick={() => setExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 69,
            border: 'none',
            padding: 0,
            margin: 0,
            background: 'transparent',
            cursor: 'default',
          }}
        />
      ) : null}

      <div
        className="margo-stories-dock"
        style={{
          position: 'fixed',
          zIndex: 70,
          right: '12px',
          bottom: 'calc(var(--margo-page-bottom) + 12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {expanded && authors.length > 0 ? (
          <div
            role="list"
            aria-label="Stories"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px',
              maxHeight: 'min(52dvh, 360px)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              pointerEvents: 'auto',
              paddingRight: `${(TOOLBAR_HIT - TOOLBAR_VISUAL) / 2}px`,
            }}
          >
            {authors.map((author, index) => (
              <ExpandedStoryChip
                key={author.profileId}
                author={author}
                delayMs={index * 28}
                onWarm={() => warmStory(author.profileId)}
                onOpen={() => openPerson(author.profileId)}
              />
            ))}
            <style>{`
              @keyframes margo-story-magnify {
                from { transform: translateY(10px) scale(0.72); opacity: 0; }
                to { transform: none; opacity: 1; }
              }
            `}</style>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleDockClick}
          onPointerDown={() => {
            if (unseen) warmStory(unseen.profileId)
          }}
          aria-label={expanded ? 'Close Stories' : hasUnseen ? 'Open new Stories' : 'Open Stories'}
          aria-expanded={expanded}
          style={{
            width: TOOLBAR_HIT,
            height: TOOLBAR_HIT,
            minWidth: TOOLBAR_HIT,
            minHeight: TOOLBAR_HIT,
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              position: 'relative',
              width: TOOLBAR_VISUAL,
              height: TOOLBAR_VISUAL,
              borderRadius: '50%',
              border: '1px solid var(--border-hi)',
              background: 'var(--margo-bar)',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--bg) 55%, transparent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {expanded ? (
              <CloseIcon size={14} color="var(--text)" />
            ) : (
              <MenuIcon size={14} color="var(--text)" />
            )}
            {!expanded && hasUnseen ? (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: '3px',
                  right: '3px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  border: '1px solid var(--bg)',
                }}
              />
            ) : null}
          </span>
        </button>
      </div>
    </>
  )
}

function ExpandedStoryChip({
  author,
  delayMs,
  onOpen,
  onWarm,
}: {
  author: StoryRingAuthor
  delayMs: number
  onOpen: () => void
  onWarm: () => void
}) {
  const label = author.isSelf ? 'Your Story' : (author.displayName || author.username)
  return (
    <button
      type="button"
      role="listitem"
      onClick={onOpen}
      onPointerDown={onWarm}
      aria-label={author.hasUnseen ? `View ${label}'s new Story` : `View ${label}'s Story`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: 0,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        animation: `margo-story-magnify 180ms ease-out ${delayMs}ms both`,
      }}
    >
      <span style={{
        fontFamily: font,
        fontSize: TYPE.label,
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: 'var(--text)',
        maxWidth: '120px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'right',
      }}>
        {label}
      </span>
      <StoryAvatarRing size={32} hasUnseen={author.hasUnseen}>
        {author.avatarUrl ? (
          <img
            src={author.avatarUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <MusicNoteIcon size={14} color="var(--gold)" />
        )}
      </StoryAvatarRing>
    </button>
  )
}
