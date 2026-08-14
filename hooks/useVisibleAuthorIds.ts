'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'

const supabase = createClient()

/**
 * Given the author UIDs present in a list of posts, returns the subset
 * whose content the signed-in viewer is allowed to see.
 *
 * An author's content is visible if any of:
 *  - they have no Supabase profile row (legacy/Firebase-only author —
 *    there's no privacy setting to enforce, so default to visible)
 *  - their profile is public (is_private = false)
 *  - the viewer is the author themselves
 *  - the viewer follows the author with an accepted follow (private profile)
 *
 * Unknown privacy is NOT treated as visible — that was the logged-in
 * empty/swap flash (show everyone, then drop private accounts, then
 * restore follows). Callers should keep loading until `ready`.
 */
export function useVisibleAuthorIds(authorUids: (string | null | undefined)[]) {
  const { user: authUser, loading: authLoading } = useAuthGate()
  const signedIn = !authLoading && !!authUser && !authUser.is_anonymous
  const viewerId = signedIn ? authUser!.id : null

  const [privacyMap, setPrivacyMap] = useState<Record<string, boolean>>({})
  const [privacyEpoch, setPrivacyEpoch] = useState('')
  const [acceptedFollows, setAcceptedFollows] = useState<Set<string>>(new Set())
  const [followsEpoch, setFollowsEpoch] = useState('')

  const uniqueIdsKey = useMemo(
    () => Array.from(new Set(authorUids.filter((id): id is string => !!id))).sort().join(','),
    [authorUids]
  )
  const uniqueIds = useMemo(
    () => (uniqueIdsKey ? uniqueIdsKey.split(',') : []),
    [uniqueIdsKey]
  )

  useEffect(() => {
    if (uniqueIds.length === 0) {
      setPrivacyEpoch('')
      return
    }
    let active = true
    supabase
      .from('profiles')
      .select('id, is_private')
      .in('id', uniqueIds)
      .then(({ data, error }) => {
        if (!active || error) return
        setPrivacyMap(prev => {
          const next = { ...prev }
          uniqueIds.forEach(id => {
            const row = data?.find(r => r.id === id)
            next[id] = row ? !!row.is_private : false
          })
          return next
        })
        setPrivacyEpoch(uniqueIdsKey)
      })
    return () => { active = false }
  }, [uniqueIdsKey, uniqueIds])

  useEffect(() => {
    if (authLoading) return
    if (!viewerId || uniqueIds.length === 0) {
      setAcceptedFollows(new Set())
      setFollowsEpoch(uniqueIdsKey)
      return
    }
    let active = true
    supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', viewerId)
      .eq('status', 'accepted')
      .in('followee_id', uniqueIds)
      .then(({ data, error }) => {
        if (!active || error) return
        setAcceptedFollows(new Set((data || []).map(r => r.followee_id)))
        setFollowsEpoch(uniqueIdsKey)
      })
    return () => { active = false }
  }, [authLoading, viewerId, uniqueIdsKey, uniqueIds])

  const privacyReady = uniqueIds.length === 0 || privacyEpoch === uniqueIdsKey
  const followsReady =
    uniqueIds.length === 0 ||
    (!authLoading && (!viewerId || followsEpoch === uniqueIdsKey))
  const ready = !authLoading && privacyReady && followsReady

  const ids = useMemo(() => {
    const visible = new Set<string>()
    if (!ready) return visible
    uniqueIds.forEach(id => {
      const isPrivate = privacyMap[id]
      if (isPrivate === undefined) return
      if (!isPrivate) { visible.add(id); return }
      if (viewerId && id === viewerId) { visible.add(id); return }
      if (acceptedFollows.has(id)) visible.add(id)
    })
    return visible
  }, [ready, uniqueIds, uniqueIdsKey, privacyMap, acceptedFollows, viewerId])

  return { ids, ready }
}
