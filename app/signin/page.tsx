'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'

export default function SigninPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'signin'>('signin')
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <AuthForm
        mode={mode}
        onSwitchMode={setMode}
        onSuccess={() => router.push('/feed')}
      />
    </div>
  )
}