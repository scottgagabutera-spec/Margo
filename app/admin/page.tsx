'use client'
import { useState, useEffect, useRef } from 'react'
import { auth, db } from '@/lib/firebase'
import { getDatabase } from 'firebase/database'
import { app } from '@/lib/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { ref, onValue, update, remove, push, set, get } from 'firebase/database'

// ── Types ──
interface Post {
  id: string; text?: string; emotion?: string; status?: string
  knowledge?: { song?: string; artist?: string }
  username?: string; timestamp?: number; tier?: number; flagCount?: number
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

  const toggleHide = async (post: Post) => {
    if (!db) return
    const newStatus = post.status === 'hidden' ? 'active' : 'hidden'
    await update(ref(db, `posts/${post.id}`), { status: newStatus })
  }

  const filtered = posts.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (p.text || '').toLowerCase().includes(q) ||
      (p.knowledge?.song || '').toLowerCase().includes(q) ||
      (p.knowledge?.artist || '').toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q)
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
      {/* Posts */}
      {loading ? <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px' }}>Loading…</p> : filtered.map(post => {
        const a = analytics[post.id] || {}
        const resonateCount = Object.keys(a.resonates || {}).length
        const isHidden = post.status === 'hidden'
        const isFlagged = (post.flagCount || 0) > 0
        return (
          <div key={post.id} style={{ ...S.card, opacity: isHidden ? 0.45 : 1, borderColor: isFlagged ? 'rgba(255,96,96,0.3)' : 'rgba(255,255,255,0.06)' }}>
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
              <button onClick={() => toggleHide(post)} style={isHidden ? S.btn : S.dangerBtn}>
                {isHidden ? 'Show' : 'Hide'}
              </button>
            </div>
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
      // Whisper runs FIRST — nothing saved to Firebase until it succeeds
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
      // Only save to Firebase after Whisper succeeds
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
      
      {/* Core fields — always visible */}
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

      {/* Generate SRT button */}
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

      {/* Tag Vibes block */}
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

      {/* Streaming links — collapsed */}
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

      {/* Lyrics — collapsed unless SRT exists */}
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
          {songs.length} song{songs.length !== 1 ? 's' : ''} · Live instantly on /music
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
  const [form, setForm] = useState({ text: '', artist: '', song: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!db) return
    get(ref(db, 'adminConfig/featuredLyric')).then(snap => {
      if (snap.exists()) setForm(snap.val())
    })
  }, [])

  const save = async () => {
    if (!db) return
    setSaving(true)
    await set(ref(db, 'adminConfig/featuredLyric'), form)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '24px', lineHeight: 1.6 }}>
        The featured lyric appears on the landing page hero. Update it anytime.
      </p>
      <div style={{ marginBottom: '14px' }}>
        <label style={S.label}>Lyric</label>
        <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          rows={3} placeholder="Enter the lyric…"
          style={{ ...S.input, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: '20px' }}>
        <div>
          <label style={S.label}>Artist</label>
          <input value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
            placeholder="Artist name" style={S.input} />
        </div>
        <div>
          <label style={S.label}>Song</label>
          <input value={form.song} onChange={e => setForm(f => ({ ...f, song: e.target.value }))}
            placeholder="Song title" style={S.input} />
        </div>
      </div>
      <button onClick={save} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>
        {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Featured Lyric'}
      </button>
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
  const [tab, setTab] = useState<'posts'|'music'|'licensed'|'featured'|'pages'>('posts')

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
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>Margo</p>
            <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400 }}>Admin</h1>
          </div>
          <button onClick={() => auth && signOut(auth)} style={S.ghostBtn}>Sign Out</button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '28px' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={S.tab(tab === t.key)}>{t.label}</button>
          ))}
        </div>
        {/* Content */}
        {tab === 'posts'    && <PostsTab />}
        {tab === 'music' && <MusicTab key="music" />}
        {tab === 'licensed' && <LicensedTab />}
        {tab === 'featured' && <FeaturedTab />}
        {tab === 'pages'    && <PagesTab />}
      </div>
    </div>
  )
}
