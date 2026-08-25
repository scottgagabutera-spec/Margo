'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CloseIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { useMessaging, type ConversationPartner } from '@/hooks/useMessaging'
import { searchProfiles, type ProfileSearchHit } from '@/lib/search-profiles'
import { MargoSearchInput } from '@/components/margo-search-input'
import { buildMomentMessageBody } from '@/lib/moment/message-format'
import { UI_FONT } from '@/lib/fonts'

const supabase = createClient()
const font = 'var(--font-lora), serif'
const SEARCH_PAGE = 24

type Person = ConversationPartner
type SheetPhase = 'pick' | 'success'

function personFromHit(hit: ProfileSearchHit): Person {
  return {
    id: hit.id,
    username: hit.username,
    displayName: hit.displayName,
    avatarUrl: hit.avatarUrl,
  }
}

function PersonAvatar({ person, size = 40 }: { person: Person; size?: number }) {
  const px = `${size}px`
  return (
    <div style={{
      width: px, height: px, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
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
  )
}

function PersonRow({
  person,
  disabled,
  selected,
  onToggle,
}: {
  person: Person
  disabled: boolean
  selected: boolean
  onToggle: (person: Person) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(person)}
      disabled={disabled}
      aria-pressed={selected}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        minHeight: '52px',
        padding: '8px 10px',
        background: selected ? 'rgba(232,197,71,0.1)' : 'rgba(255,255,255,0.02)',
        border: selected ? '1px solid var(--gold-border)' : '1px solid transparent',
        borderRadius: '14px',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
    >
      <PersonAvatar person={person} size={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: UI_FONT, fontSize: '0.88rem', fontWeight: 600,
          color: 'var(--text)', margin: 0, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {person.displayName}
        </p>
        <p style={{
          fontFamily: UI_FONT, fontSize: '0.72rem', color: 'var(--text-secondary)',
          margin: '2px 0 0', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          @{person.username}
        </p>
      </div>
      <div style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        flexShrink: 0,
        border: selected ? 'none' : '1.5px solid rgba(255,255,255,0.18)',
        background: selected ? 'var(--gold)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {selected ? (
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bg)', lineHeight: 1 }}>✓</span>
        ) : null}
      </div>
    </button>
  )
}

function SelectedPersonChip({
  person,
  disabled,
  onClear,
}: {
  person: Person
  disabled: boolean
  onClear: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      borderRadius: '14px',
      background: 'rgba(232,197,71,0.08)',
      border: '1px solid var(--gold-border)',
      marginBottom: '12px',
    }}>
      <PersonAvatar person={person} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: UI_FONT, fontSize: '0.82rem', fontWeight: 600,
          color: 'var(--text)', margin: 0, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {person.displayName}
        </p>
        <p style={{
          fontFamily: UI_FONT, fontSize: '0.68rem', color: 'var(--text-secondary)',
          margin: '1px 0 0', lineHeight: 1.2,
        }}>
          Tap again in the list to change
        </p>
      </div>
      <button
        type="button"
        aria-label="Clear selection"
        disabled={disabled}
        onClick={onClear}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          flexShrink: 0,
          border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.04)',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        <CloseIcon size={12} color="var(--text-secondary)" />
      </button>
    </div>
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
  selected,
  onTogglePerson,
  onClearSelection,
  onConfirm,
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
  selected: Person | null
  onTogglePerson: (person: Person) => void
  onClearSelection: () => void
  onConfirm: () => void
  compact?: boolean
}) {
  return (
    <>
      <div style={{ padding: compact ? '0 0 10px' : '0 16px 10px', flexShrink: 0 }}>
        <MargoSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name or @username"
        />
      </div>

      {selected ? (
        <div style={{ padding: compact ? '0 0 4px' : '0 16px 4px', flexShrink: 0 }}>
          <SelectedPersonChip
            person={selected}
            disabled={sending}
            onClear={onClearSelection}
          />
        </div>
      ) : null}

      {error ? (
        <p style={{
          fontFamily: font, fontStyle: 'italic', fontSize: '0.75rem',
          color: '#ff8a8a', textAlign: 'center',
          margin: '0 16px 8px',
        }}>
          {error}
        </p>
      ) : null}

      <div style={{
        flex: 1,
        minHeight: compact ? '160px' : '220px',
        overflowY: 'auto',
        padding: compact ? '0 2px' : '0 12px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {!showSearch && recentsCount > 0 ? (
          <p style={{
            fontFamily: font, fontSize: '0.54rem', fontWeight: 700,
            color: 'var(--gold)', letterSpacing: '1.6px', textTransform: 'uppercase',
            margin: '2px 4px 8px',
          }}>
            Recent
          </p>
        ) : null}

        {showSearch && searching && list.length === 0 ? (
          <p style={{
            fontFamily: font, fontStyle: 'italic', fontSize: '0.75rem',
            color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 8px',
          }}>
            Searching…
          </p>
        ) : null}

        {list.length === 0 && !searching ? (
          <p style={{
            fontFamily: font, fontStyle: 'italic', fontSize: '0.75rem',
            color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 12px', lineHeight: 1.5,
          }}>
            {showSearch
              ? 'No one matched that search.'
              : 'Search for someone on Margo — your recent chats appear here.'}
          </p>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {list.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              disabled={sending}
              selected={selected?.id === person.id}
              onToggle={onTogglePerson}
            />
          ))}
        </div>
      </div>

      <div style={{
        flexShrink: 0,
        padding: compact ? '12px 0 0' : '12px 16px 16px',
        borderTop: '1px solid var(--border)',
        marginTop: '8px',
      }}>
        <button
          type="button"
          disabled={!selected || sending}
          onClick={onConfirm}
          style={{
            width: '100%',
            minHeight: 'var(--margo-touch-min)',
            borderRadius: '50px',
            border: 'none',
            background: !selected || sending ? 'rgba(232,197,71,0.35)' : 'var(--gold)',
            color: 'var(--bg)',
            fontFamily: font,
            fontSize: '0.58rem',
            fontWeight: 700,
            letterSpacing: '0.9px',
            textTransform: 'uppercase',
            cursor: !selected || sending ? 'default' : 'pointer',
          }}
        >
          {sending
            ? 'Sending…'
            : selected
              ? `Send to ${selected.displayName}`
              : 'Choose someone'}
        </button>
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
  variant?: 'modal' | 'inline' | 'popover'
}) {
  const { user } = useIdentity()
  const { conversations, applyOutboundMessage } = useMessaging()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ProfileSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Person | null>(null)
  const [phase, setPhase] = useState<SheetPhase>('pick')
  const [successName, setSuccessName] = useState<string | null>(null)
  const [lastSentName, setLastSentName] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const myId = user?.id
  const isOpen = open

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setHits([])
    setError(null)
    setSending(false)
    setSelected(null)
    setPhase('pick')
    setSuccessName(null)
  }, [isOpen])

  useEffect(() => {
    if (variant !== 'popover' || !isOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [variant, isOpen, onOpenChange])

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
      void searchProfiles(supabase, q, SEARCH_PAGE).then((rows) => {
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
    .slice(0, 20)

  const showSearch = query.trim().length >= 2
  const list: Person[] = showSearch ? hits.map(personFromHit) : recents

  const togglePerson = useCallback((person: Person) => {
    setSelected((prev) => (prev?.id === person.id ? null : person))
    setError(null)
  }, [])

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
          ? `${person.displayName} isn't accepting messages right now`
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
    setLastSentName(person.displayName)
    setSuccessName(person.displayName)
    setPhase('success')
  }, [myId, sending, lyric, song, artist, postId, applyOutboundMessage])

  const panel = phase === 'success' && successName ? (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px 24px',
      textAlign: 'center',
      gap: '14px',
    }}>
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: 'rgba(232,197,71,0.12)',
        border: '1px solid var(--gold-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
        color: 'var(--gold)',
      }}>
        ✓
      </div>
      <p style={{
        fontFamily: font,
        fontStyle: 'italic',
        fontSize: '1.05rem',
        color: 'var(--text)',
        margin: 0,
        lineHeight: 1.4,
      }}>
        Sent to {successName}
      </p>
      <p style={{
        fontFamily: UI_FONT,
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        margin: 0,
        lineHeight: 1.45,
        maxWidth: '280px',
      }}>
        They&apos;ll see your Moment in Messages.
      </p>
      <button
        type="button"
        onClick={() => {
          if (successName) onSent(successName)
          onOpenChange(false)
        }}
        style={{
          marginTop: '8px',
          minWidth: '140px',
          minHeight: 'var(--margo-touch-min)',
          padding: '0 24px',
          borderRadius: '50px',
          border: 'none',
          background: 'var(--gold)',
          color: 'var(--bg)',
          fontFamily: font,
          fontSize: '0.58rem',
          fontWeight: 700,
          letterSpacing: '0.9px',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Done
      </button>
    </div>
  ) : (
    <SendToPanel
      query={query}
      setQuery={setQuery}
      list={list}
      showSearch={showSearch}
      searching={searching}
      recentsCount={recents.length}
      error={error}
      sending={sending}
      selected={selected}
      onTogglePerson={togglePerson}
      onClearSelection={() => setSelected(null)}
      onConfirm={() => { if (selected) void sendTo(selected) }}
      compact={variant === 'popover' || variant === 'inline'}
    />
  )

  if (variant === 'popover') {
    return (
      <div ref={rootRef} style={{ position: 'relative', marginTop: '12px' }}>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          style={{
            width: '100%',
            padding: '10px 16px',
            minHeight: '40px',
            background: open ? 'rgba(232,197,71,0.1)' : 'transparent',
            color: 'var(--gold)',
            borderRadius: '50px',
            fontFamily: font,
            fontWeight: 700,
            fontSize: '0.54rem',
            letterSpacing: '0.9px',
            textTransform: 'uppercase',
            border: '1px solid var(--gold-border)',
            cursor: 'pointer',
          }}
        >
          Send to someone
        </button>

        {open && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 40,
            borderRadius: '16px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(70dvh, 520px)',
          }}>
            {panel}
          </div>
        )}

        {lastSentName && !open && (
          <p style={{
            fontFamily: font,
            fontSize: '0.78rem',
            color: 'var(--gold)',
            textAlign: 'center',
            margin: '10px 0 0',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'rgba(232,197,71,0.08)',
            border: '1px solid var(--gold-border)',
          }}>
            Sent to {lastSentName}.
          </p>
        )}
      </div>
    )
  }

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
        minHeight: '280px',
        maxHeight: 'min(70dvh, 520px)',
      }}>
        {panel}
      </div>
    )
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210, overscrollBehavior: 'none' }}>
      <button
        type="button"
        aria-label="Close"
        onClick={() => { if (!sending) onOpenChange(false) }}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(7,6,10,0.92)',
          cursor: 'default',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          minHeight: '100%',
          padding: '12px',
          paddingTop: 'max(28px, calc(12px + env(safe-area-inset-top, 0px)))',
          paddingBottom: 'calc(12px + var(--margo-tabbar-h, 64px) + 16px)',
          pointerEvents: 'none',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '460px',
            height: 'min(82dvh, 620px)',
            background: 'var(--surface, #0F0E13)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 18px 12px',
            flexShrink: 0,
            gap: '12px',
          }}>
            <p style={{
              fontFamily: font,
              fontSize: '0.58rem',
              fontWeight: 700,
              color: 'var(--gold)',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
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
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: sending ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
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
    </div>
  )
}
