import { platformStats } from "@/lib/queries";
import { FEE_BPS, money, rating } from "@/lib/format";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Open statistics" };

export default async function StatsPage() {
  const s = await platformStats();
  const groups = [
    {
      title: "Marketplace",
      items: [
        ["Registered users", s.users],
        ["Mappers offering work", s.sellers],
        ["Active services", s.services],
      ],
    },
    {
      title: "Orders",
      items: [
        ["Orders opened", s.ordersTotal],
        ["Orders completed", s.ordersCompleted],
        ["Orders in dispute now", s.ordersDisputed],
      ],
    },
    {
      title: "Money",
      items: [
        ["Paid to mappers (completed orders)", money(s.volumeCents)],
        [`Meridian fees collected (${FEE_BPS / 100}%)`, money(s.feesCents)],
      ],
    },
    {
      title: "Reviews",
      items: [
        ["Published reviews", s.reviews],
        ["Average rating", rating(s.avgRating)],
      ],
    },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <PageTitle sub="Every number here is calculated live from the orders and reviews on Meridian.">
        Open statistics
      </PageTitle>
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="text-lg font-bold">{g.title}</h2>
            <dl className="mt-3 divide-y divide-line border-y border-line">
              {g.items.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-display">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
