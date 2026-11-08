import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFeedMixSurface, stripFeedMixParams } from './feed-mix-nav.ts'

test('parse create pictures overlay', () => {
  const s = new URLSearchParams('create=media')
  assert.deepEqual(parseFeedMixSurface(s), { kind: 'create', entry: 'media', focusStory: false })
})

test('parse echoes person overlay', () => {
  const s = new URLSearchParams('echoesSet=set1&echoesPerson=p1')
  assert.deepEqual(parseFeedMixSurface(s), { kind: 'echoes-person', setId: 'set1', profileId: 'p1' })
})

test('strip mix params keeps tab', () => {
  const s = stripFeedMixParams(new URLSearchParams('tab=lyrics&create=memory&e2eFeedReturn=1'))
  assert.equal(s.get('create'), null)
  assert.equal(s.get('e2eFeedReturn'), '1')
})
