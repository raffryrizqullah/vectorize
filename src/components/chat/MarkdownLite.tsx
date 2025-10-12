"use client";

import React from "react";

type Node =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; text: string }
  | { type: "h1" | "h2" | "h3"; text: string };

function sanitizeSource(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "  ")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, "$1")
    .replace(/\u0000/g, "")
    .trim();
}

function parseBlocks(md: string): Node[] {
  const out: Node[] = [];
  const lines = md.split("\n");
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  let listBuf: string[] | null = null;
  let olistBuf: string[] | null = null;
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      out.push({ type: "p", text: paraBuf.join("\n") });
      paraBuf = [];
    }
  };

  const flushLists = () => {
    if (listBuf) {
      out.push({ type: "ul", items: listBuf });
      listBuf = null;
    }
    if (olistBuf) {
      out.push({ type: "ol", items: olistBuf });
      olistBuf = null;
    }
  };

  const flushAll = () => {
    if (inCode) {
      out.push({ type: "code", text: codeBuf.join("\n") });
      inCode = false;
      codeBuf = [];
    }
    flushLists();
    flushPara();
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    let line = rawLine.trimEnd();

    if (line.trim().startsWith("````")) {
      // normalize quadruple backticks to triple to avoid dangling code blocks
      line = line.replace("````", "```");
    }

    if (line.trim().startsWith("```")) {
      if (!inCode) {
        flushAll();
        inCode = true;
        codeBuf = [];
      } else {
        out.push({ type: "code", text: codeBuf.join("\n") });
        inCode = false;
        codeBuf = [];
      }
      i++;
      continue;
    }

    if (inCode) {
      codeBuf.push(rawLine);
      i++;
      continue;
    }

    if (line === "") {
      flushAll();
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length as 1 | 2 | 3;
      out.push({ type: ("h" + level) as any, text: heading[2].trim() });
      i++;
      continue;
    }

    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      flushPara();
      if (!listBuf) {
        flushLists();
        listBuf = [];
      }
      listBuf.push(bulletMatch[1].trim());
      i++;
      continue;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushPara();
      if (!olistBuf) {
        flushLists();
        olistBuf = [];
      }
      olistBuf.push(orderedMatch[1].trim());
      i++;
      continue;
    }

    flushLists();
    paraBuf.push(rawLine);
    i++;
  }

  flushAll();
  return out;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\)|https?:\/\/[^\s)]+|(?:www\.)[^\s)]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushText = (value: string) => {
    if (!value) return;
    nodes.push(value);
  };

  while ((match = pattern.exec(text)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) pushText(text.slice(lastIndex, idx));
    const token = match[0];

    if (/^\*\*.+\*\*$/.test(token)) {
      const inner = token.slice(2, -2);
      nodes.push(
        <strong key={`${keyPrefix}-b-${nodes.length}`}>{renderInline(inner, `${keyPrefix}-b-${nodes.length}`)}</strong>,
      );
    } else if (/^\*.+\*$/.test(token)) {
      const inner = token.slice(1, -1);
      nodes.push(
        <em key={`${keyPrefix}-i-${nodes.length}`}>{renderInline(inner, `${keyPrefix}-i-${nodes.length}`)}</em>,
      );
    } else if (/^`.+`$/.test(token)) {
      const inner = token.slice(1, -1);
      nodes.push(<code key={`${keyPrefix}-c-${nodes.length}`}>{inner}</code>);
    } else if (/^\[[^\]]+\]\([^\s)]+\)$/.test(token)) {
      const [, label, url] = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/) || [];
      if (label && url) {
        const href = /^https?:/i.test(url) ? url : `https://${url}`;
        nodes.push(
          <a key={`${keyPrefix}-l-${nodes.length}`} href={href} target="_blank" rel="noopener noreferrer">
            {renderInline(label, `${keyPrefix}-lt-${nodes.length}`)}
          </a>,
        );
      } else {
        pushText(token);
      }
    } else {
      const href = token.startsWith("http") ? token : `https://${token}`;
      nodes.push(
        <a key={`${keyPrefix}-u-${nodes.length}`} href={href} target="_blank" rel="noopener noreferrer">
          {token}
        </a>,
      );
    }

    lastIndex = idx + token.length;
  }

  if (lastIndex < text.length) pushText(text.slice(lastIndex));
  return nodes;
}

function renderParagraph(text: string, index: number) {
  const lines = text.split(/\n+/).map((line) => line.trimEnd());
  return (
    <p key={`p-${index}`} className="leading-relaxed">
      {lines.map((line, i) => (
        <React.Fragment key={`p-${index}-line-${i}`}>
          {renderInline(line, `p-${index}-line-${i}`)}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  );
}

export default function MarkdownLite({ text }: { text: string }) {
  const clean = sanitizeSource(text);
  const nodes = parseBlocks(clean);

  return (
    <div className="md space-y-3 text-sm text-gray-900">
      {nodes.map((n, idx) => {
        switch (n.type) {
          case "h1":
            return (
              <h3 key={`h1-${idx}`} className="text-base font-semibold text-gray-900">
                {renderInline(n.text, `h1-${idx}`)}
              </h3>
            );
          case "h2":
            return (
              <h4 key={`h2-${idx}`} className="text-sm font-semibold text-gray-900">
                {renderInline(n.text, `h2-${idx}`)}
              </h4>
            );
          case "h3":
            return (
              <h5 key={`h3-${idx}`} className="text-sm font-semibold text-gray-900">
                {renderInline(n.text, `h3-${idx}`)}
              </h5>
            );
          case "p":
            return renderParagraph(n.text, idx);
          case "ul":
            return (
              <ul key={`ul-${idx}`} className="ml-4 list-disc space-y-1 text-sm text-gray-900">
                {n.items.map((item, itemIdx) => (
                  <li key={`ul-${idx}-${itemIdx}`}>{renderInline(item, `ul-${idx}-${itemIdx}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={`ol-${idx}`} className="ml-4 list-decimal space-y-1 text-sm text-gray-900">
                {n.items.map((item, itemIdx) => (
                  <li key={`ol-${idx}-${itemIdx}`}>{renderInline(item, `ol-${idx}-${itemIdx}`)}</li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre key={`code-${idx}`} className="overflow-x-auto rounded-md bg-gray-900/90 p-3 text-xs text-gray-100">
                <code>{n.text}</code>
              </pre>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
