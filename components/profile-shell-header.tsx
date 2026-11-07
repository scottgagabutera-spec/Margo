'use client'

import type { RefObject } from 'react'
import { BackButton } from '@/components/back-button'
import { MoreIcon } from '@/components/icons'
import { ProfileAccountMenu } from '@/components/profile-account-menu'

export function ProfileShellHeader({
  isOwnProfile,
  showStudio,
  accountMenuOpen,
  onAccountMenuOpenChange,
  accountMenuTriggerRef,
  onSignOut,
  onVisitorMenuOpen,
}: {
  isOwnProfile: boolean
  showStudio: boolean
  accountMenuOpen: boolean
  onAccountMenuOpenChange: (open: boolean) => void
  accountMenuTriggerRef: RefObject<HTMLButtonElement | null>
  onSignOut: () => void
  onVisitorMenuOpen?: () => void
}) {
  return (
    <header className="margo-profile-shell-header" data-testid="profile-shell-header">
      <div className="margo-profile-shell-header__leading">
        {!isOwnProfile ? (
          <BackButton fallbackHref="/feed" variant="chrome" label="Back" />
        ) : (
          <span className="margo-profile-shell-header__leading-spacer" aria-hidden />
        )}
      </div>
      <div className="margo-profile-shell-header__trailing">
        {isOwnProfile ? (
          <div className="margo-profile-shell-header__menu">
            <button
              ref={accountMenuTriggerRef}
              type="button"
              aria-label="Account menu"
              aria-expanded={accountMenuOpen}
              aria-haspopup="dialog"
              onClick={() => onAccountMenuOpenChange(!accountMenuOpen)}
              className="margo-profile-shell-header__menu-btn"
            >
              <MoreIcon size={18} color="var(--text-secondary)" />
            </button>
            <ProfileAccountMenu
              open={accountMenuOpen}
              onOpenChange={onAccountMenuOpenChange}
              triggerRef={accountMenuTriggerRef}
              showStudio={showStudio}
              onSignOut={onSignOut}
            />
          </div>
        ) : (
          <button
            type="button"
            aria-label="Profile options"
            onClick={() => onVisitorMenuOpen?.()}
            className="margo-profile-shell-header__menu-btn"
          >
            <MoreIcon size={18} color="var(--text-secondary)" />
          </button>
        )}
      </div>
    </header>
  )
}
