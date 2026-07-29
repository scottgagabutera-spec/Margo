'use client'
import Link from 'next/link'
import type { Notification } from '@/hooks/useNotifications'

const font = 'var(--font-lora), serif'

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h'
  if (diff < 604800) return Math.floor(diff / 86400) + 'd'
  return Math.floor(diff / 604800) + 'w'
}

function messageFor(n: Notification) {
  const name = n.actor?.displayName || n.actor?.username || 'Someone'
  switch (n.type) {
    case 'message': return `${name} sent you a message`
    case 'resonate': return `${name} resonated with your lyric`
    case 'follow': return `${name} started following you`
    default: return `${name} did something`
  }
}

function hrefFor(n: Notification) {
  switch (n.type) {
    case 'message': return n.actor ? `/messages/${n.actor.username}` : '/messages'
    case 'resonate': return n.postId ? `/feed?post=${n.postId}` : '/feed'
    case 'follow': return n.actor ? `/profile/${n.actor.username}` : '/feed'
    default: return '/feed'
  }
}

function TypeIcon({ type }: { type: Notification['type'] }) {
  if (type === 'message') {
    return (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14v9H7l-4 3V5Z" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === 'resonate') {
    return (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--gold)">
        <path d="M10 17s-6-4-6-8.5A3.5 3.5 0 0 1 10 6a3.5 3.5 0 0 1 6 2.5C16 13 10 17 10 17Z" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3" stroke="var(--gold)" strokeWidth="1.5" />
      <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function NotificationItem({
  notification, onNavigate,
}: { notification: Notification; onNavigate?: () => void }) {
  const unread = !notification.readAt
  return (
    <Link
      href={hrefFor(notification)}
      onClick={onNavigate}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '10px 12px', textDecoration: 'none',
        background: unread ? 'rgba(232,197,71,0.06)' : 'transparent',
        borderRadius: '8px', transition: 'background 120ms ease',
      }}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: notification.actor?.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
        border: '1px solid rgba(232,197,71,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {notification.actor?.avatarUrl ? (
          <img src={notification.actor.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--bg)' }}>
            {(notification.actor?.displayName || '??').slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: font, fontSize: '0.78rem', color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>
          {messageFor(notification)}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <TypeIcon type={notification.type} />
          <span style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-3)' }}>
            {timeAgo(notification.createdAt)}
          </span>
        </div>
      </div>
      {unread && (
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, marginTop: '6px' }} />
      )}
    </Link>
  )
}