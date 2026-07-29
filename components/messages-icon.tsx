'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount'

const font = 'var(--font-lora), serif'

export function MessagesIcon() {
  const pathname = usePathname()
  const unreadCount = useUnreadMessagesCount()
  const active = pathname?.startsWith('/messages')

  return (
    <Link
      href="/messages"
      aria-label="Messages"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)',
        position: 'relative', boxSizing: 'border-box', flexShrink: 0,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14v9H7l-4 3V5Z" stroke={active ? 'var(--gold)' : 'rgba(255,255,255,0.5)'} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: '6px', right: '6px',
          minWidth: '15px', height: '15px', borderRadius: '50%',
          background: 'var(--gold)', color: 'var(--bg)',
          fontFamily: font, fontSize: '0.5rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px', boxSizing: 'border-box',
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}