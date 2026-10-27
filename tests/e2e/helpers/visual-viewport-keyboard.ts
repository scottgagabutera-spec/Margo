import type { Page } from '@playwright/test'

export type KeyboardEmulationMode = 'resizes-visual' | 'resizes-content'

/** Mock visualViewport keyboard without shrinking layout viewport (resizes-visual). */
export async function installVisualViewportKeyboardMock(
  page: Page,
  mode: KeyboardEmulationMode,
  keyboardHeightPx: number,
) {
  await page.addInitScript(({ mode, keyboardHeightPx }) => {
    const w = window as Window & {
      __margoVvMock?: { open: boolean; fullH: number; keyboardH: number; mode: string }
    }
    w.__margoVvMock = { open: false, fullH: window.innerHeight, keyboardH: keyboardHeightPx, mode }

    const vv = window.visualViewport
    if (!vv) return

    const dispatch = () => {
      vv.dispatchEvent(new Event('resize'))
      vv.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('resize'))
    }

    const apply = () => {
      const mock = w.__margoVvMock
      if (!mock) return
      const open = mock.open
      const full = mock.fullH
      const kb = mock.keyboardH
      const visualH = open ? full - kb : full
      if (mock.mode === 'resizes-content' && open) {
        Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => visualH })
      }
      Object.defineProperty(vv, 'height', { configurable: true, get: () => visualH })
      Object.defineProperty(vv, 'offsetTop', { configurable: true, get: () => 0 })
      dispatch()
    }

    document.addEventListener(
      'focusin',
      (e) => {
        const t = e.target
        if (!(t instanceof HTMLElement)) return
        if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable) {
          if (w.__margoVvMock) w.__margoVvMock.open = true
          apply()
        }
      },
      true,
    )
    document.addEventListener(
      'focusout',
      () => {
        window.setTimeout(() => {
          const a = document.activeElement
          const still =
            a instanceof HTMLElement
            && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.isContentEditable)
          if (!still && w.__margoVvMock) {
            w.__margoVvMock.open = false
            apply()
          }
        }, 50)
      },
      true,
    )

    apply()
  }, { mode, keyboardHeightPx })
}

export async function assertTappableInBand(
  page: Page,
  selector: string,
  headerBottom: number,
  visibleBottom: number,
) {
  const hit = await page.evaluate(({ selector, headerBottom, visibleBottom }) => {
    const el = selector.includes(':nth')
      ? document.querySelectorAll(selector.split(':nth')[0])[Number(selector.match(/nth-of-type\((\d+)\)/)?.[1] ?? 1) - 1]
      : document.querySelector(selector)
    if (!el) return { ok: false, reason: 'missing' }
    const rect = el.getBoundingClientRect()
    if (rect.top < headerBottom - 1 || rect.bottom > visibleBottom + 1) {
      return { ok: false, reason: 'bbox', rect: { top: rect.top, bottom: rect.bottom } }
    }
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const topEl = document.elementFromPoint(cx, cy)
    const hit = topEl === el || (topEl instanceof Node && el.contains(topEl))
    return { ok: hit, reason: hit ? 'ok' : 'covered', topTag: topEl instanceof Element ? topEl.tagName : null }
  }, { selector, headerBottom, visibleBottom })
  return hit
}

export async function measureHeaderBottom(page: Page): Promise<number> {
  return page.evaluate(() => {
    const landing = document.querySelector('.margo-landing-nav')
    const app = document.querySelector('.margo-nav-bar')
    const el = (landing && landing.getBoundingClientRect().height > 0 ? landing : app) as Element | null
    return el?.getBoundingClientRect().bottom ?? 72
  })
}

export async function visibleBottomY(page: Page): Promise<number> {
  return page.evaluate(() => {
    const vv = window.visualViewport
    return (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight)
  })
}
