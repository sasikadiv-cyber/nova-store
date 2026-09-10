import type { SortKey } from "./queries";

export type FilterState = {
  categories: string[];
  genders: string[];
  sizes: string[];
  families: string[];
  collection: string | null;
  search: string | null;
  min: number | null;
  max: number | null;
  onSale: boolean;
  sort: SortKey;
};

const SORTS: SortKey[] = ["featured", "newest", "price-asc", "price-desc", "rating", "best-selling"];

function toList(value: string | string[] | undefined) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(",");
  return raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toNumber(value: string | string[] | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseFilters(params: Record<string, string | string[] | undefined>): FilterState {
  const sortRaw = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sort = SORTS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "featured";
  const onSaleRaw = Array.isArray(params.onSale) ? params.onSale[0] : params.onSale;
  const collectionRaw = Array.isArray(params.collection) ? params.collection[0] : params.collection;
  const searchRaw = Array.isArray(params.search) ? params.search[0] : params.search;

  return {
    categories: toList(params.categories),
    genders: toList(params.genders),
    sizes: toList(params.sizes),
    families: toList(params.colors),
    collection: collectionRaw || null,
    search: searchRaw || null,
    min: toNumber(params.min),
    max: toNumber(params.max),
    onSale: onSaleRaw === "true" || onSaleRaw === "1",
    sort,
  };
}

export function buildQuery(state: FilterState) {
  const params = new URLSearchParams();
  if (state.categories.length) params.set("categories", state.categories.join(","));
  if (state.genders.length) params.set("genders", state.genders.join(","));
  if (state.sizes.length) params.set("sizes", state.sizes.join(","));
  if (state.families.length) params.set("colors", state.families.join(","));
  if (state.collection) params.set("collection", state.collection);
  if (state.search) params.set("search", state.search);
  if (state.min != null) params.set("min", String(state.min));
  if (state.max != null) params.set("max", String(state.max));
  if (state.onSale) params.set("onSale", "true");
  if (state.sort !== "featured") params.set("sort", state.sort);
  return params.toString();
}

export function countActive(state: FilterState) {
  return (
    state.categories.length +
    state.genders.length +
    state.sizes.length +
    state.families.length +
    (state.collection ? 1 : 0) +
    (state.search ? 1 : 0) +
    (state.min != null ? 1 : 0) +
    (state.max != null ? 1 : 0) +
    (state.onSale ? 1 : 0)
  );
}

export const SORT_LABELS: Record<SortKey, string> = {
  featured: "Curated",
  newest: "Newest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
  "best-selling": "Best selling",
};
