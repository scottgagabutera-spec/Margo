import { test, expect } from '@playwright/test'

/**
 * Simulates feed → post → back → same post again using the same sessionStorage
 * stack rules as NavHistoryTracker + navigateToPostThread (push, not replace).
 */
test.describe('post thread repeat open', () => {
  for (const width of [360, 390, 430]) {
    test(`second open keeps feed as previous (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.setContent(`<!DOCTYPE html><html><body><script>
        window.__stackTest = function () {
          let stack = ['/feed']
          const push = (p) => { if (stack[stack.length - 1] !== p) stack = [...stack, p] }
          const pop = () => { if (stack.length > 1) stack = stack.slice(0, -1) }
          const prev = () => (stack.length < 2 ? null : stack[stack.length - 2])
          push('/post/n2music-keep-bleeding')
          const afterOpen = prev()
          pop()
          const afterBack = stack.slice()
          push('/post/n2music-keep-bleeding')
          return { afterOpen, afterBack, afterSecond: { stack: stack.slice(), prev: prev() } }
        }
      </script></body></html>`, { waitUntil: 'domcontentloaded' })
      const result = await page.evaluate(() => (window as unknown as { __stackTest: () => unknown }).__stackTest())
      expect(result.afterOpen).toBe('/feed')
      expect(result.afterBack).toEqual(['/feed'])
      expect(result.afterSecond.prev).toBe('/feed')
      expect(result.afterSecond.stack).toEqual(['/feed', '/post/n2music-keep-bleeding'])
    })
  }
})
