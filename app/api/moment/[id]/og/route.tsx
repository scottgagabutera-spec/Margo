import { ImageResponse } from 'next/og'
import { loadPublicMomentById } from '@/lib/moment/load'

export const runtime = 'nodejs'

const GOLD = '#E8C547'
const INK = '#07060A'
const INK_MUTED = 'rgba(7,6,10,0.62)'

function truncateLyric(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const loaded = await loadPublicMomentById(id)
  if (!loaded) {
    return new Response('Not found', { status: 404 })
  }

  const primary = loaded.moment.lines[0]
  const lyric = truncateLyric(primary?.lyric || 'A lyric moment', 140)
  const meta = [primary?.songTitle, primary?.artistName].filter(Boolean).join(' · ')
  const vibe = loaded.moment.vibeLabel

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: GOLD,
          padding: '56px 64px',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: INK,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '12px',
                borderTop: `3px solid ${GOLD}`,
                borderBottom: `3px solid ${GOLD}`,
              }}
            />
          </div>
          <span
            style={{
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: INK_MUTED,
            }}
          >
            Margo
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: lyric.length > 80 ? '52px' : '64px',
              fontStyle: 'italic',
              lineHeight: 1.2,
              color: INK,
              maxWidth: '1000px',
            }}
          >
            &ldquo;{lyric}&rdquo;
          </p>
          {meta ? (
            <p style={{ margin: 0, fontSize: '28px', color: INK_MUTED }}>{meta}</p>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {vibe ? (
            <span
              style={{
                fontSize: '20px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: INK_MUTED,
              }}
            >
              {vibe}
            </span>
          ) : (
            <span />
          )}
          <span style={{ fontSize: '22px', color: INK_MUTED }}>trymargo.com</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
