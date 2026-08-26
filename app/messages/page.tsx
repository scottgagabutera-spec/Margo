'use client'
import { useState } from 'react'
import Link from 'next/link'
import { PendingNavLink } from '@/components/pending-nav-link'
import { useIdentity } from '@/hooks/useIdentity'
import { useConversations } from '@/hooks/useConversations'
import { RelativeTime } from '@/components/relative-time'
import { formatMessagePreview } from '@/lib/moment/message-format'

const font = 'var(--font-lora), serif'

export default function MessagesPage() {
  const { user } = useIdentity()
  const { inbox, requests, loading } = useConversations()
  const [tab, setTab] = useState<'inbox' | 'requests'>('inbox')

  const isSignedIn = !!user && !user.isAnonymous
  const list = tab === 'inbox' ? inbox : requests

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <main style={{ maxWidth: '560px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 16px) 20px var(--margo-page-padding-bottom)' }}>
        <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.4rem', color: 'var(--text)', marginBottom: '20px' }}>
          Messages
        </h1>

        {!isSignedIn ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Sign in to see your messages
            </p>
            <Link href="/signin" style={{
              padding: '10px 24px', border: '1px solid var(--border)', borderRadius: '50px',
              color: 'var(--text-secondary)', fontFamily: font, fontSize: '0.6rem',
              letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none',
            }}>Sign In</Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px' }}>
              {(['inbox', 'requests'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    minHeight: '38px', padding: '0 4px', marginRight: '24px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: font, fontSize: '0.62rem', fontWeight: 700,
                    letterSpacing: '1.2px', textTransform: 'uppercase',
                    color: tab === t ? 'var(--gold)' : 'var(--text-secondary)',
                    borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                  }}
                >
                  {t === 'inbox' ? 'Inbox' : `Requests${requests.length > 0 ? ` (${requests.length})` : ''}`}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
                  ))}
                </div>
              </div>
            ) : list.length === 0 ? (
              <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '48px 16px' }}>
                {tab === 'inbox' ? 'No conversations yet' : 'No message requests'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {list.map(c => (
                  <PendingNavLink
                    key={c.otherUser.id}
                    href={`/messages/${c.otherUser.username}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 8px', textDecoration: 'none',
                      background: c.unreadCount > 0 ? 'rgba(232,197,71,0.06)' : 'transparent',
                      borderRadius: '10px',
                    }}
                  >
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                      background: c.otherUser.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                      border: '1px solid rgba(232,197,71,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {c.otherUser.avatarUrl ? (
                        <img src={c.otherUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: font, fontSize: '0.75rem', fontWeight: 700, color: 'var(--bg)' }}>
                          {c.otherUser.displayName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text)', margin: 0, fontWeight: c.unreadCount > 0 ? 700 : 400 }}>
                        {c.otherUser.displayName}
                      </p>
                      <p style={{
                        fontFamily: font, fontSize: '0.72rem', color: c.unreadCount > 0 ? 'var(--text)' : 'var(--text-secondary)',
                        margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {c.lastMessage.senderId !== c.otherUser.id ? 'You: ' : ''}
                        {formatMessagePreview(c.lastMessage.body)}
                      </p>
                    </div>
                    <RelativeTime
                      date={c.lastMessage.createdAt}
                      variant="compact"
                      nowLabel="now"
                      style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', flexShrink: 0 }}
                    />
                    {c.unreadCount > 0 && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                    )}
                  </PendingNavLink>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}