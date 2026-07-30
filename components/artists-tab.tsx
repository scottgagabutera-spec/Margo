'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue, update, push, serverTimestamp } from 'firebase/database'

interface ArtistProfile {
  displayName: string
  email: string
  status: 'active' | 'warned' | 'frozen' | 'removed'
  statusReason?: string
  agreedToRightsWarranty: boolean
  createdAt: number
}

const S: Record<string, any> = {
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
  input: {
    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    color: 'var(--text)', fontFamily: 'var(--font-lora), serif',
    fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
  },
}

const STATUS_COLOR: Record<string, string> = {
  active: 'rgba(255,255,255,0.35)',
  warned: '#ffc847',
  frozen: '#7B9FFF',
  removed: '#ff6060',
}

export function ArtistsTab() {
  const [artists, setArtists] = useState<(ArtistProfile & { uid: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'warned' | 'frozen' | 'removed' | 'all'>('all')
  const [actionTarget, setActionTarget] = useState<{ uid: string; type: 'warn' | 'freeze' | 'remove' } | null>(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!db) return
    const unsub = onValue(ref(db, 'artists'), snap => {
      const list: (ArtistProfile & { uid: string })[] = []
      snap.forEach(child => { list.push({ ...child.val(), uid: child.key as string }) })
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setArtists(list)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const notify = async (uid: string, type: string, message: string) => {
    if (!db) return
    await push(ref(db, `notifications/${uid}`), {
      type, message, timestamp: serverTimestamp(), read: false,
    })
  }

  const applyAction = async () => {
    if (!db || !actionTarget) return
    const { uid, type } = actionTarget
    if (type === 'warn') {
      await update(ref(db, `artists/${uid}`), { status: 'warned', statusReason: reason, statusUpdatedAt: serverTimestamp() })
      await notify(uid, 'admin_warning', reason)
    } else if (type === 'freeze') {
      await update(ref(db, `artists/${uid}`), { status: 'frozen', statusReason: reason, statusUpdatedAt: serverTimestamp() })
      await notify(uid, 'admin_freeze', reason)
    } else if (type === 'remove') {
      await update(ref(db, `artists/${uid}`), { status: 'removed', statusReason: reason, statusUpdatedAt: serverTimestamp() })
      await notify(uid, 'admin_removed', reason)
    }
    setActionTarget(null)
    setReason('')
  }

  const quickRestore = async (uid: string) => {
    if (!db) return
    await update(ref(db, `artists/${uid}`), { status: 'active', statusReason: null, statusUpdatedAt: serverTimestamp() })
    await notify(uid, 'admin_restored', 'Your account has been restored to good standing.')
  }

  const filtered = artists.filter(a => filter === 'all' ? true : a.status === filter)

  if (loading) {
    return <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px' }}>Loading…</p>
  }

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '20px', lineHeight: 1.6 }}>
        Artists get access immediately on signup. Use these tools to warn, freeze, or remove
        accounts as issues come up — this does not yet revoke their Firebase login itself,
        only their in-app standing. See note below.
      </p>

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
        <div key={artist.uid} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text)', marginBottom: '4px' }}>
                {artist.displayName}
              </p>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
                {artist.email}
              </p>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: STATUS_COLOR[artist.status], textTransform: 'uppercase', letterSpacing: '1px' }}>
                {artist.status}{artist.statusReason ? ` — ${artist.statusReason}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {artist.status !== 'removed' && (
                <button onClick={() => { setActionTarget({ uid: artist.uid, type: 'warn' }); setReason('') }} style={S.ghostBtn}>Warn</button>
              )}
              {artist.status === 'frozen'
                ? <button onClick={() => quickRestore(artist.uid)} style={S.btn}>Unfreeze</button>
                : artist.status !== 'removed' && (
                  <button onClick={() => { setActionTarget({ uid: artist.uid, type: 'freeze' }); setReason('') }} style={S.dangerBtn}>Freeze</button>
                )}
              {artist.status === 'removed'
                ? <button onClick={() => quickRestore(artist.uid)} style={S.btn}>Restore</button>
                : (
                  <button onClick={() => { setActionTarget({ uid: artist.uid, type: 'remove' }); setReason('') }} style={S.dangerBtn}>Remove</button>
                )}
            </div>
          </div>

          {actionTarget?.uid === artist.uid && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                Reason (shown to the artist)
              </label>
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