import Link from "next/link";
import type { GameMode, OrderStatus } from "@/db/schema";
import { modeLabel, statusLabel } from "@/lib/format";

export function Avatar({ src, name, size = 40 }: { src?: string | null; name?: string | null; size?: number }) {
  if (!src) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-panel-2 font-bold text-muted"
        style={{ width: size, height: size }}
      >
        {(name ?? "?").slice(0, 1).toUpperCase()}
      </span>
    );
  }
  // osu! avatars are served from a.ppy.sh; a plain img keeps config simple.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className="rounded-full" style={{ width: size, height: size }} />;
}

export function VerifiedBadge() {
  return (
    <span
      title="Meridian Member: identity and portfolio checked by Meridian staff"
      className="inline-flex items-center gap-1 rounded-full border border-gold/60 px-2 py-0.5 text-xs font-bold text-gold"
    >
      <span aria-hidden>●</span> Verified
    </span>
  );
}

export function ModeTag({ mode }: { mode: GameMode }) {
  return <span className="rounded-md bg-panel-2 px-2 py-0.5 text-sm text-muted">{modeLabel[mode]}</span>;
}

const statusTone: Record<OrderStatus, string> = {
  requested: "text-muted border-line",
  accepted: "text-cue border-cue/50",
  in_progress: "text-cue border-cue/50",
  delivered: "text-gold border-gold/50",
  completed: "text-ink border-line",
  cancelled: "text-muted border-line",
  disputed: "text-alert border-alert/60",
};

export function StatusTag({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-sm ${statusTone[status]}`}>{statusLabel[status]}</span>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="text-gold" aria-label={`${value} out of 5`}>
      {"★".repeat(value)}
      <span className="text-line">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export function UserLink({ username }: { username: string | null }) {
  if (!username) return <span className="text-muted">deleted user</span>;
  return (
    <Link href={`/u/${username}`} className="font-bold hover:text-cue">
      {username}
    </Link>
  );
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold">{children}</h1>
      {sub && <p className="mt-2 max-w-2xl text-muted">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line p-8 text-center text-muted">{children}</div>;
}
