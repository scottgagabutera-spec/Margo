'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'
import {
  adaptiveTextColorOnBackground,
  adaptiveTextCssColor,
  adaptiveTitleCssOnPhotoScrim,
} from '@/lib/ui/adaptive-text-color'

const MIN_PX = 11
const MAX_PX = 15

export function MemoryTileTitle({
  text,
  variant,
  sampleBg,
  useLora = false,
}: {
  text: string
  variant: 'scrim' | 'words'
  sampleBg: string
  useLora?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(MAX_PX)
  const color =
    variant === 'scrim'
      ? adaptiveTitleCssOnPhotoScrim()
      : adaptiveTextCssColor(adaptiveTextColorOnBackground(sampleBg))

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const box = el.parentElement
    if (!box) return
    const maxH = box.clientHeight
    const maxW = box.clientWidth
    let size = MAX_PX
    for (; size >= MIN_PX; size--) {
      el.style.fontSize = `${size}px`
      if (el.scrollHeight <= maxH && el.scrollWidth <= maxW) break
    }
    setFontSize(size)
  }, [text])

  return (
    <span
      ref={ref}
      className="margo-memory-tile-title"
      style={{
        fontFamily: useLora ? LYRIC_FONT : UI_FONT,
        fontStyle: useLora ? 'italic' : 'normal',
        fontWeight: useLora ? 400 : 500,
        fontSize,
        color,
        lineHeight: 1.2,
      }}
    >
      {text}
    </span>
  )
}
