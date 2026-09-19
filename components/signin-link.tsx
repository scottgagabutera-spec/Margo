'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps, MouseEvent } from 'react'
import {
  buildSigninHref,
  persistAuthReturnScroll,
  type AuthModeParam,
} from '@/lib/auth-return'
import { persistActivePrimaryScroll } from '@/components/primary-tab-shell'

type SignInLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  /** Destination after auth. Defaults to the page the user is on now. */
  returnTo?: string | null
  mode?: AuthModeParam
}

export function useSigninHref(returnTo?: string | null, mode?: AuthModeParam): string {
  const pathname = usePathname()
  return buildSigninHref(returnTo ?? pathname, mode ? { mode } : undefined)
}

export function SignInLink({ returnTo, mode, onClick, ...props }: SignInLinkProps) {
  const href = useSigninHref(returnTo, mode)

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    persistActivePrimaryScroll()
    persistAuthReturnScroll()
    onClick?.(e)
  }

  return <Link href={href} onClick={handleClick} {...props} />
}
