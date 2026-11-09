import { HelpCenterTopic } from '@/components/help-center/help-center-topic'

type Props = { params: Promise<{ topic: string }> }

export default async function HelpTopicPage({ params }: Props) {
  const { topic } = await params
  return <HelpCenterTopic topicId={topic} />
}
