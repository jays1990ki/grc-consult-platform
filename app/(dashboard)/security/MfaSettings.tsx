"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, Smartphone, KeyRound, CheckCircle2, XCircle } from "lucide-react";

export default function MfaSettings({ mfaEnabled }: { mfaEnabled: boolean }) {
  const router = useRouter();

  // ── Enable flow state ─────────────────────────────────────────────────────
  const [showSetup, setShowSetup]     = useState(false);
  const [qrDataUrl, setQrDataUrl]     = useState("");
  const [secret, setSecret]           = useState("");
  const [setupCode, setSetupCode]     = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError]   = useState("");

  // ── Disable flow state ────────────────────────────────────────────────────
  const [showDisable, setShowDisable]   = useState(false);
  const [disablePass, setDisablePass]   = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState("");

  // ── Success banner ────────────────────────────────────────────────────────
  const [success, setSuccess] = useState("");

  // ── Load QR code ─────────────────────────────────────────────────────────
  async function startSetup() {
    setSetupError(""); setSetupCode(""); setQrDataUrl(""); setSecret("");
    setShowSetup(true);
    const res  = await fetch("/api/auth/mfa-setup");
    const data = await res.json();
    if (!res.ok) { setSetupError(data.error || "Failed to generate QR code"); return; }
    setQrDataUrl(data.qrDataUrl);
    setSecret(data.secret);
  }

  // ── Confirm setup ─────────────────────────────────────────────────────────
  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setSetupLoading(true); setSetupError("");
    const res  = await fetch("/api/auth/mfa-enable", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ secret, code: setupCode }),
    });
    const data = await res.json();
    setSetupLoading(false);
    if (!res.ok) { setSetupError(data.error || "Incorrect code"); return; }
    setShowSetup(false);
    setSuccess("MFA has been enabled. Your account is now protected with two-factor authentication.");
    router.refresh();
  }

  // ── Disable MFA ──────────────────────────────────────────────────────────
  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setDisableLoading(true); setDisableError("");
    const res  = await fetch("/api/auth/mfa-disable", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password: disablePass }),
    });
    const data = await res.json();
    setDisableLoading(false);
    if (!res.ok) { setDisableError(data.error || "Incorrect password"); return; }
    setShowDisable(false); setDisablePass("");
    setSuccess("MFA has been disabled.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="ml-auto text-green-600 hover:text-green-800">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* MFA status card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${mfaEnabled ? "bg-green-100" : "bg-gray-100"}`}>
            {mfaEnabled
              ? <ShieldCheck className="text-green-600" size={24} />
              : <ShieldOff className="text-gray-400" size={24} />
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-base font-semibold text-gray-900">
                Two-Factor Authentication (2FA)
              </h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                mfaEnabled
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {mfaEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {mfaEnabled
                ? "Your account is protected. A 6-digit code from your authenticator app is required at every login."
                : "Add an extra layer of security. A code from your phone is required in addition to your password."
              }
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          {mfaEnabled ? (
            <button
              onClick={() => { setShowDisable(true); setDisableError(""); setDisablePass(""); }}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl
                         hover:bg-red-50 transition"
            >
              Disable MFA
            </button>
          ) : (
            <button
              onClick={startSetup}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                         bg-blue-600 hover:bg-blue-700 rounded-xl transition"
            >
              <Smartphone size={16} />
              Enable MFA
            </button>
          )}
        </div>
      </div>

      {/* ── Setup modal ────────────────────────────────────────────────────── */}
      {showSetup && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Smartphone size={18} className="text-blue-500" />
            Set up Authenticator App
          </h3>

          <ol className="space-y-4 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="font-medium">Install an authenticator app</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Google Authenticator, Microsoft Authenticator, or Authy
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="font-medium mb-2">Scan this QR code</p>
                {qrDataUrl
                  ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={qrDataUrl} alt="MFA QR Code" width={180} height={180}
                         className="border border-gray-200 rounded-lg p-2 bg-white" />
                  )
                  : <div className="w-44 h-44 bg-gray-100 rounded-lg animate-pulse" />
                }
                {secret && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <KeyRound size={11} /> Manual entry key:
                    </p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono tracking-wider break-all">
                      {secret}
                    </code>
                  </div>
                )}
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div className="flex-1">
                <p className="font-medium mb-2">Enter the 6-digit code to confirm</p>
                <form onSubmit={confirmSetup} className="flex gap-2">
                  <input
                    type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                    value={setupCode}
                    onChange={e => setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono
                               text-lg tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                    autoComplete="one-time-code"
                  />
                  <button
                    type="submit"
                    disabled={setupLoading || setupCode.length !== 6 || !secret}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white
                               text-sm font-medium rounded-lg transition"
                  >
                    {setupLoading ? "Activating…" : "Activate"}
                  </button>
                  <button type="button" onClick={() => setShowSetup(false)}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition">
                    Cancel
                  </button>
                </form>
                {setupError && (
                  <p className="text-red-600 text-sm mt-2">{setupError}</p>
                )}
              </div>
            </li>
          </ol>
        </div>
      )}

      {/* ── Disable confirmation ──────────────────────────────────────────── */}
      {showDisable && (
        <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Disable Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500 mb-4">
            Enter your password to confirm. Your account will be less secure without MFA.
          </p>
          <form onSubmit={confirmDisable} className="flex gap-2">
            <input
              type="password"
              placeholder="Current password"
              value={disablePass}
              onChange={e => setDisablePass(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:ring-2 focus:ring-red-400 outline-none"
              autoComplete="current-password"
            />
            <button
              type="submit"
              disabled={disableLoading || !disablePass}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white
                         text-sm font-medium rounded-lg transition"
            >
              {disableLoading ? "Disabling…" : "Confirm Disable"}
            </button>
            <button type="button" onClick={() => setShowDisable(false)}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition">
              Cancel
            </button>
          </form>
          {disableError && <p className="text-red-600 text-sm mt-2">{disableError}</p>}
        </div>
      )}
    </div>
  );
}
