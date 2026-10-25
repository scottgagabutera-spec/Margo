export const PROFILE_AVATAR_BUCKET = 'avatars'

/** Object path inside the avatars bucket (matches legacy AvatarUpload). */
export function profileAvatarObjectPath(userId: string, fileName: string): string {
  const ext = fileName.split('.').pop() || 'jpg'
  return `${userId}/avatar.${ext}`
}
