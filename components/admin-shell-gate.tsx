'use client'

import { createContext, useContext, type ReactNode } from 'react'

const AdminShellGateContext = createContext(false)

export function AdminShellGateProvider({
  serverAdminVerified,
  children,
}: {
  serverAdminVerified: boolean
  children: ReactNode
}) {
  return (
    <AdminShellGateContext.Provider value={serverAdminVerified}>
      {children}
    </AdminShellGateContext.Provider>
  )
}

export function useAdminShellGateVerified(): boolean {
  return useContext(AdminShellGateContext)
}
