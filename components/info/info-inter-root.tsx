import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export function InfoInterRoot({ children }: { children: ReactNode }) {
  return <div className={`margo-help-root ${inter.className}`}>{children}</div>
}
