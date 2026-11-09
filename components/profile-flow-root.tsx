import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export function ProfileFlowRoot({ children }: { children: ReactNode }) {
  return <div className={`margo-profile-flow-root ${inter.className}`}>{children}</div>
}
