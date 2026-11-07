'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useNotifications } from '@/hooks/useNotifications'
import { MargoAvatar } from '@/components/margo-avatar'
import { UI_FONT, TYPE } from '@/lib/fonts'
import { notificationHref } from '@/lib/navigation/notification-routes'
import {
  welcomeSeriesBodyFromNotification,
  welcomeSeriesCopy,
  welcomeSeriesKindFromData,
} from '@/lib/welcome-series/copy'

export default function NotificationTipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { notifications, markNotificationRead } = useNotifications()
  const n = notifications.find((row) => row.id === id)

  if (!n || n.type !== 'system_welcome') {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: 'calc(var(--nav-height, 72px) + 16px) 20px var(--margo-page-padding-bottom)',
        maxWidth: 560,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>
        <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>This tip is not available.</p>
        <Link href="/notifications" style={{ fontFamily: UI_FONT, color: 'var(--gold)' }}>Back to Notifications</Link>
      </main>
    )
  }

  const kind = welcomeSeriesKindFromData(n.data)
  const copy = kind ? welcomeSeriesCopy(kind, (n.data as { firstName?: string })?.firstName) : null
  const title = (n.data as { title?: string })?.title || copy?.title || 'Tips from Margo'
  const body = kind
    ? welcomeSeriesBodyFromNotification(kind, n.data as { firstName?: string; body?: string })
    : ''
  const buttonLabel = (n.data as { buttonLabel?: string })?.buttonLabel || copy?.buttonLabel || 'Open'
  const href = notificationHref(n)

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: 'calc(var(--nav-height, 72px) + 12px) 16px var(--margo-page-padding-bottom)',
      maxWidth: 560,
      margin: '0 auto',
      boxSizing: 'border-box',
    }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          border: 'none',
          background: 'none',
          color: 'var(--gold)',
          fontFamily: UI_FONT,
          fontSize: TYPE.secondary,
          fontWeight: 600,
          padding: '8px 0',
          marginBottom: 12,
          cursor: 'pointer',
        }}
      >
        Notifications
      </button>
      <article style={{
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: 20,
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <MargoAvatar size="sm" displayName="Margo" brandMark />
          <h1 style={{
            margin: 0,
            fontFamily: UI_FONT,
            fontSize: TYPE.displayName,
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.3,
          }}>
            {title}
          </h1>
        </div>
        <p style={{
          margin: '0 0 20px',
          fontFamily: UI_FONT,
          fontSize: TYPE.body,
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
        }}>
          {body}
        </p>
        <button
          type="button"
          onClick={() => {
            void markNotificationRead(n.id)
            router.push(href)
          }}
          style={{
            width: '100%',
            minHeight: 'var(--margo-touch-min)',
            borderRadius: 999,
            border: '1px solid var(--gold)',
            background: 'transparent',
            color: 'var(--gold)',
            fontFamily: UI_FONT,
            fontSize: TYPE.label,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {buttonLabel}
        </button>
      </article>
    </main>
  )
}
