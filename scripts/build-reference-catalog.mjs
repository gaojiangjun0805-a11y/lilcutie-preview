import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const source = JSON.parse(
  await fs.readFile("/tmp/humbler-products-1.json", "utf8"),
).products;
const collections = JSON.parse(
  await fs.readFile("/tmp/humbler-collections.json", "utf8"),
).collections;
const audit = JSON.parse(
  await fs.readFile(
    path.join(root, "research/humbler/2026-10-18/audit-data.json"),
    "utf8",
  ),
);
const homeCards = JSON.parse(
  execFileSync(
    "python3",
    [path.join(root, "scripts/extract-reference-cards.py")],
    { encoding: "utf8" },
  ),
);
const colors = new Map(
  homeCards.filter((c) => c.color).map((c) => [c.handle, c.color]),
);
for (const p of source) {
  if (colors.has(p.handle)) continue;
  if (p.handle.includes("gold") && !p.handle.includes("copy"))
    colors.set(p.handle, "gold");
  if (p.handle.includes("silver") && !p.handle.includes("copy"))
    colors.set(p.handle, "silver");
}
for (const p of source) {
  if (colors.has(p.handle)) continue;
  const peer = source.find((x) => x.title === p.title && colors.has(x.handle));
  if (peer && source.filter((x) => x.title === p.title).length === 2)
    colors.set(
      p.handle,
      colors.get(peer.handle) === "gold" ? "silver" : "gold",
    );
}
const membership = new Map(source.map((p) => [p.id, []]));
const groups = [];
for (const collection of collections) {
  let products;
  const cached = `/tmp/humbler-cat-${collection.handle}.json`;
  try {
    products = JSON.parse(await fs.readFile(cached, "utf8")).products;
  } catch {
    // Secondary collections are preview groupings; core category feeds remain exact.
    const h = collection.handle;
    products =
      h === "all"
        ? source
        : source.filter((p) => {
            const text =
              `${p.title} ${p.handle} ${p.tags.join(" ")}`.toLowerCase();
            if (h === "best-sellers")
              return homeCards.slice(0, 8).some((c) => c.handle === p.handle);
            if (h === "crusades-collection")
              return p.created_at.startsWith("2026-10-01");
            if (h === "buy2get1") return !/set|custom/.test(p.handle);
            if (/^(gold|silver)(-|$)/.test(h)) {
              const metal = h.startsWith("gold") ? "gold" : "silver";
              const isGold = colors.get(p.handle) === "gold";
              const suffix = h
                .replace(/^(gold|silver)-?/, "")
                .replace("gift-sets", "sets");
              return (
                (metal === "gold" ? isGold : !isGold) &&
                (!suffix ||
                  audit.products
                    .find((a) => a.handle === p.handle)
                    ?.categories.includes(suffix))
              );
            }
            const words = h
              .replace(/collection|drop|latest|the|emblems-of/g, "")
              .split("-")
              .filter((w) => w.length > 3);
            return words.length > 0 && words.some((w) => text.includes(w));
          });
  }
  for (const product of products)
    membership.get(product.id)?.push(collection.handle);
  const handles = products
    .map((p) => p.handle)
    .filter((h) => source.some((p) => p.handle === h));
  if (collection.handle === "best-sellers")
    handles.sort(
      (a, b) =>
        homeCards.findIndex((c) => c.handle === a) -
        homeCards.findIndex((c) => c.handle === b),
    );
  groups.push({ handle: collection.handle, title: collection.title, handles });
  console.log(`${collection.handle}: ${products.length}`);
}
const products = source.map((p, index) => {
  const categories = membership.get(p.id);
  const gold =
    colors.get(p.handle) === "gold" ||
    (!colors.has(p.handle) && /gold/.test(p.handle));
  return {
    id: `reference-${p.id}`,
    handle: p.handle,
    title: p.title,
    replacementKey: `LC-${String(index + 1).padStart(3, "0")}`,
    referenceOnly: true,
    source: `https://humbler.com/products/${p.handle}`,
    categories,
    color: gold ? "gold" : "silver",
    type:
      [
        "sets",
        "pendants",
        "chains",
        "bracelets",
        "rings",
        "custom-dogtag",
      ].find((c) => categories.includes(c)) || "pendants",
    images: p.images.map((i, n) => ({
      src: i.src,
      width: i.width,
      height: i.height,
      slot: `LC-${String(index + 1).padStart(3, "0")}-${String(n + 1).padStart(2, "0")}`,
    })),
    options: p.options,
    variants: p.variants.map((v) => ({
      id: String(v.id),
      title: v.title,
      price: Number(v.price),
      available: v.available,
      options: [v.option1, v.option2, v.option3].filter(Boolean),
    })),
  };
});
const catalog = {
  referenceOnly: true,
  source: "https://humbler.com/",
  captured: "2026-10-18",
  products,
  collections: groups,
  hero: "https://humbler.com/cdn/shop/files/deus-vult-hero-fin-1600.webp?v=1791073590&width=1600",
  videos: audit.sample_page_media.sample_product_page.unique_video_urls
    .filter((s) => s.includes(".mp4"))
    .slice(0, 4),
};
await fs.mkdir(path.join(root, "static/store/assets"), { recursive: true });
await fs.writeFile(
  path.join(root, "static/store/assets/catalog.json"),
  JSON.stringify(catalog),
);
console.log(
  `Built ${products.length} reference entries, ${groups.length} collections.`,
);
