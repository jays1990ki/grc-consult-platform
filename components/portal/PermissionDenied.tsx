import Link from "next/link";
import { Lock } from "lucide-react";

interface PermissionDeniedProps {
  moduleName: string;
  moduleTh: string;
}

export default function PermissionDenied({ moduleName, moduleTh }: PermissionDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
        <Lock size={36} className="text-gray-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
      <p className="text-gray-500 mb-1">คุณยังไม่ได้รับสิทธิ์เข้าถึง <strong>{moduleName}</strong></p>
      <p className="text-sm text-gray-400 mb-6">กรุณาติดต่อ Admin เพื่อขอสิทธิ์ใช้งาน <em>{moduleTh}</em></p>
      <Link href="/portal/dashboard"
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
        ← กลับ Dashboard
      </Link>
    </div>
  );
}
