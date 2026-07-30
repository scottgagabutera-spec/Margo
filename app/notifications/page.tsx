'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useIdentity } from '@/hooks/useIdentity'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationList } from '@/components/notification-list'

const font = 'var(--font-lora), serif'

export default function NotificationsPage() {
  const { user } = useIdentity()
  const { notifications, unreadCount, loading, markAllRead } = useNotifications()

  const isSignedIn = !!user && !user.isAnonymous

  // The bell dropdown marks notifications read when opened, but this
  // standalone page (the only entry point on mobile, which has no
  // bell) never did — visiting it left unreadCount untouched, so
  // already-seen notifications kept showing as unread everywhere else
  // in the app. Mark read here too, once notifications have loaded.
  useEffect(() => {
    if (!isSignedIn || loading || unreadCount === 0) return
    void markAllRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, loading, unreadCount])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <main style={{ maxWidth: '560px', margin: '0 auto', padding: '88px 20px var(--margo-page-padding-bottom)' }}>
        <h1 style={{
          fontFamily: font, fontStyle: 'italic', fontSize: '1.4rem',
          color: 'var(--text)', marginBottom: '24px',
        }}>Notifications</h1>

        {!isSignedIn ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-3)', marginBottom: '16px' }}>
              Sign in to see your notifications
            </p>
            <Link href="/signin" style={{
              padding: '10px 24px', border: '1px solid var(--border)', borderRadius: '50px',
              color: 'var(--text-3)', fontFamily: font, fontSize: '0.6rem',
              letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none',
            }}>Sign In</Link>
          </div>
        ) : (
          <NotificationList notifications={notifications} loading={loading} />
        )}
      </main>
    </div>
  )
}