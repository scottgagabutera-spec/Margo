'use client'

import { useMemo } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount'
import { useIdentity } from '@/hooks/useIdentity'
import {
  hubHasActivity,
  resolveHubTiles,
  type ResolvedHubTile,
} from '@/lib/hub/tiles'

export function useHubSurfaces(signedIn: boolean): {
  tiles: ResolvedHubTile[]
  hasActivity: boolean
} {
  const { identity } = useIdentity()
  const { notifications } = useNotifications()
  const messagesUnread = useUnreadMessagesCount()

  const notificationsUnread = signedIn
    ? notifications.filter((n) => !n.readAt && n.type !== 'message').length
    : 0

  return useMemo(() => {
    const tiles = resolveHubTiles({
      signedIn,
      isArtist: !!identity?.isArtist,
      unread: {
        messages: signedIn ? messagesUnread : 0,
        notifications: notificationsUnread,
      },
    })
    return {
      tiles,
      hasActivity: signedIn && hubHasActivity(tiles),
    }
  }, [signedIn, identity?.isArtist, messagesUnread, notificationsUnread])
}
