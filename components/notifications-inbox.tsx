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
import { MargoSystemAvatar } from '@/components/margo-system-avatar'
import { MargoAvatar } from '@/components/margo-avatar'
import { LIST_ROW_TYPE, UI_FONT } from '@/lib/fonts'
import { signedOutGateBenefitStyle, signedOutGateSignInStyle } from '@/lib/signed-out-gate-styles'
import { isMargoBrandUsername } from '@/lib/margo-brand-account'
import { messageFor, notificationActionFor } from '@/lib/notifications/copy'
import { AuthorMeta } from '@/components/username-tag'
import {
  welcomeSeriesBodyFromNotification,
  welcomeSeriesCopy,
  welcomeSeriesKindFromData,
} from '@/lib/welcome-series/copy'

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'likes', label: 'Likes' },
  { id: 'follows', label: 'Follows' },
  { id: 'updates', label: 'Updates' },
]

function SystemWelcomeNotificationRow({
  n,
}: {
  n: Notification
}) {
  const router = useRouter()
  const { markNotificationRead } = useNotifications()
  const unread = !n.readAt
  const kind = welcomeSeriesKindFromData(n.data)
  const copy = kind ? welcomeSeriesCopy(kind, (n.data as { firstName?: string })?.firstName) : null
  const title = n.data?.title || copy?.title || 'Tips from Margo'
  const body = kind
    ? welcomeSeriesBodyFromNotification(kind, n.data as { firstName?: string; body?: string })
    : messageFor(n)

  return (
    <button
      type="button"
      onClick={() => {
        void markNotificationRead(n.id)
        router.push(`/notifications/tip/${n.id}`)
      }}
      className={unread ? 'margo-signal-unread-surface' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        textAlign: 'left',
        padding: '16px',
        borderRadius: '16px',
        background: unread ? undefined : 'var(--surface-2)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <MargoSystemAvatar size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: UI_FONT,
            fontSize: LIST_ROW_TYPE.preview,
            fontWeight: 700,
            color: 'var(--text)',
            margin: '0 0 8px',
            lineHeight: 1.35,
          }}>
            {title}
          </p>
          <p style={{
            fontFamily: UI_FONT,
            fontSize: LIST_ROW_TYPE.preview,
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
          }}>
            {body}
          </p>
        </div>
        {unread ? (
          <span className="margo-signal-dot" style={{ marginTop: '6px' }} />
        ) : null}
      </div>
    </button>
  )
}

function NotificationRow({
  n,
  text,
  grouped,
  desktop,
  selectedPostId,
  onOpenDesktop,
}: {
  n: Notification
  text: string
  grouped?: boolean
  desktop: boolean
  selectedPostId: string | null
  onOpenDesktop: (n: Notification) => void
}) {
  const router = useRouter()
  const { markNotificationRead } = useNotifications()
  const unread = !n.readAt
  const actor = n.actor
  const brandMark = actor?.username ? isMargoBrandUsername(actor.username) : false
  const href = notificationHref(n)
  const postSelected = n.postId && selectedPostId === n.postId
  const artistSelfTypes: Notification['type'][] = [
    'artist_submitted',
    'artist_approved',
    'artist_rejected',
    'warned',
    'frozen',
    'removed',
    'restored',
    'system_welcome',
  ]
  const systemBody = !actor || artistSelfTypes.includes(n.type) || grouped
  const actionText = systemBody ? text : notificationActionFor(n)

  const openContent = () => {
    void markNotificationRead(n.id)
    if (desktop && (n.type === 'resonate' || n.type === 'lyric_back') && n.postId) {
      onOpenDesktop(n)
      return
    }
    router.push(href)
  }

  return (
    <button
      type="button"
      onClick={openContent}
      className={unread && !postSelected ? 'margo-signal-unread-surface' : undefined}
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
          ? 'var(--surface-2)'
          : unread
            ? undefined
            : 'transparent',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {actor ? (
        <MargoAvatar
          size="sm"
          imageUrl={actor.avatarUrl}
          username={actor.username}
          displayName={actor.displayName}
          brandMark={brandMark}
        />
      ) : (
        <span style={{ width: 32, height: 40, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: UI_FONT,
          fontSize: LIST_ROW_TYPE.preview,
          color: 'var(--text)',
          margin: 0,
          lineHeight: 1.4,
        }}>
          {systemBody ? (
            text
          ) : (
            <>
              {actor?.username ? (
                <AuthorMeta
                  username={actor.username}
                  authorUid={actor.id}
                  size="compact"
                  linkProfile
                />
              ) : (
                'Someone'
              )}{' '}
              {actionText}
            </>
          )}
        </p>
      </div>
      {unread ? (
        <span className="margo-signal-dot" style={{ marginTop: '6px' }} />
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
              color: unreadCount === 0 ? 'var(--text-disabled)' : 'var(--text-secondary)',
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
              color: unreadCount === 0 ? 'var(--text-disabled)' : 'var(--text-secondary)',
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
            className={`margo-btn margo-btn--chip${filter === f.id ? ' margo-btn--chip--active' : ''}`}
            style={{
              fontFamily: UI_FONT,
              cursor: 'pointer',
              minWidth: 0,
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
                    fontSize: 'var(--margo-type-l)',
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    margin: '12px 0 4px',
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                >
                  {row.label}
                </p>
              )
            }
            if (row.notification.type === 'system_welcome') {
              return (
                <SystemWelcomeNotificationRow
                  key={row.notification.id}
                  n={row.notification}
                />
              )
            }
            const text = row.groupedText || messageFor(row.notification)
            return (
              <NotificationRow
                key={row.notification.id}
                n={row.notification}
                text={text}
                grouped={!!row.groupedText}
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
                color: 'var(--text-secondary)',
                fontFamily: UI_FONT,
                fontSize: LIST_ROW_TYPE.chip,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Load more
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
