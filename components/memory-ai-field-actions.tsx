'use client'

import { useState } from 'react'
import { UI_FONT, TYPE } from '@/lib/fonts'

const font = UI_FONT

export function MemoryImproveWithAi({
  field,
  text,
  onUseSuggestion,
}: {
  field: 'story' | 'title'
  text: string
  onUseSuggestion: (next: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    setErr(null)
    setSuggestion(null)
    try {
      const res = await fetch('/api/memories/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not improve')
      setSuggestion((data as { suggestion?: string }).suggestion || null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not improve')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="margo-memory-ai-assist">
      <button
        type="button"
        className={`margo-memory-ai-assist__trigger${loading ? ' margo-memory-ai-assist__trigger--busy' : ''}`}
        onClick={() => void run()}
        disabled={!text.trim() || loading}
        style={{ fontFamily: font }}
      >
        {loading ? 'Improving…' : 'Improve with AI'}
      </button>
      {err ? (
        <p className="margo-memory-ai-assist__err" style={{ fontFamily: font, fontSize: TYPE.meta }}>
          {err}
        </p>
      ) : null}
      {suggestion ? (
        <div className="margo-memory-ai-assist__card" style={{ fontFamily: font }}>
          <p className="margo-memory-ai-assist__card-text">{suggestion}</p>
          <div className="margo-memory-ai-assist__card-actions">
            <button type="button" onClick={() => { onUseSuggestion(suggestion); setSuggestion(null) }}>
              Use this
            </button>
            <button type="button" onClick={() => void run()} disabled={loading}>
              Try again
            </button>
            <button type="button" onClick={() => setSuggestion(null)}>
              Keep mine
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function MemorySuggestTitles({
  story,
  songs,
  onPick,
}: {
  story: string
  songs: string[]
  onPick: (title: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [titles, setTitles] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)

  const run = async () => {
    if (loading) return
    setLoading(true)
    setErr(null)
    setTitles([])
    try {
      const res = await fetch('/api/memories/ai/suggest-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story, songs }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not suggest')
      setTitles((data as { titles?: string[] }).titles || [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not suggest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="margo-memory-ai-assist margo-memory-ai-assist--titles">
      <button
        type="button"
        className={`margo-memory-ai-assist__trigger${loading ? ' margo-memory-ai-assist__trigger--busy' : ''}`}
        onClick={() => void run()}
        disabled={loading}
        style={{ fontFamily: font }}
      >
        {loading ? 'Suggesting…' : 'Suggest a title'}
      </button>
      {err ? <p className="margo-memory-ai-assist__err" style={{ fontFamily: font, fontSize: TYPE.meta }}>{err}</p> : null}
      {titles.length > 0 ? (
        <div className="margo-memory-ai-title-chips">
          {titles.map((t) => (
            <button key={t} type="button" className="margo-memory-ai-title-chips__chip" onClick={() => onPick(t)} style={{ fontFamily: font }}>
              {t}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
