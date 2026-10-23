'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '@/components/icons'
import { LyricBackPanelCompose, type LyricBackPanelPrefill } from '@/components/lyric-back-panel-compose'
import type { Echo } from '@/hooks/useEchoes'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import {
  MOMENT_VIBE_PICKER_OPTIONS,
  emotionToVibeLabel,
  vibeLabelToEmotion,
} from '@/lib/moment/vibe'

export type LyricBackEditLayerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  echo: Echo
  onSaved: (patch: LyricBackEditSavedPatch) => void
  onRequireAuth?: () => boolean
}

export type LyricBackEditSavedPatch = {
  lyric: string
  song: string
  artist: string
  emotion: string
  songId: string | null
  snippetStart: number | null
  snippetEnd: number | null
  artwork: string | null
  externalListenUrl: string | null
  audioUrl: string | null
}

function echoToPrefill(echo: Echo): LyricBackPanelPrefill {
  return {
    lyric: echo.lyric,
    songTitle: echo.song,
    artistName: echo.artist,
    songId: echo.songId ?? null,
    audioUrl: echo.audioUrl ?? null,
    externalListenUrl: echo.externalListenUrl ?? null,
    artwork: echo.artwork ?? null,
    startSec: echo.snippetStart ?? null,
    endSec: echo.snippetEnd ?? null,
  }
}

export function LyricBackEditLayer({
  open,
  onOpenChange,
  echo,
  onSaved,
  onRequireAuth,
}: LyricBackEditLayerProps) {
  const [mounted, setMounted] = useState(false)
  const { height, offsetTop, keyboardInset } = useVisualViewport({ publishCssVars: false })
  const offsetLeft =
    typeof window !== 'undefined' ? window.visualViewport?.offsetLeft ?? 0 : 0
  const width =
    typeof window !== 'undefined' ? window.visualViewport?.width ?? window.innerWidth : 390

  const initialLabel =
    emotionToVibeLabel(echo.emotion) ?? MOMENT_VIBE_PICKER_OPTIONS[0]
  const [vibeLabel, setVibeLabel] = useState(initialLabel)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    setVibeLabel(emotionToVibeLabel(echo.emotion) ?? MOMENT_VIBE_PICKER_OPTIONS[0])
  }, [open, echo.id, echo.emotion])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !mounted) return null

  const submitEmotion = vibeLabelToEmotion(vibeLabel) ?? echo.emotion

  return createPortal(
    <div
      className="margo-lb-edit-layer"
      role="presentation"
      style={{
        position: 'fixed',
        top: offsetTop,
        left: offsetLeft,
        width,
        height,
        zIndex: 245,
        boxSizing: 'border-box',
        background: 'var(--surface, #0F0E13)',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: keyboardInset,
      }}
    >
      <header className="margo-lb-edit-layer__header">
        <p className="margo-lb-edit-layer__title">Edit Lyric Back</p>
        <button
          type="button"
          className="margo-lb-edit-layer__close"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <CloseIcon size={16} color="var(--text-secondary)" />
        </button>
      </header>
      <div className="margo-lb-edit-layer__vibes" role="listbox" aria-label="Vibe">
        {MOMENT_VIBE_PICKER_OPTIONS.map((label) => {
          const selected = label === vibeLabel
          return (
            <button
              key={label}
              type="button"
              role="option"
              aria-selected={selected}
              className={`margo-lb-edit-layer__vibe${selected ? ' margo-lb-edit-layer__vibe--on' : ''}`}
              onClick={() => setVibeLabel(label)}
            >
              {label}
            </button>
          )
        })}
      </div>
      <div className="margo-lb-edit-layer__compose">
        <LyricBackPanelCompose
          key={echo.id}
          layout="panel"
          mode="edit"
          editPostId={echo.id}
          parentPostId={`edit-${echo.id}`}
          parentEmotion={submitEmotion}
          submitEmotion={submitEmotion}
          prefill={echoToPrefill(echo)}
          onRequireAuth={onRequireAuth}
          focusSearchOnMount={false}
          onSaved={(payload) => {
            onOpenChange(false)
            onSaved({
              lyric: payload.text,
              song: payload.songTitle,
              artist: payload.artistName,
              emotion: payload.emotion,
              songId: payload.songId,
              snippetStart: payload.snippetStartSec,
              snippetEnd: payload.snippetEndSec,
              artwork: payload.artworkUrl,
              externalListenUrl: payload.externalListenUrl,
              audioUrl: payload.audioUrl ?? null,
            })
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
