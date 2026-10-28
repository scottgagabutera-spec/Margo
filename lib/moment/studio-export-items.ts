import type { MomentActionMenuItem } from '@/components/moment-action-menu'

export interface BuildMomentStudioExportItemsInput {
  onExportImage: () => void
  onExportVideo: () => void
  videoEnabled: boolean
}

/** Export ▾ on Moment studio — Image + Video only, no subtext. */
export function buildMomentStudioExportItems({
  onExportImage,
  onExportVideo,
  videoEnabled,
}: BuildMomentStudioExportItemsInput): MomentActionMenuItem[] {
  return [
    { id: 'png', label: 'Image', onClick: onExportImage },
    {
      id: 'video',
      label: 'Video',
      disabled: !videoEnabled,
      onClick: onExportVideo,
    },
  ]
}
