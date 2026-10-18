export const currency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/\.00$/, "");
export function restoreCart(raw, products) {
  let items;
  try {
    items = JSON.parse(raw || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  return items
    .filter((line) =>
      products.some(
        (p) =>
          p.handle === line.handle &&
          p.variants.some((v) => v.id === line.variant && v.available),
      ),
    )
    .filter(
      (line) =>
        Number.isInteger(line.quantity) &&
        line.quantity > 0 &&
        line.quantity <= 99,
    )
    .map(({ handle, variant, quantity, bundle, bundleSize }) => ({
      handle,
      variant,
      quantity,
      ...(typeof bundle === "string" && [2, 3].includes(bundleSize)
        ? { bundle, bundleSize }
        : {}),
    }));
}
export function cartTotals(cart, products) {
  const lines = cart.flatMap((line) => {
    const product = products.find((p) => p.handle === line.handle);
    const variant = product?.variants.find((v) => v.id === line.variant);
    return variant && variant.available
      ? [
          {
            ...line,
            product,
            selected: variant,
            total: variant.price * line.quantity,
          },
        ]
      : [];
  });
  const groups = new Map();
  for (const line of lines)
    if (line.bundle) {
      if (!groups.has(line.bundle)) groups.set(line.bundle, []);
      groups.get(line.bundle).push(line);
    }
  let discount = 0;
  for (const entries of groups.values()) {
    const size = entries[0].bundleSize;
    const complete =
      entries.every(
        (l) =>
          l.bundleSize === size &&
          l.quantity === 1 &&
          (size === 3
            ? l.product.type === "chains"
            : !["sets", "custom-dogtag"].includes(l.product.type)),
      ) && entries.length === size;
    if (complete)
      discount += Math.max(
        0,
        entries.reduce((sum, l) => sum + l.total, 0) - 99,
      );
  }
  const original = lines.reduce((sum, l) => sum + l.total, 0);
  return {
    lines,
    quantity: lines.reduce((sum, l) => sum + l.quantity, 0),
    original,
    discount,
    subtotal: original - discount,
  };
}
export function filterProducts(
  products,
  {
    collection = "all",
    query = "",
    color = "",
    sort = "featured",
    max = Infinity,
  } = {},
) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const result = products.filter(
    (p) =>
      (collection === "all" || p.categories.includes(collection)) &&
      (!color || p.color === color) &&
      Math.min(...p.variants.map((v) => v.price)) <= max &&
      terms.every((term) =>
        `${p.title} ${p.type} ${p.color}`.toLowerCase().includes(term),
      ),
  );
  const price = (p) => Math.min(...p.variants.map((v) => v.price));
  if (sort === "low") result.sort((a, b) => price(a) - price(b));
  if (sort === "high") result.sort((a, b) => price(b) - price(a));
  if (sort === "az") result.sort((a, b) => a.title.localeCompare(b.title));
  return result;
}
export function bundlePrice(picks, required) {
  return picks.length === required && picks.every((p) => p?.variant?.available)
    ? 99
    : null;
}
