'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function AdminTrigger() {
  const router = useRouter()
  const pressedKeys = useRef<Set<string>>(new Set())
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      pressedKeys.current.add(e.key.toLowerCase())
      if (pressedKeys.current.has('b') && pressedKeys.current.has('g')) {
        router.push('/admin')
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.current.delete(e.key.toLowerCase())
    }
    const onTouchStart = () => {
      if (touchTimer.current) return
      touchTimer.current = setTimeout(() => {
        router.push('/admin')
        touchTimer.current = null
      }, 10000)
    }
    const onTouchEnd = () => {
      if (touchTimer.current) {
        clearTimeout(touchTimer.current)
        touchTimer.current = null
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('touchstart', onTouchStart)
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      if (touchTimer.current) clearTimeout(touchTimer.current)
    }
  }, [router])

  return null
}
