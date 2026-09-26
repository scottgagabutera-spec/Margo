'use client'

import { useRef, useState } from 'react'
import { MargoActionSheet } from '@/components/margo-action-sheet'
import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export type MargoPhotoSourceProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFile: (file: File) => void
  title?: string
}

async function probeCameraAccess(): Promise<'granted' | 'denied' | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'unknown'
  }
  try {
    if (typeof navigator.permissions?.query === 'function') {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
      if (status.state === 'denied') return 'denied'
      if (status.state === 'granted') return 'granted'
    }
  } catch {
    /* Permissions API optional */
  }
  return 'unknown'
}

/**
 * Take photo vs library — OS picker handles real permission prompts on mobile.
 * If camera is already blocked, we explain before opening a dead-end flow.
 */
export function MargoPhotoSource({
  open,
  onOpenChange,
  onFile,
  title = 'Profile photo',
}: MargoPhotoSourceProps) {
  const libraryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const pick = (file: File | undefined) => {
    if (!file) return
    setMessage(null)
    onFile(file)
    onOpenChange(false)
  }

  const openCamera = async () => {
    setMessage(null)
    const access = await probeCameraAccess()
    if (access === 'denied') {
      setMessage('Camera access is off for this site. Allow it in browser settings, or choose from library.')
      return
    }
    cameraRef.current?.click()
  }

  const openLibrary = () => {
    setMessage(null)
    libraryRef.current?.click()
  }

  return (
    <>
      <MargoActionSheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setMessage(null)
          onOpenChange(next)
        }}
        title={title}
        message={message}
        actions={[
          {
            id: 'camera',
            label: 'Take photo',
            onSelect: () => { void openCamera() },
          },
          {
            id: 'library',
            label: 'Choose from library',
            onSelect: openLibrary,
          },
          {
            id: 'cancel',
            label: 'Cancel',
            tone: 'cancel',
            onSelect: () => onOpenChange(false),
          },
        ]}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          pick(file)
          e.target.value = ''
        }}
      />
    </>
  )
}
