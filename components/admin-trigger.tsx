'use client'
import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

function isAdminTriggerExemptPath(pathname: string | null): boolean {
  if (!pathname) return false
  const path = pathname.split('?')[0]
  if (path === '/signin' || path.startsWith('/auth/')) return true
  if (path === '/admin' || path.startsWith('/admin/')) return true
  return false
}

export function AdminTrigger() {
  const router = useRouter()
  const pathname = usePathname()
  const pressedKeys = useRef<Set<string>>(new Set())
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    const clearTouch = () => {
      if (touchTimer.current) {
        clearTimeout(touchTimer.current)
        touchTimer.current = null
      }
      touchStartRef.current = null
    }

    const goAdmin = () => {
      if (isAdminTriggerExemptPath(pathnameRef.current)) return
      router.push('/admin')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isAdminTriggerExemptPath(pathnameRef.current)) return
      pressedKeys.current.add(e.key.toLowerCase())
      if (pressedKeys.current.has('b') && pressedKeys.current.has('g')) {
        goAdmin()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.current.delete(e.key.toLowerCase())
    }
    const onBlur = () => {
      pressedKeys.current.clear()
      clearTouch()
    }
    const onTouchStart = (e: TouchEvent) => {
      if (isAdminTriggerExemptPath(pathnameRef.current)) return
      if (touchTimer.current) return
      const t = e.touches[0]
      touchStartRef.current = t ? { x: t.clientX, y: t.clientY } : null
      touchTimer.current = setTimeout(() => {
        touchTimer.current = null
        goAdmin()
      }, 10000)
    }
    const onTouchMove = (e: TouchEvent) => {
      const start = touchStartRef.current
      const t = e.touches[0]
      if (!start || !t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (dx * dx + dy * dy > 100) clearTouch()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pagehide', onBlur)
    document.addEventListener('visibilitychange', onBlur)
    window.addEventListener('touchstart', onTouchStart)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', clearTouch)
    window.addEventListener('touchcancel', clearTouch)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pagehide', onBlur)
      document.removeEventListener('visibilitychange', onBlur)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', clearTouch)
      window.removeEventListener('touchcancel', clearTouch)
      clearTouch()
    }
  }, [router])

  return null
}
