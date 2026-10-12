import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renderizador de Markdown próprio da Kira (sem dependências externas).
 * Suporta: blocos de código com copiar, títulos, negrito, itálico, código
 * inline, listas (ul/ol), citações, links, separadores e quebras de linha.
 * Tudo vira elementos React — nenhum HTML é injetado.
 */

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível
    }
  };
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/70 bg-[#0b1120] text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] tracking-wider text-slate-400 uppercase">
          {lang || "código"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-slate-300 transition-colors hover:bg-white/10"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-5">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(`[^`\n]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]]+\]\([^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("[")) {
      const link = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(token);
      nodes.push(
        <a
          key={key}
          href={link?.[2]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          {link?.[1]}
        </a>,
      );
    } else {
      const marker = token[0];
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
      void marker;
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type Block =
  | { type: "code"; code: string; lang: string }
  | { type: "heading"; level: number; text: string }
  | { type: "quote"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "hr" }
  | { type: "p"; lines: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // fecha o fence
      blocks.push({ type: "code", code: code.join("\n"), lang });
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      i++;
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (line.trim().startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", lines: quote });
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith(">") &&
      !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i])
    ) {
      paragraph.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", lines: paragraph });
  }
  return blocks;
}

const HEADING_CLASSES: Record<number, string> = {
  1: "mt-4 mb-2 text-xl font-bold tracking-tight",
  2: "mt-4 mb-2 text-lg font-bold tracking-tight",
  3: "mt-3 mb-1.5 text-base font-semibold",
  4: "mt-3 mb-1.5 text-sm font-semibold uppercase tracking-wide",
};

export function Markdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseBlocks(text ?? "");
  return (
    <div className={cn("text-[15px] leading-6 break-words", className)}>
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.type) {
          case "code":
            return <CodeBlock key={key} code={block.code} lang={block.lang} />;
          case "heading":
            return (
              <div
                key={key}
                className={HEADING_CLASSES[block.level] ?? HEADING_CLASSES[3]}
              >
                {renderInline(block.text, key)}
              </div>
            );
          case "hr":
            return <hr key={key} className="my-4 border-border/70" />;
          case "quote":
            return (
              <blockquote
                key={key}
                className="my-2 border-l-2 border-primary/60 pl-3 text-muted-foreground italic"
              >
                {block.lines.map((line, li) => (
                  <div key={`${key}-${li}`}>
                    {renderInline(line, `${key}-${li}`)}
                  </div>
                ))}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={key} className="my-2 list-disc space-y-1 pl-5">
                {block.items.map((item, li) => (
                  <li key={`${key}-${li}`}>
                    {renderInline(item, `${key}-${li}`)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="my-2 list-decimal space-y-1 pl-5">
                {block.items.map((item, li) => (
                  <li key={`${key}-${li}`}>
                    {renderInline(item, `${key}-${li}`)}
                  </li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={key} className="my-1.5 first:mt-0 last:mb-0">
                {block.lines.map((line, li) => (
                  <span key={`${key}-${li}`}>
                    {renderInline(line, `${key}-${li}`)}
                    {li < block.lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
