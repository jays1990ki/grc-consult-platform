"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Download } from "lucide-react";

interface LogRow {
  id: number;
  user_id: number | null;
  user_name: string;
  user_email: string;
  action: string;
  module: string;
  target_id: number | null;
  target_name: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_STYLES: Record<string, string> = {
  login:              "bg-blue-100 text-blue-700",
  logout:             "bg-gray-100 text-gray-600",
  create:             "bg-green-100 text-green-700",
  update:             "bg-yellow-100 text-yellow-700",
  delete:             "bg-red-100 text-red-700",
  disable:            "bg-orange-100 text-orange-700",
  enable:             "bg-emerald-100 text-emerald-700",
  permission_update:  "bg-purple-100 text-purple-700",
  upload:             "bg-cyan-100 text-cyan-700",
  review:             "bg-indigo-100 text-indigo-700",
};

const MODULE_LABELS: Record<string, string> = {
  auth:               "Auth",
  users:              "Users",
  risk_assets:        "Assets",
  risk_assessments:   "Assessments",
  controls:           "Controls",
  portal_permissions: "Permissions",
  audit_projects:     "IT Audit",
  evidence_files:     "Evidence",
  gap_frameworks:     "Frameworks",
  gap_requirements:   "Requirements",
  business_processes: "BIA",
};

function formatDateTime(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("th-TH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return iso; }
}

export default function ActivityLogsPage() {
  const [rows,    setRows]    = useState<LogRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);

  const [search,  setSearch]  = useState("");
  const [action,  setAction]  = useState("");
  const [module,  setModule]  = useState("");
  const [ip,      setIp]      = useState("");
  const [from,    setFrom]    = useState("");
  const [to,      setTo]      = useState("");

  const LIMIT = 50;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("page",  String(p));
      q.set("limit", String(LIMIT));
      if (search) q.set("search", search);
      if (action) q.set("action", action);
      if (module) q.set("module", module);
      if (ip)     q.set("ip",     ip);
      if (from)   q.set("from",   from);
      if (to)     q.set("to",     to);

      const res = await fetch(`/api/logs?${q}`);
      if (!res.ok) return;
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [search, action, module, ip, from, to]);

  useEffect(() => { load(1); }, [load]);

  function exportCsv() {
    if (!rows.length) return;
    const headers = ["ID", "User", "Email", "Action", "Module", "Target", "Details", "IP", "Timestamp"];
    const lines = rows.map(r => [
      r.id, r.user_name, r.user_email, r.action, r.module,
      r.target_name ?? "", r.details ?? "", r.ip_address ?? "", r.created_at
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-500 mt-1 text-sm">Track all user actions — login, logout, create, edit, delete</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load(1)}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load(1)}
              placeholder="Search name, email, target…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          {/* Action */}
          <select value={action} onChange={e => setAction(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">All Actions</option>
            {Object.keys(ACTION_STYLES).map(a => (
              <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1).replace(/_/g, " ")}</option>
            ))}
          </select>
          {/* Module */}
          <select value={module} onChange={e => setModule(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">All Modules</option>
            {Object.entries(MODULE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {/* IP Address filter — A09 */}
          <input
            value={ip} onChange={e => setIp(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(1)}
            placeholder="Filter by IP…"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
          />
          {/* Date range */}
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <span className="text-gray-400 text-xs">–</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="text-sm text-gray-500">
        Found <strong className="text-gray-700">{total.toLocaleString()}</strong> records
        {total > LIMIT && ` — showing page ${page} of ${totalPages}`}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Timestamp", "User", "Action", "Module", "Target", "Details", "IP"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <RefreshCw size={20} className="animate-spin inline mr-2" />Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">No logs found.</td>
              </tr>
            )}
            {!loading && rows.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800 text-xs">{r.user_name}</p>
                  <p className="text-gray-400 text-xs">{r.user_email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ACTION_STYLES[r.action] ?? "bg-gray-100 text-gray-600"}`}>
                    {r.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {MODULE_LABELS[r.module] ?? r.module}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {r.target_name ?? <span className="text-gray-300">—</span>}
                  {r.target_id && <span className="text-gray-400 ml-1">#{r.target_id}</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[240px] truncate" title={r.details ?? ""}>
                  {r.details ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{r.ip_address ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => load(page - 1)} disabled={page <= 1 || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
          >
            ← Previous
          </button>
          <span className="text-gray-500">Page {page} / {totalPages}</span>
          <button
            onClick={() => load(page + 1)} disabled={page >= totalPages || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
