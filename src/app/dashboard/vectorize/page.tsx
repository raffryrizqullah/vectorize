"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken, uploadDocuments, listDocuments, type DocumentSummary } from "@/lib/api";
import { CloudArrowUpIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import {
  cardSurfaceClass,
  fieldInputClass,
  fieldBaseClass,
  primaryButtonClass,
  secondaryButtonClass,
  alertStyles,
} from "@/styles/design";
import { vectorizeUploadState } from "@/lib/vectorizeUploadState";

type LocalFile = {
  file: File;
  sourceLink?: string;
  status: "queued" | "uploading" | "processing" | "completed" | "failed";
  message?: string;
  chunks?: number;
  documentId?: string;
};

export default function VectorizePage() {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [sourceLinks, setSourceLinks] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [sensitivity, setSensitivity] = useState<"public" | "internal">("public");
  const [author, setAuthor] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fetchingList, setFetchingList] = useState(false);
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  const refreshList = useCallback(async () => {
    setListError(null);
    setFetchingList(true);
    const token = getToken();
    if (!token) { setListError("Missing token."); setFetchingList(false); return; }
    try {
      const data = await listDocuments(token, { filter: filter || undefined, limit: 2000 });
      setDocs(data?.documents || []);
    } catch (err: any) {
      setListError(err?.message || "Failed to load document list.");
    } finally {
      setFetchingList(false);
    }
  }, [filter]);

  const onChooseFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    if (loading) return;
    const selected: LocalFile[] = Array.from(list)
      .filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .map((f) => ({ file: f, status: "queued" as const }));
    setFiles((prev) => [...prev, ...selected]);
  }, [loading]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (loading) return;
    onChooseFiles(e.dataTransfer.files);
  }, [onChooseFiles, loading]);

  // Auto-adjust source link input rows to match files count
  useEffect(() => {
    setSourceLinks((prev) => {
      const next = prev.slice(0, files.length);
      while (next.length < files.length) next.push("");
      return next;
    });
  }, [files.length]);

  const handleUpload = useCallback(async () => {
    setError(null);
    setSuccessMsg(null);
    if (files.length === 0) {
      setError("Select at least one PDF file first.");
      return;
    }
    const token = getToken();
    if (!token) {
      setError("Missing token. Please log in again.");
      return;
    }

    // update local statuses to uploading
    setFiles((prev) => prev.map((f, i) => ({ ...f, status: "uploading" })));
    setLoading(true);
    vectorizeUploadState.begin();
    try {
      const meta: Record<string, any> = {};
      if (author) meta.author = author;
      if (department) meta.department = department;
      if (category) meta.kategori = category;
      // Sensitivity string metadata (use canonical English key expected by backend)
      meta["sensitivity"] = sensitivity;
      // Automatically add a client-side timestamp
      meta["client_upload_timestamp"] = new Date().toISOString();

      const cleanLinks = sourceLinks.map((s) => s.trim());
      const resp = await uploadDocuments(token, files.map((f) => f.file), cleanLinks, meta);

      // Handle both single and batch results
      let results = resp?.results ?? (resp?.document_id ? [resp as any] : []);

      setFiles((prev) => prev.map((f, idx) => {
        const r = results[idx];
        if (!r) return { ...f, status: "processing" };
        return {
          ...f,
          status: (r.status as any) || "completed",
          chunks: r?.metadata?.total_chunks,
          message: r?.message,
          documentId: r?.document_id,
          sourceLink: r?.source_link,
        };
      }));

      const totalChunks = results.reduce((sum: number, r: any) => sum + (r?.metadata?.total_chunks || 0), 0);
      const okCount = results.filter((r: any) => (r?.status || "").toLowerCase() === "completed").length;
      setSuccessMsg(`Upload successful: ${okCount}/${files.length} document${files.length === 1 ? "" : "s"}. Total chunks: ${totalChunks}.`);
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
      setFiles((prev) => prev.map((f) => ({ ...f, status: f.status === "uploading" ? "failed" : f.status })));
    } finally {
      setLoading(false);
      vectorizeUploadState.end();
    }
  }, [files, sourceLinks, category, sensitivity]);

  // keep overlay in sync across navigations within app
  useEffect(() => {
    const unsub = vectorizeUploadState.subscribe((uploading) => setLoading(uploading));
    return unsub;
  }, []);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <div className="text-sm text-gray-700">Uploading & processing documents...</div>
          </div>
        </div>
      )}
      <div className={`space-y-4 ${loading ? "blur-[2px] pointer-events-none" : ""}`}>
      <div className={cardSurfaceClass}>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary p-2"><CloudArrowUpIcon className="size-5 text-white" /></span>
          <h2 className="text-lg font-semibold text-gray-900">Upload Documents (PDF)</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">Upload one or more PDFs to process and index.</p>

        {/* Drag and drop */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="mt-4 flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-10"
        >
          <div className="text-center">
            <div className="mt-4 flex text-sm leading-6 text-gray-600">
              <label className="relative cursor-pointer rounded-md bg-white font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 hover:opacity-90">
                <span>Choose files</span>
                <input type="file" multiple accept="application/pdf" className="sr-only" onChange={(e) => onChooseFiles(e.target.files)} disabled={loading} />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs leading-5 text-gray-600">PDF only, reasonably sized for the server.</p>
          </div>
        </div>

        {/* Source links dynamic + metadata */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Source links (optional)</label>
            <div className="mt-1 space-y-2">
              {files.map((f, i) => (
                <input
                  key={`src-${i}`}
                  type="url"
                  value={sourceLinks[i] || ""}
                  onChange={(e) => setSourceLinks((prev) => {
                    const next = prev.slice();
                    next[i] = e.target.value;
                    return next;
                  })}
                  placeholder={`Link for: ${f.file.name}`}
                  className="input"
                  disabled={loading}
                />
              ))}
              {files.length === 0 && (
                <p className="hint">Add files to show per-file source link inputs.</p>
              )}
            </div>
            <p className="hint">Field count automatically matches the number of files.</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-2">
                <label className="field-label">Author</label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author name"
                  className="input"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Department</label>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Unit/Division"
                  className="input"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="field-label">Sensitivity</label>
                <div className="mt-1 inline-flex rounded-md border border-gray-300 bg-white p-0.5">
                  {(["public","internal"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => !loading && setSensitivity(opt)}
                      className={`px-3 py-1 text-sm ${sensitivity===opt ? 'bg-primary text-white' : 'text-gray-700'}`}
                      disabled={loading}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="field-label">Category</label>
              <div className="mt-1 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
                {[
                  "System & Service Documentation",
                  "IT Procedures & Policies",
                  "Security & Networking",
                  "Training & Tutorials",
                  "Reports & Audits",
                ].map((label) => (
                  <label key={label} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="category"
                      checked={category === label}
                      onChange={() => !loading && setCategory(label)}
                      className="size-4"
                      disabled={loading}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading || files.length === 0}
            className={primaryButtonClass}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
          <span className="text-xs text-gray-500">
            {files.length === 1 ? "1 file selected" : `${files.length} files selected`}
          </span>
        </div>

        {error && <div className={`${alertStyles.error} mt-3`}>{error}</div>}
        {successMsg && <div className={`${alertStyles.success} mt-3`}>{successMsg}</div>}
      </div>

      {/* List files */}
      {files.length > 0 && (
        <div className={cardSurfaceClass}>
          <h3 className="text-base font-semibold text-gray-900">File List</h3>
          <ul className="mt-3 divide-y divide-gray-200">
            {files.map((f, idx) => (
              <li key={`${f.file.name}-${idx}`} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.file.name}</p>
                  <p className="text-xs text-gray-600">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  {f.chunks !== undefined && (
                    <p className="text-xs text-gray-600">Chunks: {f.chunks}</p>
                  )}
                  {f.documentId && (
                    <p className="text-[11px] text-gray-500">ID: {f.documentId}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    f.status === "completed" ? "bg-green-100 text-green-700" :
                    f.status === "failed" ? "bg-red-100 text-red-700" :
                    f.status === "uploading" ? "bg-primary/10 text-primary" :
                    f.status === "processing" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{f.status}</span>
                  {f.status === 'queued' && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Documents table */}
      <div className={cardSurfaceClass}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary p-2"><DocumentTextIcon className="size-5 text-white" /></span>
            <h3 className="text-base font-semibold text-gray-900">Indexed Documents</h3>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter"
              className={`w-72 ${fieldBaseClass}`}
            />
            <button
              type="button"
              onClick={refreshList}
              className={secondaryButtonClass}
              disabled={fetchingList}
            >
              {fetchingList ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {listError && <div className={`${alertStyles.error} mt-3`}>{listError}</div>}

        <div className="mt-4 overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Author</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Source Links</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Deployed at</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Sensitivity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {docs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No data. Click Refresh to load.</td>
                </tr>
              )}
              {docs.map((d) => {
                const name = d.document_name || d.document_id;
                const meta = d.metadata || {};
                const authorName = d.author || meta.author || meta.Author || "-";
                const deployedRaw = d.client_upload_timestamp || meta.client_upload_timestamp || meta.upload_timestamp || "-";
                const formatTs = (ts: string) => {
                  if (!ts || typeof ts !== "string") return "-";
                  const dte = new Date(ts);
                  if (isNaN(dte.getTime())) return ts; // fallback show raw
                  const pad = (n: number) => String(n).padStart(2, "0");
                  const yyyy = dte.getFullYear();
                  const mm = pad(dte.getMonth() + 1);
                  const dd = pad(dte.getDate());
                  const HH = pad(dte.getHours());
                  const MM = pad(dte.getMinutes());
                  const SS = pad(dte.getSeconds());
                  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
                };
                const deployed = typeof deployedRaw === "string" ? formatTs(deployedRaw) : "-";
                const sensitiv = d.sensitivity || meta.Sensitivitas || meta.sensitivity || meta.sensitivitas || "-";
                const links: string[] = Array.isArray(d.source_links) ? d.source_links : [];
                return (
                  <tr key={d.document_id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{authorName}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {links.length === 0 ? (
                          <span className="text-sm text-gray-500">-</span>
                        ) : (
                          links.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200">
                              Link {i + 1}
                            </a>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Completed</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700"><span className="font-mono text-xs">{deployed}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{sensitiv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
