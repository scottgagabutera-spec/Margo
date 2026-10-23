'use client'

import type { ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { PendingNavLink } from '@/components/pending-nav-link'
import { navigateToPostThread, postThreadHref } from '@/lib/post-thread-nav'

type Props = Omit<ComponentProps<typeof PendingNavLink>, 'href'> & {
  postId: string
}

/** Post thread link — replace unless the target is already one step back. */
export function PostThreadLink({ postId, onClick, ...rest }: Props) {
  const router = useRouter()
  const href = postThreadHref(postId)
  return (
    <PendingNavLink
      {...rest}
      href={href}
      prefetch
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        e.preventDefault()
        navigateToPostThread(router, postId)
      }}
    />
  )
}
