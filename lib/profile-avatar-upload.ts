import { createClient } from '@/lib/supabase/client'
import {
  PROFILE_AVATAR_BUCKET,
  profileAvatarObjectPath,
} from '@/lib/profile-avatar-upload-path'

const supabase = createClient()

export { PROFILE_AVATAR_BUCKET, profileAvatarObjectPath } from '@/lib/profile-avatar-upload-path'

/** Same storage path + profiles.avatar_url write as Edit Profile (`AvatarUpload`). */
export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5MB.')
  }
  const path = profileAvatarObjectPath(userId, file.name)
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (uploadError) throw uploadError
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
  const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: freshUrl })
    .eq('id', userId)
  if (updateError) throw updateError
  return freshUrl
}

export async function clearProfileAvatar(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId)
  if (error) throw error
}

export async function clearProfileCover(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ cover_url: null })
    .eq('id', userId)
  if (error) throw error
}
