import { db, schema } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function InvoicesPage() {
  const invoices = db.select().from(schema.invoices).all();

  const statusColors: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    sent: "bg-blue-100 text-blue-700",
    draft: "bg-gray-100 text-gray-600",
    overdue: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 mt-1">Manage billing and payments</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Invoice #", "Client", "Amount", "Status", "Issued", "Due Date"].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono font-medium text-gray-900">{inv.invoiceNumber}</td>
                <td className="px-6 py-4 text-gray-600">{inv.clientName}</td>
                <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(inv.amount)}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{formatDate(inv.issuedDate)}</td>
                <td className="px-6 py-4 text-gray-500">{formatDate(inv.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
