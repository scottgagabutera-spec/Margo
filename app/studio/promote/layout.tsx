import { Suspense } from 'react'

export default function StudioPromoteLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
