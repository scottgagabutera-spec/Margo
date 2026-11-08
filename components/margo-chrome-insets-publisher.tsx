'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { measureMargoHeaderBottom, resolveMargoHeaderBandElement } from '@/lib/margo-header-band'
import { MARGO_CHROME_SELECTORS, setRootChromePx } from '@/lib/margo-chrome-vars'

function chromeBarHeight(el: HTMLElement | null): number {
  if (!el) return 0
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden') return 0
  return el.offsetHeight
}

function mobileTabBarHeight(el: HTMLElement | null): number {
  if (document.documentElement.hasAttribute('data-margo-keyboard')) return 0
  return chromeBarHeight(el)
}

/**
 * Single ResizeObserver publisher for app chrome heights on :root.
 * Publishes --margo-header-h, --nav-height (alias), --margo-feed-tab-bar-h, --margo-tabbar-h.
 */
export function MargoChromeInsetsPublisher() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const root = document.documentElement
    const observers: ResizeObserver[] = []
    const observed = new WeakSet<Element>()

    const publishHeader = () => {
      const { bottom, height } = measureMargoHeaderBottom()
      setRootChromePx('--margo-header-h', height)
      setRootChromePx('--nav-height', height)
      setRootChromePx('--margo-header-bottom', bottom)
    }

    const bind = (el: Element | null, onMeasure: () => void) => {
      if (!el || !(el instanceof HTMLElement)) {
        onMeasure()
        return
      }
      if (!observed.has(el)) {
        observed.add(el)
        onMeasure()
        if (typeof ResizeObserver !== 'undefined') {
          const ro = new ResizeObserver(onMeasure)
          ro.observe(el)
          observers.push(ro)
        }
      } else {
        onMeasure()
      }
    }

    const publishFeedTabs = () => {
      const el = document.querySelector(MARGO_CHROME_SELECTORS.feedTabBar)
      bind(el, () => {
        const node = document.querySelector(MARGO_CHROME_SELECTORS.feedTabBar)
        const h = node instanceof HTMLElement && !node.closest('[hidden]') ? chromeBarHeight(node) : 0
        setRootChromePx('--margo-feed-tab-bar-h', h)
      })
    }

    const publishTabBar = () => {
      const el = document.querySelector(MARGO_CHROME_SELECTORS.mobileTabBar)
      bind(el, () => {
        const node = document.querySelector(MARGO_CHROME_SELECTORS.mobileTabBar)
        setRootChromePx(
          '--margo-tabbar-h',
          mobileTabBarHeight(node instanceof HTMLElement ? node : null),
        )
      })
    }

    const syncAll = () => {
      publishHeader()
      const { el: headerNode } = resolveMargoHeaderBandElement()
      bind(headerNode, publishHeader)
      publishFeedTabs()
      publishTabBar()
    }

    syncAll()

    const onViewport = () => syncAll()
    window.addEventListener('resize', onViewport)
    window.visualViewport?.addEventListener('resize', onViewport)

    let domRaf = 0
    const scheduleDom = () => {
      if (domRaf) return
      domRaf = window.requestAnimationFrame(() => {
        domRaf = 0
        syncAll()
      })
    }
    const domMo = new MutationObserver(scheduleDom)
    domMo.observe(document.body, { childList: true, subtree: true })

    const attrMo = new MutationObserver(() => publishTabBar())
    attrMo.observe(root, { attributes: true, attributeFilter: ['data-margo-keyboard'] })

    return () => {
      observers.forEach((ro) => ro.disconnect())
      domMo.disconnect()
      attrMo.disconnect()
      window.removeEventListener('resize', onViewport)
      window.visualViewport?.removeEventListener('resize', onViewport)
      if (domRaf) window.cancelAnimationFrame(domRaf)
    }
  }, [pathname])

  return null
}
