export type RetrievedDoc = {
  score?: number;
  metadata?: {
    source_link?: string | null;
    [k: string]: any;
  } | null;
};

export type SourceDoc = {
  metadata?: { source_link?: string | null; [k: string]: any } | null;
};

export type QueryApiResponse = {
  answer?: string;
  session_id?: string;
  sources?: { documents?: SourceDoc[] } | null;
  retrieved_documents?: RetrievedDoc[] | null;
  detail?: string;
  message?: string;
  error?: string;
};

function normalizeLink(v?: string | null): string | null {
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

export function formatQueryResponseToMarkdown(
  data: QueryApiResponse,
  opts?: { topK?: number; whatsapp?: string; title?: string }
): string {
  const topK = opts?.topK ?? 3;
  const wa = (opts?.whatsapp ?? "").trim();
  const title = opts?.title;

  const answer = (data?.answer ?? "").trim();
  const parts: string[] = [];

  if (title) parts.push(`# ${title}`);
  if (answer) parts.push(answer);

  // collect links from retrieved_documents (by score) then fallback to sources.documents
  let links: string[] = [];
  const retrieved = Array.isArray(data?.retrieved_documents)
    ? (data!.retrieved_documents as RetrievedDoc[])
    : [];

  if (retrieved.length > 0) {
    const sorted = [...retrieved].sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));
    for (const item of sorted.slice(0, topK)) {
      const link = normalizeLink(item?.metadata?.source_link ?? null);
      if (link) links.push(link);
    }
  } else if (Array.isArray(data?.sources?.documents)) {
    for (const d of data!.sources!.documents!) {
      const link = normalizeLink(d?.metadata?.source_link ?? null);
      if (link) links.push(link);
    }
  }

  const uniqueLinks = Array.from(new Set(links.filter(Boolean)));
  if (uniqueLinks.length > 0) {
    parts.push("**Sumber:**");
    uniqueLinks.forEach((l, i) => parts.push(`${i + 1}. ${l}`));
  }

  if (wa) {
    const waNum = wa.replace(/[^\d+]/g, "");
    const waLink = `https://wa.me/${waNum.replace(/^\+/,'')}`;
    parts.push(`Butuh bantuan? Hubungi IT Support via WhatsApp: ${waLink}`);
  }

  return parts.join("\n\n").trim();
}
