'use client'

import type { CSSProperties, RefObject } from 'react'
import { composeLyricTextStyle } from '@/components/compose-lyric-card'
import { LYRIC_FONT } from '@/lib/fonts'

export type CatalogPickLyricFieldProps = {
  value: string
  catalogPickOnly: boolean
  onOpenPicker: () => void
  onValueChange: (next: string) => void
  maxLength?: number
  rows?: number
  /** Matches Lyric Back panel compose (`panel`) vs gold compose card (`gold`). */
  variant?: 'panel' | 'compose' | 'signature'
  className?: string
  style?: CSSProperties
  textareaRef?: RefObject<HTMLTextAreaElement | null>
}

/**
 * Shared catalog line field — same interaction as Lyric Back panel compose
 * (`catalogLinePickOnly` in lyric-back-panel-compose.tsx): read-only for Margo
 * catalog songs; tap/focus reopens the line picker; typing only when off-catalog.
 */
export function CatalogPickLyricField({
  value,
  catalogPickOnly,
  onOpenPicker,
  onValueChange,
  maxLength = 140,
  rows = 2,
  variant = 'compose',
  className,
  style,
  textareaRef,
}: CatalogPickLyricFieldProps) {
  const isPanel = variant === 'panel'
  const isGold = variant === 'compose'
  const isSignature = variant === 'signature'

  const wrapperClass = [
    isPanel ? 'margo-post-card__lb-compose-lyric margo-post-card__lb-compose-lyric--panel' : '',
    catalogPickOnly ? 'margo-post-card__lb-compose-lyric--catalog-pick' : '',
    isSignature ? 'margo-catalog-pick-lyric--signature' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  const inputClass = [
    isPanel
      ? 'margo-post-card__lb-compose-input margo-post-card__lb-compose-input--panel'
      : 'margo-catalog-pick-lyric__input',
    catalogPickOnly ? 'margo-post-card__lb-compose-input--catalog-pick' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inlineStyle: CSSProperties = isGold
    ? {
        ...composeLyricTextStyle,
        flex: 1,
        width: '100%',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        resize: 'none',
        overflowY: 'auto',
        boxSizing: 'border-box',
        minHeight: 'var(--margo-touch-min)',
        ...style,
      }
    : isSignature
      ? {
          width: '100%',
          minHeight: 'var(--margo-touch-min)',
          padding: '14px 16px',
          resize: 'none',
          fontFamily: LYRIC_FONT,
          fontStyle: 'italic',
          fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
          color: 'var(--gold)',
          lineHeight: 1.5,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxSizing: 'border-box',
          outline: 'none',
          ...style,
        }
      : {
          minHeight: 'var(--margo-touch-min)',
          ...style,
        }

  const field = (
    <textarea
      ref={textareaRef}
      className={inputClass}
      value={value}
      rows={rows}
      onChange={(e) => {
        if (catalogPickOnly) return
        onValueChange(e.target.value.slice(0, maxLength))
      }}
      onFocus={(e) => {
        if (!catalogPickOnly) return
        e.preventDefault()
        onOpenPicker()
        e.currentTarget.blur()
      }}
      onClick={() => {
        if (catalogPickOnly) onOpenPicker()
      }}
      readOnly={catalogPickOnly}
      aria-readonly={catalogPickOnly || undefined}
      placeholder={
        catalogPickOnly ? 'Choose a line from the song…' : 'Write your line…'
      }
      aria-label={
        catalogPickOnly
          ? 'Selected catalog line. Tap to choose another line.'
          : 'Lyric line'
      }
      style={inlineStyle}
    />
  )

  if (isGold) {
    return (
      <div
        className={wrapperClass || undefined}
        style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {field}
      </div>
    )
  }

  if (wrapperClass) {
    return <div className={wrapperClass}>{field}</div>
  }

  return field
}
