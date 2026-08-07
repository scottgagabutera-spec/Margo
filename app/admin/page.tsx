'use client'
import { useState, useEffect, useRef } from 'react'
import { auth, db } from '@/lib/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { ref, onValue, update, set, get } from 'firebase/database'
import { ArtistApplicationsTab } from '@/components/artist-applications-tab'
import { PostReportsTab } from '@/components/post-reports-tab'
import { BackButton } from '@/components/back-button'

// ── Types ──
interface Post {
  id: string; text?: string; emotion?: string; status?: string
  knowledge?: { song?: string; artist?: string }
  username?: string; timestamp?: number; tier?: number; flagCount?: number
}
interface Echo {
  id: string; lyric?: string; song?: string; artist?: string
  username?: string; emotion?: string; timestamp?: number; status?: string
}
interface CatalogPost {
  id: string; text: string; emotion: string | null; status: string
  song: string | null; artist: string | null; username: string | null
  displayName?: string | null
}

interface Analytics { views?: number; resonates?: Record<string,boolean> }

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
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!auth) return
    setLoading(true); setError('')
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const uid = cred.user.uid
      if (!db) throw new Error('No DB')
      const snap = await get(ref(db, 'adminConfig/allowedUid'))
      if (snap.val() !== uid) {
        await signOut(auth)
        setError('Access denied.')
        return
      }
      onLogin()
    } catch (e: any) {
      setError(e.message?.includes('denied') ? 'Access denied.' : 'Invalid credentials.')
    } finally { setLoading(false) }
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
          {error && <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: '#ff6060' }}>{error}</p>}
          <button onClick={handleLogin} disabled={loading} style={{ ...S.btn, width: '100%', padding: '14px', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Posts Tab ──
function PostsTab() {
  const [posts, setPosts] = useState<Post[]>([])
  const [analytics, setAnalytics] = useState<Record<string, Analytics>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [echoes, setEchoes] = useState<Record<string, Echo[]>>({})
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null)
  const [backfillRunning, setBackfillRunning] = useState(false)
  const [resonateBackfillStatus, setResonateBackfillStatus] = useState<string | null>(null)
  const [resonateBackfillRunning, setResonateBackfillRunning] = useState(false)
  const [viewsBackfillStatus, setViewsBackfillStatus] = useState<string | null>(null)
  const [viewsBackfillRunning, setViewsBackfillRunning] = useState(false)
  const [playBackfillStatus, setPlayBackfillStatus] = useState<string | null>(null)
  const [playBackfillRunning, setPlayBackfillRunning] = useState(false)
  const [postFilter, setPostFilter] = useState<'all' | 'active' | 'hidden'>('active')
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
    if (!auth?.currentUser) return
    setEchoesLoadingId(postId)
    setCatalogActionError(null)
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('/api/admin/catalog-posts?parent_post_id=' + encodeURIComponent(postId), {
        headers: { Authorization: 'Bearer ' + token },
      })
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

  const runBackfill = async () => {
    if (!db || backfillRunning) return
    setBackfillRunning(true)
    setBackfillStatus('Reading posts…')
    try {
      const snap = await get(ref(db, 'posts'))
      if (!snap.exists()) { setBackfillStatus('No posts found.'); return }
      const posts = snap.val() as Record<string, any>
      const multiPath: Record<string, number> = {}
      for (const [postId, post] of Object.entries(posts)) {
        const echoes = post.echoes ? Object.values(post.echoes as Record<string, any>) : []
        const echoCount = echoes.filter((e: any) => e.status !== 'hidden').length
        if (echoCount > 0) multiPath[`postStats/${postId}/echoCount`] = echoCount
        else if (post.echoes) multiPath[`postStats/${postId}/echoCount`] = 0
      }
      if (Object.keys(multiPath).length > 0) {
        await update(ref(db), multiPath)
      }
      setBackfillStatus(`Done — updated ${Object.keys(multiPath).length} posts.`)
    } catch (e: any) {
      setBackfillStatus(`Error: ${e.message}`)
    } finally {
      setBackfillRunning(false)
    }
  }

  const runPlayBackfill = async () => {
    if (!db || playBackfillRunning) return
    setPlayBackfillRunning(true)
    setPlayBackfillStatus('Reading engagement plays…')
    try {
      const snap = await get(ref(db, 'engagement/plays'))
      if (!snap.exists()) { setPlayBackfillStatus('No engagement plays found.'); return }
      const plays = snap.val() as Record<string, any>
      const multiPath: Record<string, number> = {}
      for (const [songId, sessions] of Object.entries(plays)) {
        const count = sessions ? Object.keys(sessions as Record<string, any>).length : 0
        if (count > 0) multiPath[`songStats/${songId}/plays`] = count
      }
      if (Object.keys(multiPath).length > 0) {
        await update(ref(db), multiPath)
      }
      setPlayBackfillStatus(`Done — updated ${Object.keys(multiPath).length} songs.`)
    } catch (e: any) {
      setPlayBackfillStatus(`Error: ${e.message}`)
    } finally {
      setPlayBackfillRunning(false)
    }
  }

  useEffect(() => {
    if (!db) return
    const unsub = onValue(ref(db, 'posts'), snap => {
      const list: Post[] = []
      snap.forEach(child => { list.push({ ...child.val(), id: child.key }) })
      setPosts(list.reverse())
      setLoading(false)
    })
    const unsub2 = onValue(ref(db, 'analytics'), snap => {
      setAnalytics(snap.val() || {})
    })
    return () => { unsub(); unsub2() }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      if (!auth?.currentUser) {
        if (!cancelled) {
          setCatalogError('Not signed in')
          setCatalogLoading(false)
        }
        return
      }
      setCatalogLoading(true)
      setCatalogError(null)
      try {
        const token = await auth.currentUser.getIdToken()
        const res = await fetch('/api/admin/catalog-posts', {
          headers: { Authorization: `Bearer ${token}` },
        })
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

  const runResonateBackfill = async () => {
    if (!db || resonateBackfillRunning) return
    setResonateBackfillRunning(true)
    setResonateBackfillStatus('Reading analytics…')
    try {
      const snap = await get(ref(db, 'analytics'))
      if (!snap.exists()) { setResonateBackfillStatus('No analytics found.'); return }
      const data = snap.val() as Record<string, any>
      const multiPath: Record<string, number> = {}
      for (const [postId, a] of Object.entries(data)) {
        const count = Object.keys((a as any).resonates || {}).length
        if (count > 0) multiPath[`postStats/${postId}/resonateCount`] = count
      }
      if (Object.keys(multiPath).length > 0) await update(ref(db), multiPath)
      setResonateBackfillStatus(`Done — updated ${Object.keys(multiPath).length} posts.`)
    } catch (e: any) {
      setResonateBackfillStatus(`Error: ${e.message}`)
    } finally {
      setResonateBackfillRunning(false)
    }
  }

  const runViewsBackfill = async () => {
    if (!db || viewsBackfillRunning) return
    setViewsBackfillRunning(true)
    setViewsBackfillStatus('Reading analytics…')
    try {
      const snap = await get(ref(db, 'analytics'))
      if (!snap.exists()) { setViewsBackfillStatus('No analytics found.'); return }
      const data = snap.val() as Record<string, any>
      const multiPath: Record<string, number> = {}
      for (const [postId, a] of Object.entries(data)) {
        const views = (a as any).views || 0
        if (views > 0) multiPath[`postStats/${postId}/views`] = views
      }
      if (Object.keys(multiPath).length > 0) await update(ref(db), multiPath)
      setViewsBackfillStatus(`Done — updated ${Object.keys(multiPath).length} posts.`)
    } catch (e: any) {
      setViewsBackfillStatus(`Error: ${e.message}`)
    } finally {
      setViewsBackfillRunning(false)
    }
  }

  /** Real feed/Discover read Supabase posts.status — never Firebase. */
  const patchSupabasePostStatus = async (postId: string, status: string) => {
    if (!auth?.currentUser) throw new Error('Not signed in')
    const token = await auth.currentUser.getIdToken()
    const res = await fetch('/api/admin/catalog-posts', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: postId, status }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
    return body as { id: string; status: string }
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

  /** Firebase list Hide — legacy RTDB only. Live moderation is Catalog above. */
  const toggleHide = async (post: Post) => {
    if (!db) return
    const newStatus = post.status === 'hidden' ? 'active' : 'hidden'
    await update(ref(db, `posts/${post.id}`), { status: newStatus })
  }

  const filtered = posts.filter(p => {
    if (postFilter === 'active' && p.status === 'hidden') return false
    if (postFilter === 'hidden' && p.status !== 'hidden') return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (p.text || '').toLowerCase().includes(q) ||
      (p.knowledge?.song || '').toLowerCase().includes(q) ||
      (p.knowledge?.artist || '').toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q)
  })

  const filteredCatalog = catalogPosts.filter(p => {
    if (catalogFilter === 'active' && p.status !== 'active') return false
    if (catalogFilter === 'private' && p.status !== 'private') return false
    if (catalogFilter === 'hidden' && p.status !== 'hidden') return false
    return true
  })

  const totalPosts = posts.filter(p => p.status !== 'hidden').length
  const totalViews = Object.values(analytics).reduce((s, a) => s + (a.views || 0), 0)
  const totalResonates = Object.values(analytics).reduce((s, a) => s + Object.keys(a.resonates || {}).length, 0)
  const flagged = posts.filter(p => (p.flagCount || 0) > 0 && p.status !== 'hidden').length

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
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[['Posts Live', totalPosts], ['Total Views', totalViews], ['Resonates', totalResonates], ['Flagged', flagged]].map(([label, val]) => (
          <div key={label} style={{ ...S.card, textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: label === 'Flagged' && Number(val) > 0 ? '#ff6060' : 'var(--gold)', fontWeight: 700 }}>{val}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
          </div>
        ))}
      </div>
      {/* Search */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search posts, songs, artists, users…"
        style={{ ...S.input, marginBottom: '16px' }} />
      {/* Post filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['active', 'hidden', 'all'] as const).map(f => (
          <button key={f} onClick={() => setPostFilter(f)} style={{
            ...S.ghostBtn,
            fontFamily: 'var(--font-lora), serif',
            fontSize: '0.6rem',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            borderBottom: postFilter === f ? '1px solid var(--gold)' : '1px solid transparent',
            color: postFilter === f ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
            borderRadius: 0,
            padding: '4px 12px',
          }}>{f}</button>
        ))}
      </div>

      {/* Supabase Catalog — live posts (Hide/Show) */}
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

      {/* Backfill tools */}
      {[
        { label: 'Backfill Echo Counts', desc: 'Counts existing lyric backs → postStats.echoCount', status: backfillStatus, running: backfillRunning, fn: runBackfill },
        { label: 'Backfill Resonate Counts', desc: 'Reads analytics.resonates → postStats.resonateCount', status: resonateBackfillStatus, running: resonateBackfillRunning, fn: runResonateBackfill },
        { label: 'Backfill Views', desc: 'Copies analytics.views → postStats.views', status: viewsBackfillStatus, running: viewsBackfillRunning, fn: runViewsBackfill },
        { label: 'Backfill Play Counts', desc: 'Counts engagement plays → songStats.plays', status: playBackfillStatus, running: playBackfillRunning, fn: runPlayBackfill },
      ].map(({ label, desc, status, running, fn }) => (
        <div key={label} style={{ ...S.card, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'var(--text)', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>{status || desc}</p>
          </div>
          <button onClick={fn} disabled={running} style={{ ...S.btn, opacity: running ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            {running ? 'Running…' : 'Run'}
          </button>
        </div>
      ))}

      {/* Firebase legacy posts — Hide only mutates RTDB; live moderation is Catalog above */}
      {loading ? <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px' }}>Loading…</p> : filtered.map(post => {
        const a = analytics[post.id] || {}
        const resonateCount = Object.keys(a.resonates || {}).length
        const isHidden = post.status === 'hidden'
        const isFlagged = (post.flagCount || 0) > 0
        const isExpanded = expandedPost === post.id
        return (
          <div key={post.id} style={{ ...S.card, opacity: isHidden ? 0.45 : 1, borderColor: isFlagged ? 'rgba(255,96,96,0.3)' : 'rgba(255,255,255,0.06)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '6px', lineHeight: 1.4 }}>"{post.text?.slice(0, 120)}{(post.text?.length || 0) > 120 ? '…' : ''}"</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {post.knowledge?.song} · {post.knowledge?.artist} · {post.username || 'anon'} · {post.tier === 1 ? '⭐ Tier 1' : 'Tier 2'}
                  {isFlagged && <span style={{ color: '#ff6060', marginLeft: '8px' }}>⚑ {post.flagCount} flags</span>}
                </p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
                  {a.views || 0} views · {resonateCount} resonates · {post.emotion || 'no vibe'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => toggleExpandPost(post.id)} style={{ ...S.ghostBtn, fontSize: '0.55rem' }}>
                  {isExpanded ? 'Hide Backs' : 'Lyric Backs'}
                </button>
                <button onClick={() => toggleHide(post)} style={isHidden ? S.btn : S.dangerBtn}>
                  {isHidden ? 'Show' : 'Hide'}
                </button>
              </div>
            </div>
            {isExpanded && renderEchoPanel(post.id)}
          </div>
        )
      })}
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
      if (!auth?.currentUser) {
        if (!cancelled) {
          setError('Not signed in')
          setLoading(false)
        }
        return
      }
      setLoading(true)
      setError(null)
      try {
        const token = await auth.currentUser.getIdToken()
        const res = await fetch('/api/admin/catalog-songs', {
          headers: { Authorization: 'Bearer ' + token },
        })
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

// ── Featured Tab ──
function FeaturedTab() {
  const empty = { text: '', artist: '', song: '', username: '', reply: { text: '', artist: '', song: '', username: '' } }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!db) return
    get(ref(db, 'adminConfig/featuredLyric')).then(snap => {
      if (snap.exists()) {
        const val = snap.val()
        setForm({
          text: val.text || '',
          artist: val.artist || '',
          song: val.song || '',
          username: val.username || '',
          reply: {
            text: val.reply?.text || '',
            artist: val.reply?.artist || '',
            song: val.reply?.song || '',
            username: val.reply?.username || '',
          },
        })
      }
    })
  }, [])

  const setReply = (k: string, v: string) => setForm(f => ({ ...f, reply: { ...f.reply, [k]: v } }))

  const save = async () => {
    if (!db) return
    setSaving(true)
    await set(ref(db, 'adminConfig/featuredLyric'), form)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const canSave = form.text.trim() && form.reply.text.trim()

  return (
    <div style={{ maxWidth: '560px' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '24px', lineHeight: 1.6 }}>
        Appears on the landing page as "Exchange of the Week." Stays hidden until both the original lyric and the reply are filled in.
      </p>

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
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<'posts'|'catalog'|'featured'|'artists'|'reports'>('posts')

  useEffect(() => {
    if (!auth) { setAuthChecked(true); return }
    return onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u && db) {
        const snap = await get(ref(db, 'adminConfig/allowedUid'))
        setIsAdmin(snap.val() === u.uid)
      } else {
        setIsAdmin(false)
      }
      setAuthChecked(true)
    })
  }, [])

  if (!authChecked) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
    </div>
  )

  if (!user || !isAdmin) return <LoginForm onLogin={() => {}} />

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
          <button onClick={() => auth && signOut(auth)} style={S.ghostBtn}>Sign Out</button>
        </div>
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '28px' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={S.tab(tab === t.key)}>{t.label}</button>
          ))}
        </div>
        {tab === 'posts'    && <PostsTab />}
        {tab === 'catalog' && <CatalogSongsTab key="catalog" />}
        {tab === 'featured' && <FeaturedTab />}
        {tab === 'artists'  && <ArtistApplicationsTab />}
        {tab === 'reports'  && <PostReportsTab />}
      </div>
    </div>
  )
}