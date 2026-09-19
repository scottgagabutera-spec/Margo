'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuthGate } from '@/components/supabase-auth-provider'
import {
  AUTH_GATE_ERROR_PARAM,
  authGateErrorMessage,
  parseAuthGateErrorCode,
} from '@/lib/oauth-error-redirect'

/**
 * When OAuth fails from the auth gate, server redirects back to the origin
 * page with ?auth_error= instead of dumping the user on /signin.
 */
export function AuthGateErrorHandler() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading, openAuthGateWithError } = useAuthGate()
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading || user) return

    const code = parseAuthGateErrorCode(searchParams.get(AUTH_GATE_ERROR_PARAM))
    if (!code) return

    const fingerprint = `${pathname}?${searchParams.toString()}`
    if (handledRef.current === fingerprint) return
    handledRef.current = fingerprint

    const returnPath = `${pathname}${(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete(AUTH_GATE_ERROR_PARAM)
      const qs = params.toString()
      return qs ? `?${qs}` : ''
    })()}`

    openAuthGateWithError(authGateErrorMessage(code), returnPath)

    const cleanParams = new URLSearchParams(searchParams.toString())
    cleanParams.delete(AUTH_GATE_ERROR_PARAM)
    const cleanQs = cleanParams.toString()
    router.replace(cleanQs ? `${pathname}?${cleanQs}` : pathname, { scroll: false })
  }, [loading, user, pathname, searchParams, router, openAuthGateWithError])

  return null
}
