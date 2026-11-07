'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MemoryMediaPicker } from '@/components/memory-media-picker'
import { KeyboardSafeCtaBar, keyboardSafePrimaryBtnStyle } from '@/components/keyboard-safe-cta-bar'
import { ArrowLeftIcon } from '@/components/icons'
import type { MemoryPublic } from '@/lib/memory/types'
import type { MemoryDraftPhoto } from '@/lib/memory/client-media-upload'
import { validateMemoryTitle } from '@/lib/memory/title'
import { hasMemoryContent } from '@/lib/memory/validate-payload'
import { MemoryImproveWithAi, MemorySuggestTitles } from '@/components/memory-ai-field-actions'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { toast } from 'sonner'

const font = UI_FONT
const STORY_MAX = 500

function photosFromMemory(memory: MemoryPublic): MemoryDraftPhoto[] {
  return memory.photos.map((p, i) => {
    let r2Key = ''
    try {
      r2Key = new URL(p.url).pathname.replace(/^\//, '')
    } catch {
      /* keep empty */
    }
    return {
      position: i,
      r2Key,
      previewUrl: p.posterUrl || p.url,
      width: p.width,
      height: p.height,
      mediaType: p.mediaType,
      durationSec: p.durationSec ?? undefined,
    }
  })
}

export function MemoryEditFlow({
  memory,
  onClose,
}: {
  memory: MemoryPublic
  onClose?: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(memory.title)
  const [story, setStory] = useState(memory.story || '')
  const [photos, setPhotos] = useState<MemoryDraftPhoto[]>(() => photosFromMemory(memory))
  const [busy, setBusy] = useState(false)

  const titleErr = useMemo(() => validateMemoryTitle(title), [title])
  const canSave = useMemo(() => {
    if (titleErr) return false
    return hasMemoryContent({
      songs: memory.songs.map((s, i) => ({
        position: i,
        songId: s.songId,
        songTitle: s.songTitle,
        artistName: s.artistName,
        isLyricOnly: s.isLyricOnly,
      })),
      photos: photos.map((p, i) => ({ position: i, r2Key: p.r2Key })),
      story,
    })
  }, [titleErr, memory.songs, photos, story])

  const save = async () => {
    if (!canSave || busy) return
    setBusy(true)
    try {
      const metaRes = await fetch(`/api/memories/${memory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), story: story.trim() }),
      })
      if (!metaRes.ok) throw new Error('Could not save text')

      const mediaRes = await fetch(`/api/memories/${memory.id}/media`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photos.map((p, i) => ({
            position: i,
            r2Key: p.r2Key,
            width: p.width,
            height: p.height,
            mediaType: p.mediaType,
            durationSec: p.durationSec ?? null,
          })),
          coverR2Key: photos[0]?.r2Key ?? null,
        }),
      })
      if (!mediaRes.ok) throw new Error('Could not save media')

      toast.success('Memory updated')
      router.push(`/memory/${memory.id}`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="margo-memory-create margo-memory-create--desktop">
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={onClose ?? (() => router.back())} aria-label="Back" style={{ border: 'none', background: 'none', padding: 8, cursor: 'pointer' }}>
          <ArrowLeftIcon size={20} color="var(--text)" />
        </button>
        <h1 style={{ fontFamily: font, fontSize: TYPE.secondary, fontWeight: 600, margin: 0 }}>Edit memory</h1>
      </header>

      <MemoryMediaPicker draftOrMemoryId={memory.id} photos={photos} onChange={setPhotos} />

      <label style={{ fontFamily: font, fontSize: TYPE.label, fontWeight: 600, display: 'block', marginBottom: 8 }}>Story</label>
      <textarea
        value={story}
        onChange={(e) => setStory(e.target.value.slice(0, STORY_MAX))}
        rows={5}
        style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', padding: 12, fontFamily: font, fontSize: TYPE.secondary, lineHeight: 1.45, boxSizing: 'border-box' }}
      />
      <MemoryImproveWithAi field="story" text={story} onUseSuggestion={(s) => setStory(s.slice(0, STORY_MAX))} />

      <label style={{ fontFamily: font, fontSize: TYPE.secondary, fontWeight: 500, color: 'var(--gold)', display: 'block', margin: '20px 0 8px' }}>Title</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 80))}
        style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', padding: 12, fontFamily: font, fontSize: TYPE.secondary, boxSizing: 'border-box' }}
      />
      <MemoryImproveWithAi field="title" text={title} onUseSuggestion={(s) => setTitle(s.slice(0, 80))} />
      <MemorySuggestTitles
        story={story}
        songs={memory.songs.map((s) => `${s.songTitle} — ${s.artistName}`)}
        onPick={setTitle}
      />
      {titleErr ? <p style={{ color: 'var(--danger, #e57373)', fontSize: TYPE.meta, fontFamily: font }}>{titleErr}</p> : null}

      <KeyboardSafeCtaBar>
        <button type="button" style={{ ...keyboardSafePrimaryBtnStyle, opacity: canSave ? 1 : 0.45 }} disabled={!canSave || busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </KeyboardSafeCtaBar>
    </div>
  )
}
