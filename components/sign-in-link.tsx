'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo, type ComponentProps, type MouseEvent } from 'react'
import { captureAuthReturnScroll, currentReturnPath, formatSigninHref } from '@/lib/auth-return'

type SignInLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  mode?: 'signup' | 'signin'
}

/** Sign-in entry that captures return path + scroll before navigation. */
export function SignInLink({ children, mode, onPointerDown, onClick, ...rest }: SignInLinkProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnPath = useMemo(() => {
    if (typeof window === 'undefined') return '/feed'
    return currentReturnPath()
  }, [pathname, searchParams])

  const href = formatSigninHref({ returnTo: returnPath, mode })

  return (
    <Link
      {...rest}
      href={href}
      onPointerDown={(event) => {
        captureAuthReturnScroll(returnPath)
        onPointerDown?.(event)
      }}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event)
      }}
    >
      {children}
    </Link>
  )
}
