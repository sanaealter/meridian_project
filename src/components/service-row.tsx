import Link from "next/link";
import type { listServices } from "@/lib/queries";
import { money, rating, unitLabel } from "@/lib/format";
import { Avatar, ModeTag, VerifiedBadge } from "./ui";

type Row = Awaited<ReturnType<typeof listServices>>[number];

/** One service in a list. Stacks on phones, single line from the sm breakpoint. */
export function ServiceRow({ row, showRanked = false }: { row: Row; showRanked?: boolean }) {
  const { service, seller, avgRating, reviewCount } = row;
  return (
    <Link
      href={`/services/${service.id}`}
      className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 py-4 hover:bg-panel/50 sm:grid-cols-[auto_1fr_auto_7rem_9rem]"
    >
      <Avatar src={seller.image} name={seller.username} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{seller.username}</span>
          {seller.isVerified && <VerifiedBadge />}
          {showRanked && <span className="text-sm text-muted">{seller.rankedMapsets} ranked</span>}
        </div>
        <div className="text-muted sm:truncate">{service.title}</div>
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-3 sm:contents">
        <ModeTag mode={service.mode} />
        <span className="text-sm text-muted">
          {reviewCount > 0 ? `${rating(avgRating)} (${reviewCount})` : "New"}
        </span>
        <span className="ml-auto text-right sm:ml-0">
          <span className="font-bold">{money(service.priceCents)}</span>
          <span className="block text-sm text-muted">{unitLabel[service.pricingUnit]}</span>
        </span>
      </div>
    </Link>
  );
}
