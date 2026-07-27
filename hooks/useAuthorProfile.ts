'use client'
import { useEffect, useState } from 'react'
import { subscribeAuthorProfile, type AuthorProfile } from '@/lib/profile-lookup'

export function useAuthorProfile(authorUid: string | null | undefined): AuthorProfile | null {
  const [profile, setProfile] = useState<AuthorProfile | null>(null)

  useEffect(() => {
    if (!authorUid) {
      setProfile(null)
      return
    }
    const unsub = subscribeAuthorProfile(authorUid, setProfile)
    return unsub
  }, [authorUid])

  return profile
}