'use client'

import { useEffect, useState } from 'react'
import { PendingNavLink } from '@/components/pending-nav-link'
import { ArtistBadge } from '@/components/artist-badge'
import { NotificationRowSkeletonList } from '@/components/margo-skeletons'
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'
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
  const hostName = result && 'displayName' in result
    ? (result.displayName || result.username || username)
    : username
  const hostHandle = result && 'username' in result && result.username
    ? result.username
    : username

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 16px) 20px var(--margo-page-padding-bottom)',
      }}>
        <p style={{
          fontFamily: font,
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '1.6px',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          margin: '0 0 8px',
        }}>
          {title}
        </p>
        <h1 style={{
          fontFamily: font,
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--text)',
          margin: '0 0 4px',
          lineHeight: 1.2,
        }}>
          {hostName}
        </h1>
        <p style={{
          fontFamily: font,
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          margin: '0 0 8px',
        }}>
          @{hostHandle}
        </p>
        {result?.ok && (
          <p style={{
            fontFamily: font,
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            margin: '0 0 20px',
          }}>
            {kind === 'followers'
              ? (result.total === 1 ? '1 person follows them' : `${result.total} people follow them`)
              : (result.total === 1 ? 'Following 1 person' : `Following ${result.total} people`)}
          </p>
        )}

        {loading && <NotificationRowSkeletonList count={5} />}

        {!loading && result && !result.ok && result.error === 'not_found' && (
          <p style={{ fontFamily: lyricFont, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            No one here by that name.
          </p>
        )}

        {!loading && result && !result.ok && result.error === 'private_profile' && (
          <p style={{ fontFamily: lyricFont, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            This account is private.
          </p>
        )}

        {!loading && result && !result.ok && result.error === 'lists_private' && (
          <p style={{ fontFamily: lyricFont, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            They keep this list private.
          </p>
        )}

        {!loading && result?.ok && result.items.length === 0 && (
          <p style={{
            fontFamily: lyricFont,
            fontStyle: 'italic',
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            marginTop: '12px',
          }}>
            {kind === 'followers' ? 'No one here yet.' : 'Not following anyone yet.'}
          </p>
        )}

        {!loading && result?.ok && result.items.length > 0 && (
          <ul style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            borderTop: '1px solid var(--border)',
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
        ringSize={24}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          minHeight: '64px',
          padding: '10px 4px',
          textDecoration: 'none',
          color: 'inherit',
          borderBottom: '1px solid var(--border)',
          borderRadius: 0,
        }}
      >
        <span style={{
          width: '48px',
          height: '48px',
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
              fontSize: '0.85rem',
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
            fontSize: '0.95rem',
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
            <ArtistBadge isArtist={person.isArtist} artistStatus={null} size={12} />
          </span>
          <span style={{
            display: 'block',
            fontFamily: font,
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            marginTop: '2px',
          }}>
            @{person.username}
          </span>
        </span>
      </PendingNavLink>
    </li>
  )
}
