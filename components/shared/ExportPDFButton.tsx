"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

interface Props {
  /** API endpoint, e.g. "/api/pdf/risk-register?orgId=1" */
  href:      string;
  label?:    string;
  filename?: string;
  /** Tailwind className override for the button */
  className?: string;
}

export default function ExportPDFButton({
  href,
  label     = "Export PDF",
  filename,
  className = "flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;

      // Derive filename from Content-Disposition header or prop fallback
      const disp = res.headers.get("Content-Disposition") ?? "";
      const match = disp.match(/filename="?([^"]+)"?/);
      a.download  = match?.[1] ?? filename ?? "report.pdf";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate PDF");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleExport}
        disabled={loading}
        className={className}
        title={loading ? "Generating PDF…" : label}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Generating PDF…</span>
          </>
        ) : (
          <>
            <FileDown size={14} />
            <span>{label}</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-600 max-w-xs text-right">⚠ {error}</p>
      )}
    </div>
  );
}
