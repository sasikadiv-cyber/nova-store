import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { sitePages, type PageBlock, type SitePage } from "@/db/schema";

export type PageSeed = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  blocks: PageBlock[];
  sortOrder: number;
};

/* Default copy for every informational page. Seeded once, then the owner
   rewrites anything they like from the console. */
export const DEFAULT_PAGES: PageSeed[] = [
  {
    slug: "help",
    title: "Help Centre",
    eyebrow: "Client care",
    intro:
      "Everything you need before and after an order — answered by the same team that packs your parcel in Rotterdam.",
    sortOrder: 1,
    blocks: [
      {
        heading: "Ordering",
        body: [
          "Orders are confirmed by email within minutes and enter the atelier queue the same working day. You can follow every step from your account, from confirmation to delivery.",
          "If a size or colourway is showing as unavailable, join the waitlist from the product page — restocks are announced to that list first.",
        ],
      },
      {
        heading: "Payment",
        body: [
          "We accept Visa, Mastercard, American Express, PayPal, Apple Pay and Klarna. Card details are entered at checkout and are never stored on your account.",
          "Prices are shown in your chosen currency for guidance; the charge is settled in USD at your bank's rate.",
        ],
      },
      {
        heading: "Delivery",
        body: [
          "Standard express shipping is complimentary on every order and arrives within three to five working days to 94 countries, duties and taxes included.",
          "Priority shipping is available at checkout and moves your order to the front of the packing queue.",
        ],
      },
      {
        heading: "Still need us?",
        body: [
          "Write to the studio from the contact page and a client adviser replies within one working day, in English, French, German or Sinhala.",
        ],
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact Us",
    eyebrow: "We are listening",
    intro:
      "A client adviser reads every message personally. Write to us about sizing, deliveries, repairs or a piece you are searching for.",
    sortOrder: 2,
    blocks: [
      {
        heading: "Client services",
        body: [
          "Monday to Friday, 09:00 – 18:00 CET. Replies land within one working day.",
        ],
      },
      {
        heading: "Studio visits",
        body: [
          "Our Rotterdam atelier welcomes clients by appointment for fittings and repairs. Write to us and we will arrange a time.",
        ],
      },
    ],
  },
  {
    slug: "shipping",
    title: "Global Shipping",
    eyebrow: "Worldwide, duties included",
    intro:
      "Express delivery to 94 countries from our Rotterdam and Singapore hubs, with duties and taxes settled at checkout.",
    sortOrder: 3,
    blocks: [
      {
        heading: "Rates and speeds",
        body: [
          "Standard express is complimentary on every order and arrives in three to five working days. Priority shipping is available at checkout for next-working-day dispatch to most cities.",
        ],
      },
      {
        heading: "Duties and taxes",
        body: [
          "The price you pay at checkout is final. We prepay import duties and taxes for every destination we serve, so nothing is collected on your doorstep.",
        ],
      },
      {
        heading: "Tracking",
        body: [
          "Every parcel ships with a DHL or UPS tracking number, visible in your account from the moment it leaves the atelier.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    title: "Returns & Exchanges",
    eyebrow: "Thirty days, prepaid",
    intro:
      "Try everything on at home. If a piece is not right, return it within thirty days with a prepaid label.",
    sortOrder: 4,
    blocks: [
      {
        heading: "The window",
        body: [
          "You have thirty days from delivery to start a return or exchange. Pieces should be unworn with their tags and original packaging.",
        ],
      },
      {
        heading: "How it works",
        body: [
          "Open your account, choose the order and select the pieces you are sending back. A prepaid label arrives by email instantly. Refunds are issued within three working days of arrival at the studio.",
        ],
      },
      {
        heading: "Exchanges",
        body: [
          "Size and colour exchanges are free. We hold your new size for seven days while your parcel travels back to us.",
        ],
      },
    ],
  },
  {
    slug: "size-guide",
    title: "Size Guide",
    eyebrow: "Measure once",
    intro:
      "Our pieces are cut in European sizing. Measure a garment you already love and match it to the tables below.",
    sortOrder: 5,
    blocks: [
      {
        heading: "Knitwear and tailoring",
        body: [
          "Chest is measured flat across the fullest point, doubled. Length is from the highest shoulder point to the hem. If you sit between two sizes, take the larger for tailoring and the smaller for knitwear.",
        ],
      },
      {
        heading: "Footwear",
        body: [
          "Our Porto-made shoes run true to Brannock size. If you are between sizes, we recommend the half size down for loafers and the half size up for boots worn with socks.",
        ],
      },
      {
        heading: "Still unsure?",
        body: [
          "Write to us from the contact page with your usual sizes in other houses and a client adviser will map them for you.",
        ],
      },
    ],
  },
  {
    slug: "product-care",
    title: "Product Care",
    eyebrow: "Repaired, not replaced",
    intro:
      "Every piece is made to be kept. Free stitching and resoling on all footwear for the life of the shoe.",
    sortOrder: 6,
    blocks: [
      {
        heading: "Cashmere and merino",
        body: [
          "Hand wash cool with a pH-neutral soap, or dry clean. Dry flat away from direct heat. Store folded with cedar, never on a hanger.",
        ],
      },
      {
        heading: "Cotton and linen",
        body: [
          "Machine wash at thirty degrees on a gentle cycle and hang to dry. Press on the reverse while slightly damp for a crisp finish.",
        ],
      },
      {
        heading: "Leather footwear",
        body: [
          "Brush off dust after wear, condition every few months with a neutral cream, and rest your shoes on cedar trees between wears.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    eyebrow: "Your data",
    intro:
      "We collect the minimum we need to send you beautiful things, and we never sell it.",
    sortOrder: 7,
    blocks: [
      {
        heading: "What we collect",
        body: [
          "Your name, delivery address, email and order history. Payment card details are entered at checkout and processed by our payment partners — they are never stored on your account or on our servers.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To make and deliver your orders, to answer your messages, and — only if you ask — to send you our newsletter. Analytics are aggregated and anonymous.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You may request a copy of your data, correct it, or have your account deleted at any time. Write to us from the contact page and we action every request within thirty days.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "A strictly necessary cookie keeps your session and bag. Analytics cookies only run with your consent, and your theme and currency preferences are kept on your own device.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    eyebrow: "The agreement",
    intro:
      "The terms of sale for every order placed with Nova Global Commerce.",
    sortOrder: 8,
    blocks: [
      {
        heading: "Orders and pricing",
        body: [
          "An order is an offer to buy. The contract forms when we confirm dispatch. Prices are shown in your chosen currency and settled in USD; a price is only binding once your order is confirmed.",
        ],
      },
      {
        heading: "Delivery and title",
        body: [
          "Risk passes to you on delivery. If a parcel arrives damaged, photograph the packaging and write to us within seven days and we will replace the piece.",
        ],
      },
      {
        heading: "Returns",
        body: [
          "You have thirty days from delivery to return unworn pieces for a full refund. The statutory right of withdrawal is unaffected by these terms.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "Our liability is limited to the value of the affected order. Nothing in these terms limits liability for death, personal injury or fraud.",
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility",
    eyebrow: "For everyone",
    intro:
      "A store should be as easy to use as it is beautiful. Here is where we stand and where we are going.",
    sortOrder: 9,
    blocks: [
      {
        heading: "What we do today",
        body: [
          "The storefront is built to WCAG 2.1 AA: keyboard navigation across every page, visible focus states, alt text on product imagery, and colour contrast checked in both light and dark themes.",
          "The interface respects your motion preferences and never relies on colour alone to convey meaning.",
        ],
      },
      {
        heading: "What we are working on",
        body: [
          "Full screen-reader labelling for the checkout flow and transcripts for our campaign films are in progress.",
        ],
      },
      {
        heading: "Tell us what you need",
        body: [
          "If anything on this site is hard to use, write to us from the contact page. Every message is read by a person and shapes what we fix next.",
        ],
      },
    ],
  },
  {
    slug: "materials",
    title: "Our Materials",
    eyebrow: "The source",
    intro:
      "Fibres and leathers chosen slowly, from mills we visit three times a year.",
    sortOrder: 10,
    blocks: [
      {
        heading: "Cashmere",
        body: [
          "Two-ply, grade-A cashmere from Inner Mongolia, spun in Biella. Long fibres mean less pilling and a hand that softens with age.",
        ],
      },
      {
        heading: "Denim",
        body: [
          "Selvedge denim woven on shuttle looms in Okayama, sanforised so the fit you buy is the fit you keep.",
        ],
      },
      {
        heading: "Leather",
        body: [
          "Vegetable-tanned calf and suede from certified tanneries in Tuscany, chosen for the way they patina rather than wear out.",
        ],
      },
    ],
  },
  {
    slug: "responsibility",
    title: "Responsibility",
    eyebrow: "Made to be kept",
    intro:
      "Small runs, honest materials and repairs instead of landfill.",
    sortOrder: 11,
    blocks: [
      {
        heading: "Small-run manufacturing",
        body: [
          "Between 150 and 600 units per colourway. Nothing is made to sit in a warehouse, and nothing is destroyed at the end of a season.",
        ],
      },
      {
        heading: "Repair for life",
        body: [
          "Free stitching and resoling on all footwear for the life of the shoe. Bring a piece back and we will bring it back.",
        ],
      },
      {
        heading: "Packaging",
        body: [
          "Recycled and recyclable boxes, paper tape and no plastic windows. Our garment bags are compostable cornstarch.",
        ],
      },
    ],
  },
  {
    slug: "ateliers",
    title: "Ateliers & Mills",
    eyebrow: "The makers",
    intro:
      "Four workshops and three mills, visited three times a year, on a first-name basis.",
    sortOrder: 12,
    blocks: [
      {
        heading: "Biella, Italy",
        body: [
          "Where our cashmere and merino are spun. The mill has been family-run since 1663 and still washes its yarn in Alpine water.",
        ],
      },
      {
        heading: "Okayama, Japan",
        body: [
          "Shuttle looms running at a third of modern speed, weaving the selvedge denim for our five-pocket jean.",
        ],
      },
      {
        heading: "Porto, Portugal",
        body: [
          "The footwear atelier. Each pair passes through sixty pairs of hands before it is boxed.",
        ],
      },
    ],
  },
  {
    slug: "careers",
    title: "Careers",
    eyebrow: "Join the house",
    intro:
      "A small team, working slowly and well. We hire for curiosity and keep people for decades.",
    sortOrder: 13,
    blocks: [
      {
        heading: "How we work",
        body: [
          "Studio-first, hybrid where the role allows. Everyone in the company, including the founders, spends one week a season on the client services desk.",
        ],
      },
      {
        heading: "Open roles",
        body: [
          "We post new roles here as they open. If nothing fits, write to us from the contact page with a note about what you make and how you work.",
        ],
      },
    ],
  },
];

let seedPromise: Promise<void> | null = null;

/** Writes the default copy once, so every footer link resolves from day one. */
export async function ensureSitePagesSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const [{ count } = { count: 0 }] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(sitePages);
        if (count > 0) return;

        await db
          .insert(sitePages)
          .values(
            DEFAULT_PAGES.map((page) => ({
              slug: page.slug,
              title: page.title,
              eyebrow: page.eyebrow,
              intro: page.intro,
              blocks: page.blocks,
              sortOrder: page.sortOrder,
            })),
          )
          .onConflictDoNothing({ target: sitePages.slug });
      } catch (error) {
        console.error("[nova] page seeding skipped:", error);
        seedPromise = null;
      }
    })();
  }
  return seedPromise;
}

/** A published page by slug, or null so the route can 404. */
export async function getSitePage(slug: string): Promise<SitePage | null> {
  try {
    const [page] = await db
      .select()
      .from(sitePages)
      .where(eq(sitePages.slug, slug))
      .limit(1);
    if (!page || !page.published) return null;
    return page;
  } catch {
    const fallback = DEFAULT_PAGES.find((page) => page.slug === slug);
    return fallback ? { ...fallback, published: true, updatedAt: new Date() } : null;
  }
}

/** Every page, published or not, for the console. */
export async function getSitePages(): Promise<SitePage[]> {
  try {
    return await db.select().from(sitePages).orderBy(asc(sitePages.sortOrder));
  } catch {
    return DEFAULT_PAGES.map((page) => ({ ...page, published: true, updatedAt: new Date() }));
  }
}

/** Which slugs exist, so the footer never links to a missing page. */
export async function getPublishedSlugs(): Promise<Set<string>> {
  try {
    const rows = await db
      .select({ slug: sitePages.slug })
      .from(sitePages)
      .where(eq(sitePages.published, true));
    return new Set(rows.map((row) => row.slug));
  } catch {
    return new Set(DEFAULT_PAGES.map((page) => page.slug));
  }
}
