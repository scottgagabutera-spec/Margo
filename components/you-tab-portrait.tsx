'use client'

import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { isMargoBrandUsername } from '@/lib/margo-brand-account'

type Props = {
  username: string
  displayName: string
  avatarUrl?: string | null
  active: boolean
}

/** ~32px portrait tile for primary tab bar You slot (mobile). */
export function YouTabPortrait({ username, displayName, avatarUrl, active }: Props) {
  const brandMark = isMargoBrandUsername(username)
  const initial = (displayName || username || '?').trim().slice(0, 1).toUpperCase()
  return (
    <span
      className="margo-you-tab-portrait"
      data-active={active ? '1' : '0'}
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        borderRadius: '7px',
        border: active ? '1.5px solid var(--gold)' : '1px solid var(--border)',
        padding: '1px',
        boxSizing: 'border-box',
        transition: 'border-color 80ms var(--ease-out)',
      }}
    >
      <MargoPortraitAvatar
        size="tab"
        imageUrl={avatarUrl}
        fallbackInitial={initial}
        fallbackSeed={!avatarUrl && !brandMark ? username : null}
        brandMark={brandMark}
        separationRingColor="var(--bg)"
        style={{ display: 'block' }}
      />
    </span>
  )
}
