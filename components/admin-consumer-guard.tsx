'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { ADMIN_OPERATOR_HOME, shouldProxyRedirectAdminFromConsumerPage } from '@/lib/admin-operator-routes'

/**
 * Client backstop when SPA navigation skips a full document request.
 * Server proxy is the primary gate; this keeps operator sessions off consumer chrome.
 */
export function AdminConsumerGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuthGate()
  const { loading: identityLoading, isAdminOperator } = useIdentity()

  useEffect(() => {
    if (loading || identityLoading) return
    if (!user?.id || user.is_anonymous) return
    if (!isAdminOperator) return
    if (!shouldProxyRedirectAdminFromConsumerPage(pathname || '')) return
    router.replace(ADMIN_OPERATOR_HOME)
  }, [loading, identityLoading, user?.id, user?.is_anonymous, isAdminOperator, pathname, router])

  return null
}
