import Link from "next/link";
import { listServices, platformStats } from "@/lib/queries";
import { FEE_BPS, rating } from "@/lib/format";
import { ServiceRow } from "@/components/service-row";

const steps = [
  {
    title: "Send a request",
    body: "Pick a mapper, describe the song and the difficulties you want. The mapper confirms the final price.",
  },
  {
    title: "Pay into escrow",
    body: "Your payment is held by Meridian, not the mapper. Nobody can change the price after you pay.",
  },
  {
    title: "Get your map",
    body: "The mapper delivers a link to the beatmap. Ask for revisions or open a dispute if it isn't what you agreed.",
  },
  {
    title: "Approve and review",
    body: "Money is released only when you approve. Your review appears on the mapper's public profile.",
  },
];

export default async function Home() {
  const [stats, featured] = await Promise.all([platformStats(), listServices({ verifiedOnly: true, limit: 6 })]);

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">Order osu! maps from mappers you can check.</h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Every mapper on Meridian signs in with osu!, so their ranked maps and reviews are real. Your payment is held
            until you approve the map.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sellers" className="btn btn-primary">
              Find a mapper
            </Link>
            <Link href="/dashboard/services/new" className="btn btn-ghost">
              Offer your mapping
            </Link>
          </div>
        </div>
        <HitCircle />
      </section>

      <section className="border-y border-line bg-panel/40">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
          <Stat label="Mappers offering work" value={stats.sellers} />
          <Stat label="Completed orders" value={stats.ordersCompleted} />
          <Stat label="Average rating" value={rating(stats.avgRating)} />
          <Stat label="Meridian fee" value={`${FEE_BPS / 100}%`} />
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold">How an order works</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t-2 border-cue pt-4">
              <span className="font-display text-cue">{i + 1}</span>
              <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">Verified mappers</h2>
          <Link href="/sellers" className="text-cue hover:underline">
            See all mappers
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="mt-6 text-muted">The first verified mappers are being onboarded.</p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {featured.map((row) => (
              <li key={row.service.id}>
                <ServiceRow row={row} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-display text-2xl">{value}</dd>
    </div>
  );
}

/** A single osu! hit circle with its approach ring closing in, played once on load. */
function HitCircle() {
  return (
    <div aria-hidden className="relative mx-auto hidden aspect-square w-full max-w-xs place-items-center md:grid">
      <div className="approach-ring absolute size-48 rounded-full border-4 border-cue" />
      <div className="hit-circle relative grid size-48 place-items-center rounded-full border-[6px] border-ink bg-panel-2">
        <span className="font-display text-6xl font-bold">1</span>
      </div>
    </div>
  );
}
