'use client'

import { MargoSymbol } from '@/components/margo-symbol'
import { UI_FONT } from '@/lib/fonts'
import { stageCardLyricStyle, lyricLineOffset, stageCardMarkStyle } from '@/hooks/useStageCardLayout'
import type { ResolvedStageCardLayout } from '@/lib/moment-export/layout'
import type { StageCardTheme } from '@/lib/moment/stage-theme'

export function StageSocialCardLayers({
  layout,
  theme,
  lyricFallback,
  songTitle,
  artistName,
  artwork,
}: {
  layout: ResolvedStageCardLayout
  theme: StageCardTheme
  lyricFallback: string
  songTitle: string
  artistName: string
  artwork?: string | null
}) {
  const markVariant = theme.markVariant === 'on-light' ? 'ink' : 'gold'
  const lyricStyle = stageCardLyricStyle(layout)

  return (
    <>
      <div style={{ ...stageCardMarkStyle(layout), zIndex: 4 }}>
        <MargoSymbol size={layout.mark.symbolSize} variant={markVariant} />
      </div>
      <p
        style={{
          ...lyricStyle,
          position: 'absolute',
          left: layout.lyric.x,
          top: layout.lyric.y,
          width: layout.lyric.maxWidth,
          margin: 0,
          zIndex: 2,
        }}
      >
        {layout.lyric.lines.length > 0
          ? layout.lyric.lines.map((line, i) => (
              <span
                key={`${i}-${line.text}`}
                style={{ display: 'block', whiteSpace: 'pre', marginTop: lyricLineOffset(layout, i) }}
              >
                {line.text || '\u00a0'}
              </span>
            ))
          : lyricFallback}
      </p>
      {layout.meta && (songTitle || artistName) ? (
        <div style={{ position: 'absolute', left: layout.meta.x, top: layout.meta.y, zIndex: 2, maxWidth: layout.contentWidth }}>
          {layout.meta.song ? (
            <p style={{
              margin: 0,
              fontFamily: UI_FONT,
              fontSize: layout.meta.song.style.fontSize,
              fontWeight: layout.meta.song.style.fontWeight,
              color: layout.meta.song.style.color,
              lineHeight: layout.meta.song.style.lineHeight,
            }}>
              {layout.meta.song.text}
            </p>
          ) : null}
          {layout.meta.artist ? (
            <p style={{
              margin: layout.meta.song ? '3px 0 0' : 0,
              fontFamily: UI_FONT,
              fontSize: layout.meta.artist.style.fontSize,
              fontWeight: layout.meta.artist.style.fontWeight,
              color: layout.meta.artist.style.color,
              lineHeight: layout.meta.artist.style.lineHeight,
            }}>
              {layout.meta.artist.text}
            </p>
          ) : null}
        </div>
      ) : null}
      {artwork && layout.artwork ? (
        <img
          src={artwork}
          alt=""
          style={{
            position: 'absolute',
            left: layout.artwork.x,
            top: layout.artwork.y,
            width: layout.artwork.width,
            height: layout.artwork.height,
            borderRadius: layout.artwork.width * 0.18,
            objectFit: 'cover',
            zIndex: 2,
          }}
        />
      ) : null}
    </>
  )
}
