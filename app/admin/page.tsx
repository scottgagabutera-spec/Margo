'use client'
import { Suspense, useState, useEffect, useCallback, type CSSProperties } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setBrowserAccessToken, signOutBrowser } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { ArtistApplicationsTab } from '@/components/artist-applications-tab'
import { PostReportsTab } from '@/components/post-reports-tab'
import { BackButton } from '@/components/back-button'

type AdminSection = 'overview' | 'posts' | 'catalog' | 'artists' | 'reports' | 'featured'

const SECTIONS: { key: AdminSection; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'posts', label: 'Posts' },
  { key: 'catalog', label: 'Catalog' },
  { key: 'artists', label: 'Artists' },
  { key: 'reports', label: 'Reports' },
  { key: 'featured', label: 'Featured' },
]

function parseSection(raw: string | null): AdminSection {
  const allowed: AdminSection[] = ['overview', 'posts', 'catalog', 'artists', 'reports', 'featured']
  if (raw && (allowed as string[]).includes(raw)) return raw as AdminSection
  return 'overview'
}

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
  // Temporary diagnosis: /admin?perf=1 → server returns `_perf` + logs [perf]
  if (typeof window !== 'undefined') {
    try {
      if (new URLSearchParams(window.location.search).get('perf') === '1') {
        headers.set('x-margo-perf', '1')
      }
    } catch { /* ignore */ }
  }
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

// ── Overview KPI types (shared by LoginForm, shell, OverviewPanel) ──
interface OverviewGrowthData {
  signupsTotal: number
  postsActive: number
  postsAll: number
  lyricBacksActive: number
  lyricBacksAll: number
  signupsByDay: { date: string; count: number }[]
  windowDays: number
  timezone: string
}

interface OverviewData {
  pendingReports: number
  pendingArtistApps: number
  flaggedPosts: number
  hiddenPosts: number
  liveSongs: number
  approvedArtists: number
  artistsNeedingAttention: number
  featuredStatus: 'live' | 'incomplete'
  growth: OverviewGrowthData
}

function parseGrowthPayload(raw: unknown): OverviewGrowthData | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Record<string, unknown>
  const nums = [
    'signupsTotal',
    'postsActive',
    'postsAll',
    'lyricBacksActive',
    'lyricBacksAll',
    'windowDays',
  ] as const
  for (const k of nums) {
    if (typeof g[k] !== 'number') return null
  }
  if (typeof g.timezone !== 'string') return null
  if (!Array.isArray(g.signupsByDay)) return null
  const signupsByDay: { date: string; count: number }[] = []
  for (const row of g.signupsByDay) {
    if (!row || typeof row !== 'object') return null
    const r = row as Record<string, unknown>
    if (typeof r.date !== 'string' || typeof r.count !== 'number') return null
    signupsByDay.push({ date: r.date, count: r.count })
  }
  return {
    signupsTotal: g.signupsTotal as number,
    postsActive: g.postsActive as number,
    postsAll: g.postsAll as number,
    lyricBacksActive: g.lyricBacksActive as number,
    lyricBacksAll: g.lyricBacksAll as number,
    signupsByDay,
    windowDays: g.windowDays as number,
    timezone: g.timezone as string,
  }
}

function parseOverviewPayload(raw: unknown): OverviewData | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const featured = o.featuredStatus
  if (featured !== 'live' && featured !== 'incomplete') return null
  const growth = parseGrowthPayload(o.growth)
  if (!growth) return null
  const nums = [
    'pendingReports',
    'pendingArtistApps',
    'flaggedPosts',
    'hiddenPosts',
    'liveSongs',
    'approvedArtists',
    'artistsNeedingAttention',
  ] as const
  for (const k of nums) {
    if (typeof o[k] !== 'number') return null
  }
  return {
    pendingReports: o.pendingReports as number,
    pendingArtistApps: o.pendingArtistApps as number,
    flaggedPosts: o.flaggedPosts as number,
    hiddenPosts: o.hiddenPosts as number,
    liveSongs: o.liveSongs as number,
    approvedArtists: o.approvedArtists as number,
    artistsNeedingAttention: o.artistsNeedingAttention as number,
    featuredStatus: featured,
    growth,
  }
}

// ── Login ──
function LoginForm({
  onSuccess,
}: {
  onSuccess: (overview: OverviewData | null) => void
}) {
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

      // Default admin landing is Overview — one assertAdmin + KPIs (no second hop).
      const sessionRes = await adminFetch('/api/admin/session?overview=1')
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
      const sessionBody = await sessionRes.json().catch(() => ({}))
      const overview = parseOverviewPayload(sessionBody?.overview)

      onSuccess(overview)
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

// ── Posts Tab (glance → expand) ──
function PostsTab() {
  const [search, setSearch] = useState('')
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [echoes, setEchoes] = useState<Record<string, Echo[]>>({})
  const [catalogPosts, setCatalogPosts] = useState<CatalogPost[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'active' | 'private' | 'hidden' | 'flagged'>('active')
  const [catalogBusyId, setCatalogBusyId] = useState<string | null>(null)
  const [catalogActionError, setCatalogActionError] = useState<string | null>(null)
  const [echoesLoadingId, setEchoesLoadingId] = useState<string | null>(null)
  const [echoBusyId, setEchoBusyId] = useState<string | null>(null)

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
      return
    }
    setExpandedPost(postId)
    if (!echoes[postId]) loadEchoes(postId)
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
        [postId]: (prev[postId] || []).map(e => e.id === echo.id ? { ...e, status: newStatus } : e),
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
    if (catalogFilter === 'flagged' && !(p.flagCount && p.flagCount > 0)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (p.text || '').toLowerCase().includes(q) ||
      (p.song || '').toLowerCase().includes(q) ||
      (p.artist || '').toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q) ||
      (p.displayName || '').toLowerCase().includes(q)
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

  const statusChip = (status: string) => {
    const isPrivate = status === 'private'
    const isHidden = status === 'hidden'
    return (
      <span style={{
        fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '1.5px',
        color: isPrivate ? 'var(--gold)' : isHidden ? '#ff6060' : 'rgba(255,255,255,0.4)',
        border: `1px solid ${isPrivate ? 'var(--gold)' : isHidden ? 'rgba(255,96,96,0.4)' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: '6px', padding: '2px 8px',
      }}>{status}</span>
    )
  }

  const renderEchoPanel = (parentId: string) => {
    const postEchoes = echoes[parentId] || []
    const loading = echoesLoadingId === parentId
    const activeN = postEchoes.filter(e => e.status !== 'hidden' && e.status !== 'private').length
    const hiddenN = postEchoes.filter(e => e.status === 'hidden').length
    const privateN = postEchoes.filter(e => e.status === 'private').length
    return (
      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px',
        }}>
          Lyric backs
          {!loading && postEchoes.length > 0 ? ` — ${activeN} active · ${hiddenN} hidden · ${privateN} private` : ''}
        </p>
        {loading ? (
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>Loading lyric backs…</p>
        ) : postEchoes.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No lyric backs yet.</p>
        ) : (
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
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '6px' }}>
                      &ldquo;{echo.lyric}&rdquo;
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {[echo.song, echo.artist, echo.username || 'anon'].filter(Boolean).join(' · ')}
                      </span>
                      {echo.emotion && (
                        <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>{echo.emotion}</span>
                      )}
                      {isEchoHidden && <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: '#ff6060', textTransform: 'uppercase', letterSpacing: '1px' }}>hidden</span>}
                      {isEchoPrivate && <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>private</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void toggleHideEcho(parentId, echo) }}
                    disabled={echoBusyId === echo.id}
                    style={{ ...(isEchoHidden ? S.btn : S.dangerBtn), flexShrink: 0, opacity: echoBusyId === echo.id ? 0.6 : 1 }}
                  >
                    {echoBusyId === echo.id ? '…' : isEchoHidden ? 'Show' : 'Hide'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
        Posts
      </p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '16px', lineHeight: 1.5 }}>
        Feed and Discover posts. Click a row for full text, lyric backs, and hide/show. Hide removes a post from public feeds.
      </p>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search posts, songs, artists, users…"
        style={{ ...S.input, marginBottom: '12px' }}
      />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['active', 'private', 'hidden', 'flagged', 'all'] as const).map(f => (
          <button key={f} type="button" onClick={() => setCatalogFilter(f)} style={chip(catalogFilter === f)}>
            {f}
          </button>
        ))}
      </div>

      {catalogLoading ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px' }}>Loading posts…</p>
      ) : catalogError ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: '#ff6060', fontSize: '0.75rem', padding: '12px 0' }}>{catalogError}</p>
      ) : filteredCatalog.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', padding: '12px 0' }}>No posts match this filter.</p>
      ) : (
        filteredCatalog.map(post => {
          const status = post.status || 'active'
          const isHidden = status === 'hidden'
          const author = post.displayName || post.username || 'anon'
          const isExpanded = expandedPost === post.id
          const snippet = post.text.length > 120 ? post.text.slice(0, 120) + '…' : post.text

          return (
            <div
              key={post.id}
              style={{
                ...S.card,
                opacity: isHidden ? 0.45 : 1,
                marginBottom: '10px',
                cursor: 'pointer',
              }}
              onClick={() => toggleExpandPost(post.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleExpandPost(post.id)
                }
              }}
            >
              {/* Glance */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.9rem',
                    color: 'var(--text)', marginBottom: '8px', lineHeight: 1.4,
                  }}>
                    &ldquo;{isExpanded ? post.text : snippet}&rdquo;
                  </p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {statusChip(status)}
                    <span style={{
                      fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem',
                      color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px',
                    }}>
                      {author}
                    </span>
                    {(post.flagCount || 0) > 0 && (
                      <span style={{
                        fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem',
                        color: '#ff6060', textTransform: 'uppercase', letterSpacing: '1px',
                      }}>
                        {post.flagCount} flag{(post.flagCount || 0) === 1 ? '' : 's'}
                      </span>
                    )}
                    {!isExpanded && (post.song || post.artist) && (
                      <span style={{
                        fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem',
                        color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px',
                      }}>
                        {[post.song, post.artist].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    marginTop: 4,
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 150ms ease',
                  }}
                >
                  <path d="M4 2L8 6L4 10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Expand */}
              {isExpanded && (
                <div onClick={(e) => e.stopPropagation()}>
                  <p style={{
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
                    color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px',
                    marginTop: '14px', marginBottom: '12px', lineHeight: 1.5,
                  }}>
                    {[post.song, post.artist, author, post.emotion].filter(Boolean).join(' · ')}
                  </p>
                  <button
                    type="button"
                    onClick={() => void toggleCatalogHide(post)}
                    disabled={catalogBusyId === post.id}
                    style={{
                      ...(isHidden ? S.btn : S.dangerBtn),
                      opacity: catalogBusyId === post.id ? 0.6 : 1,
                    }}
                  >
                    {catalogBusyId === post.id ? '…' : isHidden ? 'Show' : 'Hide'}
                  </button>
                  {renderEchoPanel(post.id)}
                </div>
              )}
            </div>
          )
        })
      )}
      {catalogActionError && (
        <p style={{ fontFamily: 'var(--font-lora), serif', color: '#ff6060', fontSize: '0.75rem', padding: '8px 0 0' }}>{catalogActionError}</p>
      )}
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

// ── Overview KPIs ──
function OverviewPanel({
  onNavigate,
  initialData = null,
}: {
  onNavigate: (section: AdminSection) => void
  /** Cold-load KPIs from session?overview=1 — skips GET /api/admin/overview */
  initialData?: OverviewData | null
}) {
  const [data, setData] = useState<OverviewData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setData(initialData)
      setLoading(false)
      setError(null)
      if (typeof window !== 'undefined') {
        console.log('[perf] admin client waterfall — overview hop skipped (session bundled KPIs)')
      }
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      try {
        const res = await adminFetch('/api/admin/overview')
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status))
        const clientMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0)
        if (body._perf && typeof window !== 'undefined') {
          console.log('[perf] admin client waterfall — overview hop', {
            clientFetchMs: clientMs,
            server: body._perf,
          })
        }
        const { _perf: _drop, ...kpi } = body as OverviewData & { _perf?: unknown }
        const parsed = parseOverviewPayload(kpi)
        if (!parsed) throw new Error('Invalid overview payload')
        if (!cancelled) setData(parsed)
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load overview')
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // initialData only consulted on mount (cold shell pass or panel remount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  type OverviewCard = {
    key: string
    label: string
    value: string | number
    warn?: boolean
    section: AdminSection
  }

  // Row 1 = queues that need action; Row 2 = roster/health stats
  const actionCards: OverviewCard[] = data
    ? [
        { key: 'reports', label: 'Pending reports', value: data.pendingReports, warn: data.pendingReports > 0, section: 'reports' },
        { key: 'apps', label: 'Pending artist apps', value: data.pendingArtistApps, warn: data.pendingArtistApps > 0, section: 'artists' },
        { key: 'flagged', label: 'Flagged posts', value: data.flaggedPosts, warn: data.flaggedPosts > 0, section: 'posts' },
        { key: 'hidden', label: 'Hidden posts', value: data.hiddenPosts, section: 'posts' },
      ]
    : []

  const statCards: OverviewCard[] = data
    ? [
        { key: 'songs', label: 'Live songs', value: data.liveSongs, section: 'catalog' },
        { key: 'approved', label: 'Approved artists', value: data.approvedArtists, section: 'artists' },
        {
          key: 'artists',
          label: 'Artists needing attention',
          value: data.artistsNeedingAttention,
          warn: data.artistsNeedingAttention > 0,
          section: 'artists',
        },
        {
          key: 'featured',
          label: 'Featured exchange',
          value: data.featuredStatus === 'live' ? 'Live' : 'Incomplete',
          warn: data.featuredStatus === 'incomplete',
          section: 'featured',
        },
      ]
    : []

  const rowLabel: CSSProperties = {
    fontFamily: 'var(--font-lora), serif',
    fontSize: '0.55rem',
    color: 'rgba(255,255,255,0.28)',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '10px',
  }

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
  }

  const renderCard = (card: OverviewCard) => (
    <button
      key={card.key}
      type="button"
      onClick={() => onNavigate(card.section)}
      style={{
        ...S.card,
        marginBottom: 0,
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-lora), serif',
          fontSize: '1.5rem',
          color: card.warn ? '#ff6060' : 'var(--gold)',
          fontWeight: 700,
          marginBottom: '8px',
        }}
      >
        {card.value}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-lora), serif',
          fontSize: '0.55rem',
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          lineHeight: 1.4,
        }}
      >
        {card.label}
      </p>
    </button>
  )

  if (loading) {
    return (
      <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '48px 0' }}>
        Loading overview…
      </p>
    )
  }

  if (error) {
    return (
      <p style={{ fontFamily: 'var(--font-lora), serif', color: '#ff6060', fontSize: '0.85rem', padding: '24px 0' }}>
        {error}
      </p>
    )
  }

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '24px', lineHeight: 1.6 }}>
        At-a-glance counts from live Supabase data. Click a card to open that queue.
      </p>
      <div style={{ marginBottom: '28px' }}>
        <p style={rowLabel}>Needs attention</p>
        <div style={gridStyle}>{actionCards.map(renderCard)}</div>
      </div>
      <div style={{ marginBottom: '28px' }}>
        <p style={rowLabel}>Catalog & roster</p>
        <div style={gridStyle}>{statCards.map(renderCard)}</div>
      </div>
      {data?.growth && (
        <div>
          <p style={rowLabel}>Growth</p>
          <div style={gridStyle}>
            <div style={{ ...S.card, marginBottom: 0 }}>
              <p style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: 'var(--gold)',
                fontWeight: 700, marginBottom: '6px',
              }}>
                {data.growth.signupsTotal}
              </p>
              <p style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.4, marginBottom: '10px',
              }}>
                Total signups
              </p>
              <SignupSparkline days={data.growth.signupsByDay} />
              <p style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)',
                marginTop: '8px', letterSpacing: '0.5px',
              }}>
                Last {data.growth.windowDays} days · {data.growth.timezone.replace('_', ' ')}
              </p>
            </div>
            <div style={{ ...S.card, marginBottom: 0 }}>
              <p style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: 'var(--gold)',
                fontWeight: 700, marginBottom: '6px',
              }}>
                {data.growth.postsActive}
              </p>
              <p style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.4, marginBottom: '6px',
              }}>
                Posts
              </p>
              <p style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.28)',
                lineHeight: 1.4,
              }}>
                {data.growth.postsActive} active · {data.growth.postsAll} total
              </p>
            </div>
            <div style={{ ...S.card, marginBottom: 0 }}>
              <p style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: 'var(--gold)',
                fontWeight: 700, marginBottom: '6px',
              }}>
                {data.growth.lyricBacksActive}
              </p>
              <p style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.4, marginBottom: '6px',
              }}>
                Lyric backs
              </p>
              <p style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.28)',
                lineHeight: 1.4,
              }}>
                {data.growth.lyricBacksActive} active · {data.growth.lyricBacksAll} total
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SignupSparkline({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count))
  return (
    <div
      title="Signups per day"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '2px',
        height: 28,
        width: '100%',
      }}
    >
      {days.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count}`}
          style={{
            flex: 1,
            minWidth: 2,
            height: `${Math.max(8, Math.round((d.count / max) * 100))}%`,
            background: d.count > 0 ? 'rgba(232,197,71,0.55)' : 'rgba(255,255,255,0.06)',
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  )
}

// ── Main Admin Page ──
function AdminShell() {
  const { loading: authLoading } = useAuthGate()
  const router = useRouter()
  const searchParams = useSearchParams()
  const section = parseSection(searchParams.get('section'))

  const [sessionChecked, setSessionChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  /** KPIs from session?overview=1; consumed once by OverviewPanel, then cleared */
  const [overviewInitial, setOverviewInitial] = useState<OverviewData | null>(null)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    ;(async () => {
      const wantOverview = section === 'overview'
      const sessionPath = wantOverview
        ? '/api/admin/session?overview=1'
        : '/api/admin/session'
      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      try {
        const res = await adminFetch(sessionPath)
        const clientMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0)
        if (res.ok) {
          const body = await res.json().catch(() => ({}))
          if (body?._perf) {
            console.log('[perf] admin client waterfall — session hop', {
              clientFetchMs: clientMs,
              includeOverview: wantOverview,
              server: body._perf,
            })
          }
          if (wantOverview && !cancelled) {
            setOverviewInitial(parseOverviewPayload(body?.overview))
          }
        }
        if (!cancelled) setIsAdmin(res.ok)
      } catch {
        if (!cancelled) setIsAdmin(false)
      } finally {
        if (!cancelled) setSessionChecked(true)
      }
    })()
    return () => { cancelled = true }
    // Gate once after auth boot — not on every section change (panels fetch their own data).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  const setSection = useCallback((next: AdminSection) => {
    if (next !== 'overview') setOverviewInitial(null)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'overview') params.delete('section')
    else params.set('section', next)
    const q = params.toString()
    router.replace(q ? `/admin?${q}` : '/admin')
  }, [router, searchParams])

  const handleSignOut = async () => {
    await signOutBrowser()
    setIsAdmin(false)
    setSessionChecked(true)
    setOverviewInitial(null)
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
        onSuccess={(overview) => {
          setIsAdmin(true)
          setSessionChecked(true)
          setOverviewInitial(overview)
        }}
      />
    )
  }

  const navBtn = (item: { key: AdminSection; label: string }, opts?: { mobile?: boolean }) => {
    const active = section === item.key
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => setSection(item.key)}
        style={{
          display: 'block',
          width: opts?.mobile ? 'auto' : '100%',
          textAlign: opts?.mobile ? 'center' : 'left',
          padding: opts?.mobile ? '8px 14px' : '10px 14px',
          background: active ? 'rgba(232,197,71,0.08)' : 'transparent',
          border: 'none',
          borderLeft: opts?.mobile ? 'none' : (active ? '2px solid var(--gold)' : '2px solid transparent'),
          borderBottom: opts?.mobile ? (active ? '2px solid var(--gold)' : '2px solid transparent') : 'none',
          borderRadius: opts?.mobile ? 0 : '0 8px 8px 0',
          cursor: 'pointer',
          fontFamily: 'var(--font-lora), serif',
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: active ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
          whiteSpace: 'nowrap',
        }}
      >
        {item.label}
      </button>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '88px 24px 80px',
          display: 'grid',
          gridTemplateColumns: '200px 1fr',
          gap: '32px',
          alignItems: 'start',
        }}
        className="admin-shell-grid"
      >
        <aside style={{ position: 'sticky', top: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <BackButton fallbackHref="/feed" />
            <div>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>Margo</p>
              <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.25rem', color: 'var(--text)', fontWeight: 400, margin: 0 }}>Admin</h1>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '24px' }} className="admin-sidebar-nav">
            {SECTIONS.map((item) => navBtn(item))}
          </nav>

          <button type="button" onClick={handleSignOut} style={{ ...S.ghostBtn, width: '100%' }}>
            Sign Out
          </button>
        </aside>

        <main style={{ minWidth: 0 }}>
          {/* Mobile: horizontal section strip (CSS hides sidebar below breakpoint via inline media workaround) */}
          <div className="admin-mobile-nav" style={{ display: 'none', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BackButton fallbackHref="/feed" />
                <div>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '2px' }}>Margo</p>
                  <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.2rem', color: 'var(--text)', fontWeight: 400, margin: 0 }}>Admin</h1>
                </div>
              </div>
              <button type="button" onClick={handleSignOut} style={S.ghostBtn}>Sign Out</button>
            </div>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
              {SECTIONS.map((item) => navBtn(item, { mobile: true }))}
            </div>
          </div>

          {section === 'overview' && (
            <OverviewPanel
              onNavigate={setSection}
              initialData={overviewInitial}
            />
          )}
          {section === 'posts' && <PostsTab />}
          {section === 'catalog' && <CatalogSongsTab key="catalog" />}
          {section === 'artists' && <ArtistApplicationsTab />}
          {section === 'reports' && <PostReportsTab />}
          {section === 'featured' && <FeaturedTab />}
        </main>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .admin-shell-grid {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
            padding-top: 72px !important;
          }
          .admin-shell-grid > aside {
            display: none !important;
          }
          .admin-mobile-nav {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
        </div>
      }
    >
      <AdminShell />
    </Suspense>
  )
}
