import type { Metadata } from 'next'
import { AdminShellGateProvider } from '@/components/admin-shell-gate'
import { getServerAdminVerified } from '@/lib/admin-page-gate'

export const metadata: Metadata = {
  title: { absolute: 'Internal' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const serverAdminVerified = await getServerAdminVerified()
  return (
    <AdminShellGateProvider serverAdminVerified={serverAdminVerified}>
      {children}
    </AdminShellGateProvider>
  )
}
