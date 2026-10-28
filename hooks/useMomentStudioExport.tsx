'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { canShareImageFiles } from '@/lib/moment'
import {
  saveMargoMomentImage,
  shareMargoMomentImage,
} from '@/lib/moment-export/save-moment-image'
import {
  prepareMargoMomentVideoShare,
  sharePreparedMomentVideo,
  canShareVideoFiles,
} from '@/lib/moment-export/save-moment-video'
import { momentUsesVisualLoopExport } from '@/lib/moment-export/visual-loop-export'
import { probeMomentVideoCapability } from '@/lib/moment-export/video/capabilities'
import { triggerFileDownload } from '@/lib/moment-export/trigger-file-download'
import {
  toastMomentExportFailed,
  toastMomentImageSaved,
  toastMomentShared,
  toastMomentShareFailed,
  toastMomentVideoSaved,
} from '@/lib/moment-export/moment-export-toasts'
import { buildMomentExportActionItems, buildMomentShareActionItems } from '@/lib/moment/share-action-items'
import type { MargoMoment } from '@/lib/moment/types'
import {
  MomentVideoReadySheet,
  type MomentVideoReadyMode,
} from '@/components/moment-video-ready-sheet'

export function useMomentStudioExport(
  moment: MargoMoment | null,
  canPlaySnippet: boolean,
  isMargoCatalog = false,
) {
  const [saving, setSaving] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [videoProgress, setVideoProgress] = useState<string | null>(null)
  const [canExportVideo, setCanExportVideo] = useState(false)
  const [canShareVid, setCanShareVid] = useState(false)
  const videoAbortRef = useRef<AbortController | null>(null)
  const [mediaReadySheet, setMediaReadySheet] = useState<{
    mode: MomentVideoReadyMode
    previewUrl: string
    file: File
    silent?: boolean
  } | null>(null)

  const hasMoment = !!moment
  const hasPlayableSnippet = canPlaySnippet && isMargoCatalog
  const hasVisualLoopExport = moment ? momentUsesVisualLoopExport(moment) && isMargoCatalog : false
  const canClipExport = hasPlayableSnippet || hasVisualLoopExport
  const videoEnabled = canClipExport && canExportVideo

  useEffect(() => {
    setCanShareVid(canShareVideoFiles())
    let cancelled = false
    void probeMomentVideoCapability().then((cap) => {
      if (cancelled) return
      setCanExportVideo(cap.canExport)
    })
    return () => {
      cancelled = true
      videoAbortRef.current?.abort()
    }
  }, [])

  const handleSaveImage = useCallback(async () => {
    if (!moment) return
    setSaving(true)
    try {
      await saveMargoMomentImage(moment)
      toastMomentImageSaved()
    } catch {
      toastMomentExportFailed('image')
    } finally {
      setSaving(false)
    }
  }, [moment])

  const handleShareImage = useCallback(async () => {
    if (!moment) return
    setShareBusy(true)
    try {
      const result = await shareMargoMomentImage(moment)
      if (result === 'shared') toastMomentShared()
      else toastMomentShareFailed()
    } finally {
      setShareBusy(false)
    }
  }, [moment])

  const prepareVideo = useCallback(async () => {
    if (!moment || !videoEnabled) return null
    videoAbortRef.current?.abort()
    const ac = new AbortController()
    videoAbortRef.current = ac
    setVideoProgress('Creating your Moment…')
    try {
      const out = await prepareMargoMomentVideoShare(moment, setVideoProgress, ac.signal)
      if (!out) {
        toastMomentExportFailed('video')
        return null
      }
      return out
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toastMomentExportFailed('video', (err as Error)?.message)
      }
      return null
    } finally {
      setVideoProgress(null)
      if (videoAbortRef.current === ac) videoAbortRef.current = null
    }
  }, [moment, videoEnabled])

  const handleSaveVideo = useCallback(async () => {
    if (!moment) return
    setSaving(true)
    try {
      const out = await prepareVideo()
      if (!out) return
      setMediaReadySheet({
        mode: 'save',
        file: out.file,
        previewUrl: out.previewUrl,
        silent: hasVisualLoopExport,
      })
    } finally {
      setSaving(false)
    }
  }, [moment, prepareVideo, hasVisualLoopExport])

  const handleShareVideo = useCallback(async () => {
    setShareBusy(true)
    try {
      const out = await prepareVideo()
      if (!out) return
      setMediaReadySheet({
        mode: 'share',
        file: out.file,
        previewUrl: out.previewUrl,
        silent: hasVisualLoopExport,
      })
    } finally {
      setShareBusy(false)
    }
  }, [prepareVideo, hasVisualLoopExport])

  const confirmMediaReady = useCallback(async () => {
    if (!mediaReadySheet) return
    const { mode, file } = mediaReadySheet
    if (mode === 'save') {
      setSaving(true)
      try {
        const result = await triggerFileDownload(file)
        if (result !== 'failed') {
          toastMomentVideoSaved(result)
          setMediaReadySheet(null)
        } else {
          toastMomentExportFailed('video')
        }
      } finally {
        setSaving(false)
      }
      return
    }
    setShareBusy(true)
    try {
      const result = await sharePreparedMomentVideo(file)
      if (result === 'shared') {
        toastMomentShared()
        setMediaReadySheet(null)
      } else if (result !== 'cancelled') {
        toastMomentShareFailed()
      }
    } finally {
      setShareBusy(false)
    }
  }, [mediaReadySheet])

  const exportItems = useMemo(
    () =>
      buildMomentExportActionItems({
        onExportImage: () => { void handleSaveImage() },
        hasPlayableSnippet,
        hasVisualLoopExport,
        canExportVideo,
        onExportVideo: () => { void handleSaveVideo() },
      }).filter((item) => item.id !== 'pdf'),
    [
      handleSaveImage,
      handleSaveVideo,
      hasPlayableSnippet,
      hasVisualLoopExport,
      canExportVideo,
    ],
  )

  const shareItems = useMemo(
    () =>
      buildMomentShareActionItems({
        canShareImage: canShareImageFiles(),
        canShareVideo: canShareVid && videoEnabled,
        onShareImage: () => { void handleShareImage() },
        onShareVideo: () => { void handleShareVideo() },
      }),
    [canShareVid, videoEnabled, handleShareImage, handleShareVideo],
  )

  const videoReadySheet = (
    <MomentVideoReadySheet
      open={!!mediaReadySheet}
      mode={mediaReadySheet?.mode ?? 'save'}
      previewUrl={mediaReadySheet?.previewUrl ?? null}
      filename={mediaReadySheet?.file.name ?? 'MARGO_Moment.mp4'}
      silent={mediaReadySheet?.silent}
      busy={mediaReadySheet?.mode === 'save' ? saving : shareBusy}
      onPrimary={() => { void confirmMediaReady() }}
      onClose={() => setMediaReadySheet(null)}
    />
  )

  return {
    hasMoment,
    saving,
    shareBusy,
    videoProgress,
    exportItems,
    shareItems,
    videoReadySheet,
  }
}
