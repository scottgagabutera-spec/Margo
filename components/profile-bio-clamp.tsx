'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'

export function ProfileBioClamp({
  bio,
  editHref,
  className,
}: {
  bio: string
  editHref?: string
  className?: string
}) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [clamped, setClamped] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || expanded) return
    setClamped(el.scrollHeight > el.clientHeight + 1)
  }, [bio, expanded])

  if (!bio.trim() && editHref) {
    return (
      <Link
        href={editHref}
        className={className ?? 'margo-profile-bio'}
        style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'block' }}
      >
        Add bio
      </Link>
    )
  }

  if (!bio.trim()) return null

  return (
    <div className="margo-profile-bio-wrap">
      <p
        ref={textRef}
        className={`${className ?? 'margo-profile-bio'}${expanded ? ' margo-profile-bio--expanded' : ''}`}
      >
        {bio}
      </p>
      {clamped && !expanded ? (
        <button
          type="button"
          className="margo-profile-bio-more"
          onClick={() => setExpanded(true)}
        >
          more
        </button>
      ) : null}
    </div>
  )
}
