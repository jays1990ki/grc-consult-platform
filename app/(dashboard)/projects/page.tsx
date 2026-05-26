import { db, schema } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ProjectsPage() {
  const projects = db.select().from(schema.projects).all();
  const consultants = db.select().from(schema.consultants).all();
  const consultantMap = Object.fromEntries(consultants.map(c => [c.id, c.name]));

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    on_hold: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-gray-500 mt-1">Track all consulting engagements</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Project", "Client", "Consultant", "Budget", "Status", "End Date"].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.description?.slice(0, 50)}…</p>
                </td>
                <td className="px-6 py-4 text-gray-600">{p.clientName}</td>
                <td className="px-6 py-4 text-gray-600">{p.consultantId ? consultantMap[p.consultantId] ?? "-" : "-"}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{formatCurrency(p.budget)}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {p.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{formatDate(p.endDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
