import type { ColorOption } from "@/db/schema";
import { parseImageLine } from "@/lib/image-utils";

/** Everything the admin product form can write. */
export type ProductWrite = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  story: string;
  category: string;
  gender: string;
  collectionSlug: string;
  priceCents: number;
  compareAtCents: number | null;
  colors: ColorOption[];
  sizes: string[];
  sizeType: string;
  images: string[];
  imageLabels: string[];
  storyImages: string[];
  storyImageLabels: string[];
  details: string[];
  materials: string;
  care: string;
  stock: number;
  badge: string | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
};

const FALLBACK_IMAGE =
  "https://images.pexels.com/photos/30569741/pexels-photo-30569741.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1330";

function text(form: FormData, key: string, fallback = "") {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function numeric(form: FormData, key: string, fallback = 0) {
  const value = Number(text(form, key));
  return Number.isFinite(value) ? value : fallback;
}

function bool(form: FormData, key: string) {
  return form.get(key) === "on" || form.get(key) === "true";
}

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function list(value: string) {
  return value.split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean);
}

function parseColours(value: string): ColorOption[] {
  return lines(value).map((line) => {
    const [name, hex, family] = line.split("|").map((part) => (part ?? "").trim());
    return { name: name || "Untitled", hex: hex || "#cccccc", family: family || "Neutral" };
  });
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}

/** Turns the submitted form into a row we can write straight to Postgres. */
export function parseProductForm(form: FormData): { id: number; values: ProductWrite } {
  const name = text(form, "name") || "Untitled piece";
  const compareAt = numeric(form, "compareAt", 0);
  const colours = parseColours(text(form, "colors"));
  const sizes = list(text(form, "sizes"));
  const imageRows = lines(text(form, "images"))
    .map(parseImageLine)
    .filter((row) => row.url.length > 0);
  const storyRows = lines(text(form, "storyImages"))
    .map(parseImageLine)
    .filter((row) => row.url.length > 0);

  return {
    id: Math.max(0, Math.round(numeric(form, "id", 0))),
    values: {
      slug: slugify(text(form, "slug") || name),
      name,
      subtitle: text(form, "subtitle"),
      description: text(form, "description"),
      story: text(form, "story"),
      category: text(form, "category") || "Essentials",
      gender: text(form, "gender") || "Unisex",
      collectionSlug: text(form, "collectionSlug") || "elevated-essentials",
      priceCents: Math.max(0, Math.round(numeric(form, "price") * 100)),
      compareAtCents: compareAt > 0 ? Math.round(compareAt * 100) : null,
      colors: colours.length ? colours : [{ name: "Optic White", hex: "#f8f6f2", family: "White" }],
      sizes: sizes.length ? sizes : ["S", "M", "L"],
      sizeType: text(form, "sizeType") || "alpha",
      images: imageRows.length ? imageRows.map((row) => row.url) : [FALLBACK_IMAGE],
      imageLabels: imageRows.length ? imageRows.map((row) => row.label) : [""],
      storyImages: storyRows.map((row) => row.url),
      storyImageLabels: storyRows.map((row) => row.label),
      details: lines(text(form, "details")),
      materials: text(form, "materials"),
      care: text(form, "care"),
      stock: Math.max(0, Math.round(numeric(form, "stock", 0))),
      badge: text(form, "badge") || null,
      isFeatured: bool(form, "isFeatured"),
      isNewArrival: bool(form, "isNewArrival"),
      isBestSeller: bool(form, "isBestSeller"),
    },
  };
}
