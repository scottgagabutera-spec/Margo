'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useIdentity } from '@/hooks/useIdentity'
import { useThread } from '@/hooks/useThread'
import { KeyboardSafeCtaBar } from '@/components/keyboard-safe-cta-bar'
import { useKeyboardSafeChrome } from '@/hooks/useVisualViewport'
import { BackButton } from '@/components/back-button'
import { MomentMessageCard } from '@/components/moment-message-card'
import { parseMomentMessageBody } from '@/lib/moment/message-format'

const font = 'var(--font-lora), serif'

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function ThreadMessageBody({ body, mine }: { body: string; mine: boolean }) {
  const moment = parseMomentMessageBody(body)
  if (moment) {
    return <MomentMessageCard moment={moment} mine={mine} />
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
  const { user } = useIdentity()
  const { partner, messages, loading, loadError, canSend, sending, sendMessage } = useThread(params.username)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  // Same chrome stack as Compose: --margo-keyboard-inset + data-margo-keyboard
  // (hides mobile tab bar while typing). Must run before any early return.
  const { keyboardOpen, chromeHidden } = useKeyboardSafeChrome()

  const isSignedIn = !!user && !user.isAnonymous

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const handleSend = async () => {
    if (!draft.trim()) return
    const body = draft
    setDraft('')
    await sendMessage(body)
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)',
        padding: 'calc(var(--nav-height, 72px) + 8px) 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'grid',
        gridTemplateColumns: '44px 1fr 44px',
        alignItems: 'center', gap: '8px',
      }}>
        <BackButton fallbackHref="/messages" label="Back" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minWidth: 0 }}>
          {partner && (
            <>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                background: partner.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                border: '1px solid rgba(232,197,71,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {partner.avatarUrl ? (
                  <img src={partner.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--bg)' }}>
                    {partner.displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span style={{
                fontFamily: font, fontSize: '0.85rem', color: 'var(--text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {partner.displayName}
              </span>
            </>
          )}
        </div>
        <div aria-hidden style={{ width: '44px' }} />
      </div>

      <div style={{
        flex: 1, maxWidth: '560px', width: '100%', margin: '0 auto',
        padding: '16px 20px',
        paddingBottom: 'calc(88px + var(--margo-tabbar-h, 0px))',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
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
        <div ref={bottomRef} />
      </div>

      <KeyboardSafeCtaBar keyboardOpen={keyboardOpen || chromeHidden}>
        {!canSend ? (
          <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
            {partner ? `${partner.displayName} isn't accepting messages right now` : ''}
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
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
              onClick={handleSend}
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
    </div>
  )
}