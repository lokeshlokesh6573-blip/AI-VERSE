'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

// ─── Inline Code ─────────────────────────────────────────────────────────────
function InlineCode({ children }: { children: string }) {
  return (
    <code className="font-mono text-[0.85em] px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-red-300">
      {children}
    </code>
  );
}

// ─── Code Block with Copy + Language Label ────────────────────────────────────
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [code]);

  const displayLang = (language || 'code').toLowerCase();

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/12 shadow-2xl bg-[#09090e] transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-red-400" />
          <span className="text-[11px] font-mono text-white/60 uppercase tracking-wider font-semibold">
            {displayLang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-[13px] leading-relaxed select-text">
          <code
            className="font-mono text-slate-200"
            style={{ fontFamily: 'JetBrains Mono, Fira Code, monospace' }}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ─── Table renderer ───────────────────────────────────────────────────────────
function Table({ content }: { content: string }) {
  const lines = content.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return <p className="ai-prose">{content}</p>;

  const parseRow = (line: string) =>
    line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow); // skip separator line

  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-white/[0.06] border-b border-white/10">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold text-white/90 tracking-wide text-xs uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-white/[0.03] transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 text-white/80 text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Markdown Renderer ───────────────────────────────────────────────────
interface MarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export default function MarkdownRenderer({ content, isStreaming }: MarkdownProps) {
  const renderContent = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // ── Code block ──────────────────────────────────────────────
      const codeBlockMatch = remaining.match(/^```(\w*)\n?([\s\S]*?)```/m);
      if (codeBlockMatch && remaining.startsWith('```')) {
        const lang = codeBlockMatch[1] || '';
        const code = codeBlockMatch[2] || '';
        nodes.push(<CodeBlock key={keyIdx++} language={lang} code={code} />);
        remaining = remaining.slice(codeBlockMatch[0].length);
        continue;
      }

      // ── Heading ──────────────────────────────────────────────────
      const headingMatch = remaining.match(/^(#{1,4}) (.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
        
        const headingStyles: Record<number, string> = {
          1: 'text-xl md:text-2xl font-bold text-white mt-6 mb-3 pb-2 border-b border-white/10 flex items-center gap-2',
          2: 'text-lg md:text-xl font-bold text-white mt-5 mb-2.5',
          3: 'text-base md:text-lg font-semibold text-white/95 mt-4 mb-2',
          4: 'text-sm md:text-base font-semibold text-white/90 mt-3 mb-1.5',
        };

        nodes.push(
          <Tag key={keyIdx++} className={`${headingStyles[level]} tracking-tight first:mt-0`}>
            {level <= 2 && <span className="w-1.5 h-4 rounded-full bg-red-500 inline-block shrink-0" />}
            <span>{renderInline(headingText)}</span>
          </Tag>
        );
        remaining = remaining.slice(headingMatch[0].length).replace(/^\n/, '');
        continue;
      }

      // ── Horizontal rule ──────────────────────────────────────────
      if (/^---+/.test(remaining)) {
        nodes.push(<hr key={keyIdx++} className="my-5 border-white/10" />);
        remaining = remaining.replace(/^---+\n?/, '');
        continue;
      }

      // ── Table ────────────────────────────────────────────────────
      if (/^\|.+\|/.test(remaining)) {
        const tableLines: string[] = [];
        const lines = remaining.split('\n');
        let i = 0;
        while (i < lines.length && /^\|/.test(lines[i])) {
          tableLines.push(lines[i]);
          i++;
        }
        nodes.push(<Table key={keyIdx++} content={tableLines.join('\n')} />);
        remaining = lines.slice(i).join('\n');
        continue;
      }

      // ── Blockquote ───────────────────────────────────────────────
      if (remaining.startsWith('> ')) {
        const lines: string[] = [];
        const allLines = remaining.split('\n');
        let i = 0;
        while (i < allLines.length && allLines[i].startsWith('> ')) {
          lines.push(allLines[i].slice(2));
          i++;
        }
        nodes.push(
          <blockquote key={keyIdx++} className="my-4 pl-4 py-1.5 border-l-2 border-red-500 bg-red-950/15 rounded-r-lg text-white/80 italic text-sm md:text-base">
            {lines.join('\n')}
          </blockquote>
        );
        remaining = allLines.slice(i).join('\n');
        continue;
      }

      // ── Unordered list ───────────────────────────────────────────
      if (/^[-*+] /.test(remaining)) {
        const items: string[] = [];
        const lines = remaining.split('\n');
        let i = 0;
        while (i < lines.length && /^[-*+] /.test(lines[i])) {
          items.push(lines[i].replace(/^[-*+] /, ''));
          i++;
        }
        nodes.push(
          <ul key={keyIdx++} className="my-3 space-y-1.5 pl-1">
            {items.map((item, ii) => (
              <li key={ii} className="text-white/85 flex items-start gap-2.5 leading-relaxed text-sm md:text-[15px]">
                <span className="text-red-500 mt-1.5 shrink-0 text-xs">▸</span>
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        remaining = lines.slice(i).join('\n');
        continue;
      }

      // ── Ordered list ─────────────────────────────────────────────
      if (/^\d+\. /.test(remaining)) {
        const items: string[] = [];
        const lines = remaining.split('\n');
        let i = 0;
        let num = 1;
        while (i < lines.length && new RegExp(`^${num}\\. `).test(lines[i])) {
          items.push(lines[i].replace(/^\d+\. /, ''));
          i++;
          num++;
        }
        nodes.push(
          <ol key={keyIdx++} className="my-3 space-y-1.5 pl-1">
            {items.map((item, ii) => (
              <li key={ii} className="text-white/85 flex items-start gap-2.5 leading-relaxed text-sm md:text-[15px]">
                <span className="text-red-400 font-mono text-xs mt-0.5 shrink-0 font-semibold min-w-[1.2em]">{ii + 1}.</span>
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ol>
        );
        remaining = lines.slice(i).join('\n');
        continue;
      }

      // ── Paragraph ────────────────────────────────────────────────
      const nextSpecial = remaining.search(/\n#{1,4} |\n```|\n> |\n[-*+] |\n\d+\. |\n\|/);
      const para = nextSpecial > 0 ? remaining.slice(0, nextSpecial) : remaining;
      const trimmed = para.trim();
      if (trimmed) {
        nodes.push(
          <p key={keyIdx++} className="text-white/90 leading-relaxed text-sm md:text-[15px] mb-3.5 last:mb-0">
            {renderInline(trimmed)}
          </p>
        );
      }
      remaining = nextSpecial > 0 ? remaining.slice(nextSpecial).replace(/^\n/, '') : '';
      if (nextSpecial <= 0) break;
    }

    return nodes;
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|\[.+?\]\(.+?\))/);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('`') && part.endsWith('`')) {
        return <InlineCode key={i}>{part.slice(1, -1)}</InlineCode>;
      }
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return <em key={i} className="italic text-white/75">{part.slice(1, -1)}</em>;
      }
      // Link [text](url)
      const linkMatch = part.match(/^\[(.+?)\]\((.+?)\)$/);
      if (linkMatch) {
        return (
          <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
            className="text-red-400 underline underline-offset-4 hover:text-red-300 transition-colors">
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="ai-prose text-sm md:text-[15px] tracking-normal">
      {renderContent(content)}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-red-500 ml-1 rounded-sm animate-pulse align-middle shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
      )}
    </div>
  );
}
