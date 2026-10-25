import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  HUB_TILE_CONFIG,
  hubSignedOutLockedTileIds,
  hubTileBadgeLabel,
  hubTileOrderIds,
  resolveHubTiles,
} from './tiles.ts'

describe('hub tiles config', () => {
  it('orders Stage, Messages, Notifications, Music Library', () => {
    const tiles = resolveHubTiles({ signedIn: true, isArtist: true, unread: {} })
    assert.deepEqual(hubTileOrderIds(tiles), [
      'stage',
      'messages',
      'notifications',
      'library',
    ])
  })

  it('locks account tiles when signed out', () => {
    const tiles = resolveHubTiles({ signedIn: false, isArtist: false, unread: {} })
    assert.deepEqual(hubSignedOutLockedTileIds(tiles).sort(), [
      'library',
      'messages',
      'notifications',
    ])
    const stage = tiles.find((t) => t.id === 'stage')
    assert.ok(stage)
    assert.equal(stage!.locked, false)
    assert.equal(stage!.dimmed, false)
  })

  it('omits unshipped artist tiles', () => {
    const shipped = HUB_TILE_CONFIG.filter((t) => t.ship).map((t) => t.id)
    assert.ok(!shipped.includes('studio'))
    assert.ok(!shipped.includes('promote'))
  })

  it('caps badge labels at 99+', () => {
    assert.equal(hubTileBadgeLabel(0), '')
    assert.equal(hubTileBadgeLabel(3), '3')
    assert.equal(hubTileBadgeLabel(99), '99')
    assert.equal(hubTileBadgeLabel(100), '99+')
  })

  it('shows artist-only tiles only when isArtist once shipped', () => {
    const artistTiles = resolveHubTiles({ signedIn: true, isArtist: true, unread: {} })
    const listenerTiles = resolveHubTiles({ signedIn: true, isArtist: false, unread: {} })
    assert.equal(artistTiles.length, listenerTiles.length)
  })
})
