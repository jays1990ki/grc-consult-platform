"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, RefreshCw,
  Clock, Loader2, Download, ChevronLeft, User, Calendar,
  MessageSquare, Save, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface EvidenceRequest {
  id: number;
  audit_project_id: number;
  requirement_id: string | null;
  evidence_name: string;
  evidence_description: string | null;
  assigned_owner: string | null;
  due_date: string | null;
  status: string;
}

export interface EvidenceFile {
  id: number;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  version_number: number;
  auditor_comment: string | null;
  review_status: string | null;
  review_date: string | null;
  created_at: string;
}

interface Props {
  evidence: EvidenceRequest;
  initialFiles: EvidenceFile[];
  projectName: string;
  orgId?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  "Not Submitted": "bg-gray-100 text-gray-600",
  "Submitted":     "bg-blue-100 text-blue-700",
  "Under Review":  "bg-amber-100 text-amber-700",
  "Pass":          "bg-green-100 text-green-700",
  "Fail":          "bg-red-100 text-red-700",
  "Need Revision": "bg-orange-100 text-orange-700",
};

function fmtSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return d.slice(0, 10);
}

function fmtDateTime(d: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric",
                                       hour: "2-digit", minute: "2-digit" });
}

function fileIcon(mime: string): string {
  if (mime.includes("pdf"))   return "📄";
  if (mime.includes("word") || mime.includes("docx")) return "📝";
  if (mime.includes("excel") || mime.includes("xlsx") || mime.includes("spreadsheet")) return "📊";
  if (mime.includes("image")) return "🖼️";
  return "📎";
}

function isOverdue(ev: EvidenceRequest): boolean {
  if (!ev.due_date || ev.status === "Pass" || ev.status === "Fail") return false;
  return ev.due_date < new Date().toISOString().slice(0, 10);
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────
function DropZone({ onFile, uploading }: { onFile: (f: File) => void; uploading: boolean }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={e => { e.preventDefault(); setDragging(false); }}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
        dragging ? "border-blue-500 bg-blue-50 scale-[1.01]" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
      )}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) { onFile(file); e.target.value = ""; }
        }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="text-blue-500 animate-spin" />
          <p className="text-sm font-medium text-blue-600">Uploading…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload size={36} className={cn("transition-colors", dragging ? "text-blue-500" : "text-gray-400")} />
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {dragging ? "Drop file here" : "Drag & Drop or click to upload"}
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX, PNG, JPG · Max 10 MB</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EvidenceDetail({ evidence, initialFiles, projectName, orgId = 1 }: Props) {
  const router = useRouter();

  const [files,      setFiles]     = useState(initialFiles);
  const [status,     setStatus]    = useState(evidence.status);
  const [uploading,  setUploading] = useState(false);
  const [uploadErr,  setUploadErr] = useState<string | null>(null);
  const [uploadOk,   setUploadOk]  = useState(false);

  // Review panel state
  const [reviewStatus,  setReviewStatus]  = useState(evidence.status === "Pass" || evidence.status === "Fail" || evidence.status === "Need Revision" ? evidence.status : "Pass");
  const [reviewComment, setReviewComment] = useState(files[0]?.auditor_comment ?? "");
  const [savingReview,  setSavingReview]  = useState(false);
  const [reviewSaved,   setReviewSaved]   = useState(false);
  const [gapToast,      setGapToast]      = useState(false);

  const pid = evidence.audit_project_id;
  const eid = evidence.id;

  // ── Upload handler ───────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    setUploadErr(null);
    setUploadOk(false);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(
        `/api/audit/projects/${pid}/evidence/${eid}/upload?orgId=${orgId}`,
        { method: "POST", body: fd }
      );
      const data = await res.json();
      if (!res.ok) { setUploadErr(data.error ?? "Upload failed"); return; }

      setUploadOk(true);
      setStatus("Submitted");

      // Refetch files
      const evRes  = await fetch(`/api/audit/projects/${pid}/evidence/${eid}?orgId=${orgId}`);
      const evData = await evRes.json();
      setFiles(evData.files ?? []);

      setTimeout(() => setUploadOk(false), 3000);
    } catch {
      setUploadErr("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  }, [pid, eid, orgId]);

  // ── Review save handler ──────────────────────────────────────────────────
  const handleSaveReview = useCallback(async () => {
    setSavingReview(true);
    setReviewSaved(false);
    setGapToast(false);

    try {
      const res = await fetch(
        `/api/audit/projects/${pid}/evidence/${eid}?orgId=${orgId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status:          reviewStatus,
            auditor_comment: reviewComment || null,
            review_date:     new Date().toISOString(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error("Failed");

      setStatus(reviewStatus);
      setReviewSaved(true);
      if (data.gapCreated) setGapToast(true);

      // Refresh files to get updated auditor_comment
      const evRes  = await fetch(`/api/audit/projects/${pid}/evidence/${eid}?orgId=${orgId}`);
      const evData = await evRes.json();
      setFiles(evData.files ?? []);

      setTimeout(() => setReviewSaved(false), 3000);
    } finally {
      setSavingReview(false);
    }
  }, [pid, eid, orgId, reviewStatus, reviewComment]);

  const overdueMark = isOverdue(evidence);

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── GAP toast ─────────────────────────────────────────────────────── */}
      {gapToast && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Finding sent to GAP Analysis</p>
            <p className="text-xs text-amber-600 mt-0.5">
              A Non-Compliant entry has been automatically created in the GAP Analysis module for this requirement.
            </p>
          </div>
          <button onClick={() => setGapToast(false)} className="ml-auto text-amber-500 hover:text-amber-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Evidence header ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {/* Breadcrumb */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 mb-4 transition-colors"
        >
          <ChevronLeft size={14} />
          Back to {projectName}
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-gray-900">{evidence.evidence_name}</h1>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", STATUS_BADGE[status] ?? "bg-gray-100 text-gray-600")}>
                {status}
              </span>
              {evidence.requirement_id && (
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded font-mono">
                  {evidence.requirement_id}
                </span>
              )}
            </div>
            {evidence.evidence_description && (
              <p className="text-sm text-gray-500 mt-1">{evidence.evidence_description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              {evidence.assigned_owner && (
                <span className="flex items-center gap-1"><User size={11} />{evidence.assigned_owner}</span>
              )}
              {evidence.due_date && (
                <span className={cn("flex items-center gap-1", overdueMark && "text-red-600 font-semibold")}>
                  <Calendar size={11} />Due {fmtDate(evidence.due_date)}
                  {overdueMark && " ⚠ Overdue"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── File upload ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload size={16} className="text-blue-600" />
          Upload Evidence File
          {files.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium ml-1">
              Version {(files[0]?.version_number ?? 0) + 1} will be created
            </span>
          )}
        </h2>

        <DropZone onFile={handleUpload} uploading={uploading} />

        {uploadErr && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
            <AlertTriangle size={14} />
            {uploadErr}
          </div>
        )}
        {uploadOk && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2.5">
            <CheckCircle2 size={14} />
            File uploaded successfully! Status updated to Submitted.
          </div>
        )}
      </div>

      {/* ── Version history ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-gray-600" />
          Version History
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
        </h2>

        {files.length === 0 ? (
          <div className="py-8 text-center">
            <FileText size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map(f => (
              <div key={f.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border transition-colors",
                  f.version_number === files[0]?.version_number
                    ? "border-blue-200 bg-blue-50/40"
                    : "border-gray-100 bg-gray-50/40"
                )}
              >
                {/* File icon */}
                <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-lg shrink-0">
                  {fileIcon(f.file_type)}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`/uploads/evidence/${f.stored_filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sm text-gray-900 hover:text-blue-600 truncate"
                    >
                      {f.original_filename}
                    </a>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                      v{f.version_number}
                    </span>
                    {f.version_number === files[0]?.version_number && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{fmtSize(f.file_size)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><User size={10} />{f.uploaded_by}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{fmtDateTime(f.created_at)}</span>
                  </div>

                  {/* Auditor comment on this version */}
                  {f.auditor_comment && (
                    <div className="mt-2 flex items-start gap-2 text-xs">
                      <MessageSquare size={11} className={cn(
                        "mt-0.5 shrink-0",
                        f.review_status === "Pass"  ? "text-green-500" :
                        f.review_status === "Fail"  ? "text-red-500" : "text-amber-500"
                      )} />
                      <span className={cn(
                        "italic",
                        f.review_status === "Pass"  ? "text-green-700" :
                        f.review_status === "Fail"  ? "text-red-700" : "text-amber-700"
                      )}>
                        {f.review_status}: "{f.auditor_comment}"
                        {f.review_date && ` · ${fmtDate(f.review_date)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Download button */}
                <a
                  href={`/uploads/evidence/${f.stored_filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                >
                  <Download size={15} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Auditor review panel ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <MessageSquare size={16} className="text-purple-600" />
          Auditor Review
          {files.length === 0 && (
            <span className="text-xs text-gray-400 font-normal ml-1">(upload evidence first)</span>
          )}
        </h2>

        <div className="space-y-4">
          {/* Status dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Review Decision</label>
            <div className="flex gap-3 flex-wrap">
              {["Pass", "Fail", "Need Revision", "Under Review"].map(s => (
                <button
                  key={s}
                  onClick={() => setReviewStatus(s)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors",
                    reviewStatus === s
                      ? s === "Pass"          ? "border-green-500 bg-green-50 text-green-700"
                        : s === "Fail"        ? "border-red-500 bg-red-50 text-red-700"
                        : s === "Need Revision" ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                  )}
                >
                  {s === "Pass"          && <CheckCircle2 size={13} className="inline mr-1.5" />}
                  {s === "Fail"          && <AlertTriangle size={13} className="inline mr-1.5" />}
                  {s === "Need Revision" && <RefreshCw size={13} className="inline mr-1.5" />}
                  {s === "Under Review"  && <Clock size={13} className="inline mr-1.5" />}
                  {s}
                </button>
              ))}
            </div>
            {reviewStatus === "Fail" && evidence.requirement_id && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                ⚠ Saving as <strong>Fail</strong> will automatically create a <strong>Non-Compliant</strong> finding in GAP Analysis (Req: {evidence.requirement_id}).
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Auditor Comment
              {reviewStatus === "Fail" || reviewStatus === "Need Revision"
                ? " *"
                : " (optional)"}
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={4}
              placeholder={
                reviewStatus === "Fail"
                  ? "Describe what is missing or non-compliant…"
                  : reviewStatus === "Need Revision"
                  ? "Describe what needs to be corrected…"
                  : "Add notes for the auditee…"
              }
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
            />
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveReview}
              disabled={savingReview || files.length === 0}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors",
                reviewStatus === "Pass"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : reviewStatus === "Fail"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : reviewStatus === "Need Revision"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {savingReview ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Review
            </button>

            {reviewSaved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 size={14} />
                Review saved!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
