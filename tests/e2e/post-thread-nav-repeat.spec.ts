import { test, expect } from '@playwright/test'

/**
 * Simulates feed → post → back → same post again using the same sessionStorage
 * stack rules as NavHistoryTracker + navigateToPostThread (push, not replace).
 */
test.describe('post thread repeat open', () => {
  for (const width of [360, 390, 430]) {
    test(`second open keeps feed as previous (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.setContent('<!DOCTYPE html><html><body>stack test</body></html>', {
        waitUntil: 'domcontentloaded',
      })
      const result = await page.evaluate(() => {
        const KEY = 'margo:inAppNavStack'
        const read = (): string[] => {
          const raw = sessionStorage.getItem(KEY)
          return raw ? (JSON.parse(raw) as string[]) : []
        }
        const write = (s: string[]) => sessionStorage.setItem(KEY, JSON.stringify(s))
        const reset = (p: string) => write([p])
        const push = (p: string) => {
          const s = read()
          if (s[s.length - 1] === p) return
          write([...s, p])
        }
        const pop = () => {
          const s = read()
          if (s.length <= 1) return
          write(s.slice(0, -1))
        }
        const prev = () => (read().length < 2 ? null : read()[read().length - 2])

        reset('/feed')
        push('/post/n2music-keep-bleeding')
        const afterOpen = prev()
        pop()
        const afterBack = read()
        push('/post/n2music-keep-bleeding')
        const afterSecond = { stack: read(), prev: prev() }
        return { afterOpen, afterBack, afterSecond }
      })
      expect(result.afterOpen).toBe('/feed')
      expect(result.afterBack).toEqual(['/feed'])
      expect(result.afterSecond.prev).toBe('/feed')
      expect(result.afterSecond.stack).toEqual(['/feed', '/post/n2music-keep-bleeding'])
    })
  }
})
