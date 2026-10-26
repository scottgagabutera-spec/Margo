'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignInLink } from '@/components/signin-link'
import { useIdentity } from '@/hooks/useIdentity'
import { useNotifications, type Notification } from '@/hooks/useNotifications'
import {
  buildNotificationDisplayRows,
  filterNotifications,
  type NotificationFilter,
} from '@/lib/notifications/display'
import { notificationHref } from '@/lib/navigation/notification-routes'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { LIST_ROW_TYPE, UI_FONT } from '@/lib/fonts'
import { signedOutGateBenefitStyle, signedOutGateSignInStyle } from '@/lib/signed-out-gate-styles'
import { isMargoBrandUsername } from '@/lib/margo-brand-account'
import { messageFor } from '@/lib/notifications/copy'

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'likes', label: 'Likes' },
  { id: 'follows', label: 'Follows' },
  { id: 'updates', label: 'Updates' },
]

function NotificationRow({
  n,
  text,
  desktop,
  selectedPostId,
  onOpenDesktop,
}: {
  n: Notification
  text: string
  desktop: boolean
  selectedPostId: string | null
  onOpenDesktop: (n: Notification) => void
}) {
  const router = useRouter()
  const { markNotificationRead } = useNotifications()
  const unread = !n.readAt
  const actor = n.actor
  const initial = (actor?.displayName || actor?.username || '?').slice(0, 1).toUpperCase()
  const brandMark = actor?.username ? isMargoBrandUsername(actor.username) : false
  const href = notificationHref(n)
  const postSelected = n.postId && selectedPostId === n.postId

  return (
    <button
      type="button"
      onClick={() => {
        void markNotificationRead(n.id)
        if (desktop && (n.type === 'resonate' || n.type === 'lyric_back') && n.postId) {
          onOpenDesktop(n)
          return
        }
        router.push(href)
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        width: '100%',
        textAlign: 'left',
        padding: '12px',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        background: postSelected
          ? 'var(--gold-faint)'
          : unread
            ? 'rgba(232,197,71,0.08)'
            : 'transparent',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {actor ? (
        <MargoPortraitAvatar
          size="row"
          imageUrl={actor.avatarUrl}
          fallbackInitial={initial}
          fallbackSeed={!actor.avatarUrl && !brandMark ? actor.username : null}
          brandMark={brandMark}
          separationRingColor="var(--bg)"
        />
      ) : (
        <span style={{ width: 44, height: 44, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: UI_FONT,
          fontSize: LIST_ROW_TYPE.preview,
          color: 'var(--text)',
          margin: 0,
          lineHeight: 1.4,
        }}>
          {text}
        </p>
      </div>
      {unread ? (
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--gold)',
          flexShrink: 0,
          marginTop: '6px',
        }} />
      ) : null}
    </button>
  )
}

export function NotificationsInbox({
  embedded = false,
  desktop = false,
  onSelectPost,
  selectedPostId = null,
}: {
  embedded?: boolean
  desktop?: boolean
  onSelectPost?: (postId: string | null) => void
  selectedPostId?: string | null
}) {
  const { user } = useIdentity()
  const {
    notifications,
    loading,
    markAllRead,
    unreadCount,
    hasMoreNotifications,
    loadMoreNotifications,
  } = useNotifications()
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const isSignedIn = !!user && !user.isAnonymous

  const filtered = useMemo(
    () => filterNotifications(notifications, filter),
    [notifications, filter],
  )
  const rows = useMemo(() => buildNotificationDisplayRows(filtered), [filtered])

  if (!isSignedIn) {
    return (
      <div style={{ textAlign: 'center', padding: embedded ? '32px 16px' : '48px 0' }}>
        <p style={signedOutGateBenefitStyle}>Sign in to see your notifications.</p>
        <SignInLink style={signedOutGateSignInStyle} returnTo="/notifications">
          Sign in
        </SignInLink>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {!embedded ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={() => void markAllRead()}
            style={{
              background: 'none',
              border: 'none',
              cursor: unreadCount === 0 ? 'default' : 'pointer',
              fontFamily: UI_FONT,
              fontSize: LIST_ROW_TYPE.chip,
              fontWeight: 600,
              color: unreadCount === 0 ? 'var(--text-disabled)' : 'var(--gold)',
              padding: '8px 4px',
            }}
          >
            Mark all read
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.chip, color: 'var(--text-muted)' }}>
            Notifications
          </span>
          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={() => void markAllRead()}
            style={{
              background: 'none',
              border: 'none',
              cursor: unreadCount === 0 ? 'default' : 'pointer',
              fontFamily: UI_FONT,
              fontSize: LIST_ROW_TYPE.chip,
              fontWeight: 600,
              color: unreadCount === 0 ? 'var(--text-disabled)' : 'var(--gold)',
            }}
          >
            Mark all read
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            style={{
              padding: '8px 14px',
              borderRadius: '50px',
              border: '1px solid var(--border)',
              background: filter === f.id ? 'var(--gold)' : 'var(--surface-2)',
              color: filter === f.id ? 'var(--bg)' : 'var(--text-secondary)',
              fontFamily: UI_FONT,
              fontSize: LIST_ROW_TYPE.chip,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && notifications.length === 0 ? (
        <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontFamily: UI_FONT, color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
          No notifications yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {rows.map((row, i) => {
            if (row.kind === 'group') {
              return (
                <p
                  key={`g-${row.label}-${i}`}
                  style={{
                    fontFamily: UI_FONT,
                    fontSize: LIST_ROW_TYPE.time,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    margin: '12px 0 4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {row.label}
                </p>
              )
            }
            const text = row.groupedText || messageFor(row.notification)
            return (
              <NotificationRow
                key={row.notification.id}
                n={row.notification}
                text={text}
                desktop={desktop}
                selectedPostId={selectedPostId}
                onOpenDesktop={(n) => onSelectPost?.(n.postId)}
              />
            )
          })}
          {hasMoreNotifications ? (
            <button
              type="button"
              onClick={loadMoreNotifications}
              style={{
                marginTop: '8px',
                padding: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--gold)',
                fontFamily: UI_FONT,
                fontSize: LIST_ROW_TYPE.chip,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Load more
            </button>
          ) : (
            <p style={{
              fontFamily: UI_FONT,
              fontSize: LIST_ROW_TYPE.time,
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '16px 0',
              margin: 0,
            }}>
              Older items load as you scroll.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
