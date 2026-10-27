import type { Page } from '@playwright/test'

export type KeyboardEmulationMode = 'resizes-visual' | 'resizes-content'

/** Mock keyboard via __margoVvMock (read by lib/margo-keyboard-geometry in the page). */
export async function installVisualViewportKeyboardMock(
  page: Page,
  mode: KeyboardEmulationMode,
  keyboardHeightPx: number,
) {
  await page.addInitScript(({ mode, keyboardHeightPx }) => {
    const w = window as Window & {
      __margoVvMock?: {
        open: boolean
        fullH: number
        keyboardH: number
        mode: string
      }
    }
    w.__margoVvMock = {
      open: false,
      fullH: window.innerHeight,
      keyboardH: keyboardHeightPx,
      mode,
    }

    const dispatch = () => {
      window.visualViewport?.dispatchEvent(new Event('resize'))
      window.visualViewport?.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('resize'))
    }

    const sync = (open: boolean) => {
      if (w.__margoVvMock) w.__margoVvMock.open = open
      dispatch()
    }

    document.addEventListener(
      'focusin',
      (e) => {
        const t = e.target
        if (!(t instanceof HTMLElement)) return
        if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable) {
          sync(true)
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
          if (!still) sync(false)
        }, 60)
      },
      true,
    )
  }, { mode, keyboardHeightPx })
}

export async function assertTappableInBand(
  page: Page,
  selector: string,
  headerBottom: number,
  visibleBottom: number,
  index = 0,
) {
  const hit = await page.evaluate(({ selector, headerBottom, visibleBottom, index }) => {
    const list = document.querySelectorAll(selector)
    const el = list[index] ?? document.querySelector(selector)
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
  }, { selector, headerBottom, visibleBottom, index })
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
    const mock = (window as Window & { __margoVvMock?: { open: boolean; fullH: number; keyboardH: number } }).__margoVvMock
    if (mock) {
      const h = mock.open ? mock.fullH - mock.keyboardH : mock.fullH
      return h
    }
    const vv = window.visualViewport
    return (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight)
  })
}
