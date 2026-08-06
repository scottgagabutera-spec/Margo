'use client'
import { NotificationItem } from '@/components/notification-item'
import type { Notification } from '@/hooks/useNotifications'

const font = 'var(--font-lora), serif'

export function NotificationList({
  notifications, loading, onNavigate, emptyLabel = 'No notifications yet',
}: {
  notifications: Notification[]
  loading: boolean
  onNavigate?: () => void
  emptyLabel?: string
}) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
          ))}
        </div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <p style={{
        fontFamily: font, fontStyle: 'italic', fontSize: '0.8rem',
        color: 'var(--text-secondary)', textAlign: 'center', padding: '32px 16px',
      }}>{emptyLabel}</p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {notifications.map(n => (
        <NotificationItem key={n.id} notification={n} onNavigate={onNavigate} />
      ))}
    </div>
  )
}