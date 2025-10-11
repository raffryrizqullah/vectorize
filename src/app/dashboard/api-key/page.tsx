"use client";

import { useEffect, useState } from "react";
import { getToken, createApiKey, listApiKeys, revokeApiKey, type ApiKeyItem } from "@/lib/api";
import { KeyIcon } from "@heroicons/react/24/outline";

export default function ApiKeyPage() {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const token = getToken();
    if (!token) { setError("Tidak ada token"); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await listApiKeys(token);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat API keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setCreatedKey(null);
    const token = getToken();
    if (!token) { setCreateError("Tidak ada token"); return; }
    if (!userId || !name) { setCreateError("User ID dan Name wajib diisi."); return; }
    setCreating(true);
    try {
      const res = await createApiKey(token, { user_id: userId, name });
      if (res.api_key) setCreatedKey(res.api_key);
      setName("");
      await refresh();
    } catch (e: any) {
      setCreateError(e?.message || "Gagal membuat API key");
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(id: string) {
    const token = getToken();
    if (!token) { setError("Tidak ada token"); return; }
    if (!confirm("Revoke API key ini?")) return;
    try {
      await revokeApiKey(token, id);
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Gagal revoke");
    }
  }

  return (
    <div className="space-y-4">
      {/* Create API key */}
      <div className="rounded-lg border border-gray-200 bg-background p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary p-2"><KeyIcon className="size-5 text-white" /></span>
          <h2 className="text-lg font-semibold text-gray-900">Create API Key</h2>
        </div>
        <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="field-label">User ID</label>
            <input value={userId} onChange={(e)=>setUserId(e.target.value)} className="input" placeholder="UUID user" required />
          </div>
          <div className="sm:col-span-1">
            <label className="field-label">Name</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="input" placeholder="Nama penggunaan key" required />
          </div>
          <div className="sm:col-span-1 flex items-end">
            <button type="submit" className="btn-primary" disabled={creating}>{creating?"Creating...":"Create"}</button>
          </div>
        </form>
        {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
        {createdKey && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Copy your API key now (shown only once):</p>
            <div className="mt-2 flex items-center justify-between rounded bg-white px-3 py-2 text-gray-900">
              <span className="font-mono text-xs break-all">{createdKey}</span>
              <button type="button" onClick={()=>navigator.clipboard.writeText(createdKey)} className="ml-3 rounded bg-primary px-2 py-1 text-xs text-white">Copy</button>
            </div>
          </div>
        )}
      </div>

      {/* List API keys */}
      <div className="rounded-lg border border-gray-200 bg-background p-6 shadow-xs">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary p-2"><KeyIcon className="size-5 text-white" /></span>
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          </div>
          <button type="button" onClick={refresh} className="btn-primary" disabled={loading}>{loading?"Loading...":"Refresh"}</button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Key prefix</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Active</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Last used</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">Tidak ada data.</td></tr>
              )}
              {items.map((k) => {
                const format = (s?: string | null) => {
                  if (!s) return '-';
                  const d = new Date(s);
                  if (isNaN(d.getTime())) return s;
                  const pad=(n:number)=>String(n).padStart(2,'0');
                  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                };
                return (
                  <tr key={k.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{k.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{k.username || k.user_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{k.key_prefix}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{k.is_active ? 'active' : 'revoked'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700"><span className="font-mono text-xs">{format(k.created_at)}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-700"><span className="font-mono text-xs">{format(k.last_used_at)}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={()=>onRevoke(k.id)} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:opacity-90">Revoke</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
