import { InfoInterRoot } from '@/components/info/info-inter-root'
import type { ReactNode } from 'react'

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return <InfoInterRoot>{children}</InfoInterRoot>
}
