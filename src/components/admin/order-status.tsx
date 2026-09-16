"use client";

import { useState } from "react";

import { updateOrderStatusAction } from "@/app/admin/actions";

const STATUSES = [
  "pending_payment",
  "confirmed",
  "packed",
  "in_transit",
  "delivered",
  "cancelled",
  "refunded",
];

const TRACKING_STATUSES = ["in_transit", "delivered"];

/**
 * An order's status and tracking, read-only until the owner picks up the
 * pencil — so an accidental click cannot change a live order.
 */
export function OrderStatusEditor({
  orderId,
  status,
  trackingNumber,
}: {
  orderId: number;
  status: string;
  trackingNumber: string;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const trackingNeeded = TRACKING_STATUSES.includes(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-block px-2.5 py-1 text-[10.5px] uppercase tracking-[0.14em] ${
          status === "delivered"
            ? "bg-ok text-bone"
            : status === "cancelled" || status === "refunded"
              ? "bg-ember text-bone"
              : status === "pending_payment"
                ? "bg-brass/20 text-brass"
                : "bg-bone-dark text-ink-500"
        }`}
      >
        {status.replace(/_/g, " ")}
      </span>

      {trackingNumber && !trackingNumber.startsWith("stripe:") && (
        <code className="font-mono text-[11px] tracking-[0.06em] text-ink-300">
          {trackingNumber}
        </code>
      )}

      {editing ? (
        <form
          action={updateOrderStatusAction}
          onSubmit={() => setBusy(true)}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={orderId} />

          <select
            name="status"
            defaultValue={status}
            className="border border-ink/15 bg-bone px-2 py-1.5 text-[12.5px] outline-none focus:border-ink"
            aria-label="Order status"
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <input
            name="tracking"
            defaultValue={trackingNumber.startsWith("stripe:") ? "" : trackingNumber}
            placeholder="DHL / UPS tracking"
            className="w-[168px] border border-ink/15 bg-bone px-2 py-1.5 text-[12.5px] outline-none focus:border-ink"
            aria-label="Tracking number"
          />

          <button
            type="submit"
            disabled={busy}
            className={`bg-ink px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-bone transition-colors hover:bg-ink-700 ${
              busy ? "cursor-wait opacity-60" : ""
            }`}
          >
            {busy ? "Saving" : "Save"}
          </button>

          <button
            type="button"
            onClick={() => setEditing(false)}
            className="border border-ink/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-ink-300 transition-colors hover:border-ink hover:text-ink"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Edit status and tracking"
          aria-label="Edit status and tracking"
          className="inline-flex items-center gap-1.5 border border-ink/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-ink-500 transition-colors hover:border-ink hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
          </svg>
          Edit
        </button>
      )}
    </div>
  );
}
