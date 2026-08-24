'use client'

import { useCallback, useEffect, useState } from 'react'
import { CloseIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { useMessaging, type ConversationPartner } from '@/hooks/useMessaging'
import { searchProfiles, type ProfileSearchHit } from '@/lib/search-profiles'
import { MargoSearchInput } from '@/components/margo-search-input'

import { getMomentShareUrl } from '@/lib/moment'

const supabase = createClient()
const font = 'var(--font-lora), serif'

type Person = ConversationPartner

function momentMessageBody(lyric: string, song: string, artist: string, postId: string) {
  const trimmed = lyric.trim()
  const quoted = trimmed.startsWith('"') ? trimmed : '"' + trimmed + '"'
  const meta = [song.trim(), artist.trim()].filter(Boolean).join(' · ')
  const url = getMomentShareUrl(postId)
  return [quoted, meta, url].filter(Boolean).join('\n')
}

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
}: {
  person: Person
  disabled: boolean
  onPick: (person: Person) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(person)}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        minHeight: 'var(--margo-touch-min)',
        padding: '8px 4px',
        background: 'none',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: person.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
        border: '1px solid var(--gold-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {person.avatarUrl ? (
          <img src={person.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: font, fontSize: '0.75rem', fontWeight: 700, color: 'var(--bg)' }}>
            {(person.displayName || person.username || '??').slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text)', margin: 0 }}>
          {person.displayName}
        </p>
        <p style={{ fontFamily: font, fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
          @{person.username}
        </p>
      </div>
    </button>
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  lyric: string
  song: string
  artist: string
  onSent: (name: string) => void
}) {
  const { user } = useIdentity()
  const { conversations, applyOutboundMessage } = useMessaging()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<ProfileSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const myId = user?.id

  useEffect(() => {
    if (!open) return
    setQuery('')
    setHits([])
    setError(null)
    setSending(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const t = window.setTimeout(() => {
      void searchProfiles(supabase, q, 8).then((rows) => {
        if (cancelled) return
        setHits(rows.filter((row) => row.id !== myId))
        setSearching(false)
      })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [open, query, myId])

  const recents = conversations
    .map((c) => c.otherUser)
    .filter((p) => p.id && p.id !== myId && p.username !== 'unknown')
    .slice(0, 8)

  const showSearch = query.trim().length >= 2
  const list: Person[] = showSearch ? hits.map(personFromHit) : recents

  const sendTo = useCallback(async (person: Person) => {
    if (!myId || sending) return
    setSending(true)
    setError(null)
    const body = momentMessageBody(lyric, song, artist, postId)
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
    onOpenChange(false)
  }, [myId, sending, lyric, song, artist, postId, applyOutboundMessage, onSent, onOpenChange])

  if (!open) return null

  const sheetStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '420px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '0 0 20px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'min(78dvh, 560px)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--margo-scrim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={() => { if (!sending) onOpenChange(false) }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={sheetStyle}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 10px',
        }}>
          <p style={{
            fontFamily: font, fontSize: '0.58rem', fontWeight: 700,
            color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase',
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
              width: '36px', height: '36px',
              borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              cursor: sending ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <CloseIcon size={14} color="var(--text-secondary)" />
          </button>
        </div>

        <div style={{ padding: '0 16px 10px' }}>
          <MargoSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Find someone"
          />
        </div>

        {error && (
          <p style={{
            fontFamily: font, fontStyle: 'italic', fontSize: '0.82rem',
            color: 'var(--text-secondary)', textAlign: 'center',
            margin: '0 20px 12px',
          }}>
            {error}
          </p>
        )}

        <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1 }}>
          {!showSearch && recents.length > 0 && (
            <p style={{
              fontFamily: font, fontSize: '0.6rem', fontWeight: 700,
              color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase',
              margin: '4px 4px 8px',
            }}>
              Recent
            </p>
          )}

          {showSearch && searching && list.length === 0 && (
            <p style={{
              fontFamily: font, fontStyle: 'italic', fontSize: '0.8rem',
              color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 8px',
            }}>
              Searching…
            </p>
          )}

          {list.length === 0 && !searching && (
            <p style={{
              fontFamily: font, fontStyle: 'italic', fontSize: '0.8rem',
              color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 8px',
            }}>
              {showSearch ? 'No one matched that name.' : 'Search for someone on Margo'}
            </p>
          )}

          {list.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              disabled={sending}
              onPick={sendTo}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
