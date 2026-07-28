'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { BackButton } from '@/components/back-button'

export default function SigninPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'signin'>('signin')
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ position: 'fixed', top: '16px', left: '16px', zIndex: 60 }}>
        <BackButton fallbackHref="/" />
      </div>
      <AuthForm
        mode={mode}
        onSwitchMode={setMode}
        onSuccess={() => router.push('/feed')}
      />
    </div>
  )
}