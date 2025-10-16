"use client";

import { useEffect, useState } from "react";
import {
  getToken,
  meRequest,
  registerRequest,
  deleteUserAccount,
  type RegisterBody,
  listUsers,
  type UserSummary,
} from "@/lib/api";
import { UserCircleIcon, UserPlusIcon, EyeIcon, EyeSlashIcon, UsersIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  cardSurfaceClass,
  primaryButtonClass,
  secondaryButtonClass,
  fieldInputClass,
  fieldSelectClass,
  fieldBaseClass,
  alertStyles,
  toggleInputClass,
  loadingToastClass,
} from "@/styles/design";
import { formatRoleLabel, getRoleOptions, normalizeRoleValue } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";

export default function AuthenticationPage() {
  const [me, setMe] = useState<any>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [meLoading, setMeLoading] = useState<boolean>(false);

  const [form, setForm] = useState<RegisterBody>({ username: "", email: "", password: "", full_name: "", role: "STUDENT" });
  const [regLoading, setRegLoading] = useState<boolean>(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [retype, setRetype] = useState<string>("");
  const [showPwd, setShowPwd] = useState(false);
  const [showRetype, setShowRetype] = useState(false);
  const mismatch = form.password !== retype && retype.length > 0;

  // Users list state
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [limit, setLimit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const currentRole = normalizeRoleValue(me?.role ?? me?.user?.role);
  const creationRoleOptions = getRoleOptions(currentRole === "SUPER_ADMIN");
  const filterRoleOptions = getRoleOptions(true);
  const showDeleteActions = currentRole === "SUPER_ADMIN";
  const tableColumnCount = showDeleteActions ? 7 : 6;
  const meId = me?.id ?? me?.user?.id ?? null;

  useEffect(() => {
    if (!creationRoleOptions.length) return;
    if (form.role && creationRoleOptions.some((option) => option.value === form.role)) return;
    const fallback =
      creationRoleOptions.find((option) => option.value === "STUDENT") ??
      creationRoleOptions[creationRoleOptions.length - 1];
    if (fallback && form.role !== fallback.value) {
      setForm((prev) => ({ ...prev, role: fallback.value }));
    }
  }, [creationRoleOptions, form.role]);

  async function refreshUsers() {
    const token = getToken();
    if (!token) { setUsersError("Missing token."); return; }
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await listUsers(token, {
        search: search || undefined,
        role: roleFilter || undefined,
        is_active: activeOnly ? true : undefined,
        limit,
        offset,
      });
      setUsers(data);
    } catch (e: any) {
      setUsersError(e?.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleDeleteUser(user: UserSummary) {
    if (!user?.id) return;
    if (!window.confirm(`Delete user ${user.username}? This action cannot be undone.`)) {
      return;
    }
    if (meId && user.id === meId) {
      setDeleteError("Cannot delete your own account.");
      return;
    }
    const token = getToken();
    if (!token) {
      setDeleteError("Missing token.");
      return;
    }
    setDeleteError(null);
    setDeleteSuccess(null);
    setDeletingUserId(user.id);
    try {
      const response = await deleteUserAccount(token, user.id);
      const successMessage = response?.message || `User ${user.username} deleted successfully.`;
      setDeleteSuccess(successMessage);
      await refreshUsers();
    } catch (err: any) {
      const message = err?.message || "Failed to delete user.";
      setDeleteError(message);
    } finally {
      setDeletingUserId(null);
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { setMeError("Missing token."); return; }
    setMeLoading(true);
    meRequest(token)
      .then((u) => { setMe(u); setMeError(null); })
      .catch((e) => setMeError(e?.message || "Failed to load profile."))
      .finally(() => setMeLoading(false));
  }, []);

  async function onRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    const token = getToken();
    if (!token) { setRegError("Missing token."); return; }
    if (form.password !== retype) {
      setRegError("Password and confirmation must match.");
      return;
    }
    setRegLoading(true);
    try {
      await registerRequest(token, form);
      setRegSuccess(`User ${form.username} created successfully.`);
      setForm({ username: "", email: "", password: "", full_name: "", role: "STUDENT" });
      setRetype("");
    } catch (err: any) {
      setRegError(err?.message || "Registration failed.");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={cardSurfaceClass}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary p-2"><UserCircleIcon className="size-5 text-white" /></span>
            <h2 className="text-lg font-semibold text-gray-900">Current User</h2>
          </div>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              const token = getToken();
              if (!token) { setMeError("Missing token."); return; }
              setMeLoading(true);
              meRequest(token)
                .then((u) => { setMe(u); setMeError(null); })
                .catch((e) => setMeError(e?.message || "Failed to load profile."))
                .finally(() => setMeLoading(false));
            }}
            disabled={meLoading}
          >
            {meLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {meError && <div className={`${alertStyles.error} mt-3`}>{meError}</div>}
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
              <div className="text-sm font-medium text-gray-900">{formatRoleLabel(me.role ?? me.user?.role)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created at</div>
              <div className="text-sm font-mono text-gray-900">{me.created_at || "-"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Users table */}
      <div className={cardSurfaceClass}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary p-2"><UsersIcon className="size-5 text-white" /></span>
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username/email"
              className={`w-56 ${fieldBaseClass}`}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter((e.target.value as UserRole) || "")}
              className={`w-40 ${fieldSelectClass}`}
            >
              <option value="">All roles</option>
              {filterRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-2xl border border-secondary/10 bg-secondary/5 px-3 py-2 text-sm text-secondary/70">
              <input
                type="checkbox"
                className={toggleInputClass}
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              Active
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 0)}
              className={`w-20 ${fieldBaseClass}`}
            />
            <input
              type="number"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value) || 0)}
              className={`w-20 ${fieldBaseClass}`}
            />
            <button
              type="button"
              onClick={refreshUsers}
              className={secondaryButtonClass}
              disabled={usersLoading}
            >
              {usersLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
        {deleteSuccess && <div className={`${alertStyles.success} mt-3`}>{deleteSuccess}</div>}
        {usersError && <div className={`${alertStyles.error} mt-3`}>{usersError}</div>}
        {deleteError && <div className={`${alertStyles.error} mt-3`}>{deleteError}</div>}
        <div className="mt-4 overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Full name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Active</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Created at</th>
                {showDeleteActions && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.length === 0 && (
                <tr>
                  <td colSpan={tableColumnCount} className="px-4 py-6 text-center text-sm text-gray-500">No data. Click Refresh to load.</td>
                </tr>
              )}
              {users.map((u)=>{
                const created = u.created_at ? new Date(u.created_at) : null;
                const format = (d: Date) => {
                  const pad=(n:number)=>String(n).padStart(2,'0');
                  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                };
                const isSelf = Boolean(meId && u.id === meId);
                const isDeleting = deletingUserId === u.id;
                const deleteDisabled = isSelf || isDeleting;
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{u.username}</div>
                      <div className="font-mono text-[11px] text-gray-500">{u.id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.full_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatRoleLabel(u.role)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{u.is_active ? 'active' : 'inactive'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{created ? <span className="font-mono text-xs">{format(created)}</span> : '-'}</td>
                    {showDeleteActions && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          disabled={deleteDisabled}
                          className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <TrashIcon className={`h-4 w-4 ${isDeleting ? "animate-spin" : ""}`} />
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className={cardSurfaceClass}>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary p-2"><UserPlusIcon className="size-5 text-white" /></span>
          <h2 className="text-lg font-semibold text-gray-900">Register New User (Admin only)</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">Create a new user. Requires an administrator or super administrator token.</p>
        <form onSubmit={onRegister} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-900">Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              className={`mt-1 ${fieldInputClass}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className={`mt-1 ${fieldInputClass}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Full name</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              className={`mt-1 ${fieldInputClass}`}
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
                className={`${fieldInputClass} pr-12 ${mismatch ? '!border-red-500 focus:!border-red-600 focus:!ring-red-200' : ''}`}
                aria-invalid={mismatch}
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
                className={`${fieldInputClass} pr-12 ${mismatch ? '!border-red-500 focus:!border-red-600 focus:!ring-red-200' : ''}`}
                aria-invalid={mismatch}
              />
              <button type="button" onClick={() => setShowRetype((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showRetype ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            {mismatch && (
              <p className="mt-1 text-xs text-red-600">Password and confirmation do not match.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Role</label>
            <select
              value={form.role ?? ""}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className={`mt-1 ${fieldSelectClass}`}
            >
              {creationRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={regLoading || mismatch}
            >
              {regLoading ? "Registering..." : "Create user"}
            </button>
          </div>
        </form>
        {regError && <div className={`${alertStyles.error} mt-3`}>{regError}</div>}
        {regSuccess && <div className={`${alertStyles.success} mt-3`}>{regSuccess}</div>}
      </div>
      {(meLoading || usersLoading || regLoading) && (
        <div className={loadingToastClass}>
          <span className="size-3 animate-spin rounded-full border-2 border-secondary/60 border-t-transparent" />
          {meLoading
            ? "Loading profile..."
            : usersLoading
            ? "Loading users..."
            : "Registering new user..."}
        </div>
      )}
    </div>
  );
}
