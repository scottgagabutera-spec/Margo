'use client'
import { useState, useEffect } from 'react'

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

async function adminFetch(input: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json')
  return fetch(input, { ...init, credentials: 'include', headers })
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{
        flexShrink: 0,
        marginTop: 4,
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform 150ms ease',
      }}
    >
      <path d="M4 2L8 6L4 10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Applications section ──
function ApplicationsSection() {
  const [applications, setApplications] = useState<ArtistApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch('/api/admin/artist-applications')
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
      setApplications(Array.isArray(body.applications) ? body.applications : [])
    } catch (e: any) {
      console.error('Failed to load artist applications:', e)
      setError(e?.message || 'Failed to load applications')
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const review = async (app: ArtistApplicationRow, decision: 'approved' | 'rejected') => {
    setActioningId(app.id)
    setError(null)
    try {
      const res = await adminFetch('/api/admin/artist-applications', {
        method: 'PATCH',
        body: JSON.stringify({ id: app.id, status: decision }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
      await load()
    } catch (e: any) {
      console.error('Failed to review application:', e)
      setError(e?.message || 'Failed to review application')
    } finally {
      setActioningId(null)
    }
  }

  const filtered = applications.filter(a => filter === 'all' ? true : a.status === filter)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} type="button" onClick={() => { setFilter(f); setExpandedId(null) }} style={{
            ...S.ghostBtn,
            borderBottom: filter === f ? '1px solid var(--gold)' : '1px solid transparent',
            color: filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
            borderRadius: 0, padding: '4px 12px',
          }}>{f}</button>
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: '#ff6060', fontSize: '0.75rem', marginBottom: '12px' }}>{error}</p>
      )}

      {loading ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '32px' }}>
          No {filter !== 'all' ? filter : ''} applications.
        </p>
      ) : filtered.map(app => {
        const isExpanded = expandedId === app.id
        const noteSnippet = app.note && app.note.length > 80 ? app.note.slice(0, 80) + '…' : app.note
        return (
          <div
            key={app.id}
            style={{ ...S.card, cursor: 'pointer' }}
            onClick={() => toggleExpand(app.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleExpand(app.id)
              }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text)', marginBottom: '4px' }}>
                  {app.display_artist_name}
                </p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
                  @{app.username || 'unknown'} · submitted {new Date(app.submitted_at).toLocaleDateString()}
                </p>
                <p style={{
                  fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
                  color: app.status === 'pending' ? '#ffc847' : app.status === 'approved' ? '#4ade80' : '#ff6060',
                  textTransform: 'uppercase', letterSpacing: '1px',
                }}>
                  {app.status}
                </p>
                {!isExpanded && noteSnippet && (
                  <p style={{
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
                    fontStyle: 'italic', marginTop: '8px',
                  }}>
                    &ldquo;{noteSnippet}&rdquo;
                  </p>
                )}
              </div>
              <Chevron open={isExpanded} />
            </div>

            {isExpanded && (
              <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {Object.entries(app.links || {}).map(([key, url]) => url ? (
                    <a key={key} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer"
                      style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', textDecoration: 'none' }}>
                      {key}
                    </a>
                  ) : null)}
                  {Object.keys(app.links || {}).length === 0 && (
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                      No links provided
                    </span>
                  )}
                </div>
                {app.note && (
                  <p style={{
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)',
                    fontStyle: 'italic', marginBottom: '12px',
                  }}>
                    &ldquo;{app.note}&rdquo;
                  </p>
                )}
                {app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => review(app, 'approved')}
                      disabled={actioningId === app.id}
                      style={{ ...S.btn, opacity: actioningId === app.id ? 0.5 : 1 }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => review(app, 'rejected')}
                      disabled={actioningId === app.id}
                      style={{ ...S.dangerBtn, opacity: actioningId === app.id ? 0.5 : 1 }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Moderation section (approved artists — warn/freeze/remove) ──
function ModerationSection() {
  const [artists, setArtists] = useState<ArtistProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'warned' | 'frozen' | 'removed' | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionTarget, setActionTarget] = useState<{ id: string; type: 'warn' | 'freeze' | 'remove' } | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch('/api/admin/artist-moderation')
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
      setArtists(Array.isArray(body.artists) ? body.artists : [])
    } catch (e: any) {
      console.error('Failed to load artists:', e)
      setError(e?.message || 'Failed to load artists')
      setArtists([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const applyAction = async () => {
    if (!actionTarget) return
    const statusMap = { warn: 'warned', freeze: 'frozen', remove: 'removed' } as const
    const newStatus = statusMap[actionTarget.type]

    setError(null)
    try {
      const res = await adminFetch('/api/admin/artist-moderation', {
        method: 'PATCH',
        body: JSON.stringify({
          id: actionTarget.id,
          status: newStatus,
          reason,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
      setActionTarget(null)
      setReason('')
      await load()
    } catch (e: any) {
      console.error('Failed to apply moderation action:', e)
      setError(e?.message || 'Failed to apply moderation action')
    }
  }

  const quickRestore = async (id: string) => {
    setError(null)
    try {
      const res = await adminFetch('/api/admin/artist-moderation', {
        method: 'PATCH',
        body: JSON.stringify({ id, status: 'active', reason: null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
      await load()
    } catch (e: any) {
      console.error('Failed to restore artist:', e)
      setError(e?.message || 'Failed to restore artist')
    }
  }

  const filtered = artists.filter(a => filter === 'all' ? true : a.artist_status === filter)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => {
      if (prev === id) {
        if (actionTarget?.id === id) {
          setActionTarget(null)
          setReason('')
        }
        return null
      }
      return id
    })
  }

  const startAction = (id: string, type: 'warn' | 'freeze' | 'remove') => {
    setExpandedId(id)
    setActionTarget({ id, type })
    setReason('')
  }

  if (loading) {
    return <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px' }}>Loading…</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['active', 'warned', 'frozen', 'removed', 'all'] as const).map(f => (
          <button key={f} type="button" onClick={() => { setFilter(f); setExpandedId(null); setActionTarget(null); setReason('') }} style={{
            ...S.ghostBtn,
            borderBottom: filter === f ? '1px solid var(--gold)' : '1px solid transparent',
            color: filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
            borderRadius: 0, padding: '4px 12px',
          }}>{f}</button>
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: '#ff6060', fontSize: '0.75rem', marginBottom: '12px' }}>{error}</p>
      )}

      {filtered.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '32px' }}>
          No {filter !== 'all' ? filter : ''} artists.
        </p>
      ) : filtered.map(artist => {
        const isExpanded = expandedId === artist.id
        const reasonGlance = artist.artist_status_reason
          ? (artist.artist_status_reason.length > 60
            ? artist.artist_status_reason.slice(0, 60) + '…'
            : artist.artist_status_reason)
          : null

        return (
          <div
            key={artist.id}
            style={{ ...S.card, cursor: 'pointer' }}
            onClick={() => toggleExpand(artist.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleExpand(artist.id)
              }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text)', marginBottom: '4px' }}>
                  {artist.display_name}{' '}
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>@{artist.username}</span>
                </p>
                <p style={{
                  fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
                  color: STATUS_COLOR[artist.artist_status], textTransform: 'uppercase', letterSpacing: '1px',
                }}>
                  {artist.artist_status}
                  {!isExpanded && reasonGlance ? ` — ${reasonGlance}` : ''}
                </p>
              </div>
              <Chevron open={isExpanded} />
            </div>

            {isExpanded && (
              <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {artist.artist_status_reason && (
                  <p style={{
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
                    marginBottom: '8px', lineHeight: 1.5,
                  }}>
                    Current reason: {artist.artist_status_reason}
                  </p>
                )}
                {artist.artist_status_updated_at && (
                  <p style={{
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.28)',
                    marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px',
                  }}>
                    Updated {new Date(artist.artist_status_updated_at).toLocaleString()}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: actionTarget?.id === artist.id ? '14px' : 0 }}>
                  {artist.artist_status !== 'removed' && (
                    <button
                      type="button"
                      onClick={() => startAction(artist.id, 'warn')}
                      style={S.ghostBtn}
                    >Warn</button>
                  )}
                  {artist.artist_status === 'frozen'
                    ? <button type="button" onClick={() => quickRestore(artist.id)} style={S.btn}>Unfreeze</button>
                    : artist.artist_status !== 'removed' && (
                      <button type="button" onClick={() => startAction(artist.id, 'freeze')} style={S.dangerBtn}>Freeze</button>
                    )}
                  {artist.artist_status === 'removed'
                    ? <button type="button" onClick={() => quickRestore(artist.id)} style={S.btn}>Restore</button>
                    : (
                      <button type="button" onClick={() => startAction(artist.id, 'remove')} style={S.dangerBtn}>Remove</button>
                    )}
                </div>

                {actionTarget?.id === artist.id && (
                  <div style={{ paddingTop: '4px' }}>
                    <label style={S.label}>Reason (shown to the artist)</label>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows={2}
                      style={{ ...S.input, resize: 'vertical', marginBottom: '10px' }}
                      placeholder="Explain why — this becomes their notification and, if frozen, the message on their status page."
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={applyAction} disabled={!reason.trim()} style={{ ...S.btn, opacity: reason.trim() ? 1 : 0.5 }}>
                        Confirm {actionTarget.type}
                      </button>
                      <button type="button" onClick={() => { setActionTarget(null); setReason('') }} style={S.ghostBtn}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
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
        issues come up. Click a row to expand details and actions.
      </p>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['applications', 'moderation'] as const).map(s => (
          <button key={s} type="button" onClick={() => setSection(s)} style={{
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
