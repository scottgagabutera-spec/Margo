'use client'

import { useCallback, useEffect, useState } from 'react'
import { CloseIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { useMessaging, type ConversationPartner } from '@/hooks/useMessaging'
import { searchProfiles, type ProfileSearchHit } from '@/lib/search-profiles'
import { MargoSearchInput } from '@/components/margo-search-input'
import { buildMomentMessageBody } from '@/lib/moment/message-format'

const supabase = createClient()
const font = 'var(--font-lora), serif'

type Person = ConversationPartner

function personFromHit(hit: ProfileSearchHit): Person {
  return {
    id: hit.id,
    username: hit.username,
    displayName: hit.displayName,
    avatarUrl: hit.avatarUrl,
  }
}

function PersonRow({
  person,
  disabled,
  onPick,
  compact = false,
}: {
  person: Person
  disabled: boolean
  onPick: (person: Person) => void
  compact?: boolean
}) {
  const avatarSize = compact ? '36px' : '40px'
  return (
    <button
      type="button"
      onClick={() => onPick(person)}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        minHeight: compact ? '40px' : '44px',
        padding: compact ? '4px 2px' : '6px 4px',
        background: 'none',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: avatarSize, height: avatarSize, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: person.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
        border: '1px solid var(--gold-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {person.avatarUrl ? (
          <img src={person.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: font, fontSize: '0.68rem', fontWeight: 700, color: 'var(--bg)' }}>
            {(person.displayName || person.username || '??').slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: font, fontSize: compact ? '0.82rem' : '0.88rem',
          color: 'var(--text)', margin: 0, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {person.displayName}
        </p>
        <p style={{
          fontFamily: font, fontSize: '0.68rem', color: 'var(--text-secondary)',
          margin: '1px 0 0', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          @{person.username}
        </p>
      </div>
    </button>
  )
}

function SendToPanel({
  query,
  setQuery,
  list,
  showSearch,
  searching,
  recentsCount,
  error,
  sending,
  onPick,
  compact,
}: {
  query: string
  setQuery: (v: string) => void
  list: Person[]
  showSearch: boolean
  searching: boolean
  recentsCount: number
  error: string | null
  sending: boolean
  onPick: (person: Person) => void
  compact?: boolean
}) {
  return (
    <>
      <div style={{ padding: compact ? '0 0 8px' : '0 16px 8px', flexShrink: 0 }}>
        <MargoSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Find someone"
        />
      </div>

      {error && (
        <p style={{
          fontFamily: font, fontStyle: 'italic', fontSize: '0.75rem',
          color: 'var(--text-secondary)', textAlign: 'center',
          margin: '0 16px 8px',
        }}>
          {error}
        </p>
      )}

      <div style={{
        flex: 1, minHeight: compact ? '180px' : '240px',
        overflowY: 'auto', padding: compact ? '0' : '0 12px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {!showSearch && recentsCount > 0 && (
          <p style={{
            fontFamily: font, fontSize: '0.54rem', fontWeight: 700,
            color: 'var(--gold)', letterSpacing: '1.6px', textTransform: 'uppercase',
            margin: '2px 4px 6px',
          }}>
            Recent
          </p>
        )}

        {showSearch && searching && list.length === 0 && (
          <p style={{
            fontFamily: font, fontStyle: 'italic', fontSize: '0.75rem',
            color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 8px',
          }}>
            Searching…
          </p>
        )}

        {list.length === 0 && !searching && (
          <p style={{
            fontFamily: font, fontStyle: 'italic', fontSize: '0.75rem',
            color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 8px',
          }}>
            {showSearch ? 'No one matched that name.' : 'Search for someone on Margo'}
          </p>
        )}

        {list.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            disabled={sending}
            onPick={onPick}
            compact={compact}
          />
        ))}
      </div>
    </>
  )
}

export function ComposeSendTo({
  open,
  onOpenChange,
  postId,
  lyric,
  song,
  artist,
  onSent,
  variant = 'modal',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  lyric: string
  song: string
  artist: string
  onSent: (name: string) => void
  /** inline = embedded panel on Sent screen; modal = overlay */
  variant?: 'modal' | 'inline'
}) {
  const { user } = useIdentity()
  const { conversations, applyOutboundMessage } = useMessaging()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ProfileSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const myId = user?.id
  const isOpen = variant === 'inline' ? open : open

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setHits([])
    setError(null)
    setSending(false)
  }, [isOpen])

  useEffect(() => {
    if (variant === 'modal' && !open) return
    if (variant === 'modal') {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open, variant])

  useEffect(() => {
    if (!isOpen) return
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const t = window.setTimeout(() => {
      void searchProfiles(supabase, q, 16).then((rows) => {
        if (cancelled) return
        setHits(rows.filter((row) => row.id !== myId))
        setSearching(false)
      })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [isOpen, query, myId])

  const recents = conversations
    .map((c) => c.otherUser)
    .filter((p) => p.id && p.id !== myId && p.username !== 'unknown')
    .slice(0, 12)

  const showSearch = query.trim().length >= 2
  const list: Person[] = showSearch ? hits.map(personFromHit) : recents

  const sendTo = useCallback(async (person: Person) => {
    if (!myId || sending) return
    setSending(true)
    setError(null)
    const body = buildMomentMessageBody(lyric, song, artist, postId)
    const { data, error: insertErr } = await supabase
      .from('messages')
      .insert({
        sender_id: myId,
        recipient_id: person.id,
        body,
      })
      .select('id, sender_id, body, read_at, created_at')
      .single()

    if (insertErr || !data) {
      const raw = (insertErr?.message || '') + ' ' + (insertErr?.code || '')
      const blocked = /policy|permission|violates|42501|row-level/i.test(raw)
      setError(
        blocked
          ? person.displayName + " isn't accepting messages right now"
          : "Couldn't send. Try again."
      )
      setSending(false)
      return
    }

    applyOutboundMessage({
      otherUser: person,
      body: data.body,
      createdAt: data.created_at,
      senderId: data.sender_id,
    })
    setSending(false)
    onSent(person.displayName)
    if (variant === 'modal') onOpenChange(false)
    else setQuery('')
  }, [myId, sending, lyric, song, artist, postId, applyOutboundMessage, onSent, onOpenChange, variant])

  const panel = (
    <SendToPanel
      query={query}
      setQuery={setQuery}
      list={list}
      showSearch={showSearch}
      searching={searching}
      recentsCount={recents.length}
      error={error}
      sending={sending}
      onPick={sendTo}
      compact={variant === 'inline'}
    />
  )

  if (variant === 'inline') {
    if (!open) return null
    return (
      <div style={{
        marginTop: '10px',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.02)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '220px',
      }}>
        <p style={{
          fontFamily: font, fontSize: '0.54rem', fontWeight: 700,
          color: 'var(--gold)', letterSpacing: '1.6px', textTransform: 'uppercase',
          margin: '0 0 8px',
        }}>
          Send to someone
        </p>
        {panel}
      </div>
    )
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(7,6,10,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px',
        overscrollBehavior: 'none',
      }}
      onClick={() => { if (!sending) onOpenChange(false) }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          height: 'min(86dvh, 640px)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px 6px', flexShrink: 0,
        }}>
          <p style={{
            fontFamily: font, fontSize: '0.54rem', fontWeight: 700,
            color: 'var(--text-secondary)', letterSpacing: '1.8px', textTransform: 'uppercase',
            margin: 0,
          }}>
            Send to someone
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            style={{
              width: '34px', height: '34px',
              borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              cursor: sending ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <CloseIcon size={14} color="var(--text-secondary)" />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {panel}
        </div>
      </div>
    </div>
  )
}
