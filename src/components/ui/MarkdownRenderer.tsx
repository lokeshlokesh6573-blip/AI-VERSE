'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

// ─── Inline Code ─────────────────────────────────────────────────────────────
function InlineCode({ children }: { children: string }) {
  return (
    <code className="font-mono text-[0.875em] px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-fuchsia-300 dark:text-fuchsia-300">
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

  const displayLang = language || 'code';

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d0d14]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-white/40" />
          <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">
            {displayLang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
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
        <pre className="p-4 text-[13px] leading-relaxed">
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
    <div className="my-4 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/5 border-b border-white/10">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left font-semibold text-white/80 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-white/5 hover:bg-white/2 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-white/70">
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
        const text = headingMatch[2];
        const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
        const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base'];
        nodes.push(
          <Tag key={keyIdx++} className={`${sizes[level - 1]} font-bold text-white mt-5 mb-2 first:mt-0`}>
            {renderInline(text)}
          </Tag>
        );
        remaining = remaining.slice(headingMatch[0].length).replace(/^\n/, '');
        continue;
      }

      // ── Horizontal rule ──────────────────────────────────────────
      if (/^---+/.test(remaining)) {
        nodes.push(<hr key={keyIdx++} className="my-4 border-white/10" />);
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
          <blockquote key={keyIdx++} className="my-3 pl-4 border-l-2 border-red-500/50 text-white/60 italic">
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
          <ul key={keyIdx++} className="my-3 space-y-1 pl-5">
            {items.map((item, ii) => (
              <li key={ii} className="text-white/80 flex gap-2">
                <span className="text-red-400 mt-1 shrink-0 text-xs">▸</span>
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
          <ol key={keyIdx++} className="my-3 space-y-1 pl-5">
            {items.map((item, ii) => (
              <li key={ii} className="text-white/80 flex gap-2">
                <span className="text-blue-400 font-mono text-xs mt-1 shrink-0 min-w-[1.5em]">{ii + 1}.</span>
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
          <p key={keyIdx++} className="text-white/85 leading-relaxed mb-3 last:mb-0">
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
    // Split by inline patterns
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
        return <em key={i} className="italic text-white/70">{part.slice(1, -1)}</em>;
      }
      // Link [text](url)
      const linkMatch = part.match(/^\[(.+?)\]\((.+?)\)$/);
      if (linkMatch) {
        return (
          <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
            className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors">
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="ai-prose text-sm md:text-[15px]">
      {renderContent(content)}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
      )}
    </div>
  );
}
