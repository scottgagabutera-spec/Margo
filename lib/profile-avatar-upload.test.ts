import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PROFILE_AVATAR_BUCKET,
  profileAvatarObjectPath,
} from './profile-avatar-upload-path.ts'

test('profile avatar upload uses avatars bucket and user-scoped avatar path', () => {
  assert.equal(PROFILE_AVATAR_BUCKET, 'avatars')
  assert.equal(profileAvatarObjectPath('uid-1', 'photo.PNG'), 'uid-1/avatar.PNG')
  assert.equal(profileAvatarObjectPath('uid-1', 'noext'), 'uid-1/avatar.noext')
})
