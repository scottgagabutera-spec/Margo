import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFeedMixSurface, resolveFeedMixSurface, stripFeedMixParams } from './feed-mix-nav.ts'

test('parse create pictures overlay', () => {
  const s = new URLSearchParams('create=media')
  assert.deepEqual(parseFeedMixSurface(s), { kind: 'create', entry: 'media', focusStory: false })
})

test('parse echoes person overlay', () => {
  const s = new URLSearchParams('echoesSet=set1&echoesPerson=p1')
  assert.deepEqual(parseFeedMixSurface(s), { kind: 'echoes-person', setId: 'set1', profileId: 'p1' })
})

test('memory query is not an overlay', () => {
  assert.equal(parseFeedMixSurface(new URLSearchParams('memory=abc')), null)
})

test('painted mix wins until URL catches up', () => {
  const url = parseFeedMixSurface(new URLSearchParams())
  const painted = { kind: 'echoes-set' as const, setId: 's1' }
  assert.deepEqual(resolveFeedMixSurface(url, painted), painted)
  assert.equal(resolveFeedMixSurface(painted, null), null)
  assert.equal(resolveFeedMixSurface(url, undefined), url)
})

test('strip mix params keeps tab', () => {
  const s = stripFeedMixParams(new URLSearchParams('tab=lyrics&create=memory&e2eFeedReturn=1'))
  assert.equal(s.get('create'), null)
  assert.equal(s.get('e2eFeedReturn'), '1')
})
