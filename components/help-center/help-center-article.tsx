'use client'

import { notFound } from 'next/navigation'
import { getArticle } from '@/lib/help-center/content'
import { HelpContentPageShell } from '@/components/help-center/help-content-page-shell'
import { HelpStepText } from '@/components/help-center/help-step-text'

export function HelpCenterArticle({ topicId, articleId }: { topicId: string; articleId: string }) {
  const article = getArticle(topicId, articleId)
  if (!article) notFound()

  return (
    <HelpContentPageShell title={article.title} dateLine={`Last updated ${article.updated}`}>
      <p className="margo-content-page__intro">{article.intro}</p>
      <h2 className="margo-content-page__section-title">Steps</h2>
      <ol className="margo-help-steps">
        {article.steps.map((step, i) => (
          <li key={step} className="margo-help-steps__item">
            <span className="margo-help-steps__num">{i + 1}</span>
            <span className="margo-help-steps__text">
              <HelpStepText text={step} />
            </span>
          </li>
        ))}
      </ol>
      {article.goodToKnow ? (
        <>
          <h2 className="margo-content-page__section-title">Good to know</h2>
          <p className="margo-content-page__intro">
            <HelpStepText text={article.goodToKnow} />
          </p>
        </>
      ) : null}
    </HelpContentPageShell>
  )
}
