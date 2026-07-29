'use client'
import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationList } from '@/components/notification-list'

const font = 'var(--font-lora), serif'

export function NotificationBell() {
  const { notifications, unreadCount, loading, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && unreadCount > 0) void markAllRead()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)',
          background: 'none', border: 'none', cursor: 'pointer',
          position: 'relative', boxSizing: 'border-box', padding: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 8a5 5 0 0 1 10 0c0 3 1 4.5 1.5 5.2.3.4 0 .8-.5.8H4c-.5 0-.8-.4-.5-.8C4 12.5 5 11 5 8Z" stroke={open ? 'var(--gold)' : 'rgba(255,255,255,0.5)'} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 16a2 2 0 0 0 4 0" stroke={open ? 'var(--gold)' : 'rgba(255,255,255,0.5)'} strokeWidth="1.5" strokeLinecap="round" />
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
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: '340px', maxHeight: '420px', overflowY: 'auto',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: '12px', boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
          padding: '8px', zIndex: 60,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 10px' }}>
            <span style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Notifications
            </span>
          </div>
          <NotificationList notifications={notifications} loading={loading} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}