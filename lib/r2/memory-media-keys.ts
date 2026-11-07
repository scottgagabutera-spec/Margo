export type MemoryMediaFileKind = 'image' | 'video' | 'poster'

/** R2 keys — one folder per user, mirror studio pattern under `users/{userId}/...`. */
export function memoryMediaObjectKey(
  profileId: string,
  draftOrMemoryId: string,
  position: number,
  kind: MemoryMediaFileKind,
  ext: string,
): string {
  const pos = Math.max(0, Math.min(29, position))
  const safeExt = ext.replace(/^\./, '')
  if (kind === 'poster') {
    return `users/${profileId}/memories/${draftOrMemoryId}/${pos}-poster.webp`
  }
  return `users/${profileId}/memories/${draftOrMemoryId}/${pos}.${safeExt}`
}

export function memoryVideoPosterKey(videoKey: string): string {
  return videoKey.replace(/\.(mp4|webm)$/i, '-poster.webp')
}

export function isMemoryVideoR2Key(key: string): boolean {
  return /\.(mp4|webm)$/i.test(key)
}

export function isMemoryPosterR2Key(key: string): boolean {
  return /-poster\.webp$/i.test(key)
}
