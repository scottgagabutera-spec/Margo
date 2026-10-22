import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { collectScrollAncestors, panelBox } from './lyric-back-scroll-metrics.ts'

describe('lyric back scroll metrics helpers', () => {
  it('collectScrollAncestors records scrollLeft and scrollTop', () => {
    const parent = {
      scrollLeft: 12,
      scrollTop: 0,
      tagName: 'DIV',
      className: 'pane',
      parentElement: null,
    } as unknown as HTMLElement
    const child = {
      scrollLeft: 0,
      scrollTop: 44,
      tagName: 'DIV',
      className: 'margo-lb-focus__scroll',
      parentElement: parent,
    } as unknown as HTMLElement

    const snaps = collectScrollAncestors(child)
    assert.ok(snaps.some((s) => s.scrollTop === 44 && s.className.includes('scroll')))
    assert.ok(snaps.some((s) => s.scrollLeft === 12))
  })

  it('panelBox rounds bounding rect', () => {
    const el = {
      getBoundingClientRect: () => ({
        left: 10.4,
        top: 120.6,
        width: 359.2,
        height: 400.8,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement
    assert.deepEqual(panelBox(el), { left: 10, top: 121, width: 359, height: 401 })
  })
})
