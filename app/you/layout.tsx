import type { Metadata } from 'next'
import { ProfileFlowRoot } from '@/components/profile-flow-root'

export const metadata: Metadata = {
  title: 'You',
}

export default function YouLayout({ children }: { children: React.ReactNode }) {
  return <ProfileFlowRoot>{children}</ProfileFlowRoot>
}
