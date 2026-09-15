/**
 * Storefront appearance — client-safe definitions.
 *
 * Every key has a default, so the site renders correctly on a fresh database
 * before anything has been saved, and a missing row can never blank out a
 * page. Shop products are deliberately not part of this.
 */

export const EDITORIAL_IMAGE_DEFAULT =
  "https://images.pexels.com/photos/14641430/pexels-photo-14641430.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1250";

export const PROMO_IMAGE_DEFAULT =
  "https://images.pexels.com/photos/19099691/pexels-photo-19099691.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=800";

export type SettingKey =
  // hero media + copy
  | "hero_video"
  | "hero_poster"
  | "hero_eyebrow"
  | "hero_heading_line1"
  | "hero_heading_line2"
  | "hero_body"
  | "hero_cta_label"
  | "hero_cta_href"
  | "hero_secondary_label"
  | "hero_secondary_href"
  // editorial / story media
  | "atelier_video"
  | "atelier_poster"
  | "editorial_image"
  // navigation labels
  | "nav_home"
  | "nav_collections"
  | "nav_footwear"
  | "nav_outerwear"
  | "nav_shop_all"
  | "nav_my_account"
  // announcement bar
  | "announcement_enabled"
  | "announcement_text"
  | "announcement_link_label"
  | "announcement_link_href"
  // seasonal promo card
  | "promo_enabled"
  | "promo_eyebrow"
  | "promo_title"
  | "promo_body"
  | "promo_code"
  | "promo_cta_label"
  | "promo_cta_href"
  | "promo_image"
  // welcome popup
  | "popup_enabled"
  | "popup_eyebrow"
  | "popup_title"
  | "popup_body"
  | "popup_code"
  | "popup_cta_label"
  | "popup_cta_href"
  | "popup_image"
  | "popup_delay"
  // home page section copy
  | "features_eyebrow"
  | "features_heading"
  | "new_in_eyebrow"
  | "new_in_heading"
  | "new_in_body"
  | "best_eyebrow"
  | "best_heading"
  | "method_eyebrow"
  | "method_heading"
  | "method_body"
  | "service_eyebrow"
  | "service_heading"
  | "notes_eyebrow"
  | "join_eyebrow"
  | "join_heading"
  | "join_body";

export type SettingGroup =
  | "hero"
  | "nav"
  | "announcement"
  | "promo"
  | "home"
  | "popup";

export type SettingDefinition = {
  key: SettingKey;
  group: SettingGroup;
  label: string;
  help: string;
  kind: "video" | "image" | "text" | "href" | "toggle" | "multiline";
  default: string;
};

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  /* ------------------------------------------------------------- hero */
  { key: "hero_video", group: "hero", label: "Hero video (mp4)", help: "The looping background film behind the home page headline.", kind: "video", default: "" },
  { key: "hero_poster", group: "hero", label: "Hero poster image", help: "Shown while the video loads, and if it cannot play.", kind: "image", default: "https://images.pexels.com/photos/14641430/pexels-photo-14641430.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1920&h=1080" },
  { key: "hero_eyebrow", group: "hero", label: "Hero eyebrow", help: "The small letterspaced label above the headline.", kind: "text", default: "Autumn — Winter 2026 · Global Edition" },
  { key: "hero_heading_line1", group: "hero", label: "Headline line 1", help: "The first line of the large headline.", kind: "text", default: "Quiet luxury," },
  { key: "hero_heading_line2", group: "hero", label: "Headline line 2 (italic)", help: "The second line, rendered in italic with the accent colour.", kind: "text", default: "made to travel." },
  { key: "hero_body", group: "hero", label: "Hero paragraph", help: "The supporting copy under the headline.", kind: "multiline", default: "Double-faced wool from Biella. Grade-A cashmere from Inner Mongolia. Hand-finished footwear from Porto. Cut in small runs and delivered to 94 countries — duties included." },
  { key: "hero_cta_label", group: "hero", label: "Primary button label", help: "The solid button in the hero.", kind: "text", default: "Shop the winter edit" },
  { key: "hero_cta_href", group: "hero", label: "Primary button link", help: "Where the primary button goes.", kind: "href", default: "/shop?collection=winter-edit" },
  { key: "hero_secondary_label", group: "hero", label: "Secondary link label", help: "The understated link next to the primary button.", kind: "text", default: "Explore new arrivals" },
  { key: "hero_secondary_href", group: "hero", label: "Secondary link href", help: "Where the secondary link goes.", kind: "href", default: "/shop?sort=newest" },

  /* --------------------------------------------------------- editorial */
  { key: "atelier_video", group: "hero", label: "Story video (mp4)", help: "The film inside the “Nova method” editorial block.", kind: "video", default: "" },
  { key: "atelier_poster", group: "hero", label: "Story poster image", help: "Shown while that video loads.", kind: "image", default: "https://images.pexels.com/photos/32366927/pexels-photo-32366927.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=1500" },
  { key: "editorial_image", group: "hero", label: "Editorial overlap image", help: "The framed still that overlaps the story video.", kind: "image", default: EDITORIAL_IMAGE_DEFAULT },

  /* -------------------------------------------------------------- nav */
  { key: "nav_home", group: "nav", label: "Nav · Home", help: "Link to the home page.", kind: "text", default: "Home" },
  { key: "nav_collections", group: "nav", label: "Nav · Collections", help: "The dropdown trigger in the navigation bar.", kind: "text", default: "Collections" },
  { key: "nav_footwear", group: "nav", label: "Nav · Footwear", help: "", kind: "text", default: "Footwear" },
  { key: "nav_outerwear", group: "nav", label: "Nav · Outerwear", help: "", kind: "text", default: "Outerwear" },
  { key: "nav_shop_all", group: "nav", label: "Nav · Shop all", help: "Used in the mobile menu.", kind: "text", default: "Shop All" },
  { key: "nav_my_account", group: "nav", label: "Nav · My account", help: "Used in the mobile menu.", kind: "text", default: "My Account" },

  /* ----------------------------------------------------- announcement */
  { key: "announcement_enabled", group: "announcement", label: "Show the announcement bar", help: "Turn the strip above the navigation bar on or off.", kind: "toggle", default: "true" },
  { key: "announcement_text", group: "announcement", label: "Announcement text", help: "The message shown in the strip.", kind: "multiline", default: "Free global shipping over $250 — duties and taxes included in 94 countries" },
  { key: "announcement_link_label", group: "announcement", label: "Announcement link label", help: "Optional short link inside the strip. Leave blank to hide it.", kind: "text", default: "Shop new in" },
  { key: "announcement_link_href", group: "announcement", label: "Announcement link href", help: "Where that link goes.", kind: "href", default: "/shop?sort=newest" },

  /* ------------------------------------------------------------- promo */
  { key: "promo_enabled", group: "promo", label: "Show the seasonal offer card", help: "A discount card on the home page.", kind: "toggle", default: "false" },
  { key: "promo_eyebrow", group: "promo", label: "Offer eyebrow", help: "", kind: "text", default: "Seasonal offer" },
  { key: "promo_title", group: "promo", label: "Offer title", help: "", kind: "text", default: "Winter edit — 20% off footwear" },
  { key: "promo_body", group: "promo", label: "Offer description", help: "", kind: "multiline", default: "Apply code FOOTWEAR20 at checkout to take a fifth off every hand-finished pair from the Porto atelier. Ends when the season does." },
  { key: "promo_code", group: "promo", label: "Promo code", help: "Shown as a copyable code chip. Leave blank to hide.", kind: "text", default: "FOOTWEAR20" },
  { key: "promo_cta_label", group: "promo", label: "Offer button label", help: "", kind: "text", default: "Shop the edit" },
  { key: "promo_cta_href", group: "promo", label: "Offer button link", help: "", kind: "href", default: "/shop?categories=Footwear" },
  { key: "promo_image", group: "promo", label: "Offer image", help: "The photograph beside the offer text.", kind: "image", default: PROMO_IMAGE_DEFAULT },

  /* ------------------------------------------------------------ popup */
  { key: "popup_enabled", group: "popup", label: "Show the welcome popup", help: "A premium card that appears shortly after someone opens the site. Shown once per visit until dismissed.", kind: "toggle", default: "false" },
  { key: "popup_eyebrow", group: "popup", label: "Popup eyebrow", help: "", kind: "text", default: "Welcome to Nova" },
  { key: "popup_title", group: "popup", label: "Popup title", help: "", kind: "text", default: "Ten percent off your first order" },
  { key: "popup_body", group: "popup", label: "Popup description", help: "", kind: "multiline", default: "Join the list for early access to limited runs and a monthly note on how things are actually made." },
  { key: "popup_code", group: "popup", label: "Popup promo code", help: "Shown as a copyable code chip. Leave blank to hide.", kind: "text", default: "NOVAWELCOME" },
  { key: "popup_cta_label", group: "popup", label: "Popup button label", help: "", kind: "text", default: "Start shopping" },
  { key: "popup_cta_href", group: "popup", label: "Popup button link", help: "", kind: "href", default: "/shop" },
  { key: "popup_image", group: "popup", label: "Popup image", help: "The photograph inside the popup card.", kind: "image", default: "https://images.pexels.com/photos/29865096/pexels-photo-29865096.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=900&h=1200" },
  { key: "popup_delay", group: "popup", label: "Delay before showing (seconds)", help: "For example 1.5. Use 0 to show immediately.", kind: "text", default: "1.2" },

  /* -------------------------------------------------------- home copy */
  { key: "features_eyebrow", group: "home", label: "Collections eyebrow", help: "", kind: "text", default: "Featured collections" },
  { key: "features_heading", group: "home", label: "Collections heading", help: "", kind: "text", default: "Three edits, one quiet point of view" },
  { key: "new_in_eyebrow", group: "home", label: "New in eyebrow", help: "", kind: "text", default: "Just landed" },
  { key: "new_in_heading", group: "home", label: "New in heading", help: "", kind: "text", default: "New arrivals" },
  { key: "new_in_body", group: "home", label: "New in paragraph", help: "", kind: "multiline", default: "Fresh from the ateliers — released in quantities of a few hundred, and rarely repeated." },
  { key: "best_eyebrow", group: "home", label: "Best sellers eyebrow", help: "", kind: "text", default: "Most loved" },
  { key: "best_heading", group: "home", label: "Best sellers heading", help: "", kind: "text", default: "The pieces our clients reorder" },
  { key: "method_eyebrow", group: "home", label: "Method eyebrow", help: "", kind: "text", default: "The Nova method" },
  { key: "method_heading", group: "home", label: "Method heading", help: "", kind: "text", default: "We would rather make fewer, better things" },
  { key: "method_body", group: "home", label: "Method paragraph", help: "", kind: "multiline", default: "Every Nova piece begins with a fabric decision. We buy from eleven family-run mills and one atelier in Porto, visit them three times a year, and cut each style in runs of 150 to 600 units — small enough to keep the finishing hand-done, large enough to keep the price honest." },
  { key: "service_eyebrow", group: "home", label: "Service eyebrow", help: "", kind: "text", default: "Service, globally" },
  { key: "service_heading", group: "home", label: "Service heading", help: "", kind: "text", default: "Shopping across borders should feel effortless" },
  { key: "notes_eyebrow", group: "home", label: "Client notes eyebrow", help: "", kind: "text", default: "Client notes" },
  { key: "join_eyebrow", group: "home", label: "Newsletter eyebrow", help: "", kind: "text", default: "Members receive first access" },
  { key: "join_heading", group: "home", label: "Newsletter heading", help: "", kind: "text", default: "Join the Nova list" },
  { key: "join_body", group: "home", label: "Newsletter paragraph", help: "", kind: "multiline", default: "Ten percent off your first order, early access to limited runs, and a monthly note on how things are actually made. No noise." },
];

export const SETTING_DEFAULTS: Record<SettingKey, string> = SETTING_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.key] = definition.default;
    return acc;
  },
  {} as Record<SettingKey, string>,
);

export type SiteAppearance = Record<SettingKey, string>;

/** Toggle keys are stored as "true"/"false" strings. */
export function isOn(value: string | undefined) {
  return value === "true";
}

export const GROUP_LABELS: Record<SettingGroup, string> = {
  hero: "Hero & story media",
  nav: "Navigation labels",
  announcement: "Announcement bar",
  promo: "Seasonal offer card",
  home: "Home page sections",
  popup: "Welcome popup",
};
