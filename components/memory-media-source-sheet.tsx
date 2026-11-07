'use client'

import { useRef, type RefObject } from 'react'
import { MargoActionSheet } from '@/components/margo-action-sheet'
import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function MemoryMediaSourceSheet({
  open,
  onOpenChange,
  onFile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFile: (file: File) => void
}) {
  const libraryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = (file: File | undefined) => {
    if (!file) return
    const ok =
      file.type.startsWith('image/') ||
      file.type.startsWith('video/') ||
      /\.(mp4|webm|jpe?g|png|heic|webp)$/i.test(file.name)
    if (!ok) return
    onFile(file)
    onOpenChange(false)
  }

  const actions = [
    { id: 'camera', label: 'Take a photo', onSelect: () => cameraRef.current?.click() },
    { id: 'video', label: 'Record a video', onSelect: () => videoRef.current?.click() },
    { id: 'gallery', label: 'Choose from gallery', onSelect: () => libraryRef.current?.click() },
    { id: 'file', label: 'Choose a file', onSelect: () => fileRef.current?.click() },
    { id: 'cancel', label: 'Cancel', tone: 'cancel' as const, onSelect: () => onOpenChange(false) },
  ]

  return (
    <>
      <MargoActionSheet open={open} onOpenChange={onOpenChange} title="Add media" actions={actions} />
      <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)', margin: 0, display: 'none' }} aria-hidden>
        Memory media picker
      </p>
      <HiddenInputs libraryRef={libraryRef} cameraRef={cameraRef} videoRef={videoRef} fileRef={fileRef} onPick={pick} />
    </>
  )
}

function HiddenInputs({
  libraryRef,
  cameraRef,
  videoRef,
  fileRef,
  onPick,
}: {
  libraryRef: RefObject<HTMLInputElement | null>
  cameraRef: RefObject<HTMLInputElement | null>
  videoRef: RefObject<HTMLInputElement | null>
  fileRef: RefObject<HTMLInputElement | null>
  onPick: (file: File | undefined) => void
}) {
  return (
    <>
      <input ref={libraryRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => onPick(e.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onPick(e.target.files?.[0])} />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onPick(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => onPick(e.target.files?.[0])} />
    </>
  )
}
