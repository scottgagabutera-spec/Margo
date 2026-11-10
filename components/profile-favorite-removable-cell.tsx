'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CloseIcon } from '@/components/icons'
import { useLongPress } from '@/hooks/useLongPress'

export function ProfileFavoriteRemovableCell({
  children,
  removeLabel,
  onRemove,
  enabled,
}: {
  children: ReactNode
  removeLabel: string
  onRemove: () => void
  enabled: boolean
}) {
  const [armed, setArmed] = useState(false)

  const dismiss = useCallback(() => setArmed(false), [])

  const longPress = useLongPress({
    ms: 500,
    disabled: !enabled,
    onLongPress: () => setArmed(true),
  })

  useEffect(() => {
    if (!armed) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest?.('[data-favorite-remove]')) return
      dismiss()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [armed, dismiss])

  return (
    <div className="margo-profile-favorite-artists__cell" {...longPress.handlers}>
      {children}
      {armed ? (
        <button
          type="button"
          data-favorite-remove
          className="margo-profile-favorites__remove"
          aria-label={removeLabel}
          onClick={(e) => {
            e.stopPropagation()
            dismiss()
            onRemove()
          }}
        >
          <CloseIcon size={12} color="var(--bg)" />
        </button>
      ) : null}
    </div>
  )
}
