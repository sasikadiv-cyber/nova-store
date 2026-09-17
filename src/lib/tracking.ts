/**
 * Parcel tracking links.
 *
 * The console stores whatever reference the carrier gave the atelier, so the
 * carrier is inferred from the number itself and turned into a link the
 * client can actually open. Anything unrecognised still gets a working link
 * through a carrier-detecting aggregator rather than no link at all.
 */

export type TrackingLink = {
  number: string;
  carrier: string;
  url: string;
};

/** Stripe session ids are parked in the same column before dispatch. */
export function isDispatchTracking(value: string | null | undefined) {
  return Boolean(value && value.trim() && !value.startsWith("stripe:"));
}

export function trackingLink(raw: string | null | undefined): TrackingLink | null {
  if (!isDispatchTracking(raw)) return null;

  const number = String(raw).trim();
  /* Carriers quote references with spaces and dashes; their lookup forms
     want the bare alphanumeric string. */
  const code = number.replace(/[\s-]/g, "");
  const upper = code.toUpperCase();

  if (upper.startsWith("DHL")) {
    return {
      number,
      carrier: "DHL Express",
      url: `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(
        code.replace(/^DHL/i, ""),
      )}`,
    };
  }

  if (upper.startsWith("1Z")) {
    return {
      number,
      carrier: "UPS",
      url: `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(code)}`,
    };
  }

  if (upper.startsWith("UPS")) {
    return {
      number,
      carrier: "UPS",
      url: `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(
        code.replace(/^UPS/i, ""),
      )}`,
    };
  }

  if (upper.startsWith("FEDEX") || /^\d{12}$|^\d{15}$/.test(code)) {
    return {
      number,
      carrier: "FedEx",
      url: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(
        code.replace(/^FEDEX/i, ""),
      )}`,
    };
  }

  /* Universal postal format (UPU S10), e.g. RR123456789LK. */
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(upper)) {
    return {
      number,
      carrier: "Postal service",
      url: `https://t.17track.net/en#nums=${encodeURIComponent(code)}`,
    };
  }

  return {
    number,
    carrier: "Carrier",
    url: `https://t.17track.net/en#nums=${encodeURIComponent(code)}`,
  };
}
