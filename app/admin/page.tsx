'use client'
import { useState, useEffect } from 'react'
import { setBrowserAccessToken, signOutBrowser } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { ArtistApplicationsTab } from '@/components/artist-applications-tab'
import { PostReportsTab } from '@/components/post-reports-tab'
import { BackButton } from '@/components/back-button'

// ── Types ──
interface Echo {
  id: string; lyric?: string; song?: string; artist?: string
  username?: string; emotion?: string; timestamp?: number; status?: string
}
interface CatalogPost {
  id: string; text: string; emotion: string | null; status: string
  song: string | null; artist: string | null; username: string | null
  displayName?: string | null
  flagCount?: number
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
  tab: (active: boolean) => ({
    padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700,
    letterSpacing: '2px', textTransform: 'uppercase',
    color: active ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
    borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
    transition: 'all 150ms ease',
  }),
}

// ── Login ──
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { rehydrate } = useAuthGate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError('Invalid credentials.')
        return
      }

      if (body.access_token) {
        setBrowserAccessToken(body.access_token)
      }
      await rehydrate()

      const sessionRes = await fetch('/api/admin/session', { credentials: 'include' })
      if (sessionRes.status === 403) {
        await signOutBrowser()
        setError("This account doesn't have admin access.")
        return
      }
      if (!sessionRes.ok) {
        await signOutBrowser()
        setError('Invalid credentials.')
        return
      }

      onSuccess()
    } catch {
      setError('Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>Margo</p>
          <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400 }}>Admin</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={S.input} />
          </div>
          <div>
            <label style={S.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={S.input} />
          </div>
          {error && (
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: '#ff6060' }}>
              {error}
            </p>
          )}
          <button onClick={handleLogin} disabled={loading} style={{ ...S.btn, width: '100%', padding: '14px', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Posts Tab (Supabase catalog only) ──
function PostsTab() {
  const [search, setSearch] = useState('')
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [echoes, setEchoes] = useState<Record<string, Echo[]>>({})
  const [catalogPosts, setCatalogPosts] = useState<CatalogPost[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'active' | 'private' | 'hidden'>('all')
  const [catalogBusyId, setCatalogBusyId] = useState<string | null>(null)
  const [catalogActionError, setCatalogActionError] = useState<string | null>(null)
  const [echoesLoadingId, setEchoesLoadingId] = useState<string | null>(null)
  const [echoBusyId, setEchoBusyId] = useState<string | null>(null)

  /** Lyric backs are posts rows (parent_post_id set) — same as useEchoes, but include hidden + private for moderation. */
  const loadEchoes = async (postId: string) => {
    setEchoesLoadingId(postId)
    setCatalogActionError(null)
    try {
      const res = await adminFetch('/api/admin/catalog-posts?parent_post_id=' + encodeURIComponent(postId))
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
      const list: Echo[] = Array.isArray(body.echoes) ? body.echoes : []
      setEchoes(prev => ({ ...prev, [postId]: list }))
    } catch (e: any) {
      setCatalogActionError(e.message || 'Failed to load lyric backs')
      setEchoes(prev => ({ ...prev, [postId]: [] }))
    } finally {
      setEchoesLoadingId(null)
    }
  }

  const toggleExpandPost = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null)
    } else {
      setExpandedPost(postId)
      loadEchoes(postId)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      setCatalogLoading(true)
      setCatalogError(null)
      try {
        const res = await adminFetch('/api/admin/catalog-posts')
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        const data = await res.json()
        if (!cancelled) setCatalogPosts(data.posts || [])
      } catch (e: any) {
        if (!cancelled) {
          setCatalogError(e.message || 'Failed to load catalog')
          setCatalogPosts([])
        }
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }
    loadCatalog()
    return () => { cancelled = true }
  }, [])

  const patchSupabasePostStatus = async (postId: string, status: string) => {
    const res = await adminFetch('/api/admin/catalog-posts', {
      method: 'PATCH',
      body: JSON.stringify({ id: postId, status }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
    return body as { id: string; status: string }
  }

  const toggleHideEcho = async (postId: string, echo: Echo) => {
    if (echoBusyId) return
    const newStatus = echo.status === 'hidden' ? 'active' : 'hidden'
    setEchoBusyId(echo.id)
    setCatalogActionError(null)
    try {
      await patchSupabasePostStatus(echo.id, newStatus)
      setEchoes(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(e => e.id === echo.id ? { ...e, status: newStatus } : e)
      }))
    } catch (e: any) {
      setCatalogActionError(e.message || 'Failed to update lyric back')
    } finally {
      setEchoBusyId(null)
    }
  }

  const toggleCatalogHide = async (post: CatalogPost) => {
    if (catalogBusyId) return
    const newStatus = post.status === 'hidden' ? 'active' : 'hidden'
    setCatalogBusyId(post.id)
    setCatalogActionError(null)
    try {
      await patchSupabasePostStatus(post.id, newStatus)
      setCatalogPosts(prev => prev.map(p => (p.id === post.id ? { ...p, status: newStatus } : p)))
    } catch (e: any) {
      setCatalogActionError(e.message || 'Failed to update post status')
    } finally {
      setCatalogBusyId(null)
    }
  }

  const filteredCatalog = catalogPosts.filter(p => {
    if (catalogFilter === 'active' && p.status !== 'active') return false
    if (catalogFilter === 'private' && p.status !== 'private') return false
    if (catalogFilter === 'hidden' && p.status !== 'hidden') return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (p.text || '').toLowerCase().includes(q) ||
      (p.song || '').toLowerCase().includes(q) ||
      (p.artist || '').toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q) ||
      (p.displayName || '').toLowerCase().includes(q)
  })

  const totalActive = catalogPosts.filter(p => p.status === 'active').length
  const totalPrivate = catalogPosts.filter(p => p.status === 'private').length
  const totalHidden = catalogPosts.filter(p => p.status === 'hidden').length
  const flagged = catalogPosts.filter(p => (p.flagCount || 0) > 0 && p.status !== 'hidden').length

  const renderEchoPanel = (parentId: string) => {
    const postEchoes = echoes[parentId] || []
    const loading = echoesLoadingId === parentId
    const activeN = postEchoes.filter(e => e.status !== 'hidden' && e.status !== 'private').length
    const hiddenN = postEchoes.filter(e => e.status === 'hidden').length
    const privateN = postEchoes.filter(e => e.status === 'private').length
    return (
      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
        {loading ? (
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>Loading lyric backs…</p>
        ) : postEchoes.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No lyric backs yet.</p>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              {activeN} active · {hiddenN} hidden · {privateN} private
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {postEchoes.map(echo => {
                const isEchoHidden = echo.status === 'hidden'
                const isEchoPrivate = echo.status === 'private'
                return (
                  <div key={echo.id} style={{
                    background: isEchoHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                    borderRadius: '12px', padding: '12px 14px',
                    border: '1px solid ' + (isEchoHidden ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'),
                    opacity: isEchoHidden ? 0.5 : 1,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '6px' }}>
                        &ldquo;{echo.lyric}&rdquo;
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {echo.song} · {echo.artist}
                        </span>
                        <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)' }}>·</span>
                        <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {echo.username || 'anon'}
                        </span>
                        {echo.emotion && (
                          <>
                            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)' }}>·</span>
                            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>{echo.emotion}</span>
                          </>
                        )}
                        {isEchoHidden && <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: '#ff6060', textTransform: 'uppercase', letterSpacing: '1px' }}>hidden</span>}
                        {isEchoPrivate && <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>private</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleHideEcho(parentId, echo)}
                      disabled={echoBusyId === echo.id}
                      style={{ ...(isEchoHidden ? S.btn : S.dangerBtn), flexShrink: 0, opacity: echoBusyId === echo.id ? 0.6 : 1 }}
                    >
                      {echoBusyId === echo.id ? '…' : isEchoHidden ? 'Show' : 'Hide'}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Stats row — catalog-backed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[['Active', totalActive], ['Private', totalPrivate], ['Hidden', totalHidden], ['Flagged', flagged]].map(([label, val]) => (
          <div key={label} style={{ ...S.card, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: label === 'Flagged' && Number(val) > 0 ? '#ff6060' : 'var(--gold)', fontWeight: 700 }}>{val}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
          </div>
        ))}
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search posts, songs, artists, users…"
        style={{ ...S.input, marginBottom: '16px' }} />

      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
          Supabase Catalog — live posts (Hide/Show)
        </p>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '12px', lineHeight: 1.5 }}>
          These are the posts Feed and Discover actually read. Includes private rows for product insight. Hide removes a post from public feeds.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {(['all', 'active', 'private', 'hidden'] as const).map(f => (
            <button key={f} onClick={() => setCatalogFilter(f)} style={{
              ...S.ghostBtn,
              fontFamily: 'var(--font-lora), serif',
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              borderBottom: catalogFilter === f ? '1px solid var(--gold)' : '1px solid transparent',
              color: catalogFilter === f ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
              borderRadius: 0,
              padding: '4px 12px',
            }}>{f}</button>
          ))}
        </div>
        {catalogLoading ? (
          <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px' }}>Loading catalog…</p>
        ) : catalogError ? (
          <p style={{ fontFamily: 'var(--font-lora), serif', color: '#ff6060', fontSize: '0.75rem', padding: '12px 0' }}>{catalogError}</p>
        ) : filteredCatalog.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', padding: '12px 0' }}>No posts match this filter.</p>
        ) : (
          filteredCatalog.map(post => {
            const status = post.status || 'active'
            const isPrivate = status === 'private'
            const isHidden = status === 'hidden'
            const author = post.displayName || post.username || 'anon'
            const isExpanded = expandedPost === post.id
            return (
              <div key={post.id} style={{ ...S.card, opacity: isHidden ? 0.45 : 1, marginBottom: '10px' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text)', marginBottom: '6px', lineHeight: 1.4 }}>
                  &ldquo;{post.text.slice(0, 120)}{post.text.length > 120 ? '…' : ''}&rdquo;
                </p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                  {[post.song, post.artist, author].filter(Boolean).join(' · ')}
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '1.5px',
                      color: isPrivate ? 'var(--gold)' : isHidden ? '#ff6060' : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${isPrivate ? 'var(--gold)' : isHidden ? 'rgba(255,96,96,0.4)' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: '6px', padding: '2px 8px',
                    }}>{status}</span>
                    {post.emotion && (
                      <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {post.emotion}
                      </span>
                    )}
                    {(post.flagCount || 0) > 0 && (
                      <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: '#ff6060', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {post.flagCount} flags
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button type="button" onClick={() => toggleExpandPost(post.id)} style={{ ...S.ghostBtn, fontSize: '0.55rem' }}>
                      {isExpanded ? 'Hide Backs' : 'Lyric Backs'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCatalogHide(post)}
                      disabled={catalogBusyId === post.id}
                      style={{
                        ...(isHidden ? S.btn : S.dangerBtn),
                        opacity: catalogBusyId === post.id ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {catalogBusyId === post.id ? '…' : isHidden ? 'Show' : 'Hide'}
                    </button>
                  </div>
                </div>
                {isExpanded && renderEchoPanel(post.id)}
              </div>
            )
          })
        )}
        {catalogActionError && (
          <p style={{ fontFamily: 'var(--font-lora), serif', color: '#ff6060', fontSize: '0.75rem', padding: '8px 0 0' }}>{catalogActionError}</p>
        )}
      </div>
    </div>
  )
}

// ── Catalog Tab (Supabase songs — read-only oversight) ──
interface CatalogSong {
  id: string
  title: string
  artistDisplayName: string
  status: string
  artworkUrl: string | null
  audioUrl: string | null
  ownerProfileId: string | null
  ownerUsername: string | null
  ownerDisplayName: string | null
  artistStatus: string | null
  createdAt: string | null
}

function CatalogSongsTab() {
  const [songs, setSongs] = useState<CatalogSong[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'processing' | 'live' | 'coming_soon' | 'hidden'>('all')
  const [artistStatusFilter, setArtistStatusFilter] = useState<'all' | 'active' | 'warned' | 'frozen' | 'removed'>('all')
  const [ownerQuery, setOwnerQuery] = useState('')
  const [titleQuery, setTitleQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await adminFetch('/api/admin/catalog-songs')
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
        if (!cancelled) setSongs(Array.isArray(body.songs) ? body.songs : [])
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load catalog')
          setSongs([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = songs.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (artistStatusFilter !== 'all' && (s.artistStatus || '') !== artistStatusFilter) return false
    if (titleQuery.trim()) {
      const q = titleQuery.toLowerCase()
      if (!(s.title || '').toLowerCase().includes(q)) return false
    }
    if (ownerQuery.trim()) {
      const q = ownerQuery.toLowerCase()
      const hay = [
        s.ownerUsername,
        s.ownerDisplayName,
        s.artistDisplayName,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const chip = (active: boolean) => ({
    ...S.ghostBtn,
    fontFamily: 'var(--font-lora), serif',
    fontSize: '0.6rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
    borderBottom: active ? '1px solid var(--gold)' : '1px solid transparent',
    color: active ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
    borderRadius: 0,
    padding: '4px 12px',
  })

  const statusColor = (status: string) => {
    if (status === 'live') return 'var(--gold)'
    if (status === 'hidden') return '#ff6060'
    if (status === 'processing') return '#7B9FFF'
    if (status === 'coming_soon') return '#ffc847'
    return 'rgba(255,255,255,0.4)'
  }

  const artistStatusColor = (st: string | null) => {
    if (st === 'active') return 'rgba(255,255,255,0.35)'
    if (st === 'warned') return '#ffc847'
    if (st === 'frozen') return '#7B9FFF'
    if (st === 'removed') return '#ff6060'
    return 'rgba(255,255,255,0.25)'
  }

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
        Supabase Catalog — all songs
      </p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '16px', lineHeight: 1.5 }}>
        Read-only oversight of every Studio / Supabase upload, including drafts and songs owned by frozen or removed artists. Artists publish via Studio — this tab does not upload.
      </p>

      <input
        type="text"
        value={titleQuery}
        onChange={e => setTitleQuery(e.target.value)}
        placeholder="Search song title…"
        style={{ ...S.input, marginBottom: '10px' }}
      />
      <input
        type="text"
        value={ownerQuery}
        onChange={e => setOwnerQuery(e.target.value)}
        placeholder="Filter by artist / owner (username, display name, or stage name)…"
        style={{ ...S.input, marginBottom: '14px' }}
      />

      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Song status</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {(['all', 'draft', 'processing', 'live', 'coming_soon', 'hidden'] as const).map(f => (
          <button key={f} type="button" onClick={() => setStatusFilter(f)} style={chip(statusFilter === f)}>{f}</button>
        ))}
      </div>

      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Artist status</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['all', 'active', 'warned', 'frozen', 'removed'] as const).map(f => (
          <button key={f} type="button" onClick={() => setArtistStatusFilter(f)} style={chip(artistStatusFilter === f)}>{f}</button>
        ))}
      </div>

      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        {loading ? '…' : filtered.length + ' of ' + songs.length + ' songs'}
      </p>

      {loading ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px' }}>Loading catalog…</p>
      ) : error ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: '#ff6060', fontSize: '0.75rem', padding: '12px 0' }}>{error}</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', padding: '12px 0' }}>No songs match these filters.</p>
      ) : (
        filtered.map(song => {
          const owner = song.ownerDisplayName || song.ownerUsername || 'unknown'
          const at = song.ownerUsername ? '@' + song.ownerUsername : null
          return (
            <div key={song.id} style={{ ...S.card, opacity: song.status === 'hidden' ? 0.45 : 1, marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {song.artworkUrl ? (
                  <img
                    src={song.artworkUrl}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: 'rgba(255,255,255,0.04)' }}
                  />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0, background: 'rgba(255,255,255,0.04)' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '4px' }}>
                    {song.title}
                  </p>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    {song.artistDisplayName}
                    {' · '}
                    {owner}
                    {at ? ' · ' + at : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '1.5px',
                      color: statusColor(song.status),
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', padding: '2px 8px',
                    }}>{song.status}</span>
                    <span style={{
                      fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '1.5px',
                      color: artistStatusColor(song.artistStatus),
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', padding: '2px 8px',
                    }}>{song.artistStatus || 'no status'}</span>
                    {song.audioUrl && (
                      <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>audio</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Featured Tab (Supabase site_featured_exchange via admin API) ──
function FeaturedTab() {
  const empty = { text: '', artist: '', song: '', username: '', reply: { text: '', artist: '', song: '', username: '' } }
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await adminFetch('/api/admin/featured')
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Failed to load featured')
        if (!cancelled && json.featured) setForm({
          text: json.featured.text || '',
          artist: json.featured.artist || '',
          song: json.featured.song || '',
          username: json.featured.username || '',
          reply: {
            text: json.featured.reply?.text || '',
            artist: json.featured.reply?.artist || '',
            song: json.featured.reply?.song || '',
            username: json.featured.reply?.username || '',
          },
        })
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const setReply = (k: string, v: string) => setForm(f => ({ ...f, reply: { ...f.reply, [k]: v } }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await adminFetch('/api/admin/featured', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      if (json.featured) setForm({
        text: json.featured.text || '',
        artist: json.featured.artist || '',
        song: json.featured.song || '',
        username: json.featured.username || '',
        reply: {
          text: json.featured.reply?.text || '',
          artist: json.featured.reply?.artist || '',
          song: json.featured.reply?.song || '',
          username: json.featured.reply?.username || '',
        },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const importFromRtdb = async () => {
    setImporting(true)
    setError(null)
    try {
      const res = await adminFetch('/api/admin/featured/import-rtdb', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Import failed')
      if (json.featured) setForm({
        text: json.featured.text || '',
        artist: json.featured.artist || '',
        song: json.featured.song || '',
        username: json.featured.username || '',
        reply: {
          text: json.featured.reply?.text || '',
          artist: json.featured.reply?.artist || '',
          song: json.featured.reply?.song || '',
          username: json.featured.reply?.username || '',
        },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  // UX only — API stores whatever is saved; landing hides until both lyrics exist.
  const canSave = form.text.trim() && form.reply.text.trim()

  if (loading) {
    return <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.35)' }}>Loading…</p>
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '24px', lineHeight: 1.6 }}>
        Appears on the landing page as &ldquo;Exchange of the Week.&rdquo; Stays hidden until both the original lyric and the reply are filled in.
      </p>
      {error && (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: '#ff6060', marginBottom: '16px' }}>{error}</p>
      )}
      <div style={{ marginBottom: '20px' }}>
        <button type="button" onClick={importFromRtdb} disabled={importing} style={{ ...S.ghostBtn, opacity: importing ? 0.6 : 1 }}>
          {importing ? 'Importing…' : 'Import from Firebase RTDB (one-shot)'}
        </button>
      </div>

      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Original Post</p>
      <div style={{ marginBottom: '14px' }}>
        <label style={S.label}>Lyric</label>
        <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          rows={3} placeholder="Enter the lyric…" style={{ ...S.input, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: '14px' }}>
        <div>
          <label style={S.label}>Artist</label>
          <input value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} placeholder="Artist name" style={S.input} />
        </div>
        <div>
          <label style={S.label}>Song</label>
          <input value={form.song} onChange={e => setForm(f => ({ ...f, song: e.target.value }))} placeholder="Song title" style={S.input} />
        </div>
      </div>
      <div style={{ marginBottom: '28px' }}>
        <label style={S.label}>Posted by (optional)</label>
        <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="username" style={S.input} />
      </div>

      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Reply (Lyric Back)</p>
      <div style={{ marginBottom: '14px' }}>
        <label style={S.label}>Lyric</label>
        <textarea value={form.reply.text} onChange={e => setReply('text', e.target.value)}
          rows={3} placeholder="Enter the reply lyric…" style={{ ...S.input, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: '14px' }}>
        <div>
          <label style={S.label}>Artist</label>
          <input value={form.reply.artist} onChange={e => setReply('artist', e.target.value)} placeholder="Artist name" style={S.input} />
        </div>
        <div>
          <label style={S.label}>Song</label>
          <input value={form.reply.song} onChange={e => setReply('song', e.target.value)} placeholder="Song title" style={S.input} />
        </div>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={S.label}>Replied by (optional)</label>
        <input value={form.reply.username} onChange={e => setReply('username', e.target.value)} placeholder="username" style={S.input} />
      </div>

      <button onClick={save} disabled={saving || !canSave} style={{ ...S.btn, opacity: (saving || !canSave) ? 0.6 : 1 }}>
        {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Featured Exchange'}
      </button>
      {!canSave && (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>
          Both lyrics are required — the section stays hidden on the landing page until then.
        </p>
      )}
    </div>
  )
}

// ── Main Admin Page ──
export default function AdminPage() {
  const { loading: authLoading } = useAuthGate()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<'posts' | 'catalog' | 'featured' | 'artists' | 'reports'>('posts')

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/session', { credentials: 'include' })
        if (!cancelled) setIsAdmin(res.ok)
      } catch {
        if (!cancelled) setIsAdmin(false)
      } finally {
        if (!cancelled) setSessionChecked(true)
      }
    })()
    return () => { cancelled = true }
  }, [authLoading])

  const handleSignOut = async () => {
    await signOutBrowser()
    setIsAdmin(false)
    setSessionChecked(true)
  }

  if (authLoading || !sessionChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <LoginForm
        onSuccess={() => {
          setIsAdmin(true)
          setSessionChecked(true)
        }}
      />
    )
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'catalog', label: 'Catalog' },
    { key: 'featured', label: 'Featured' },
    { key: 'artists', label: 'Artists' },
    { key: 'reports', label: 'Reports' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <BackButton fallbackHref="/feed" />
            <div>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>Margo</p>
              <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400 }}>Admin</h1>
            </div>
          </div>
          <button onClick={handleSignOut} style={S.ghostBtn}>Sign Out</button>
        </div>
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '28px' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={S.tab(tab === t.key)}>{t.label}</button>
          ))}
        </div>
        {tab === 'posts' && <PostsTab />}
        {tab === 'catalog' && <CatalogSongsTab key="catalog" />}
        {tab === 'featured' && <FeaturedTab />}
        {tab === 'artists' && <ArtistApplicationsTab />}
        {tab === 'reports' && <PostReportsTab />}
      </div>
    </div>
  )
}
