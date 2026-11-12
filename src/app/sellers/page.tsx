import Link from "next/link";
import { listServices } from "@/lib/queries";
import { modeLabel } from "@/lib/format";
import { Empty, PageTitle } from "@/components/ui";
import { ServiceRow } from "@/components/service-row";
import type { GameMode } from "@/db/schema";

export const metadata = { title: "Find a mapper" };

const modes: GameMode[] = ["osu", "taiko", "fruits", "mania"];

export default async function SellersPage({ searchParams }: PageProps<"/sellers">) {
  const sp = await searchParams;
  const mode = typeof sp.mode === "string" ? sp.mode : undefined;
  const verifiedOnly = sp.verified === "1";
  const rows = await listServices({ mode, verifiedOnly });

  const href = (m?: string, v = verifiedOnly) => {
    const q = new URLSearchParams();
    if (m) q.set("mode", m);
    if (v) q.set("verified", "1");
    const s = q.toString();
    return s ? `/sellers?${s}` : "/sellers";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageTitle sub="Prices are set by each mapper. The final price is confirmed before you pay.">Find a mapper</PageTitle>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterLink href={href(undefined)} active={!mode}>
          All modes
        </FilterLink>
        {modes.map((m) => (
          <FilterLink key={m} href={href(m)} active={mode === m}>
            {modeLabel[m]}
          </FilterLink>
        ))}
        <span className="mx-2 h-5 w-px bg-line" />
        <FilterLink href={href(mode, !verifiedOnly)} active={verifiedOnly}>
          Verified only
        </FilterLink>
      </div>

      {rows.length === 0 ? (
        <Empty>No services match these filters yet.</Empty>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((row) => (
              <li key={row.service.id}>
                <ServiceRow row={row} showRanked />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm ${
        active ? "border-cue bg-cue text-night" : "border-line text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
