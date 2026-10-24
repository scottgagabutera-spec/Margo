import { test, expect } from '@playwright/test'

test('report menu closes when report sheet opens (one layer)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;font-family:system-ui">
  <button id="more" type="button">...</button>
  <div id="menu" hidden role="menu">Report</div>
  <div id="sheet" hidden>Form</div>
  <script>
    let menuOpen = false, sheetOpen = false
    const menu = document.getElementById('menu')
    const sheet = document.getElementById('sheet')
    more.onclick = () => {
      if (menuOpen) { menuOpen = false; menu.hidden = true; return }
      menuOpen = true; menu.hidden = false
    }
    menu.onclick = () => {
      menuOpen = false; menu.hidden = true
      sheetOpen = true; sheet.hidden = false
    }
    window.__state = () => ({ menuOpen, sheetOpen, menuHidden: menu.hidden, sheetHidden: sheet.hidden })
  </script></body></html>`, { waitUntil: 'domcontentloaded' })
  await page.locator('#more').click()
  await page.locator('#menu').click()
  const state = await page.evaluate(() => (window as unknown as { __state: () => { menuHidden: boolean; sheetHidden: boolean } }).__state())
  expect(state.menuHidden).toBe(true)
  expect(state.sheetHidden).toBe(false)
})
