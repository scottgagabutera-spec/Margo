import { notFound } from 'next/navigation'
import { SentryDebugTrigger } from '@/components/debug/sentry-debug-trigger'

export const dynamic = 'force-dynamic'

export default async function SentryDebugPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const secret = process.env.SENTRY_TEST_SECRET?.trim()
  if (!secret || !token || token !== secret) {
    notFound()
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg)',
    }}>
      <SentryDebugTrigger />
    </main>
  )
}
