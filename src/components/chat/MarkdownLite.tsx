"use client";

import React from "react";

type Node =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; text: string }
  | { type: "h1" | "h2" | "h3"; text: string };

function linkify(text: string) {
  const urlRe = /(https?:\/\/[^\s)]+)|((?:www\.)[^\s)]+)/gi;
  const parts: Array<string | JSX.Element> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    const idx = m.index;
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    const url = m[0];
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    parts.push(
      <a key={`${idx}-${url}`} href={href} target="_blank" rel="noopener noreferrer">
        {url}
      </a>,
    );
    lastIndex = idx + url.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function parse(md: string): Node[] {
  const out: Node[] = [];
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  let listBuf: string[] | null = null;
  let olistBuf: string[] | null = null;

  function flushBlocks() {
    if (inCode) {
      out.push({ type: "code", text: codeBuf.join("\n") });
      inCode = false;
      codeBuf = [];
    }
    if (listBuf) {
      out.push({ type: "ul", items: listBuf });
      listBuf = null;
    }
    if (olistBuf) {
      out.push({ type: "ol", items: olistBuf });
      olistBuf = null;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        flushBlocks();
        inCode = true;
        codeBuf = [];
      } else {
        // closing
        out.push({ type: "code", text: codeBuf.join("\n") });
        inCode = false;
        codeBuf = [];
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushBlocks();
      const level = h[1].length as 1 | 2 | 3;
      const text = h[2];
      out.push({ type: ("h" + level) as any, text });
      i++;
      continue;
    }
    const mUl = line.match(/^[-*]\s+(.*)$/);
    if (mUl) {
      if (!listBuf) { flushBlocks(); listBuf = []; }
      listBuf.push(mUl[1]);
      i++;
      continue;
    }
    const mOl = line.match(/^\d+\.\s+(.*)$/);
    if (mOl) {
      if (!olistBuf) { flushBlocks(); olistBuf = []; }
      olistBuf.push(mOl[1]);
      i++;
      continue;
    }
    if (line.trim() === "") {
      flushBlocks();
      i++;
      continue;
    }
    // paragraph
    flushBlocks();
    out.push({ type: "p", text: line });
    i++;
  }
  flushBlocks();
  return out;
}

export default function MarkdownLite({ text }: { text: string }) {
  const nodes = parse(text);
  return (
    <div className="md">
      {nodes.map((n, idx) => {
        switch (n.type) {
          case "h1":
            return (<h3 key={idx} style={{ fontWeight: 600, margin: "0 0 .35rem" }}>{linkify(n.text)}</h3>);
          case "h2":
            return (<h4 key={idx} style={{ fontWeight: 600, margin: "0 0 .35rem" }}>{linkify(n.text)}</h4>);
          case "h3":
            return (<h5 key={idx} style={{ fontWeight: 600, margin: "0 0 .35rem" }}>{linkify(n.text)}</h5>);
          case "p":
            return (<p key={idx}>{linkify(n.text)}</p>);
          case "ul":
            return (<ul key={idx}>{n.items.map((it, i) => <li key={i}>{linkify(it)}</li>)}</ul>);
          case "ol":
            return (<ol key={idx}>{n.items.map((it, i) => <li key={i}>{linkify(it)}</li>)}</ol>);
          case "code":
            return (<pre key={idx}><code>{n.text}</code></pre>);
        }
      })}
    </div>
  );
}

