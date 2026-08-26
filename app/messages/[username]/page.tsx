'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useIdentity } from '@/hooks/useIdentity'
import { useThread } from '@/hooks/useThread'
import { useConversationScroll } from '@/hooks/useConversationScroll'
import { KeyboardSafeCtaBar } from '@/components/keyboard-safe-cta-bar'
import { useKeyboardSafeChrome } from '@/hooks/useVisualViewport'
import { MargoConversationLayout } from '@/components/margo-conversation-layout'
import { MargoConversationHeader } from '@/components/margo-conversation-header'
import { MomentMessageCard } from '@/components/moment-message-card'
import { parseMomentMessageBody } from '@/lib/moment/message-format'
import { isPartnerUuid } from '@/lib/messages/partner-key'

const font = 'var(--font-lora), serif'

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function ThreadMessageBody({ body, mine }: { body: string; mine: boolean }) {
  const moment = parseMomentMessageBody(body)
  if (moment) {
    return <MomentMessageCard moment={moment} mine={mine} embedded />
  }

  const parts = body.split(/(https?:\/\/[^\s]+)/g)
  const linkStyle = {
    color: mine ? 'var(--bg)' : 'var(--gold)',
    textDecoration: 'underline' as const,
  }
  return (
    <p style={{
      fontFamily: font, fontSize: '0.82rem', margin: 0, lineHeight: 1.4,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {parts.map((part, i) => {
        if (!/^https?:\/\//.test(part)) return <span key={i}>{part}</span>
        const path = part.startsWith('https://trymargo.com')
          ? (part.slice('https://trymargo.com'.length) || '/')
          : part.includes('/m/')
            ? part.replace(/^https?:\/\/[^/]+/, '')
            : null
        if (path) return <Link key={i} href={path} style={linkStyle}>Open on Margo</Link>
        return <a key={i} href={part} style={linkStyle} rel="noopener noreferrer">Link</a>
      })}
    </p>
  )
}

export default function ThreadPage() {
  const params = useParams<{ username: string }>()
  const router = useRouter()
  const partnerKey = params.username
  const { user } = useIdentity()
  const { partner, messages, loading, loadError, canSend, sending, sendMessage } = useThread(partnerKey)
  const [draft, setDraft] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  const { keyboardOpen } = useKeyboardSafeChrome()

  const threadReady = !!partner && !loading && !loadError
  const { scrollRef, handleScroll, scrollToLatestAfterSend } = useConversationScroll({
    ready: threadReady,
    loading,
    messagesLength: messages.length,
    keyboardOpen,
  })

  const isSignedIn = !!user && !user.isAnonymous
  const compactTopChrome = isMobile

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (!partner || !isPartnerUuid(partnerKey)) return
    if (partner.username && partner.username !== partnerKey) {
      router.replace(`/messages/${partner.username}`)
    }
  }, [partner, partnerKey, router])

  const handleSend = async () => {
    if (!draft.trim()) return
    const body = draft
    setDraft('')
    await sendMessage(body)
    scrollToLatestAfterSend()
  }

  if (!isSignedIn) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Sign in to send messages
          </p>
          <Link href="/signin" style={{
            padding: '10px 24px', border: '1px solid var(--border)', borderRadius: '50px',
            color: 'var(--text-secondary)', fontFamily: font, fontSize: '0.6rem',
            letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none',
          }}>Sign In</Link>
        </div>
      </div>
    )
  }

  const composer = (
    <KeyboardSafeCtaBar
      keyboardOpen={keyboardOpen}
      solidBackground
      contentMaxWidth={560}
    >
      {!canSend ? (
        <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
          {partner ? `${partner.displayName} isn't accepting messages right now` : ''}
        </p>
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
            placeholder="Write a message..."
            style={{
              flex: 1, height: '40px', padding: '0 14px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px', color: 'var(--text)', fontFamily: font,
              fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending}
            aria-label="Send"
            style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: 'var(--gold)', border: 'none', cursor: draft.trim() ? 'pointer' : 'default',
              opacity: draft.trim() ? 1 : 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M3 10l14-7-5 14-2-6-7-1Z" stroke="var(--bg)" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </KeyboardSafeCtaBar>
  )

  return (
    <MargoConversationLayout
      compactTopChrome={compactTopChrome}
      scrollRef={scrollRef}
      onScroll={handleScroll}
      header={
        <MargoConversationHeader
          displayName={partner?.displayName}
          username={partner?.username}
          avatarUrl={partner?.avatarUrl ?? null}
          compactTop={compactTopChrome}
        />
      }
      composer={composer}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
            ))}
          </div>
        </div>
      ) : loadError ? (
        <p style={{
          fontFamily: font, fontStyle: 'italic', fontSize: '0.82rem',
          color: 'var(--text-secondary)', textAlign: 'center', padding: '48px 16px',
        }}>
          {loadError}
        </p>
      ) : messages.length === 0 ? (
        <p style={{
          fontFamily: font, fontStyle: 'italic', fontSize: '0.82rem',
          color: 'var(--text-secondary)', textAlign: 'center', padding: '48px 16px',
        }}>
          No messages yet.
        </p>
      ) : (
        messages.map(m => {
          const mine = m.senderId === user.id
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '82%', padding: '10px 14px', borderRadius: '16px',
                background: mine ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                color: mine ? 'var(--bg)' : 'var(--text)',
              }}>
                <ThreadMessageBody body={m.body} mine={mine} />
                <p style={{
                  fontFamily: font, fontSize: '0.55rem', margin: '4px 0 0',
                  color: mine ? 'rgba(11,11,11,0.55)' : 'var(--text-muted)',
                }}>{timeLabel(m.createdAt)}</p>
              </div>
            </div>
          )
        })
      )}
    </MargoConversationLayout>
  )
}
