'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ── Types ──
interface ArtistApplicationRow {
  id: string
  profile_id: string
  status: 'pending' | 'approved' | 'rejected'
  display_artist_name: string
  links: Record<string, string>
  note: string | null
  rights_agreed: boolean
  submitted_at: string
  reviewed_at: string | null
  // joined
  username?: string
  avatar_url?: string | null
}

interface ArtistProfileRow {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  artist_status: 'active' | 'warned' | 'frozen' | 'removed'
  artist_status_reason: string | null
  artist_status_updated_at: string | null
}

const S: Record<string, any> = {
  input: {
    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    color: 'var(--text)', fontFamily: 'var(--font-lora), serif',
    fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
  },
  label: {
    display: 'block', fontFamily: 'var(--font-lora), serif',
    fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px',
  },
  btn: {
    padding: '10px 20px', background: 'var(--gold)', color: 'var(--bg)',
    border: 'none', borderRadius: '10px', fontFamily: 'var(--font-lora), serif',
    fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px',
    textTransform: 'uppercase', cursor: 'pointer',
  },
  ghostBtn: {
    padding: '8px 16px', background: 'transparent', color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem',
    letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
  },
  dangerBtn: {
    padding: '8px 16px', background: 'transparent', color: '#ff6060',
    border: '1px solid rgba(255,96,96,0.3)', borderRadius: '8px',
    fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem',
    letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
  },
  card: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', padding: '16px', marginBottom: '10px',
  },
}

const STATUS_COLOR: Record<string, string> = {
  active: 'rgba(255,255,255,0.35)',
  warned: '#ffc847',
  frozen: '#7B9FFF',
  removed: '#ff6060',
}

// Matches the real hooks/useNotifications.tsx schema, confirmed against
// production July 31, 2026: recipient_id, actor_id, type, created_at, read_at.
// No `message`/`profile_id`/`read` columns exist — those were a guess from
// before the schema was confirmed. Display copy for these types (what the
// bell UI shows) needs to be added wherever useNotifications.tsx's render
// logic lives — this table has no free-text field to carry it.
type ModerationNotificationType =
  | 'artist_approved'
  | 'artist_rejected'
  | 'warned'
  | 'frozen'
  | 'removed'
  | 'restored'

async function notifyProfile(recipientId: string, type: ModerationNotificationType) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('notifications').insert({
    recipient_id: recipientId,
    actor_id: user?.id ?? null,
    type,
  })
  if (error) console.error('Failed to notify profile:', error)
}

// ── Applications section ──
function ApplicationsSection() {
  const [applications, setApplications] = useState<ArtistApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [actioningId, setActioningId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('artist_applications')
      .select('*, profiles!artist_applications_profile_id_fkey(username, avatar_url)')
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Failed to load artist applications:', error)
      setLoading(false)
      return
    }

    setApplications(
      (data || []).map((row: any) => ({
        ...row,
        username: row.profiles?.username,
        avatar_url: row.profiles?.avatar_url,
      }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const review = async (app: ArtistApplicationRow, decision: 'approved' | 'rejected') => {
    setActioningId(app.id)
    const { error } = await supabase
      .from('artist_applications')
      .update({ status: decision })
      .eq('id', app.id)

    if (error) {
      console.error('Failed to review application:', error)
      setActioningId(null)
      return
    }

    await notifyProfile(app.profile_id, decision === 'approved' ? 'artist_approved' : 'artist_rejected')

    setActioningId(null)
    load()
  }

  const filtered = applications.filter(a => filter === 'all' ? true : a.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...S.ghostBtn,
            borderBottom: filter === f ? '1px solid var(--gold)' : '1px solid transparent',
            color: filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
            borderRadius: 0, padding: '4px 12px',
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '32px' }}>
          No {filter !== 'all' ? filter : ''} applications.
        </p>
      ) : filtered.map(app => (
        <div key={app.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text)', marginBottom: '4px' }}>
                {app.display_artist_name}
              </p>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
                @{app.username || 'unknown'} · submitted {new Date(app.submitted_at).toLocaleDateString()}
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {Object.entries(app.links || {}).map(([key, url]) => url ? (
                  <a key={key} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer"
                    style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', textDecoration: 'none' }}>
                    {key}
                  </a>
                ) : null)}
              </div>
              {app.note && (
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginBottom: '8px' }}>
                  "{app.note}"
                </p>
              )}
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: app.status === 'pending' ? '#ffc847' : app.status === 'approved' ? '#4ade80' : '#ff6060', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {app.status}
              </p>
            </div>
            {app.status === 'pending' && (
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => review(app, 'approved')} disabled={actioningId === app.id} style={{ ...S.btn, opacity: actioningId === app.id ? 0.5 : 1 }}>
                  Approve
                </button>
                <button onClick={() => review(app, 'rejected')} disabled={actioningId === app.id} style={{ ...S.dangerBtn, opacity: actioningId === app.id ? 0.5 : 1 }}>
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Moderation section (approved artists — warn/freeze/remove) ──
function ModerationSection() {
  const [artists, setArtists] = useState<ArtistProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'warned' | 'frozen' | 'removed' | 'all'>('all')
  const [actionTarget, setActionTarget] = useState<{ id: string; type: 'warn' | 'freeze' | 'remove' } | null>(null)
  const [reason, setReason] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, artist_status, artist_status_reason, artist_status_updated_at')
      .eq('is_artist', true)
      .order('artist_status_updated_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Failed to load artists:', error)
      setLoading(false)
      return
    }
    setArtists(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const applyAction = async () => {
    if (!actionTarget) return
    const statusMap = { warn: 'warned', freeze: 'frozen', remove: 'removed' } as const
    const newStatus = statusMap[actionTarget.type]

    const { error } = await supabase
      .from('profiles')
      .update({
        artist_status: newStatus,
        artist_status_reason: reason,
        artist_status_updated_at: new Date().toISOString(),
      })
      .eq('id', actionTarget.id)

    if (error) {
      console.error('Failed to apply moderation action:', error)
      return
    }

    await notifyProfile(actionTarget.id, newStatus)
    setActionTarget(null)
    setReason('')
    load()
  }

  const quickRestore = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ artist_status: 'active', artist_status_reason: null, artist_status_updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Failed to restore artist:', error)
      return
    }
    await notifyProfile(id, 'restored')
    load()
  }

  const filtered = artists.filter(a => filter === 'all' ? true : a.artist_status === filter)

  if (loading) {
    return <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px' }}>Loading…</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['active', 'warned', 'frozen', 'removed', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...S.ghostBtn,
            borderBottom: filter === f ? '1px solid var(--gold)' : '1px solid transparent',
            color: filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
            borderRadius: 0, padding: '4px 12px',
          }}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '32px' }}>
          No {filter !== 'all' ? filter : ''} artists.
        </p>
      ) : filtered.map(artist => (
        <div key={artist.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text)', marginBottom: '4px' }}>
                {artist.display_name} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>@{artist.username}</span>
              </p>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: STATUS_COLOR[artist.artist_status], textTransform: 'uppercase', letterSpacing: '1px' }}>
                {artist.artist_status}{artist.artist_status_reason ? ` — ${artist.artist_status_reason}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {artist.artist_status !== 'removed' && (
                <button onClick={() => { setActionTarget({ id: artist.id, type: 'warn' }); setReason('') }} style={S.ghostBtn}>Warn</button>
              )}
              {artist.artist_status === 'frozen'
                ? <button onClick={() => quickRestore(artist.id)} style={S.btn}>Unfreeze</button>
                : artist.artist_status !== 'removed' && (
                  <button onClick={() => { setActionTarget({ id: artist.id, type: 'freeze' }); setReason('') }} style={S.dangerBtn}>Freeze</button>
                )}
              {artist.artist_status === 'removed'
                ? <button onClick={() => quickRestore(artist.id)} style={S.btn}>Restore</button>
                : (
                  <button onClick={() => { setActionTarget({ id: artist.id, type: 'remove' }); setReason('') }} style={S.dangerBtn}>Remove</button>
                )}
            </div>
          </div>

          {actionTarget?.id === artist.id && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={S.label}>Reason (shown to the artist)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                style={{ ...S.input, resize: 'vertical', marginBottom: '10px' }}
                placeholder="Explain why — this becomes their notification and, if frozen, the message on their status page."
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={applyAction} disabled={!reason.trim()} style={{ ...S.btn, opacity: reason.trim() ? 1 : 0.5 }}>
                  Confirm {actionTarget.type}
                </button>
                <button onClick={() => { setActionTarget(null); setReason('') }} style={S.ghostBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main tab — replaces the old Firebase-backed ArtistsTab ──
export function ArtistApplicationsTab() {
  const [section, setSection] = useState<'applications' | 'moderation'>('applications')

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '20px', lineHeight: 1.6 }}>
        Applications become artists on approval — this sets profiles.is_artist directly via a
        database trigger. Once approved, use Moderation to warn, freeze, or remove standing as
        issues come up.
      </p>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['applications', 'moderation'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)} style={{
            padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700,
            letterSpacing: '2px', textTransform: 'uppercase',
            color: section === s ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
            borderBottom: section === s ? '2px solid var(--gold)' : '2px solid transparent',
          }}>
            {s === 'applications' ? 'Applications' : 'Moderation'}
          </button>
        ))}
      </div>

      {section === 'applications' ? <ApplicationsSection /> : <ModerationSection />}
    </div>
  )
}