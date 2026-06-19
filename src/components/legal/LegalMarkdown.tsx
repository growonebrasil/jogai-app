// Lightweight markdown renderer for legal docs (headings, bold, lists, paragraphs).
// Keeps deps minimal — no external markdown lib needed.
import { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={`b-${i++}`} className="text-foreground">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function LegalMarkdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const nodes: ReactNode[] = [];
  let listBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!listBuf.length) return;
    nodes.push(
      <ul key={`ul-${key++}`} className="list-disc pl-6 space-y-1 text-muted-foreground my-3">
        {listBuf.map((it, i) => <li key={i}>{inline(it)}</li>)}
      </ul>
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) { listBuf.push(line.slice(2)); continue; }
    flushList();
    if (!line.trim()) continue;
    if (line.startsWith("# ")) {
      nodes.push(<h1 key={key++} className="font-display text-2xl font-bold text-foreground mt-2 mb-3">{inline(line.slice(2))}</h1>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h2 key={key++} className="font-display text-lg font-bold text-primary mt-5 mb-2">{inline(line.slice(3))}</h2>);
    } else {
      nodes.push(<p key={key++} className="text-sm text-muted-foreground leading-relaxed my-2">{inline(line)}</p>);
    }
  }
  flushList();
  return <div className="space-y-1">{nodes}</div>;
}
