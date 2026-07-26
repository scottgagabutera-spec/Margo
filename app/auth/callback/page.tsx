'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const font = 'var(--font-lora), serif'

/**
 * Lands here after completing a Google or Discord OAuth redirect
 * (see components/auth-form.tsx handleOAuthSubmit). supabase-js
 * automatically picks up the session from the URL on load — this page
 * just waits for that to resolve, then sends the person on to the
 * feed. No password handling needed here anymore: email/password
 * signup now sets the password directly via supabase.auth.signUp()
 * in auth-form.tsx, with no separate verification step to complete.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'working' | 'error'>('working')

  useEffect(() => {
    const finish = async () => {
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