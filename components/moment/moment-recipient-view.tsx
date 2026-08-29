'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useRef } from 'react'
import { ComposeLyricCard } from '@/components/compose-lyric-card'
import { MargoSymbol } from '@/components/margo-symbol'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { VibeTag } from '@/components/vibe-tag'
import { playSnippet } from '@/lib/audio-engine'
import { useSnippetPlaybackUi } from '@/hooks/useAudioEngine'
import { useIdentity } from '@/hooks/useIdentity'
import { trackEvent } from '@/lib/analytics/track'
import type { MargoMoment } from '@/lib/moment/types'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'
import { AtmosphereLayer } from '@/components/atmosphere-layer'

interface MomentRecipientViewProps {
  moment: MargoMoment
  senderLabel?: string | null
  artworkUrl?: string | null
}

export function MomentRecipientView({
  moment,
  senderLabel,
  artworkUrl,
}: MomentRecipientViewProps) {
  const { user } = useIdentity()
  const signedIn = !!user && !user.isAnonymous
  const openedRef = useRef(false)
  const primary = moment.lines[0]
  const listen = moment.listen
  const canPlay = listen?.canPlayInline ?? false
  const playbackKey = listen?.songId || listen?.audioUrl || ''
  const { playing, buffering } = useSnippetPlaybackUi(
    canPlay ? playbackKey : null,
    canPlay ? 0 : null,
  )

  const metaLine = primary
    ? [primary.songTitle, primary.artistName].filter(Boolean).join(' · ')
    : ''

  const handlePlay = useCallback(() => {
    if (!canPlay || !listen?.audioUrl || !listen.songId) return
    void playSnippet({
      audioUrl: listen.audioUrl,
      songId: listen.songId,
      title: primary?.songTitle || '',
      artist: primary?.artistName || '',
      artwork: artworkUrl || primary?.artworkUrl || null,
      lineIndex: 0,
      lineText: listen.lineLyric || primary?.lyric || '',
      startSec: listen.snippetStart!,
      endSec: listen.snippetEnd!,
      atmosphere: primary?.atmosphere ?? null,
      source: 'feed',
    })
  }, [canPlay, listen, primary, artworkUrl])

  useEffect(() => {
    if (openedRef.current) return
    openedRef.current = true
    trackEvent('moment_opened', { postId: moment.postId ?? null })
  }, [moment.postId])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: 'max(20px, env(safe-area-inset-top)) 20px calc(28px + env(safe-area-inset-bottom))',
        maxWidth: '480px',
        margin: '0 auto',
        boxSizing: 'border-box',
        position: 'relative',
        isolation: 'isolate',
        background: 'var(--bg)',
      }}
    >
      <AtmosphereLayer variant="card" active={playing} />
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MargoSymbol size={28} variant="gold" />
          <span
            style={{
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            Margo Moment
          </span>
        </div>
      </header>

      <p
        style={{
          fontFamily: UI_FONT,
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          margin: '0 0 20px',
          lineHeight: 1.45,
        }}
      >
        {senderLabel
          ? `${senderLabel} sent you a lyric`
          : 'Someone sent you a lyric'}
      </p>

      <ComposeLyricCard
        style={{
          borderRadius: '18px',
          padding: '24px 22px 20px',
          marginBottom: '20px',
        }}
      >
        <p
          style={{
            fontFamily: LYRIC_FONT,
            fontStyle: 'italic',
            fontSize: 'clamp(1.45rem, 5.2vw, 2rem)',
            color: 'var(--text-on-gold)',
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          {primary?.lyric}
        </p>

        {metaLine ? (
          <p
            style={{
              fontFamily: UI_FONT,
              fontSize: '0.78rem',
              color: 'var(--text-on-gold-muted, rgba(7,6,10,0.62))',
              margin: '14px 0 0',
            }}
          >
            {metaLine}
          </p>
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '18px',
            minHeight: 'var(--margo-touch-min)',
          }}
        >
          {canPlay ? (
            <button
              type="button"
              onClick={handlePlay}
              aria-label={playing ? 'Pause snippet' : 'Play snippet'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: 'var(--margo-touch-min)',
                padding: '0 14px 0 4px',
                borderRadius: '50px',
                border: '1px solid rgba(7,6,10,0.14)',
                background: 'rgba(7,6,10,0.08)',
                color: 'var(--text-on-gold)',
                fontFamily: UI_FONT,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(7,6,10,0.1)',
                }}
              >
                <PlayPauseIcon playing={playing} buffering={buffering} size={14} color="var(--text-on-gold)" />
              </span>
              Play
            </button>
          ) : listen?.externalUrl ? (
            <a
              href={listen.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: 'var(--margo-touch-min)',
                padding: '0 4px',
                textDecoration: 'none',
                fontFamily: UI_FONT,
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-on-gold)',
              }}
            >
              Listen ↗
            </a>
          ) : (
            <span />
          )}
          <MargoSymbol size={20} variant="ink" style={{ opacity: 0.32 }} />
        </div>

        {moment.vibeLabel ? (
          <div style={{ position: 'relative', height: '22px', marginTop: '14px' }}>
            <VibeTag label={moment.vibeLabel} color="var(--text-on-gold)" variant="on-gold" />
          </div>
        ) : null}
      </ComposeLyricCard>

      {artworkUrl ? (
        <div
          style={{
            borderRadius: '14px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            marginBottom: '24px',
            aspectRatio: '1',
            maxHeight: '220px',
            position: 'relative',
          }}
        >
          <Image
            src={artworkUrl}
            alt=""
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        </div>
      ) : null}

      {moment.lines.length > 1 ? (
        <div style={{ marginBottom: '24px' }}>
          {moment.lines.slice(1).map((line, index) => (
            <div
              key={index}
              style={{
                padding: '14px 0',
                borderTop: '1px solid var(--border)',
              }}
            >
              <p
                style={{
                  fontFamily: LYRIC_FONT,
                  fontStyle: 'italic',
                  fontSize: '1.05rem',
                  color: 'var(--text)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {line.lyric}
              </p>
              <p
                style={{
                  fontFamily: UI_FONT,
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  margin: '8px 0 0',
                }}
              >
                {[line.songTitle, line.artistName].filter(Boolean).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
        <Link
          href={signedIn ? '/compose' : '/'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 'var(--margo-touch-min)',
            borderRadius: '50px',
            background: 'var(--gold)',
            color: 'var(--text-on-gold, var(--bg))',
            fontFamily: UI_FONT,
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
            letterSpacing: '0.2px',
          }}
        >
          Send your own Moment
        </Link>
        <p
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            margin: '12px 0 0',
          }}
        >
          Pick a line. Send it to someone who&apos;ll feel it.
        </p>
      </div>
    </div>
  )
}
