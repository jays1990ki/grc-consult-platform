"use client";

import { useState } from "react";
import { UserPlus, Pencil, ToggleLeft, ToggleRight, History } from "lucide-react";
import UserFormModal from "./UserFormModal";

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin:   "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  viewer:  "bg-gray-100 text-gray-600",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

export default function UsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers]         = useState<UserRow[]>(initialUsers);
  const [modalUser, setModalUser] = useState<UserRow | null | undefined>(undefined); // undefined = closed
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function refresh() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  function openCreate() { setModalUser(null); }
  function openEdit(u: UserRow) { setModalUser(u); }
  function closeModal() { setModalUser(undefined); }

  async function handleToggle(u: UserRow) {
    if (!confirm(`${u.status === "active" ? "Disable" : "Enable"} user "${u.name}"?`)) return;
    setTogglingId(u.id);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      });
      if (res.ok) await refresh();
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage portal users and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/activity-logs"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
          >
            <History size={14} /> Activity Logs
          </a>
          <a
            href="/portal"
            target="_blank"
            className="flex items-center gap-2 text-sm font-medium text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
          >
            ↗ User Portal
          </a>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition"
          >
            <UserPlus size={14} /> New User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Name", "Email", "Role", "Status", "Created", "Actions"].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">No users found.</td>
              </tr>
            )}
            {users.map(u => (
              <tr key={u.id} className={`border-b border-gray-50 transition-colors ${u.status === "inactive" ? "opacity-60 bg-gray-50" : "hover:bg-gray-50"}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(u.created_at)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit user"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={togglingId === u.id}
                      className={`p-1.5 rounded-lg transition ${
                        u.status === "active"
                          ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                          : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                      }`}
                      title={u.status === "active" ? "Disable user" : "Enable user"}
                    >
                      {u.status === "active"
                        ? <ToggleRight size={18} />
                        : <ToggleLeft size={18} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stat bar */}
      <div className="flex gap-6 mt-4 text-xs text-gray-500">
        <span>Total: <strong className="text-gray-700">{users.length}</strong></span>
        <span>Active: <strong className="text-green-600">{users.filter(u => u.status === "active").length}</strong></span>
        <span>Inactive: <strong className="text-red-500">{users.filter(u => u.status === "inactive").length}</strong></span>
      </div>

      {/* Modal */}
      {modalUser !== undefined && (
        <UserFormModal
          user={modalUser}
          onClose={closeModal}
          onSaved={async () => { closeModal(); await refresh(); }}
        />
      )}
    </>
  );
}
