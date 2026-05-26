import { db, schema } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export default async function ConsultantsPage() {
  const consultants = db.select().from(schema.consultants).all();

  const statusColors: Record<string, string> = {
    available: "bg-green-100 text-green-700",
    busy: "bg-yellow-100 text-yellow-700",
    inactive: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consultants</h1>
        <p className="text-gray-500 mt-1">Manage consulting team members</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {consultants.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                  {c.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.specialty}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                {c.status}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p>{c.email}</p>
              {c.phone && <p>{c.phone}</p>}
              <p className="font-semibold text-gray-900 mt-3">{formatCurrency(c.rate)} / day</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
