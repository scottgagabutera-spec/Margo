import type { ReactNode } from 'react'

export default function NewMemoryLayout({ children }: { children: ReactNode }) {
  return <div className="margo-memory-flow-root">{children}</div>
}
