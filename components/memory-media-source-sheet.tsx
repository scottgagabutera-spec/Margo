'use client'

import { useRef, type RefObject } from 'react'
import { MargoMemoryCenteredDialog } from '@/components/margo-memory-centered-dialog'
import { ImagePlusIcon, PlayIcon, LibraryIcon } from '@/components/icons'

function MediaOutlineIcon({ kind }: { kind: 'photo' | 'video' | 'gallery' | 'file' }) {
  const size = 22
  if (kind === 'photo') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="7" width="16" height="12" rx="2.5" stroke="var(--gold)" strokeWidth="1.5" />
        <circle cx="9" cy="11.5" r="1.5" fill="var(--gold)" />
        <path d="M6 17l4.5-4 3 2.5L18 12" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'video') {
    return <PlayIcon size={size} color="var(--gold)" />
  }
  if (kind === 'gallery') {
    return <ImagePlusIcon size={size} color="var(--gold)" />
  }
  return <LibraryIcon size={size} color="var(--gold)" />
}

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

  const tiles = [
    { id: 'camera', label: 'Photo', kind: 'photo' as const, onSelect: () => cameraRef.current?.click() },
    { id: 'video', label: 'Video', kind: 'video' as const, onSelect: () => videoRef.current?.click() },
    { id: 'gallery', label: 'Gallery', kind: 'gallery' as const, onSelect: () => libraryRef.current?.click() },
    { id: 'file', label: 'File', kind: 'file' as const, onSelect: () => fileRef.current?.click() },
  ]

  return (
    <>
      <MargoMemoryCenteredDialog open={open} onOpenChange={onOpenChange} title="Add media" titleId="memory-add-media-title">
        <div className="margo-memory-add-media__tiles">
          {tiles.map((t) => (
            <button
              key={t.id}
              type="button"
              className="margo-memory-add-media__tile"
              onClick={t.onSelect}
            >
              <span className="margo-memory-add-media__tile-icon" aria-hidden>
                <MediaOutlineIcon kind={t.kind} />
              </span>
              <span className="margo-memory-add-media__tile-label">{t.label}</span>
            </button>
          ))}
        </div>
      </MargoMemoryCenteredDialog>
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
