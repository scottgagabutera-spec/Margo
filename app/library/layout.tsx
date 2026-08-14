import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Library',
  description: 'Your liked songs, listen later, and saved mixes on Margo.',
  alternates: { canonical: 'https://trymargo.com/library' },
}

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
