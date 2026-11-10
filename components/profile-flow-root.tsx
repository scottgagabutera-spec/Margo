import type { ReactNode } from 'react'

/** Profile page shell — inherits Geist from root layout (`var(--font-geist-sans)`). */
export function ProfileFlowRoot({ children }: { children: ReactNode }) {
  return <div className="margo-profile-flow-root">{children}</div>
}
