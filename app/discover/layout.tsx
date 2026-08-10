import type { ReactNode } from 'react'
import { DiscoverErrorBoundary } from '@/components/discover-error-boundary'

export default function DiscoverLayout({ children }: { children: ReactNode }) {
  return <DiscoverErrorBoundary>{children}</DiscoverErrorBoundary>
}
