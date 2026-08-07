'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'

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
 * This mirrors the profile-page locked-content rule so a private
 * account's lyrics never surface on any surface a non-follower can
 * reach — main feed, search, etc. — not just when visiting their
 * profile directly. Privacy and messaging permission are separate
 * axes; this hook only governs post/content visibility.
 */
export function useVisibleAuthorIds(authorUids: (string | null | undefined)[]) {
  const { user } = useIdentity()
  const [privacyMap, setPrivacyMap] = useState<Record<string, boolean>>({})
  const [acceptedFollows, setAcceptedFollows] = useState<Set<string>>(new Set())

  const uniqueIdsKey = useMemo(
    () => Array.from(new Set(authorUids.filter((id): id is string => !!id))).sort().join(','),
    [authorUids]
  )
  const uniqueIds = useMemo(
    () => (uniqueIdsKey ? uniqueIdsKey.split(',') : []),
    [uniqueIdsKey]
  )

  useEffect(() => {
    if (uniqueIds.length === 0) return
    let active = true
    supabase
      .from('profiles')
      .select('id, is_private')
      .in('id', uniqueIds)
      .then(({ data, error }) => {
        if (!active || error || !data) return
        setPrivacyMap(prev => {
          const next = { ...prev }
          data.forEach(row => { next[row.id] = !!row.is_private })
          return next
        })
      })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueIdsKey])

  useEffect(() => {
    if (!user || uniqueIds.length === 0) { setAcceptedFollows(new Set()); return }
    let active = true
    supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted')
      .in('followee_id', uniqueIds)
      .then(({ data, error }) => {
        if (!active || error || !data) return
        setAcceptedFollows(new Set(data.map(r => r.followee_id)))
      })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, uniqueIdsKey])

  return useMemo(() => {
    const visible = new Set<string>()
    uniqueIds.forEach(id => {
      const isPrivate = privacyMap[id]
      if (isPrivate === undefined) { visible.add(id); return }
      if (!isPrivate) { visible.add(id); return }
      if (user && id === user.id) { visible.add(id); return }
      if (acceptedFollows.has(id)) visible.add(id)
    })
    return visible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueIdsKey, privacyMap, acceptedFollows, user])
}