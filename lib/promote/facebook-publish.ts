import { FACEBOOK_GRAPH_VERSION } from '@/lib/promote/facebook-oauth'
import { formatFacebookApiError } from '@/lib/promote/publish-error'

export interface FacebookUploadInput {
  pageId: string
  accessToken: string
  videoBytes: Buffer
  title: string
  description: string
}

export interface FacebookUploadResult {
  videoId: string
  videoUrl: string
}

/**
 * Upload video bytes directly to a Facebook Page (multipart `source`).
 * Same in-memory pattern as YouTube — no public URL fetch.
 * @see https://developers.facebook.com/docs/graph-api/reference/page/videos
 */
export async function uploadVideoToFacebookPage({
  pageId,
  accessToken,
  videoBytes,
  title,
  description,
}: FacebookUploadInput): Promise<FacebookUploadResult> {
  const form = new FormData()
  form.append('source', new Blob([videoBytes], { type: 'video/mp4' }), 'moment.mp4')
  form.append('title', title.slice(0, 100))
  form.append('description', description.slice(0, 5000))
  form.append('access_token', accessToken)

  const res = await fetch(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${pageId}/videos`,
    { method: 'POST', body: form },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(formatFacebookApiError(res.status, text, 'video upload'))
  }

  const json = await res.json() as { id?: string; error?: { message?: string } }
  if (json.error?.message) throw new Error(json.error.message)
  if (!json.id) throw new Error('Facebook upload succeeded but no video id returned')

  return {
    videoId: json.id,
    videoUrl: `https://www.facebook.com/${pageId}/videos/${json.id}`,
  }
}
