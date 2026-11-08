import test from 'node:test'
import assert from 'node:assert/strict'

test('travis query returns at least one itunes hit', async () => {
  const r = await fetch(
    'https://itunes.apple.com/search?term=Travis&entity=song&limit=12&version=2',
  )
  assert.ok(r.ok)
  const data = (await r.json()) as { resultCount?: number; results?: unknown[] }
  const count = data.resultCount ?? data.results?.length ?? 0
  console.log(`[travis-search] result count ${count}`)
  assert.ok(count > 0)
})
