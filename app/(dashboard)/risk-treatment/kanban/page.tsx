import KanbanBoard from "@/components/risk/KanbanBoard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function KanbanPage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/risk-treatment"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition mb-2">
          <ChevronLeft size={12} /> Treatment Plan
        </Link>
        <p className="text-xs text-gray-400">
          Risk Assessment → Treatment Plan → <span className="text-gray-700 font-medium">Kanban Board</span>
        </p>
      </div>
      <KanbanBoard orgId={1} />
    </div>
  );
}
