'use client'

import { useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useRegisterNavBack } from '@/components/nav-back'
import { confirmLeaveProfileEdit } from '@/lib/profile-edit-unsaved'

/**
 * Warn before leaving Edit Profile when Save-required fields differ from identity.
 */
export function useProfileEditLeaveGuard(isDirty: boolean) {
  const pathname = usePathname()
  const editPath = pathname?.split('?')[0] === '/profile/edit'

  const navBackConfig = useMemo(
    () =>
      isDirty && editPath
        ? {
            fallbackHref: '/you',
            onBack: () => {
              if (confirmLeaveProfileEdit()) return false
              return true
            }, // true = stay on page (BackButton contract)
          }
        : null,
    [isDirty, editPath],
  )

  useRegisterNavBack(navBackConfig)

  useEffect(() => {
    if (!isDirty || !editPath) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty, editPath])

  useEffect(() => {
    if (!isDirty || !editPath) return
    window.history.pushState({ margoProfileEditGuard: true }, '', window.location.href)
    const onPopState = () => {
      if (confirmLeaveProfileEdit()) return
      window.history.pushState({ margoProfileEditGuard: true }, '', window.location.href)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isDirty, editPath])

  useEffect(() => {
    if (!isDirty || !editPath) return
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      const path = href.split('?')[0]
      if (path === '/profile/edit') return
      if (!confirmLeaveProfileEdit()) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [isDirty, editPath])
}
