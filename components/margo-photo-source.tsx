'use client'

import { useRef } from 'react'
import { MargoActionSheet } from '@/components/margo-action-sheet'

export type MargoPhotoSourceProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFile: (file: File) => void
  title?: string
}

/**
 * Premium default: choose camera or library instead of jumping straight into the OS picker.
 * Mobile uses capture= on a dedicated input; desktop "Camera" uses capture when supported.
 */
export function MargoPhotoSource({
  open,
  onOpenChange,
  onFile,
  title = 'Profile photo',
}: MargoPhotoSourceProps) {
  const libraryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const pick = (file: File | undefined) => {
    if (!file) return
    onFile(file)
    onOpenChange(false)
  }

  return (
    <>
      <MargoActionSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        actions={[
          {
            id: 'camera',
            label: 'Take photo',
            onSelect: () => cameraRef.current?.click(),
          },
          {
            id: 'library',
            label: 'Choose from library',
            onSelect: () => libraryRef.current?.click(),
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
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </>
  )
}
