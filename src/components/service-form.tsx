import type { Service } from "@/db/schema";
import { modeLabel, unitLabel } from "@/lib/format";

export function ServiceForm({
  action,
  service,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<void>;
  service?: Service;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={4}
          maxLength={100}
          defaultValue={service?.title}
          className="field"
          placeholder="Ranked-quality Insane and Extra difficulties"
        />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={20}
          rows={8}
          defaultValue={service?.description}
          className="field"
          placeholder="What you map, your style, what's included, revision policy, songs you won't map…"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="mode">
            Game mode
          </label>
          <select id="mode" name="mode" defaultValue={service?.mode ?? "osu"} className="field">
            {Object.entries(modeLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pricingUnit">
            Pricing
          </label>
          <select id="pricingUnit" name="pricingUnit" defaultValue={service?.pricingUnit ?? "per_minute"} className="field">
            {Object.entries(unitLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="price">
            Price (EUR)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="1"
            required
            defaultValue={service ? (service.priceCents / 100).toFixed(2) : undefined}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="deliveryDays">
            Usual delivery time (days)
          </label>
          <input
            id="deliveryDays"
            name="deliveryDays"
            type="number"
            min="1"
            max="180"
            required
            defaultValue={service?.deliveryDays ?? 14}
            className="field"
          />
        </div>
      </div>
      {service && (
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={service.status === "paused" ? "paused" : "active"} className="field w-48">
            <option value="active">Taking orders</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      )}
      <button className="btn btn-primary">{submitLabel}</button>
    </form>
  );
}
