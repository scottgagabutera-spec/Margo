import { HelpCenterArticle } from '@/components/help-center/help-center-article'

type Props = { params: Promise<{ topic: string; article: string }> }

export default async function HelpArticlePage({ params }: Props) {
  const { topic, article } = await params
  return <HelpCenterArticle topicId={topic} articleId={article} />
}
