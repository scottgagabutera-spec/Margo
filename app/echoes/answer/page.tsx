'use client'

import { Suspense, type ReactNode } from 'react'
import { EchoesAnswerFlow } from '@/components/echoes-answer-flow'

export default function EchoesAnswerPage() {
  return (
    <EchoesAnswerShell>
      <Suspense fallback={null}>
        <EchoesAnswerFlow />
      </Suspense>
    </EchoesAnswerShell>
  )
}

function EchoesAnswerShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: 'calc(var(--nav-height, 72px) + 16px) 16px' }}>
      {children}
    </div>
  )
}
