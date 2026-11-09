'use client'

import { useRef, type RefObject } from 'react'
import { MargoMemoryCenteredDialog } from '@/components/margo-memory-centered-dialog'

function MediaOutlineIcon({ kind }: { kind: 'photo' | 'video' | 'gallery' | 'file' }) {
  const size = 22
  const gold = 'var(--gold)'
  if (kind === 'photo') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="5" y="8" width="14" height="11" rx="2" stroke={gold} strokeWidth="1.5" />
        <circle cx="9.5" cy="12" r="1.25" fill={gold} />
        <path d="M6 17l3.5-3 2.5 2 3-2.5L18 13" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 5.5h6l1 2.5H8l1-2.5z" stroke={gold} strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'video') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="7" width="13" height="11" rx="2" stroke={gold} strokeWidth="1.5" />
        <path d="M16 10.5l5-2.5v8l-5-2.5v-3z" stroke={gold} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'gallery') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="9" width="12" height="10" rx="2" stroke={gold} strokeWidth="1.5" />
        <rect x="8" y="5" width="12" height="10" rx="2" stroke={gold} strokeWidth="1.2" opacity="0.85" />
        <circle cx="9" cy="13" r="1.25" fill={gold} />
        <path d="M5 17l2.5-2.5 2 1.5L12 13l3 2v4H4v-2z" stroke={gold} strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 4h7l3 3v13H7V4z" stroke={gold} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 4v3h3" stroke={gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 12h5M9.5 15h5" stroke={gold} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
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
    {
      id: 'camera',
      title: 'Take photo',
      subtitle: 'Open the camera',
      kind: 'photo' as const,
      onSelect: () => cameraRef.current?.click(),
    },
    {
      id: 'video',
      title: 'Record video',
      subtitle: 'Open the camera',
      kind: 'video' as const,
      onSelect: () => videoRef.current?.click(),
    },
    {
      id: 'gallery',
      title: 'Gallery',
      subtitle: 'Photos and videos',
      kind: 'gallery' as const,
      onSelect: () => libraryRef.current?.click(),
    },
    {
      id: 'file',
      title: 'Files',
      subtitle: 'Browse your phone',
      kind: 'file' as const,
      onSelect: () => fileRef.current?.click(),
    },
  ]

  return (
    <>
      <MargoMemoryCenteredDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Add media"
        titleId="memory-add-media-title"
        widthPx={320}
      >
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
              <span className="margo-memory-add-media__tile-copy">
                <span className="margo-memory-add-media__tile-title">{t.title}</span>
                <span className="margo-memory-add-media__tile-sub">{t.subtitle}</span>
              </span>
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
