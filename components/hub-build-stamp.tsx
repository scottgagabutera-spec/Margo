'use client'

import { previewBuildShortSha } from '@/lib/build-stamp'

export function HubBuildStamp() {
  const sha = previewBuildShortSha()
  if (!sha) return null
  return (
    <p className="margo-hub-build-stamp" aria-label={`Preview build ${sha}`}>
      Build {sha}
    </p>
  )
}
