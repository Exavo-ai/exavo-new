import React from "react";

interface BlogContentProps {
  content: string;
}

export function BlogContent({ content }: BlogContentProps) {
  // Simple markdown-like parsing for blog content
  const parseContent = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let inBlockquote = false;
    let blockquoteLines: string[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-4 text-muted-foreground">
            {currentList.map((item, i) => (
              <li key={i}>{parseInline(item)}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushBlockquote = () => {
      if (blockquoteLines.length > 0) {
        elements.push(
          <blockquote
            key={`quote-${elements.length}`}
            className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground"
          >
            {blockquoteLines.map((line, i) => (
              <p key={i}>{parseInline(line)}</p>
            ))}
          </blockquote>
        );
        blockquoteLines = [];
        inBlockquote = false;
      }
    };

    const parseInline = (text: string) => {
      // Bold
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic
      text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Links
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>');
      
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Blockquote
      if (trimmedLine.startsWith("> ")) {
        flushList();
        inBlockquote = true;
        blockquoteLines.push(trimmedLine.substring(2));
        return;
      } else if (inBlockquote) {
        flushBlockquote();
      }

      // List item
      if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
        currentList.push(trimmedLine.substring(2));
        return;
      } else {
        flushList();
      }

      // Headings
      if (trimmedLine.startsWith("# ")) {
        elements.push(
          <h2 key={index} className="text-2xl font-bold mt-8 mb-4">
            {parseInline(trimmedLine.substring(2))}
          </h2>
        );
        return;
      }

      if (trimmedLine.startsWith("## ")) {
        elements.push(
          <h3 key={index} className="text-xl font-semibold mt-6 mb-3">
            {parseInline(trimmedLine.substring(3))}
          </h3>
        );
        return;
      }

      if (trimmedLine.startsWith("### ")) {
        elements.push(
          <h4 key={index} className="text-lg font-semibold mt-4 mb-2">
            {parseInline(trimmedLine.substring(4))}
          </h4>
        );
        return;
      }

      // Empty line
      if (trimmedLine === "") {
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={index} className="text-lg leading-relaxed text-muted-foreground mb-4">
          {parseInline(trimmedLine)}
        </p>
      );
    });

    flushList();
    flushBlockquote();

    return elements;
  };

  return <div className="prose prose-lg dark:prose-invert max-w-none">{parseContent(content)}</div>;
}
