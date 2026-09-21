'use client'

import { useEffect, useState } from 'react'
import { PendingNavLink } from '@/components/pending-nav-link'
import { ArtistBadge } from '@/components/artist-badge'
import { NotificationRowSkeletonList } from '@/components/margo-skeletons'
import { TYPE, UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import {
  fetchProfileFollowList,
  type FollowListKind,
  type FollowListPerson,
  type FollowListResult,
} from '@/lib/profile-follow-list'

const font = UI_FONT
const lyricFont = LYRIC_FONT

export function ProfileFollowListPage({
  username,
  kind,
}: {
  username: string
  kind: FollowListKind
}) {
  const [result, setResult] = useState<FollowListResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    void fetchProfileFollowList(username, kind).then((next) => {
      if (!active) return
      setResult(next)
      setLoading(false)
    })
    return () => { active = false }
  }, [username, kind])

  const title = kind === 'followers' ? 'Followers' : 'Following'
  const hostHandle = result && 'username' in result && result.username
    ? result.username
    : username

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 8px) 20px var(--margo-page-padding-bottom)',
      }}>
        <p style={{
          fontFamily: font,
          fontSize: TYPE.label,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          margin: '0 0 12px',
        }}>
          {title}
          <span style={{
            fontWeight: 400,
            letterSpacing: 0,
            textTransform: 'none',
            color: 'var(--text-secondary)',
            marginLeft: '8px',
          }}>
            @{hostHandle}
          </span>
        </p>

        {loading && <NotificationRowSkeletonList count={5} />}

        {!loading && result && !result.ok && result.error === 'not_found' && (
          <p style={{ fontFamily: lyricFont, fontStyle: 'italic', fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>
            No one here by that name.
          </p>
        )}

        {!loading && result && !result.ok && result.error === 'private_profile' && (
          <p style={{ fontFamily: lyricFont, fontStyle: 'italic', fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>
            This account is private.
          </p>
        )}

        {!loading && result && !result.ok && result.error === 'lists_private' && (
          <p style={{ fontFamily: lyricFont, fontStyle: 'italic', fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>
            They keep this list private.
          </p>
        )}

        {!loading && result?.ok && result.items.length === 0 && (
          <p style={{
            fontFamily: lyricFont,
            fontStyle: 'italic',
            fontSize: TYPE.secondary,
            color: 'var(--text-secondary)',
          }}>
            {kind === 'followers' ? 'No one here yet.' : 'Not following anyone yet.'}
          </p>
        )}

        {!loading && result?.ok && result.items.length > 0 && (
          <ul style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}>
            {result.items.map((person) => (
              <FollowRow key={person.id} person={person} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

function FollowRow({ person }: { person: FollowListPerson }) {
  const name = person.displayName || person.username
  return (
    <li>
      <PendingNavLink
        href={`/profile/${person.username}`}
        indicator="overlay"
        ringSize={22}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minHeight: '52px',
          padding: '6px 0',
          textDecoration: 'none',
          color: 'inherit',
          borderBottom: '1px solid var(--border)',
          borderRadius: 0,
        }}
      >
        <span style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          background: person.avatarUrl
            ? 'none'
            : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {person.avatarUrl ? (
            <img
              src={person.avatarUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{
              fontFamily: font,
              fontSize: TYPE.label,
              fontWeight: 700,
              color: 'var(--bg)',
            }}>
              {name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: font,
            fontSize: TYPE.secondary,
            fontWeight: 600,
            color: 'var(--text)',
          }}>
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {name}
            </span>
            <ArtistBadge isArtist={person.isArtist} artistStatus={null} size={11} />
          </span>
          <span style={{
            display: 'block',
            fontFamily: font,
            fontSize: TYPE.meta,
            color: 'var(--text-secondary)',
            marginTop: '1px',
          }}>
            @{person.username}
          </span>
        </span>
      </PendingNavLink>
    </li>
  )
}
