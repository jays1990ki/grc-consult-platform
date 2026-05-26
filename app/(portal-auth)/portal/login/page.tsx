"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function PortalLoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "เข้าสู่ระบบไม่สำเร็จ"); return; }
      router.push("/portal/dashboard");
      router.refresh();
    } catch { setError("Network error — please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center">
          {/* Logo */}
          <div className="bg-white rounded-3xl p-4 inline-flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Image src="/cat-logo.png" alt="CAT INFONET" width={100} height={100} priority />
          </div>
          <h1 className="text-3xl font-black mb-1">CAT INFONET</h1>
          <p className="text-xl font-semibold text-blue-100">Risk Assessment Portal</p>
          <p className="mt-4 text-blue-200 text-sm leading-relaxed">
            แพลตฟอร์มประเมินความเสี่ยงสารสนเทศตามมาตรฐาน ISO 27001:2022
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-left">
            {[
              { icon: "🗄️", label: "Asset Register",     sub: "ลงทะเบียนสินทรัพย์" },
              { icon: "⚖️", label: "Risk Assessment",    sub: "ประเมินความเสี่ยง" },
              { icon: "🛡️", label: "ISO 27001 Controls", sub: "จับคู่มาตรการ" },
              { icon: "📊", label: "Exec Dashboard",     sub: "สรุปผล Compliance" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="bg-white bg-opacity-10 rounded-xl p-3">
                <span className="text-2xl">{icon}</span>
                <p className="font-semibold text-sm mt-1">{label}</p>
                <p className="text-xs text-blue-200">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center bg-white rounded-2xl p-3 shadow-md mb-3">
              <Image src="/cat-logo.png" alt="CAT INFONET" width={56} height={56} priority />
            </div>
            <p className="font-black text-xl text-gray-900">CAT INFONET</p>
            <p className="text-sm text-gray-500">Risk Assessment Portal</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {/* Logo header inside card */}
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
              <Image src="/cat-logo.png" alt="CAT INFONET" width={44} height={44} className="rounded-lg" />
              <div>
                <p className="font-bold text-gray-900 text-sm">CAT INFONET</p>
                <p className="text-xs text-gray-400">Risk Assessment Portal</p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">ยินดีต้อนรับ</h2>
            <p className="text-sm text-gray-500 mb-6">เข้าสู่ระบบเพื่อใช้งาน Risk Portal</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">อีเมล</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="yourname@mecorp.th" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสผ่าน</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="••••••••" />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">{error}</p>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition text-sm shadow-sm">
                {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                ติดต่อ Admin หากลืมรหัสผ่านหรือต้องการสิทธิ์เข้าถึง
              </p>
              <a href="/login" className="mt-2 inline-block text-xs text-gray-400 hover:text-blue-600 transition">
                → Admin Portal
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
