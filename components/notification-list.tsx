'use client'
import { NotificationItem } from '@/components/notification-item'
import type { Notification } from '@/hooks/useNotifications'
import { NotificationRowSkeletonList } from '@/components/margo-skeletons'

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
    return <NotificationRowSkeletonList count={6} />
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
