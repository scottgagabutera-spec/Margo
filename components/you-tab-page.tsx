'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { buildSigninHref } from '@/lib/auth-return'
import { ProfilePageSkeleton } from '@/components/margo-skeletons'
import ProfilePage from '@/app/profile/[username]/page'

/**
 * Static You tab body — mounted in the keepalive cache as soon as the
 * session is signed in, so the first You tap paints like Feed / Discover.
 * /profile/[username] stays the public profile URL.
 */
export function YouTabPage() {
  const router = useRouter()
  const { user, identity, loading: identityLoading } = useIdentity()
  const { loading: authLoading } = useAuthGate()
  const signedIn = !!user && !user.isAnonymous

  useEffect(() => {
    if (authLoading || identityLoading) return
    if (!signedIn) router.replace(buildSigninHref('/you'))
  }, [authLoading, identityLoading, signedIn, router])

  if (!identity?.username) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{
          padding: 'calc(var(--nav-height, 72px) + 24px) 20px var(--margo-page-padding-bottom)',
        }}>
          <ProfilePageSkeleton />
        </div>
      </main>
    )
  }

  return <ProfilePage username={identity.username} />
}
