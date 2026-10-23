import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

type Check = { path: string; label: string; patterns: RegExp[] }

const READ_PATH_CHECKS: Check[] = [
  {
    path: 'hooks/useEchoes.ts',
    label: 'Lyric Back thread list (useEchoes)',
    patterns: [/content_removed_at/, /applyEchoContentRemoved/],
  },
  {
    path: 'hooks/usePost.ts',
    label: 'Single post + ancestor chain (usePost)',
    patterns: [/content_removed_at/, /applyPostContentRemoved/],
  },
  {
    path: 'hooks/useAuthorLyricBacks.ts',
    label: 'Profile Lyric Backs tab',
    patterns: [/content_removed_at/, /applyPostContentRemoved/],
  },
  {
    path: 'lib/primary-tab-prefetch.ts',
    label: 'Feed prefetch / warmFeedPosts',
    patterns: [/content_removed_at/, /applyPostContentRemoved/, /\.is\('content_removed_at', null\)/],
  },
  {
    path: 'lib/feed-replay-map.ts',
    label: 'Feed replay attribution targets',
    patterns: [/content_removed_at/, /applyPostContentRemoved/],
  },
  {
    path: 'lib/meilisearch/postgres-search.ts',
    label: 'Postgres search fallback (lyrics)',
    patterns: [/content_removed_at/, /\.is\('content_removed_at', null\)/],
  },
  {
    path: 'lib/meilisearch/sync.ts',
    label: 'Meilisearch webhook incremental sync',
    patterns: [/content_removed_at/],
  },
  {
    path: 'lib/meilisearch/documents.ts',
    label: 'Meilisearch postToLyricDoc',
    patterns: [/content_removed_at/, /if \(row\.content_removed_at\) return null/],
  },
  {
    path: 'hooks/useNotifications.tsx',
    label: 'Notifications (no post body in SELECT)',
    patterns: [/SELECT_COLUMNS/, /post_id/],
  },
  {
    path: 'components/lyric-back-thread-row.tsx',
    label: 'Shell row UI (no actions / placeholder)',
    patterns: [
      /margo-lb-thread-row--content-removed/,
      /margo-lb-thread-row__avatar--removed/,
      /Deleted/,
      /showOwnerMenu/,
      /PostFocusedDeleteDialog/,
    ],
  },
  {
    path: 'app/api/posts/lyric-back/route.ts',
    label: 'DELETE API → delete_or_shell_own_lyric_back RPC',
    patterns: [/delete_or_shell_own_lyric_back/],
  },
]

describe('content_removed read-path audit checklist', () => {
  for (const check of READ_PATH_CHECKS) {
    it(`${check.label} [read from code]`, () => {
      const src = fs.readFileSync(check.path, 'utf8')
      for (const p of check.patterns) {
        assert.match(src, p, `${check.path} missing ${p}`)
      }
    })
  }

  it('notifications do not select post lyric text [read from code]', () => {
    const src = fs.readFileSync('hooks/useNotifications.tsx', 'utf8')
    assert.doesNotMatch(src, /from\('posts'\)/)
    assert.doesNotMatch(src, /posts\.text/)
  })
})
