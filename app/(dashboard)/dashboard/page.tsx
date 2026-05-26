import { db, schema } from "@/lib/db";
import { count, sum } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { Users, UserCheck, FolderKanban, FileText } from "lucide-react";

export default async function DashboardPage() {
  const [userCount] = db.select({ c: count() }).from(schema.users).all();
  const [consultantCount] = db.select({ c: count() }).from(schema.consultants).all();
  const [projectCount] = db.select({ c: count() }).from(schema.projects).all();
  const [invoiceStats] = db.select({ c: count(), total: sum(schema.invoices.amount) }).from(schema.invoices).all();

  const recentProjects = db.select().from(schema.projects).limit(5).all();
  const recentInvoices = db.select().from(schema.invoices).limit(5).all();

  const stats = [
    { label: "Total Users", value: String(userCount.c), icon: Users, color: "bg-blue-500" },
    { label: "Consultants", value: String(consultantCount.c), icon: UserCheck, color: "bg-green-500" },
    { label: "Active Projects", value: String(projectCount.c), icon: FolderKanban, color: "bg-purple-500" },
    { label: "Total Revenue", value: formatCurrency(Number(invoiceStats.total) || 0), icon: FileText, color: "bg-orange-500" },
  ];

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    on_hold: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    paid: "bg-green-100 text-green-700",
    sent: "bg-blue-100 text-blue-700",
    draft: "bg-gray-100 text-gray-700",
    overdue: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back to ME Admin Portal</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
            <div className={`${color} p-3 rounded-xl text-white`}><Icon size={22} /></div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h2>
          <div className="space-y-3">
            {recentProjects.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-sm text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.clientName}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {p.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h2>
          <div className="space-y-3">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-sm text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">{inv.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.amount)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[inv.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
