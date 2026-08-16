"use client";

import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  a: ({ node: _node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  img: ({ node: _node, src, alt }) => {
    if (typeof src !== "string" || !src) return alt ? <span>{alt}</span> : null;
    return (
      <a href={src} target="_blank" rel="noopener noreferrer">
        {alt ? `Image: ${alt}` : "Open linked image"}
      </a>
    );
  },
};

export function EveMarkdown({ children }: { children: string }) {
  return (
    <div className="eve-markdown">
      <Markdown
        components={components}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {children}
      </Markdown>
    </div>
  );
}
