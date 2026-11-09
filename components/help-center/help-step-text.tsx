import { Fragment } from 'react'

const EMPH_RE = /\[\[([^\]]+)\]\]/g

export function HelpStepText({ text }: { text: string }) {
  const parts: { key: string; emphasis: boolean; value: string }[] = []
  let last = 0
  let match: RegExpExecArray | null
  const re = new RegExp(EMPH_RE.source, 'g')
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ key: `t-${last}`, emphasis: false, value: text.slice(last, match.index) })
    }
    parts.push({ key: `e-${match.index}`, emphasis: true, value: match[1] })
    last = match.index + match[0].length
  }
  if (last < text.length) {
    parts.push({ key: `t-${last}`, emphasis: false, value: text.slice(last) })
  }
  if (parts.length === 0) return <>{text}</>
  return (
    <>
      {parts.map((p) => (
        <Fragment key={p.key}>
          {p.emphasis ? <span className="margo-help-emph">{p.value}</span> : p.value}
        </Fragment>
      ))}
    </>
  )
}
