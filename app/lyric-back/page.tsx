'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Legacy /lyric-back URLs → feed panel or post thread (inline compose).
 */
function LyricBackRedirectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const echoId = searchParams.get('echoId')
    const postId = searchParams.get('postId')
    if (echoId) {
      router.replace(`/post/${encodeURIComponent(echoId)}`)
      return
    }
    if (postId) {
      router.replace(`/feed?highlight=${encodeURIComponent(postId)}&openLb=1`)
      return
    }
    router.replace('/feed')
  }, [router, searchParams])

  return null
}

export default function LyricBackRedirectPage() {
  return (
    <Suspense fallback={null}>
      <LyricBackRedirectInner />
    </Suspense>
  )
}
