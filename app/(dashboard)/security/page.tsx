import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import MfaSettings from "./MfaSettings";

export default async function SecurityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = db
    .select({ mfaEnabled: schema.users.mfaEnabled })
    .from(schema.users)
    .where(eq(schema.users.id, session.id))
    .get();

  const mfaEnabled = user?.mfaEnabled === 1;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage two-factor authentication for your account
        </p>
      </div>

      <MfaSettings mfaEnabled={mfaEnabled} />
    </div>
  );
}
