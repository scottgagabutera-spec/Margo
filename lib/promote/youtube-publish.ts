import { formatYouTubeApiError } from '@/lib/promote/publish-error'

export interface YouTubeUploadInput {
  accessToken: string
  videoBytes: Buffer
  title: string
  description: string
  privacyStatus?: 'public' | 'unlisted' | 'private'
  /** Official Margo artist uploads only — other artists keep their own Studio toggle. */
  containsSyntheticMedia?: boolean
}

export interface YouTubeUploadResult {
  videoId: string
  videoUrl: string
}

/**
 * Resumable upload to the authenticated user's YouTube channel.
 * @see https://developers.google.com/youtube/v3/guides/uploading_a_video
 */
export async function uploadVideoToYouTube({
  accessToken,
  videoBytes,
  title,
  description,
  privacyStatus = 'public',
  containsSyntheticMedia,
}: YouTubeUploadInput): Promise<YouTubeUploadResult> {
  const initParams = new URLSearchParams({
    uploadType: 'resumable',
    part: 'snippet,status',
  })
  const initRes = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/videos?${initParams}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBytes.length),
      },
      body: JSON.stringify({
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          categoryId: '10',
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
          ...(containsSyntheticMedia ? { containsSyntheticMedia: true } : {}),
        },
      }),
    },
  )

  if (!initRes.ok) {
    const text = await initRes.text()
    throw new Error(formatYouTubeApiError(initRes.status, text, 'resumable init'))
  }

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('YouTube resumable init missing Location header')

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoBytes.length),
    },
    body: new Uint8Array(videoBytes),
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    throw new Error(formatYouTubeApiError(uploadRes.status, text, 'video upload'))
  }

  const json = await uploadRes.json() as { id?: string }
  if (!json.id) throw new Error('YouTube upload succeeded but no video id returned')

  return {
    videoId: json.id,
    videoUrl: `https://www.youtube.com/shorts/${json.id}`,
  }
}
