'use client'
import { useState, useEffect, useRef } from 'react'
import { auth, db } from '@/lib/firebase'
import { getDatabase } from 'firebase/database'
import { app } from '@/lib/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { ref, onValue, update, remove, push, set, get, runTransaction } from 'firebase/database'
import { ArtistApplicationsTab } from '@/components/artist-applications-tab'
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

interface Song {
  id: string; title: string; artist: string; order?: number; status?: string
  audioUrl?: string; artwork?: string; youtubeUrl?: string; spotifyUrl?: string
  appleMusicUrl?: string; audiomackUrl?: string; soundcloudUrl?: string
  boomplayUrl?: string; srt?: string; lyrics?: string; description?: string
  comingSoonLabel?: string
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

  const loadEchoes = async (postId: string) => {
    if (!db) return
    const snap = await get(ref(db, `posts/${postId}/echoes`))
    if (!snap.exists()) return
    const list: Echo[] = []
    snap.forEach(child => { list.push({ ...child.val(), id: child.key }) })
    setEchoes(prev => ({ ...prev, [postId]: list }))
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
    if (!db) return
    const newStatus = echo.status === 'hidden' ? 'active' : 'hidden'
    const delta = newStatus === 'hidden' ? -1 : 1
    await update(ref(db, `posts/${postId}/echoes/${echo.id}`), { status: newStatus })
    // Keep postStats.echoCount accurate — only count active echoes
    runTransaction(ref(db, `postStats/${postId}/echoCount`), (cur) => Math.max(0, (cur || 0) + delta))
    setEchoes(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).map(e => e.id === echo.id ? { ...e, status: newStatus } : e)
    }))
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

      {/* Supabase Catalog (read-only) */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
          Supabase Catalog (read-only)
        </p>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '12px', lineHeight: 1.5 }}>
          Includes private posts for product insight — not shown on the public feed.
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
            return (
              <div key={post.id} style={{ ...S.card, opacity: isHidden ? 0.45 : 1, marginBottom: '10px' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text)', marginBottom: '6px', lineHeight: 1.4 }}>
                  &ldquo;{post.text.slice(0, 120)}{post.text.length > 120 ? '…' : ''}&rdquo;
                </p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                  {[post.song, post.artist, author].filter(Boolean).join(' · ')}
                </p>
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
              </div>
            )
          })
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

      {/* Posts */}
      {loading ? <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px' }}>Loading…</p> : filtered.map(post => {
        const a = analytics[post.id] || {}
        const resonateCount = Object.keys(a.resonates || {}).length
        const isHidden = post.status === 'hidden'
        const isFlagged = (post.flagCount || 0) > 0
        const postEchoes = echoes[post.id] || []
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
            {/* Echo dropdown */}
            {isExpanded && (
              <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                {postEchoes.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No lyric backs yet.</p>
                ) : (
                  <>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
                      {postEchoes.filter(e => e.status !== 'hidden').length} active · {postEchoes.filter(e => e.status === 'hidden').length} hidden
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {postEchoes.map(echo => {
                        const isEchoHidden = echo.status === 'hidden'
                        return (
                          <div key={echo.id} style={{
                            background: isEchoHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                            borderRadius: '12px', padding: '12px 14px',
                            border: `1px solid ${isEchoHidden ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
                            opacity: isEchoHidden ? 0.5 : 1,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px'
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '6px' }}>
                                "{echo.lyric}"
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
                              </div>
                            </div>
                            <button onClick={() => toggleHideEcho(post.id, echo)} style={{ ...isEchoHidden ? S.btn : S.dangerBtn, flexShrink: 0 }}>
                              {isEchoHidden ? 'Show' : 'Hide'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Song Form ──
function SongForm({ song, onSave, onCancel }: { song: Partial<Song> | null; onSave: () => void; onCancel: () => void }) {
  const empty: Partial<Song> = { title: '', artist: 'Trymargo', status: 'live', audioUrl: '', artwork: '', youtubeUrl: '', spotifyUrl: '', appleMusicUrl: '', audiomackUrl: '', soundcloudUrl: '', boomplayUrl: '', srt: '', lyrics: '', description: '', comingSoonLabel: '' }
  const [form, setForm] = useState<Partial<Song>>(song || empty)
  const [saving, setSaving] = useState(false)
  const [showStreaming, setShowStreaming] = useState(false)
  const [showLyrics, setShowLyrics] = useState(!!(song?.srt || song?.lyrics))
  const [generatingSRT, setGeneratingSRT] = useState(false)
  const [whisperLang, setWhisperLang] = useState('auto')
  const [lyricsHint, setLyricsHint] = useState('')
  const [srtStatus, setSrtStatus] = useState('')
  const [taggingVibes, setTaggingVibes] = useState(false)
  const [vibeStatus, setVibeStatus] = useState('')
  const set_ = (k: keyof Song, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!db || !form.title) return
    setSaving(true)
    const payload = { ...form }
    delete payload.id
    if (song?.id) {
      await update(ref(db, `songs/${song.id}`), payload)
    } else {
      const snap = await get(ref(db, 'songs'))
      const count = snap.exists() ? Object.keys(snap.val()).length : 0
      await push(ref(db, 'songs'), { ...payload, order: count, createdAt: Date.now() })
    }
    setSaving(false)
    onSave()
  }

  const generateSRT = async () => {
    if (!form.audioUrl) { setSrtStatus('Add an Audio URL first'); return }
    if (!form.title) { setSrtStatus('Add a Title first'); return }
    setGeneratingSRT(true)
    setSrtStatus('Reading audio with Whisper AI — ~30 seconds…')
    try {
      const res = await fetch('/api/whisper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: form.audioUrl, language: whisperLang === 'auto' ? undefined : whisperLang, prompt: lyricsHint.trim() || undefined }),
      })
      const data = await res.json()
      if (!data.srt) {
        setSrtStatus('✗ ' + (data.error || 'Failed — audio must be MP3 under 25MB'))
        return
      }
      setSrtStatus('Lyrics ready — saving song…')
      const payload = { ...form, srt: data.srt } as any
      delete payload.id
      if (db) {
        if (song?.id) {
          await update(ref(db, `songs/${song.id}`), payload)
        } else {
          const snap = await get(ref(db, 'songs'))
          const count = snap.exists() ? Object.keys(snap.val()).length : 0
          await push(ref(db, 'songs'), { ...payload, order: count, createdAt: Date.now() })
        }
        setSrtStatus('✓ Done — song live with synced lyrics')
        setTimeout(() => onSave(), 1000)
      }
    } catch (e: any) {
      setSrtStatus('✗ ' + e.message)
    } finally {
      setGeneratingSRT(false)
    }
  }

  const tagVibes = async () => {
    if (!form.srt) { setVibeStatus('Generate SRT first'); return }
    if (!form.title) { setVibeStatus('Add a title first'); return }
    if (!song?.id) { setVibeStatus('Save the song first, then tag vibes'); return }
    setTaggingVibes(true)
    setVibeStatus('AI tagging each lyric line — ~15 seconds…')
    try {
      const res = await fetch('/api/tag-vibes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srt: form.srt, songTitle: form.title, artist: form.artist || 'Trymargo' }),
      })
      const data = await res.json()
      if (!data.lines) { setVibeStatus('✗ ' + (data.error || 'Tagging failed')); return }
      const lineVibes: Record<string, string[]> = {}
      const vibeIndex: Record<string, Record<string, boolean>> = {}
      data.lines.forEach((l: any) => {
        if (l.vibes && l.vibes.length > 0) {
          lineVibes[String(l.id)] = l.vibes
          l.vibes.forEach((v: string) => {
            if (!vibeIndex[v]) vibeIndex[v] = {}
            vibeIndex[v][l.id] = true
          })
        }
      })
      const { ref: dbRef, update: dbUpdate, getDatabase } = await import('firebase/database')
      const { app: fbApp } = await import('@/lib/firebase')
      const db2 = getDatabase(fbApp ?? undefined)
      await dbUpdate(dbRef(db2, 'songs/' + song.id), { lineVibes })
      const indexUpdates: Record<string, boolean> = {}
      Object.entries(vibeIndex).forEach(([vibe, lineMap]) => {
        Object.keys(lineMap).forEach(lineId => {
          indexUpdates['vibeIndex/' + vibe + '/' + song.id + '_' + lineId] = true
        })
      })
      if (Object.keys(indexUpdates).length > 0) {
        await dbUpdate(dbRef(db2, '/'), indexUpdates)
      }
      const taggedCount = data.lines.filter((l: any) => l.vibes?.length > 0).length
      setVibeStatus('✓ ' + taggedCount + ' lines tagged across ' + Object.keys(vibeIndex).length + ' vibes')
    } catch (e) {
      setVibeStatus('✗ ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setTaggingVibes(false)
    }
  }

  const field = (label: string, key: keyof Song, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: '14px' }}>
      <label style={S.label}>{label}</label>
      <input type={type} value={(form[key] as string) || ''} onChange={e => set_(key, e.target.value)}
        placeholder={placeholder} style={S.input} />
    </div>
  )

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
      <h3 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--gold)', marginBottom: '20px' }}>{song?.id ? 'Edit Song' : 'Add Song'}</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {field('Title', 'title', 'text', 'Song title')}
        {field('Artist', 'artist', 'text', 'Artist name')}
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={S.label}>Status</label>
        <select value={form.status || 'live'} onChange={e => set_('status', e.target.value)}
          style={{ ...S.input, cursor: 'pointer' }}>
          <option value="live">Live</option>
          <option value="coming_soon">Coming Soon</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>
      {field('Audio URL (R2)', 'audioUrl', 'text', 'https://audio.trymargo.com/Margo/audio/filename.wav')}
      {field('Artwork URL', 'artwork', 'text', 'https://…')}

      <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.15)', borderRadius: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '12px' }}>
          <div><label style={S.label}>Language</label><select value={whisperLang} onChange={e => setWhisperLang(e.target.value)} style={{ ...S.input, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', colorScheme: 'dark' }}><option value="auto">Auto-detect</option><optgroup label="── African"><option value="zu">Zulu</option><option value="af">Afrikaans</option><option value="am">Amharic</option><option value="ha">Hausa</option><option value="ig">Igbo</option><option value="rw">Kinyarwanda</option><option value="mg">Malagasy</option><option value="sn">Shona</option><option value="so">Somali</option><option value="st">Sesotho</option><option value="sw">Swahili</option><option value="xh">Xhosa</option><option value="yo">Yoruba</option></optgroup><optgroup label="── Asian / Pacific"><option value="tl">Filipino / Tagalog</option><option value="zh">Chinese</option><option value="ja">Japanese</option><option value="ko">Korean</option><option value="hi">Hindi</option><option value="bn">Bengali</option><option value="id">Indonesian</option><option value="ms">Malay</option><option value="th">Thai</option><option value="vi">Vietnamese</option><option value="km">Khmer</option><option value="lo">Lao</option><option value="my">Burmese</option><option value="ne">Nepali</option><option value="si">Sinhala</option><option value="ta">Tamil</option><option value="te">Telugu</option><option value="ur">Urdu</option></optgroup><optgroup label="── European"><option value="en">English</option><option value="pt">Portuguese</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="it">Italian</option><option value="nl">Dutch</option><option value="pl">Polish</option><option value="ro">Romanian</option><option value="ru">Russian</option><option value="tr">Turkish</option><option value="uk">Ukrainian</option><option value="cs">Czech</option><option value="sk">Slovak</option><option value="hr">Croatian</option><option value="bg">Bulgarian</option><option value="el">Greek</option><option value="fi">Finnish</option><option value="hu">Hungarian</option><option value="no">Norwegian</option><option value="sv">Swedish</option><option value="da">Danish</option></optgroup><optgroup label="── Middle East / Central Asia"><option value="ar">Arabic</option><option value="he">Hebrew</option><option value="fa">Persian</option><option value="az">Azerbaijani</option><option value="kk">Kazakh</option><option value="uz">Uzbek</option></optgroup></select></div>
          <div><label style={S.label}>Key lyrics hint (optional)</label><input type="text" value={lyricsHint} onChange={e => setLyricsHint(e.target.value)} placeholder="Paste hook or chorus — helps Whisper get words right" style={S.input} /></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: srtStatus ? '10px' : '0' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'var(--text)', marginBottom: '2px' }}>AI Lyrics Sync</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>Whisper AI reads the audio and generates synced karaoke lyrics automatically</p>
          </div>
          <button
            onClick={generateSRT}
            disabled={generatingSRT || !form.audioUrl}
            style={{ ...S.btn, flexShrink: 0, marginLeft: '16px', opacity: (!form.audioUrl || generatingSRT) ? 0.5 : 1 }}
          >{generatingSRT ? 'Generating…' : '✦ Generate'}</button>
        </div>
        {srtStatus && <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: srtStatus.startsWith('✓') ? '#4ade80' : '#ff6060', margin: 0 }}>{srtStatus}</p>}
      </div>

      {(form.srt && song?.id) && (
        <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(232,197,71,0.03)', border: '1px solid rgba(232,197,71,0.1)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: vibeStatus ? '10px' : '0' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'var(--text)', marginBottom: '2px' }}>Vibe Tagging</p>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>AI tags each lyric line with vibes — powers the discovery board</p>
            </div>
            <button onClick={tagVibes} disabled={taggingVibes} style={{ ...S.btn, flexShrink: 0, marginLeft: '16px', opacity: taggingVibes ? 0.5 : 1 }}>
              {taggingVibes ? 'Tagging…' : '✦ Tag Vibes'}
            </button>
          </div>
          {vibeStatus && <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: vibeStatus.startsWith('✓') ? '#4ade80' : '#ff6060', margin: 0 }}>{vibeStatus}</p>}
        </div>
      )}

      <button onClick={() => setShowStreaming(s => !s)} style={{ ...S.ghostBtn, width: '100%', textAlign: 'left', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Streaming Links</span>
        <span>{showStreaming ? '▲' : '▼'}</span>
      </button>
      {showStreaming && (
        <div style={{ marginBottom: '12px' }}>
          {field('YouTube URL', 'youtubeUrl', 'text', 'https://youtube.com/…')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {field('Spotify URL', 'spotifyUrl')}
            {field('Apple Music URL', 'appleMusicUrl')}
            {field('Audiomack URL', 'audiomackUrl')}
            {field('SoundCloud URL', 'soundcloudUrl')}
            {field('Boomplay URL', 'boomplayUrl')}
            {field('Coming Soon Label', 'comingSoonLabel', 'text', 'e.g. Drop Q3 2025')}
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Description</label>
            <textarea value={form.description || ''} onChange={e => set_('description', e.target.value)}
              rows={2} placeholder="Short description shown on music page"
              style={{ ...S.input, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
        </div>
      )}

      <button onClick={() => setShowLyrics(s => !s)} style={{ ...S.ghostBtn, width: '100%', textAlign: 'left', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Lyrics {form.srt ? '✓' : ''}</span>
        <span>{showLyrics ? '▲' : '▼'}</span>
      </button>
      {showLyrics && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>SRT Lyrics (synced karaoke) — auto-generated above</label>
            <textarea value={form.srt || ''} onChange={e => set_('srt', e.target.value)}
              rows={8} placeholder="Generated automatically by Whisper AI, or paste manually"
              style={{ ...S.input, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.7rem', lineHeight: 1.6 }} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Plain Lyrics</label>
            <textarea value={form.lyrics || ''} onChange={e => set_('lyrics', e.target.value)}
              rows={4} style={{ ...S.input, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={save} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save Song'}</button>
        <button onClick={onCancel} style={S.ghostBtn}>Cancel</button>
      </div>
    </div>
  )
}

// ── Music Tab ──
function MusicTab() {
  const [songs, setSongs] = useState<Song[]>([])
  const [editingSong, setEditingSong] = useState<Partial<Song> | null | 'new'>(null)

  useEffect(() => {
    if (!app) return
    try {
      const database = getDatabase(app)
      const unsub = onValue(
        ref(database, 'songs'),
        snap => {
          const list: Song[] = []
          let i = 0
          try {
            snap.forEach(child => {
              i++
              list.push({ ...child.val(), id: child.key as string })
            })
          } catch(e) { console.error('[MusicTab] forEach error:', e) }
          setSongs(list.sort((a, b) => (a.order || 0) - (b.order || 0)))
        },
        err => console.error('[MusicTab] Firebase error:', err)
      )
      return () => unsub()
    } catch (err) {
      console.error('[MusicTab] Init error:', err)
    }
  }, [])

  const deleteSong = async (id: string) => {
    if (!db || !confirm('Delete this song? This cannot be undone.')) return
    await remove(ref(db, `songs/${id}`))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {songs.length} song{songs.length !== 1 ? 's' : ''} · Live instantly on /discover
        </p>
        <button onClick={() => setEditingSong('new')} style={S.btn}>+ Add Song</button>
      </div>
      {editingSong === 'new' && <SongForm song={null} onSave={() => setEditingSong(null)} onCancel={() => setEditingSong(null)} />}
      {songs.map((song, i) => (
        <div key={song.id || i}>
          {editingSong && typeof editingSong === 'object' && editingSong.id === song.id
            ? <SongForm song={song} onSave={() => setEditingSong(null)} onCancel={() => setEditingSong(null)} />
            : (
              <div style={{ ...S.card, opacity: song.status === 'hidden' ? 0.45 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text)', marginBottom: '2px' }}>{song.title}</p>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {song.artist} · {song.status || 'live'} {song.audioUrl ? '· 🎵 audio' : ''} {song.srt ? '· 📝 srt' : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditingSong(song)} style={S.ghostBtn}>Edit</button>
                    <button onClick={() => deleteSong(song.id)} style={S.dangerBtn}>Delete</button>
                  </div>
                </div>
              </div>
            )}
        </div>
      ))}
    </div>
  )
}

// ── Licensed Artists Tab ──
function LicensedTab() {
  const [artists, setArtists] = useState<string[]>([])
  const [newArtist, setNewArtist] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!db) return
    return onValue(ref(db, 'adminConfig/licensedArtists'), snap => {
      if (snap.exists()) {
        const data = snap.val()
        if (Array.isArray(data)) {
          setArtists(data.map(String).filter(Boolean))
        } else if (typeof data === 'string') {
          setArtists([data].filter(Boolean))
        } else if (typeof data === 'object' && data !== null) {
          setArtists(Object.values(data).map(String).filter(Boolean))
        }
      } else {
        setArtists(['trymargo'])
      }
    })
  }, [])

  const add = async () => {
    const name = newArtist.toLowerCase().trim()
    if (!name || artists.includes(name) || !db) return
    setSaving(true)
    const updated = [...artists, name]
    await set(ref(db, 'adminConfig/licensedArtists'), updated)
    setNewArtist('')
    setSaving(false)
  }

  const remove_ = async (name: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!db) return
    const updated = artists.filter(a => a !== name)
    await set(ref(db, 'adminConfig/licensedArtists'), updated)
  }

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '24px', lineHeight: 1.6 }}>
        Artists listed here get Tier 1 treatment — gold border, Margo Original badge, inline karaoke player on the feed.
      </p>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <input value={newArtist} onChange={e => setNewArtist(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Artist name (lowercase)" style={{ ...S.input, flex: 1 }} />
        <button onClick={add} disabled={saving} style={S.btn}>Add</button>
      </div>
      {artists.map(name => (
        <div key={name} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', color: 'var(--text)' }}>{name}</p>
          <button onClick={(e) => remove_(name, e)} onMouseDown={e => e.stopPropagation()} style={S.dangerBtn}>Remove</button>
        </div>
      ))}
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

// ── Pages Tab ──
function PagesTab() {
  const pages = ['about', 'privacy', 'terms', 'contact']
  const [activePage, setActivePage] = useState('about')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!db) return
    get(ref(db, `pages/${activePage}`)).then(snap => {
      setContent(snap.exists() ? (snap.val().content || '') : '')
    })
  }, [activePage])

  const save = async () => {
    if (!db) return
    setSaving(true)
    await set(ref(db, `pages/${activePage}`), { content, updatedAt: Date.now() })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0' }}>
        {pages.map(p => (
          <button key={p} onClick={() => setActivePage(p)} style={S.tab(activePage === p)}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)}
        rows={16} placeholder={`Enter ${activePage} page content…`}
        style={{ ...S.input, resize: 'vertical', lineHeight: 1.7, marginBottom: '16px', fontFamily: 'monospace', fontSize: '0.8rem' }} />
      <button onClick={save} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>
        {saved ? 'Saved ✓' : saving ? 'Saving…' : `Save ${activePage.charAt(0).toUpperCase() + activePage.slice(1)}`}
      </button>
    </div>
  )
}

// ── Main Admin Page ──
export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<'posts'|'music'|'licensed'|'featured'|'pages'|'artists'>('posts')

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
    { key: 'music', label: 'Music' },
    { key: 'licensed', label: 'Licensed Artists' },
    { key: 'featured', label: 'Featured' },
    { key: 'pages', label: 'Pages' },
    { key: 'artists', label: 'Artists' },
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
        {tab === 'music' && <MusicTab key="music" />}
        {tab === 'licensed' && <LicensedTab />}
        {tab === 'featured' && <FeaturedTab />}
        {tab === 'pages'    && <PagesTab />}
        {tab === 'artists'  && <ArtistApplicationsTab />}
      </div>
    </div>
  )
}