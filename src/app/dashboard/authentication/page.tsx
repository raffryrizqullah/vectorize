"use client";

import { useEffect, useState } from "react";
import { getToken, meRequest, registerRequest, type RegisterBody } from "@/lib/api";
import { UserCircleIcon, UserPlusIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function AuthenticationPage() {
  const [me, setMe] = useState<any>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [meLoading, setMeLoading] = useState<boolean>(false);

  const [form, setForm] = useState<RegisterBody>({ username: "", email: "", password: "", full_name: "", role: "student" });
  const [regLoading, setRegLoading] = useState<boolean>(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [retype, setRetype] = useState<string>("");
  const [showPwd, setShowPwd] = useState(false);
  const [showRetype, setShowRetype] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { setMeError("Tidak ada token"); return; }
    setMeLoading(true);
    meRequest(token)
      .then((u) => { setMe(u); setMeError(null); })
      .catch((e) => setMeError(e?.message || "Gagal memuat profil"))
      .finally(() => setMeLoading(false));
  }, []);

  async function onRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    const token = getToken();
    if (!token) { setRegError("Tidak ada token"); return; }
    if (form.password !== retype) {
      setRegError("Password dan Retype password harus sama.");
      return;
    }
    setRegLoading(true);
    try {
      await registerRequest(token, form);
      setRegSuccess(`User ${form.username} berhasil dibuat.`);
      setForm({ username: "", email: "", password: "", full_name: "", role: "student" });
      setRetype("");
    } catch (err: any) {
      setRegError(err?.message || "Register gagal");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-background p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary p-2"><UserCircleIcon className="size-5 text-white" /></span>
            <h2 className="text-lg font-semibold text-gray-900">Current User</h2>
          </div>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            onClick={() => {
              const token = getToken();
              if (!token) { setMeError("Tidak ada token"); return; }
              setMeLoading(true);
              meRequest(token)
                .then((u) => { setMe(u); setMeError(null); })
                .catch((e) => setMeError(e?.message || "Gagal memuat profil"))
                .finally(() => setMeLoading(false));
            }}
            disabled={meLoading}
          >
            {meLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {meError && <p className="mt-2 text-sm text-red-600">{meError}</p>}
        {me && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-gray-500">Username</div>
              <div className="text-sm font-medium text-gray-900">{me.username}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Email</div>
              <div className="text-sm font-medium text-gray-900">{me.email}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Full name</div>
              <div className="text-sm font-medium text-gray-900">{me.full_name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Role</div>
              <div className="text-sm font-medium text-gray-900">{me.role}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created at</div>
              <div className="text-sm font-mono text-gray-900">{me.created_at || "-"}</div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-background p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary p-2"><UserPlusIcon className="size-5 text-white" /></span>
          <h2 className="text-lg font-semibold text-gray-900">Register New User (Admin only)</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">Buat user baru. Butuh token admin.</p>
        <form onSubmit={onRegister} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-900">Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:outline-2 focus:outline-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:outline-2 focus:outline-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Full name</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:outline-2 focus:outline-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Password</label>
            <div className="relative mt-1">
              <input
                type={showPwd ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="block w-full rounded-md border border-gray-300 bg-white p-2 pr-9 text-sm text-gray-900 focus:outline-2 focus:outline-primary"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPwd ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Retype Password</label>
            <div className="relative mt-1">
              <input
                type={showRetype ? "text" : "password"}
                value={retype}
                onChange={(e) => setRetype(e.target.value)}
                required
                className="block w-full rounded-md border border-gray-300 bg-white p-2 pr-9 text-sm text-gray-900 focus:outline-2 focus:outline-primary"
              />
              <button type="button" onClick={() => setShowRetype((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showRetype ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:outline-2 focus:outline-primary"
            >
              <option value="student">student</option>
              <option value="lecturer">lecturer</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              disabled={regLoading}
            >
              {regLoading ? "Registering..." : "Create user"}
            </button>
            {regError && <span className="text-sm text-red-600">{regError}</span>}
            {regSuccess && <span className="text-sm text-green-700">{regSuccess}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
