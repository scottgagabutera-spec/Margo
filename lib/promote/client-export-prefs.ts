import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId, MomentThemeId } from '@/lib/moment/types'

export function savePostExportPrefsClient(input: {
  postId: string
  exportShapeId: MomentShapeId
  exportThemeId: MomentThemeId
  exportAtmosphereId: AtmosphereId
}): void {
  void fetch('/api/posts/export-prefs', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).catch(() => {})
}
