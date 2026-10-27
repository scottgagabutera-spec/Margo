'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PendingNavLink } from '@/components/pending-nav-link'
import { SignInLink } from '@/components/signin-link'
import { MargoSearchInput } from '@/components/margo-search-input'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { RelativeTime } from '@/components/relative-time'
import { useIdentity } from '@/hooks/useIdentity'
import { useMessaging, type Conversation } from '@/hooks/useMessaging'
import { formatMessagePreview } from '@/lib/moment/message-format'
import { MARGO_SEARCH_HINT_PEOPLE } from '@/lib/margo-search-hints'
import { LIST_ROW_TYPE, UI_FONT } from '@/lib/fonts'
import { isMargoBrandUsername } from '@/lib/margo-brand-account'
import { signedOutGateBenefitStyle, signedOutGateSignInStyle } from '@/lib/signed-out-gate-styles'

function filterConversations(list: Conversation[], q: string): Conversation[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return list
  return list.filter((c) => {
    const name = c.otherUser.displayName.toLowerCase()
    const user = c.otherUser.username.toLowerCase()
    const preview = formatMessagePreview(c.lastMessage.body).toLowerCase()
    return name.includes(needle) || user.includes(needle) || preview.includes(needle)
  })
}

function ConversationRow({ c, active }: { c: Conversation; active: boolean }) {
  const brandMark = isMargoBrandUsername(c.otherUser.username)
  const initial = (c.otherUser.displayName || c.otherUser.username || '?').slice(0, 1).toUpperCase()
  return (
    <PendingNavLink
      href={`/messages/${c.otherUser.username}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        textDecoration: 'none',
        background: active
          ? 'var(--gold-faint)'
          : c.unreadCount > 0
            ? 'rgba(232,197,71,0.06)'
            : 'transparent',
        borderRadius: '12px',
      }}
    >
      <MargoPortraitAvatar
        size="row"
        imageUrl={c.otherUser.avatarUrl}
        fallbackInitial={initial}
        fallbackSeed={!c.otherUser.avatarUrl && !brandMark ? c.otherUser.username : null}
        brandMark={brandMark}
        separationRingColor="var(--bg)"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: UI_FONT,
          fontSize: LIST_ROW_TYPE.name,
          color: 'var(--text)',
          margin: 0,
          fontWeight: c.unreadCount > 0 ? 600 : 500,
        }}>
          {c.otherUser.displayName}
        </p>
        <p style={{
          fontFamily: UI_FONT,
          fontSize: LIST_ROW_TYPE.preview,
          color: c.unreadCount > 0 ? 'var(--text)' : 'var(--text-secondary)',
          margin: '2px 0 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {c.lastMessage.senderId !== c.otherUser.id ? 'You: ' : ''}
          {formatMessagePreview(c.lastMessage.body)}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        <RelativeTime
          date={c.lastMessage.createdAt}
          variant="compact"
          nowLabel="now"
          style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.time, color: 'var(--text-muted)' }}
        />
        {c.unreadCount > 0 ? (
          <span style={{
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            borderRadius: '9px',
            background: 'var(--gold)',
            color: 'var(--bg)',
            fontFamily: UI_FONT,
            fontSize: '0.65rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {c.unreadCount > 9 ? '9+' : c.unreadCount}
          </span>
        ) : null}
      </div>
    </PendingNavLink>
  )
}

export function MessagesInbox({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname()
  const { user } = useIdentity()
  const {
    inbox,
    requests,
    loading,
    loadingMoreConversations,
    hasMoreConversations,
    loadMoreConversations,
  } = useMessaging()
  const [tab, setTab] = useState<'inbox' | 'requests'>('inbox')
  const [query, setQuery] = useState('')
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const isSignedIn = !!user && !user.isAnonymous
  const listRaw = tab === 'inbox' ? inbox : requests
  const list = useMemo(() => filterConversations(listRaw, query), [listRaw, query])

  const activeUsername = pathname?.startsWith('/messages/')
    ? pathname.split('/')[2]?.split('?')[0]
    : null

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasMoreConversations || loading || loadingMoreConversations) return
    const scrollRoot = embedded ? (target.closest('aside') as Element | null) : null
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreConversations()
      },
      { root: scrollRoot, rootMargin: '120px 0px' },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [
    embedded,
    hasMoreConversations,
    loadMoreConversations,
    loading,
    loadingMoreConversations,
    list.length,
  ])

  if (!isSignedIn) {
    return (
      <div style={{ textAlign: 'center', padding: embedded ? '32px 16px' : '48px 0' }}>
        <p style={signedOutGateBenefitStyle}>Sign in to see your messages.</p>
        <SignInLink style={signedOutGateSignInStyle} returnTo="/messages">
          Sign in
        </SignInLink>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: embedded ? '100%' : undefined,
        minHeight: 0,
      }}
    >
      <MargoSearchInput
        value={query}
        onChange={setQuery}
        hintText={MARGO_SEARCH_HINT_PEOPLE}
        icon="left"
      />

      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid var(--border)',
      }}>
        {(['inbox', 'requests'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              minHeight: 'var(--margo-touch-min)',
              padding: '0 4px',
              marginRight: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: UI_FONT,
              fontSize: LIST_ROW_TYPE.chip,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: tab === t ? 'var(--gold)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
            }}
          >
            {t === 'inbox' ? 'Inbox' : `Requests${requests.length > 0 ? ` (${requests.length})` : ''}`}
          </button>
        ))}
      </div>

      {loading && list.length === 0 ? (
        <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
          Loading…
        </p>
      ) : list.length === 0 ? (
        <p style={{
          fontFamily: UI_FONT,
          fontSize: LIST_ROW_TYPE.preview,
          color: 'var(--text-secondary)',
          textAlign: 'center',
          padding: '32px 16px',
          margin: 0,
        }}>
          {tab === 'inbox' ? 'No messages yet.' : 'No requests.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {list.map((c) => (
            <ConversationRow
              key={c.otherUser.id}
              c={c}
              active={activeUsername === c.otherUser.username}
            />
          ))}
          <div ref={loadMoreRef} style={{ height: '1px' }} aria-hidden />
          {loadingMoreConversations ? (
            <p style={{
              fontFamily: UI_FONT,
              fontSize: LIST_ROW_TYPE.time,
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '12px 0',
              margin: 0,
            }}>
              Loading more…
            </p>
          ) : !hasMoreConversations ? (
            <p style={{
              fontFamily: UI_FONT,
              fontSize: LIST_ROW_TYPE.time,
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '16px 0',
              margin: 0,
            }}>
              That is everyone for now.
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
