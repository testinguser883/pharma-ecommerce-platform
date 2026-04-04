import { createElement, type ReactNode } from 'react'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

type MarkdownBlock =
  | { type: 'heading'; level: HeadingLevel; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }

function isSafeHref(href: string) {
  return /^(https?:\/\/|mailto:|\/)/i.test(href)
}

const SAFE_CSS_PROPERTIES = new Set([
  'color', 'background', 'background-color', 'font-size', 'font-weight', 'font-style',
  'text-align', 'text-decoration', 'text-transform', 'line-height', 'letter-spacing',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'border', 'border-radius', 'border-color', 'border-width', 'border-style',
  'display', 'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
  'opacity', 'overflow', 'vertical-align', 'white-space', 'word-break',
  'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap',
  'grid-template-columns', 'grid-template-rows', 'grid-gap',
  'list-style', 'list-style-type', 'box-shadow', 'text-shadow',
])

const SAFE_TAGS = new Set([
  'span', 'div', 'p', 'strong', 'em', 'u', 's', 'sub', 'sup', 'br', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'img', 'a', 'small', 'mark', 'abbr', 'details', 'summary',
])

function parseCssToReactStyle(css: string): Record<string, string> | null {
  const style: Record<string, string> = {}
  const declarations = css.split(';').filter(Boolean)
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':')
    if (colonIdx === -1) continue
    const prop = decl.slice(0, colonIdx).trim().toLowerCase()
    const value = decl.slice(colonIdx + 1).trim()
    if (!SAFE_CSS_PROPERTIES.has(prop)) continue
    // Block url() and expression() in values to prevent XSS
    if (/url\s*\(|expression\s*\(/i.test(value)) continue
    // Convert kebab-case to camelCase for React
    const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    style[camelProp] = value
  }
  return Object.keys(style).length > 0 ? style : null
}

function parseAttributes(attrString: string): { style?: Record<string, string>; className?: string; href?: string; src?: string; alt?: string } {
  const attrs: { style?: Record<string, string>; className?: string; href?: string; src?: string; alt?: string } = {}
  const styleMatch = /style\s*=\s*"([^"]*)"/i.exec(attrString)
  if (styleMatch) {
    const parsed = parseCssToReactStyle(styleMatch[1])
    if (parsed) attrs.style = parsed
  }
  const classMatch = /class\s*=\s*"([^"]*)"/i.exec(attrString)
  if (classMatch) attrs.className = classMatch[1]
  const hrefMatch = /href\s*=\s*"([^"]*)"/i.exec(attrString)
  if (hrefMatch && isSafeHref(hrefMatch[1])) attrs.href = hrefMatch[1]
  const srcMatch = /src\s*=\s*"([^"]*)"/i.exec(attrString)
  if (srcMatch && isSafeHref(srcMatch[1])) attrs.src = srcMatch[1]
  const altMatch = /alt\s*=\s*"([^"]*)"/i.exec(attrString)
  if (altMatch) attrs.alt = altMatch[1]
  return attrs
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Match: markdown links, bold, italic, code, self-closing HTML tags, HTML open/close tag pairs
  const pattern = /(\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|<(br|hr)\s*\/?\s*>|<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+\s*=\s*"[^"]*")*)\s*>([\s\S]*?)<\/\8>)/g
  let lastIndex = 0
  let match: RegExpExecArray | null = pattern.exec(text)

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    if (match[2] && match[3]) {
      const label = match[2]
      const href = match[3]
      nodes.push(
        isSafeHref(href) ? (
          <a
            key={`${href}-${match.index}`}
            href={href}
            target={href.startsWith('/') || href.startsWith('mailto:') ? undefined : '_blank'}
            rel={href.startsWith('/') || href.startsWith('mailto:') ? undefined : 'noreferrer'}
            className="font-medium text-sky-700 underline underline-offset-2"
          >
            {label}
          </a>
        ) : (
          label
        ),
      )
    } else if (match[4]) {
      nodes.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-slate-900">
          {match[4]}
        </strong>,
      )
    } else if (match[5]) {
      nodes.push(
        <em key={`italic-${match.index}`} className="italic">
          {match[5]}
        </em>,
      )
    } else if (match[6]) {
      nodes.push(
        <code key={`code-${match.index}`} className="rounded bg-slate-100 px-1 py-0.5 text-[0.95em] text-slate-800">
          {match[6]}
        </code>,
      )
    } else if (match[7]) {
      // Self-closing tags: <br> or <hr>
      const selfTag = match[7].toLowerCase()
      if (selfTag === 'br') {
        nodes.push(<br key={`br-${match.index}`} />)
      } else if (selfTag === 'hr') {
        nodes.push(<hr key={`hr-${match.index}`} className="my-3 border-slate-200" />)
      }
    } else if (match[8]) {
      // HTML tag pair: <tag attrs>content</tag>
      const tag = match[8].toLowerCase()
      if (SAFE_TAGS.has(tag)) {
        const attrs = parseAttributes(match[9] || '')
        const children = renderInlineMarkdown(match[10] || '')
        nodes.push(
          createElement(tag, { key: `html-${tag}-${match.index}`, ...attrs }, ...children),
        )
      }
    }

    lastIndex = pattern.lastIndex
    match = pattern.exec(text)
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  let paragraphLines: string[] = []
  let unorderedItems: string[] = []
  let orderedItems: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') })
    paragraphLines = []
  }

  const flushUnorderedList = () => {
    if (unorderedItems.length === 0) return
    blocks.push({ type: 'unordered-list', items: unorderedItems })
    unorderedItems = []
  }

  const flushOrderedList = () => {
    if (orderedItems.length === 0) return
    blocks.push({ type: 'ordered-list', items: orderedItems })
    orderedItems = []
  }

  const flushAll = () => {
    flushParagraph()
    flushUnorderedList()
    flushOrderedList()
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushAll()
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headingMatch) {
      flushAll()
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as HeadingLevel,
        content: headingMatch[2],
      })
      continue
    }

    const unorderedMatch = /^[-*]\s+(.*)$/.exec(line)
    if (unorderedMatch) {
      flushParagraph()
      flushOrderedList()
      unorderedItems.push(unorderedMatch[1])
      continue
    }

    const orderedMatch = /^\d+\.\s+(.*)$/.exec(line)
    if (orderedMatch) {
      flushParagraph()
      flushUnorderedList()
      orderedItems.push(orderedMatch[1])
      continue
    }

    flushUnorderedList()
    flushOrderedList()
    paragraphLines.push(line)
  }

  flushAll()
  return blocks
}

const headingClasses: Record<HeadingLevel, string> = {
  1: 'mt-5 text-3xl font-bold text-slate-900',
  2: 'mt-5 text-2xl font-bold text-slate-900',
  3: 'mt-4 text-xl font-semibold text-slate-900',
  4: 'mt-4 text-lg font-semibold text-slate-900',
  5: 'mt-3 text-base font-semibold text-slate-900',
  6: 'mt-3 text-sm font-semibold uppercase tracking-wide text-slate-700',
}

export function renderMarkdownContent(content: string): ReactNode[] {
  return parseMarkdownBlocks(content).map((block, index) => {
    if (block.type === 'heading') {
      switch (block.level) {
        case 1:
          return (
            <h1 key={`heading-${index}`} className={headingClasses[1]}>
              {renderInlineMarkdown(block.content)}
            </h1>
          )
        case 2:
          return (
            <h2 key={`heading-${index}`} className={headingClasses[2]}>
              {renderInlineMarkdown(block.content)}
            </h2>
          )
        case 3:
          return (
            <h3 key={`heading-${index}`} className={headingClasses[3]}>
              {renderInlineMarkdown(block.content)}
            </h3>
          )
        case 4:
          return (
            <h4 key={`heading-${index}`} className={headingClasses[4]}>
              {renderInlineMarkdown(block.content)}
            </h4>
          )
        case 5:
          return (
            <h5 key={`heading-${index}`} className={headingClasses[5]}>
              {renderInlineMarkdown(block.content)}
            </h5>
          )
        case 6:
          return (
            <h6 key={`heading-${index}`} className={headingClasses[6]}>
              {renderInlineMarkdown(block.content)}
            </h6>
          )
      }
    }

    if (block.type === 'unordered-list') {
      return (
        <ul key={`unordered-${index}`} className="mb-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
          {block.items.map((item, itemIndex) => (
            <li key={`unordered-item-${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      )
    }

    if (block.type === 'ordered-list') {
      return (
        <ol key={`ordered-${index}`} className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
          {block.items.map((item, itemIndex) => (
            <li key={`ordered-item-${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      )
    }

    return (
      <p key={`paragraph-${index}`} className="mb-3 text-sm leading-6 text-slate-700">
        {renderInlineMarkdown(block.content)}
      </p>
    )
  })
}
