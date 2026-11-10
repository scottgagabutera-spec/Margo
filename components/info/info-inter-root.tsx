import type { ReactNode } from 'react'

/** Help / legal content shell — inherits Geist from root layout (`var(--font-geist-sans)`). */
export function InfoInterRoot({ children }: { children: ReactNode }) {
  return <div className="margo-help-root">{children}</div>
}
