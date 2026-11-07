'use client'

import type { RefObject } from 'react'
import Link from 'next/link'
import MargoLogo from '@/components/MargoLogo'
import { BackButton } from '@/components/back-button'
import { SearchNavLink } from '@/components/hub-menu'
import { MoreIcon } from '@/components/icons'
import { ProfileAccountMenu } from '@/components/profile-account-menu'

export function ProfileShellHeader({
  isOwnProfile,
  showStudio,
  accountMenuOpen,
  onAccountMenuOpenChange,
  accountMenuTriggerRef,
  onSignOut,
}: {
  isOwnProfile: boolean
  showStudio: boolean
  accountMenuOpen: boolean
  onAccountMenuOpenChange: (open: boolean) => void
  accountMenuTriggerRef: RefObject<HTMLButtonElement | null>
  onSignOut: () => void
}) {
  return (
    <header className="margo-profile-shell-header" data-testid="profile-shell-header">
      <div className="margo-profile-shell-header__leading">
        {isOwnProfile ? (
          <Link
            href="/feed"
            aria-label="Margo home"
            className="margo-profile-shell-header__logo"
          >
            <MargoLogo tier="symbol" size={28} rings />
          </Link>
        ) : (
          <BackButton fallbackHref="/feed" variant="chrome" label="Back" />
        )}
      </div>
      <div className="margo-profile-shell-header__trailing">
        <SearchNavLink />
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
        ) : null}
      </div>
    </header>
  )
}
