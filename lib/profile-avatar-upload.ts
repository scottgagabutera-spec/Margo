import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

/** Same storage path + profiles.avatar_url write as Edit Profile (`AvatarUpload`). */
export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5MB.')
  }
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
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
