'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const font = 'var(--font-lora), serif'

/**
 * Lands here after completing a Google or Discord OAuth redirect
 * (see components/auth-form.tsx handleOAuthSubmit). Explicitly
 * exchanges the ?code= param from the URL for a real session —
 * relying on supabase-js's automatic detection caused a race
 * condition where getSession() could resolve before the exchange
 * finished, showing "Something went wrong" even on a successful
 * sign-in. No password handling needed here anymore: email/password
 * signup now sets the password directly via supabase.auth.signUp()
 * in auth-form.tsx, with no separate verification step to complete.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'working' | 'error'>('working')

  useEffect(() => {
    const finish = async () => {
      const code = new URLSearchParams(window.location.search).get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('exchangeCodeForSession failed:', error)
          setStatus('error')
          return
        }
        router.push('/feed')
        return
      }

      // No code param — fall back to checking for an existing session
      // (e.g. implicit-flow hash tokens supabase-js already picked up).
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setStatus('error')
        return
      }
      router.push('/feed')
    }
    finish()
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: font, fontStyle: 'italic', color: status === 'error' ? '#ff6060' : 'var(--gold)', fontSize: '1rem' }}>
        {status === 'error' ? 'Something went wrong — try signing in again.' : 'Signing you in…'}
      </p>
    </div>
  )
}