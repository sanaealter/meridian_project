import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, users } from "@/db/schema";

export const metadata = { title: "Audit log | Admin" };

export default async function AuditPage() {
  const rows = await db
    .select({ log: auditLog, actor: users.username })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(300);

  return (
    <div>
      <h1 className="text-2xl font-bold">Audit log</h1>
      <p className="mt-2 text-sm text-muted">Every change made from the admin panel, newest first.</p>
      <ul className="mt-6 divide-y divide-line border-y border-line text-sm">
        {rows.length === 0 && <li className="py-4 text-muted">No staff actions yet.</li>}
        {rows.map(({ log, actor }) => (
          <li key={log.id} className="py-3">
            <div className="flex flex-wrap gap-x-4">
              <span className="text-muted">{log.createdAt.toISOString().replace("T", " ").slice(0, 16)}</span>
              <span className="font-bold">{actor ?? "deleted user"}</span>
              <span className="text-cue">{log.action}</span>
              <span className="text-muted">
                {log.targetType} {log.targetId}
              </span>
            </div>
            {log.details && Object.keys(log.details).length > 0 && (
              <pre className="mt-2 overflow-x-auto rounded-lg bg-panel p-3 text-xs text-muted">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
