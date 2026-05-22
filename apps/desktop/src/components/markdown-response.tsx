import type { ReactNode } from "react";

type MarkdownResponseProps = {
  content: string;
};

type MarkdownBlock =
  | {
      kind: "code";
      lines: string[];
    }
  | {
      kind: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      kind: "list";
      items: string[];
      ordered: boolean;
    }
  | {
      kind: "paragraph";
      text: string;
    };

export function MarkdownResponse({ content }: MarkdownResponseProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3 text-sm leading-6 text-foreground">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function renderBlock(block: MarkdownBlock, index: number): ReactNode {
  if (block.kind === "heading") {
    const className = block.level === 1 ? "text-base" : block.level === 2 ? "text-sm" : "text-xs";

    return (
      <h3 key={index} className={`${className} font-semibold text-foreground`}>
        {block.text}
      </h3>
    );
  }

  if (block.kind === "code") {
    return (
      <pre key={index} className="overflow-auto rounded-md border border-border/70 bg-background/70 p-3 font-mono text-xs leading-5">
        {block.lines.join("\n")}
      </pre>
    );
  }

  if (block.kind === "list") {
    const List = block.ordered ? "ol" : "ul";

    return (
      <List key={index} className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </List>
    );
  }

  return <p key={index}>{renderInlineMarkdown(block.text)}</p>;
}

function parseMarkdownBlocks(content: string) {
  const blocks: MarkdownBlock[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trimEnd() ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      blocks.push({ kind: "code", lines: codeLines });
      index += 1;
      continue;
    }

    const heading = parseHeading(line);

    if (heading) {
      blocks.push(heading);
      index += 1;
      continue;
    }

    if (isBulletLine(line) || isOrderedLine(line)) {
      const ordered = isOrderedLine(line);
      const items: string[] = [];

      while (index < lines.length) {
        const currentLine = lines[index]?.trimEnd() ?? "";

        if (ordered && isOrderedLine(currentLine)) {
          items.push(currentLine.replace(/^\d+\.\s+/, ""));
          index += 1;
          continue;
        }

        if (!ordered && isBulletLine(currentLine)) {
          items.push(currentLine.replace(/^[-*]\s+/, ""));
          index += 1;
          continue;
        }

        break;
      }

      blocks.push({ items, kind: "list", ordered });
      continue;
    }

    const paragraphLines: string[] = [line.trim()];
    index += 1;

    while (index < lines.length) {
      const currentLine = lines[index]?.trimEnd() ?? "";

      if (!currentLine.trim() || currentLine.startsWith("```") || parseHeading(currentLine) || isBulletLine(currentLine) || isOrderedLine(currentLine)) {
        break;
      }

      paragraphLines.push(currentLine.trim());
      index += 1;
    }

    blocks.push({ kind: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function parseHeading(line: string): MarkdownBlock | null {
  if (line.startsWith("### ")) {
    return { kind: "heading", level: 3, text: line.slice(4).trim() };
  }

  if (line.startsWith("## ")) {
    return { kind: "heading", level: 2, text: line.slice(3).trim() };
  }

  if (line.startsWith("# ")) {
    return { kind: "heading", level: 1, text: line.slice(2).trim() };
  }

  return null;
}

function renderInlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded border border-border/70 bg-background/70 px-1 py-0.5 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <span key={index}>{part}</span>;
  });
}

function isBulletLine(line: string) {
  return /^[-*]\s+/.test(line);
}

function isOrderedLine(line: string) {
  return /^\d+\.\s+/.test(line);
}
