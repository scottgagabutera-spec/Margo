'use client'

import { useEffect, useState } from 'react'
import { MargoSheet } from '@/components/margo-sheet'
import { StoryAvatarRing } from '@/components/stories/story-avatar-ring'
import { useStoryRingContext } from '@/components/stories/story-ring-context'
import { UI_FONT } from '@/lib/fonts'
import type { StoryRingAuthor } from '@/lib/stories/types'

const font = UI_FONT
const MOBILE_MQ = '(max-width: 639px)'

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
 * Mobile Stories entry — Vercel-toolbar size class: 44px circle, bottom-center,
 * icon only. Tap opens a picker sheet; a person opens the Stories v1 viewer.
 */
export function StoriesDock({ onAddStory }: { onAddStory?: () => void }) {
  const ctx = useStoryRingContext()
  const isMobile = useMargoMobileViewport()
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!ctx?.signedIn || isMobile !== true) return null

  const { authors, openStory, warmStory } = ctx
  const unseen = authors.find((a) => a.hasUnseen) ?? authors[0] ?? null
  const hasUnseen = authors.some((a) => a.hasUnseen)

  const openPerson = (profileId: string) => {
    openStory(profileId)
  }

  return (
    <>
      <button
        type="button"
        className="margo-stories-dock"
        onClick={() => setPickerOpen(true)}
        onPointerDown={() => {
          if (unseen) warmStory(unseen.profileId)
        }}
        aria-label={hasUnseen ? 'Open new Stories' : 'Open Stories'}
        style={{
          position: 'fixed',
          zIndex: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 'calc(var(--margo-page-bottom) + 12px)',
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          minWidth: 'var(--margo-touch-min)',
          minHeight: 'var(--margo-touch-min)',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: '1px solid var(--gold-border)',
          background: 'var(--margo-bar)',
          boxShadow: '0 8px 24px color-mix(in srgb, var(--bg) 55%, transparent)',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          boxSizing: 'border-box',
        }}
      >
        <StoryAvatarRing size={28} hasUnseen={hasUnseen}>
          {unseen?.avatarUrl ? (
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
      </button>

      <MargoSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Stories"
        heightMode="auto"
      >
        {authors.length === 0 ? (
          <div style={{ padding: '12px 0 8px' }}>
            <p style={{
              fontFamily: font,
              fontSize: '0.9rem',
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              margin: '0 0 16px',
            }}>
              No Stories yet.
            </p>
            {onAddStory ? (
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false)
                  onAddStory()
                }}
                style={{
                  minHeight: 'var(--margo-touch-min)',
                  padding: '0 18px',
                  borderRadius: '50px',
                  border: '1px solid var(--gold-border)',
                  background: 'var(--gold-faint)',
                  color: 'var(--gold)',
                  fontFamily: font,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                How to add
              </button>
            ) : null}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0 0' }}>
            {authors.map((author) => (
              <StoryPickerRow
                key={author.profileId}
                author={author}
                onWarm={() => warmStory(author.profileId)}
                onOpen={() => openPerson(author.profileId)}
              />
            ))}
          </ul>
        )}
      </MargoSheet>
    </>
  )
}

function StoryPickerRow({
  author,
  onOpen,
  onWarm,
}: {
  author: StoryRingAuthor
  onOpen: () => void
  onWarm: () => void
}) {
  const label = author.isSelf ? 'Your Story' : (author.displayName || author.username)
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        onPointerDown={onWarm}
        aria-label={author.hasUnseen ? `View ${label}'s new Story` : `View ${label}'s Story`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          minHeight: 'var(--margo-touch-min)',
          padding: '10px 0',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
          textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <StoryAvatarRing size={44} hasUnseen={author.hasUnseen}>
          {author.avatarUrl ? (
            <img
              src={author.avatarUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="10" cy="7" r="3" stroke="var(--gold)" strokeWidth="1.5" />
              <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </StoryAvatarRing>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{
            display: 'block',
            fontFamily: font,
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {label}
          </span>
          <span style={{
            display: 'block',
            fontFamily: font,
            fontSize: '0.7rem',
            color: author.hasUnseen ? 'var(--gold)' : 'var(--text-secondary)',
          }}>
            {author.hasUnseen ? 'New' : author.isSelf ? 'Your Story' : `@${author.username}`}
          </span>
        </span>
      </button>
    </li>
  )
}
