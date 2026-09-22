export type {
  PlatformPublishInput,
  PlatformPublishResult,
  SocialConnectionRow,
} from '@/lib/promote/adapters/types'

export {
  adapterKindFromConnection,
  publishVideoViaAdapter as publishVideoToPlatform,
} from '@/lib/promote/publish-via-adapter'
