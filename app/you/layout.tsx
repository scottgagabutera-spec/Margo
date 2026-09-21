import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'You',
}

export default function YouLayout({ children }: { children: React.ReactNode }) {
  return children
}
