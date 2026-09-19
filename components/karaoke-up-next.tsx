'use client'

import Image from 'next/image'
import { CloseIcon, ReplayIcon } from '@/components/icons'
import { SongMeta } from '@/components/song-meta'
import { UI_FONT } from '@/lib/fonts'
import type { Song } from '@/hooks/useSongs'

export function KaraokeUpNextTray({
  songEnded,
  endedTitle,
  songs,
  onPlaySong,
  onLoop,
  onClose,
}: {
  songEnded: boolean
  endedTitle: string
  songs: Song[]
  onPlaySong: (song: Song) => void
  onLoop: () => void
  onClose: () => void
}) {
  return (
    <div
      className="margo-upnext-tray"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        borderTop: '1px solid var(--gold-border)',
        borderRadius: '24px 24px 0 0',
        padding: '16px 20px var(--margo-player-tray-padding-bottom)',
        animation: 'tray-rise 380ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
      }}
    >
      <div
        aria-hidden
        style={{
          width: '36px',
          height: '4px',
          borderRadius: '2px',
          background: 'var(--border-hi)',
          margin: '0 auto 16px',
        }}
      />

      {songEnded ? (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{
            fontFamily: UI_FONT,
            fontSize: '0.6rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            margin: '0 0 6px',
          }}>
            Song ended
          </p>
          <p style={{
            fontFamily: UI_FONT,
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text)',
            margin: 0,
          }}>
            {endedTitle}
          </p>
        </div>
      ) : (
        <p style={{
          fontFamily: UI_FONT,
          fontSize: '0.6rem',
          fontWeight: 700,
          color: 'var(--gold)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          margin: '0 0 14px',
        }}>
          Up Next
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
        {songs.length > 0 ? songs.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPlaySong(s)}
            className="margo-upnext-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              minHeight: '64px',
              padding: '8px 10px',
              border: 'none',
              borderRadius: '12px',
              background: i === 0 ? 'var(--gold-faint)' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              boxSizing: 'border-box',
            }}
          >
            <div style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--surface-2)',
            }}>
              {s.artwork ? (
                <Image src={s.artwork} alt="" fill sizes="48px" style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--gold-faint)' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {i === 0 ? (
                <p style={{
                  fontFamily: UI_FONT,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  margin: '0 0 2px',
                }}>
                  Next
                </p>
              ) : null}
              <SongMeta title={s.title} artist={s.artist} aiGenerated={!!s.isAiGenerated} />
            </div>
          </button>
        )) : (
          <p style={{
            fontFamily: UI_FONT,
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            padding: '12px 0',
            margin: 0,
          }}>
            No more songs in the catalog
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onLoop}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minHeight: '44px',
            padding: '0 20px',
            borderRadius: '50px',
            border: '1px solid var(--border-hi)',
            background: 'var(--surface-2)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontFamily: UI_FONT,
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          <ReplayIcon size={16} color="currentColor" />
          Loop
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minHeight: '44px',
            padding: '0 20px',
            borderRadius: '50px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: UI_FONT,
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          <CloseIcon size={16} color="currentColor" />
          Close
        </button>
      </div>

      {songEnded ? (
        <p style={{
          fontFamily: UI_FONT,
          fontSize: '0.6rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          margin: '12px 0 0',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Queue ended
        </p>
      ) : null}

      <style>{`
        @keyframes tray-rise { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .margo-upnext-row:active { background: var(--gold-faint); }
        @media (hover: hover) and (pointer: fine) {
          .margo-upnext-row:hover { background: var(--gold-faint); }
        }
      `}</style>
    </div>
  )
}
