'use client'
import { useEffect, useState } from 'react'

type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'all'

interface ReportRow {
  id: string
  postId: string
  reporterId: string
  reason: string
  status: 'pending' | 'reviewed' | 'dismissed'
  createdAt: string
  postText: string
  postStatus: string | null
  song: string | null
  artist: string | null
  reporterUsername: string | null
  reporterDisplayName: string | null
}

const font = 'var(--font-lora), serif'

const S = {
  card: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', padding: '16px', marginBottom: '10px',
  } as React.CSSProperties,
  ghostBtn: {
    padding: '8px 16px', minHeight: '44px', background: 'transparent', color: 'var(--text-secondary)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    fontFamily: font, fontSize: '0.55rem', letterSpacing: '1px', textTransform: 'uppercase' as const,
    cursor: 'pointer',
  },
  actionBtn: {
    padding: '8px 16px', minHeight: '44px', background: 'var(--gold)', color: 'var(--bg)',
    border: 'none', borderRadius: '8px', fontFamily: font, fontWeight: 700,
    fontSize: '0.55rem', letterSpacing: '1px', textTransform: 'uppercase' as const, cursor: 'pointer',
  },
  dismissBtn: {
    padding: '8px 16px', minHeight: '44px', background: 'transparent', color: '#ff6060',
    border: '1px solid rgba(255,96,96,0.3)', borderRadius: '8px',
    fontFamily: font, fontSize: '0.55rem', letterSpacing: '1px', textTransform: 'uppercase' as const,
    cursor: 'pointer',
  },
}

async function adminFetch(input: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json')
  return fetch(input, { ...init, credentials: 'include', headers })
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

export function PostReportsTab() {
  const [filter, setFilter] = useState<ReportStatus>('pending')
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch('/api/admin/post-reports?status=' + encodeURIComponent(filter))
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load reports')
      setReports(json.reports || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setExpandedId(null)
    void load()
  }, [filter])

  const setStatus = async (id: string, status: 'reviewed' | 'dismissed' | 'pending') => {
    setActioningId(id)
    try {
      const res = await adminFetch('/api/admin/post-reports', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    } finally {
      setActioningId(null)
    }
  }

  const filters: ReportStatus[] = ['pending', 'reviewed', 'dismissed', 'all']

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div>
      <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
        User-filed reports from the PostCard menu. Click a row for full details and actions.
        This does not auto-hide the post — use the Posts tab to change post status if needed.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {filters.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              ...S.ghostBtn,
              color: filter === f ? 'var(--gold)' : 'var(--text-secondary)',
              borderColor: filter === f ? 'var(--gold-border)' : 'rgba(255,255,255,0.1)',
            }}
          >{f}</button>
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: font, fontSize: '0.8rem', color: '#ff6060', marginBottom: '12px' }}>{error}</p>
      )}

      {loading ? (
        <p style={{ fontFamily: font, color: 'var(--text-muted)', fontStyle: 'italic' }}>Loading reports…</p>
      ) : reports.length === 0 ? (
        <p style={{ fontFamily: font, color: 'var(--text-muted)', fontStyle: 'italic' }}>No reports in this filter.</p>
      ) : (
        reports.map(r => {
          const isExpanded = expandedId === r.id
          const postSnippet = (r.postText || '—').length > 120
            ? (r.postText || '—').slice(0, 120) + '…'
            : (r.postText || '—')
          const reasonSnippet = r.reason.length > 80 ? r.reason.slice(0, 80) + '…' : r.reason

          return (
            <div
              key={r.id}
              style={{ ...S.card, cursor: 'pointer' }}
              onClick={() => toggleExpand(r.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleExpand(r.id)
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                    <span style={{
                      fontFamily: font, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '1.5px',
                      textTransform: 'uppercase', color: r.status === 'pending' ? 'var(--gold)' : 'var(--text-muted)',
                    }}>{r.status}</span>
                    <span style={{ fontFamily: font, fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '8px', lineHeight: 1.45 }}>
                    &ldquo;{isExpanded ? (r.postText || '—') : postSnippet}&rdquo;
                  </p>
                  {!isExpanded && (
                    <p style={{ fontFamily: font, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Reason: <span style={{ color: 'var(--text)' }}>{reasonSnippet}</span>
                    </p>
                  )}
                </div>
                <Chevron open={isExpanded} />
              </div>

              {isExpanded && (
                <div onClick={(e) => e.stopPropagation()}>
                  {(r.song || r.artist) && (
                    <p style={{
                      fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '1px', marginTop: '14px', marginBottom: '8px',
                    }}>
                      {[r.song, r.artist].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p style={{ fontFamily: font, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Reason: <span style={{ color: 'var(--text)' }}>{r.reason}</span>
                  </p>
                  <p style={{ fontFamily: font, fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Reporter: {r.reporterDisplayName || r.reporterUsername || r.reporterId.slice(0, 8)}
                    {r.postStatus ? ` · post status: ${r.postStatus}` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {r.status !== 'reviewed' && (
                      <button
                        type="button"
                        disabled={actioningId === r.id}
                        onClick={() => setStatus(r.id, 'reviewed')}
                        style={{ ...S.actionBtn, opacity: actioningId === r.id ? 0.6 : 1 }}
                      >Mark reviewed</button>
                    )}
                    {r.status !== 'dismissed' && (
                      <button
                        type="button"
                        disabled={actioningId === r.id}
                        onClick={() => setStatus(r.id, 'dismissed')}
                        style={{ ...S.dismissBtn, opacity: actioningId === r.id ? 0.6 : 1 }}
                      >Dismiss</button>
                    )}
                    {r.status !== 'pending' && (
                      <button
                        type="button"
                        disabled={actioningId === r.id}
                        onClick={() => setStatus(r.id, 'pending')}
                        style={S.ghostBtn}
                      >Reopen</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
