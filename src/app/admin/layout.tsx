import Link from "next/link";
import { requireAdmin } from "@/lib/session";

const links = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/services", "Services"],
  ["/admin/orders", "Orders"],
  ["/admin/reviews", "Reviews"],
  ["/admin/audit", "Audit log"],
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[180px_1fr]">
      <nav className="flex flex-wrap gap-2 md:flex-col md:gap-1" aria-label="Admin">
        <span className="mb-2 hidden font-display text-gold md:block">Admin</span>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-muted hover:bg-panel hover:text-ink">
            {label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
