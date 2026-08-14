'use client'

import { useMemo } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount'
import {
  buildHubSurfaces,
  hubHasActivity,
  type HubSurface,
} from '@/lib/hub/surfaces'

/**
 * Live unread for Hub surfaces that actually have an unread concept.
 * Library is omitted from the unread map (stays 0) until it has one.
 */
export function useHubSurfaces(signedIn: boolean): {
  surfaces: HubSurface[]
  hasActivity: boolean
} {
  const { notifications } = useNotifications()
  const messagesUnread = useUnreadMessagesCount()

  const notificationsUnread = signedIn
    ? notifications.filter((n) => !n.readAt && n.type !== 'message').length
    : 0

  return useMemo(() => {
    const surfaces = buildHubSurfaces({
      messages: signedIn ? messagesUnread : 0,
      notifications: notificationsUnread,
    })
    return { surfaces, hasActivity: signedIn && hubHasActivity(surfaces) }
  }, [signedIn, messagesUnread, notificationsUnread])
}
