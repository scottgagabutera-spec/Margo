'use client'

import { useEffect, useState } from 'react'
import { PendingNavLink } from '@/components/pending-nav-link'
import { ArtistBadge } from '@/components/artist-badge'
import { UI_FONT } from '@/lib/fonts'
import {
  fetchProfileFollowList,
  type FollowListKind,
  type FollowListPerson,
  type FollowListResult,
} from '@/lib/profile-follow-list'

const font = UI_FONT

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

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 20px) 20px var(--margo-page-padding-bottom)',
      }}>
        <h1 style={{
          fontFamily: font,
          fontSize: '1.15rem',
          fontWeight: 600,
          color: 'var(--text)',
          margin: '0 0 4px',
        }}>
          {title}
        </h1>
        {result?.ok && (
          <p style={{
            fontFamily: font,
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            margin: '0 0 20px',
          }}>
            @{result.username} · {result.total}
          </p>
        )}

        {loading && (
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Loading…
          </p>
        )}

        {!loading && result && !result.ok && result.error === 'not_found' && (
          <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            No one here by that name.
          </p>
        )}

        {!loading && result && !result.ok && result.error === 'private_profile' && (
          <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            This account is private.
          </p>
        )}

        {!loading && result && !result.ok && result.error === 'lists_private' && (
          <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            This person keeps their {kind} list private.
          </p>
        )}

        {!loading && result?.ok && result.items.length === 0 && (
          <p style={{ fontFamily: font, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        )}

        {!loading && result?.ok && result.items.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minHeight: 'var(--margo-touch-min)',
          padding: '8px 0',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <span style={{
          width: '44px',
          height: '44px',
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
              fontSize: '0.8rem',
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
            fontSize: '0.9rem',
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
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
          }}>
            @{person.username}
          </span>
        </span>
      </PendingNavLink>
    </li>
  )
}
