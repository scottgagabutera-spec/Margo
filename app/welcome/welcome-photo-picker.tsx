'use client'

import { useRef, type RefObject } from 'react'
import { MargoActionSheet } from '@/components/margo-action-sheet'
import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export type WelcomePhotoTarget = 'avatar' | 'cover'

interface WelcomePhotoPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: WelcomePhotoTarget
  hasPhoto: boolean
  onFile: (file: File) => void
  onRemove: () => void
  useDialogLayout: boolean
}

export function WelcomePhotoPicker({
  open,
  onOpenChange,
  target,
  hasPhoto,
  onFile,
  onRemove,
  useDialogLayout,
}: WelcomePhotoPickerProps) {
  const libraryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const title = target === 'cover' ? 'Cover photo' : 'Profile photo'

  const pick = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    onFile(file)
    onOpenChange(false)
  }

  const actions = [
    {
      id: 'camera',
      label: 'Take photo',
      onSelect: () => cameraRef.current?.click(),
    },
    {
      id: 'library',
      label: 'Choose from gallery',
      onSelect: () => libraryRef.current?.click(),
    },
    ...(hasPhoto
      ? [{
          id: 'remove',
          label: 'Remove photo',
          tone: 'destructive' as const,
          onSelect: () => {
            onRemove()
            onOpenChange(false)
          },
        }]
      : []),
    {
      id: 'cancel',
      label: 'Cancel',
      tone: 'cancel' as const,
      onSelect: () => onOpenChange(false),
    },
  ]

  if (useDialogLayout) {
    return (
      <>
        {open ? (
          <div
            role="presentation"
            onClick={() => onOpenChange(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 240,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            <div
              role="dialog"
              aria-modal
              aria-label={title}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '360px',
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                padding: '8px 0',
                boxSizing: 'border-box',
              }}
            >
              <p style={{
                fontFamily: font,
                fontSize: TYPE.secondary,
                fontWeight: 600,
                color: 'var(--text)',
                margin: '12px 20px 8px',
              }}>
                {title}
              </p>
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onSelect}
                  style={{
                    width: '100%',
                    minHeight: 'var(--margo-touch-min)',
                    padding: '12px 20px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontFamily: font,
                    fontSize: TYPE.body,
                    color: action.tone === 'destructive'
                      ? 'var(--destructive)'
                      : action.tone === 'cancel'
                        ? 'var(--text-muted)'
                        : 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <HiddenPhotoInputs libraryRef={libraryRef} cameraRef={cameraRef} onPick={pick} />
      </>
    )
  }

  return (
    <>
      <MargoActionSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        actions={actions}
      />
      <HiddenPhotoInputs libraryRef={libraryRef} cameraRef={cameraRef} onPick={pick} />
    </>
  )
}

function HiddenPhotoInputs({
  libraryRef,
  cameraRef,
  onPick,
}: {
  libraryRef: RefObject<HTMLInputElement | null>
  cameraRef: RefObject<HTMLInputElement | null>
  onPick: (file: File | undefined) => void
}) {
  return (
    <>
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </>
  )
}
