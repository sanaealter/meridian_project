import type { GameMode, OrderStatus, PricingUnit } from "@/db/schema";

export const FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? 500);

export function feeFor(priceCents: number) {
  return Math.round((priceCents * FEE_BPS) / 10_000);
}

export function money(cents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export const modeLabel: Record<GameMode, string> = {
  osu: "osu!standard",
  taiko: "osu!taiko",
  fruits: "osu!catch",
  mania: "osu!mania",
};

export const unitLabel: Record<PricingUnit, string> = {
  per_minute: "per minute of audio",
  per_difficulty: "per difficulty",
  fixed: "fixed price",
};

export const statusLabel: Record<OrderStatus, string> = {
  requested: "Waiting for seller",
  accepted: "Accepted, awaiting payment",
  in_progress: "In progress",
  delivered: "Delivered, awaiting approval",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "In dispute",
};

export function date(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function rating(avg: number | null | undefined) {
  return avg == null ? "No reviews yet" : `${avg.toFixed(1)} / 5`;
}
