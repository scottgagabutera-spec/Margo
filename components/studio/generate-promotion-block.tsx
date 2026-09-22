'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

type GenerateMode = 'auto' | 'directive' | 'manual'
type MomentCount = 1 | 2 | 3

interface GeneratePromotionBlockProps {
  songId: string
  songTitle: string
  artistName: string
  audioUrl?: string | null
  artworkUrl?: string | null
  lineCount: number
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: font,
  fontSize: '0.6rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  color: 'var(--text)',
  fontFamily: font,
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
  minHeight: '44px',
}

function modeButtonStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    minHeight: '44px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: `1px solid ${active ? 'var(--gold-border)' : 'var(--border)'}`,
    background: active ? 'var(--gold-faint)' : 'var(--surface-2)',
    color: active ? 'var(--gold)' : 'var(--text-2)',
    fontFamily: font,
    fontSize: '0.75rem',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  }
}

function countButtonStyle(active: boolean): React.CSSProperties {
  return {
    minWidth: '44px',
    minHeight: '44px',
    borderRadius: '10px',
    border: `1px solid ${active ? 'var(--gold-border)' : 'var(--border)'}`,
    background: active ? 'var(--gold-faint)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--text-2)',
    fontFamily: font,
    fontSize: '0.9rem',
    cursor: 'pointer',
  }
}

function buildManualComposeUrl(params: GeneratePromotionBlockProps): string {
  const q = new URLSearchParams({
    songId: params.songId,
    phase: 'picker',
    source: 'studio-promote',
  })
  if (params.songTitle) q.set('song', params.songTitle)
  if (params.artistName) q.set('artist', params.artistName)
  if (params.audioUrl) q.set('audioUrl', params.audioUrl)
  if (params.artworkUrl) q.set('artwork', params.artworkUrl)
  return `/compose?${q.toString()}`
}

export function GeneratePromotionBlock(props: GeneratePromotionBlockProps) {
  const [count, setCount] = useState<MomentCount>(1)
  const [mode, setMode] = useState<GenerateMode>('auto')
  const [directive, setDirective] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (mode === 'manual') return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const body: Record<string, unknown> = {
        songId: props.songId,
        mode: mode === 'directive' ? 'directive' : 'auto',
      }
      if (mode === 'directive') {
        body.count = count
        body.directive = directive.trim()
      }

      const res = await fetch('/api/promote/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Generation failed')
        return
      }
      const n = json.returnedCount ?? json.count ?? json.queueIds?.length ?? 0
      if (mode === 'auto') {
        setSuccess(`${n} Moment${n === 1 ? '' : 's'} queued for review.`)
      } else {
        const requested = json.requestedCount ?? count
        const partial = n < requested
        setSuccess(
          partial
            ? `${n} of ${requested} Moments queued for review (fewer non-overlapping lines remain).`
            : `${n} Moment${n === 1 ? '' : 's'} queued for review.`,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      marginBottom: '20px',
      padding: '16px',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
    }}>
      <div style={{ marginBottom: '12px' }}>
        <p style={{
          fontFamily: font,
          fontSize: '0.65rem',
          color: 'var(--gold)',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          margin: '0 0 4px',
        }}>
          Auto-Promote
        </p>
        <h3 style={{
          fontFamily: font,
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text)',
          margin: 0,
        }}>
          Generate Promotion
        </h3>
        <p style={{
          fontFamily: font,
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          margin: '8px 0 0',
          lineHeight: 1.5,
        }}>
          {mode === 'auto'
            ? 'Auto scans the whole song and queues every strong shareable moment it finds (1–3 lines each).'
            : 'AI picks quotable lyric windows and queues Shorts for your review on all connected platforms — nothing posts to the Feed.'}
        </p>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>Mode</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setMode('auto')}
            disabled={busy}
            style={modeButtonStyle(mode === 'auto')}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => setMode('directive')}
            disabled={busy}
            style={modeButtonStyle(mode === 'directive')}
          >
            Directive
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            disabled={busy}
            style={modeButtonStyle(mode === 'manual')}
          >
            Manual
          </button>
        </div>
      </div>

      {mode === 'directive' && (
        <>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Moments</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([1, 2, 3] as MomentCount[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  disabled={busy}
                  style={countButtonStyle(count === n)}
                  aria-pressed={count === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>What should we look for?</label>
            <textarea
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              rows={3}
              placeholder="e.g. hopeful lines about leaving home, or the pre-chorus hook"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              disabled={busy}
            />
          </div>
        </>
      )}

      {mode === 'manual' ? (
        <Link
          href={buildManualComposeUrl(props)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: 'var(--gold)',
            color: 'var(--bg)',
            fontFamily: font,
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Open Compose line picker
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={busy || (mode === 'directive' && !directive.trim())}
          style={{
            minHeight: '44px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: busy ? 'var(--surface-3)' : 'var(--gold)',
            color: busy ? 'var(--text-muted)' : 'var(--bg)',
            fontFamily: font,
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Generating…' : 'Generate'}
        </button>
      )}

      {error && (
        <p style={{
          fontFamily: font,
          fontSize: '0.8rem',
          color: 'var(--danger, #ff6060)',
          margin: '12px 0 0',
          lineHeight: 1.5,
        }}>
          {error}
        </p>
      )}

      {success && (
        <p style={{
          fontFamily: font,
          fontSize: '0.8rem',
          color: 'var(--text-2)',
          margin: '12px 0 0',
          lineHeight: 1.5,
        }}>
          {success}{' '}
          <Link href="/studio/promote" style={{ color: 'var(--gold)' }}>
            Review queue →
          </Link>
        </p>
      )}

      <p style={{
        fontFamily: font,
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        margin: '12px 0 0',
        lineHeight: 1.5,
      }}>
        {props.lineCount} lyric line{props.lineCount === 1 ? '' : 's'} · Generated rows always land as pending review
      </p>
    </div>
  )
}
