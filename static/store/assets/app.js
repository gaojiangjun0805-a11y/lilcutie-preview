import { languages, dictionaries } from "./i18n.js?v=20261019-2";
import {
  currency,
  restoreCart,
  cartTotals,
  filterProducts,
  bundlePrice,
} from "./model.mjs?v=20261019-2";

const app = document.querySelector("#app");
const overlay = document.querySelector("#overlay");
const store = {
  get(key, fallback = "") {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};
let lang = store.get("lilcutie-store-language", "en");
if (!languages[lang]) lang = "en";
let data,
  products,
  cart = [],
  shown = 24,
  activeTab = "pendants",
  galleryIndex = 0,
  selectedVariant = "",
  qty = 1,
  picks = [],
  lastFocus,
  toastTimer;
const core = [
  "pendants",
  "chains",
  "bracelets",
  "rings",
  "sets",
  "custom-dogtag",
];
const themes = [
  "crusades-collection",
  "flip-pendants",
  "memento-mori",
  "veni-vidi-vici",
];
const t = (key) => dictionaries[lang][key] || dictionaries.en[key] || key;
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const money = currency;
const route = (view = "home", value = "") =>
  view === "home"
    ? "./"
    : `?${new URLSearchParams({ view, ...(view === "product" ? { handle: value } : view === "collection" ? { collection: value } : view === "bundle" ? { offer: value } : view === "help" ? { topic: value } : {}) })}`;
const link = (view, value, label, cls = "") =>
  `<a class="${cls}" href="${route(view, value)}" ${label.startsWith("<i ") ? `aria-label="${esc(t(value))}" title="${esc(t(value))}"` : ""} data-route>${label}</a>`;
const button = (action, label, symbol, cls = "icon-button") =>
  `<button class="${cls}" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}">${icon(symbol)}</button>`;
function imageURL(src, width = 700) {
  const u = new URL(src);
  u.searchParams.set("width", width);
  return u.href;
}
function image(p, index = 0, cls = "", eager = false) {
  const i = p.images[index] || p.images[0];
  return i
    ? `<img class="${cls}" src="${imageURL(i.src, 700)}" srcset="${imageURL(i.src, 400)} 400w, ${imageURL(i.src, 700)} 700w, ${imageURL(i.src, 1200)} 1200w" sizes="(max-width:699px) 50vw, (max-width:999px) 33vw, 25vw" alt="${esc(p.title)} — ${index + 1}" width="${i.width}" height="${i.height}" loading="${eager ? "eager" : "lazy"}" ${eager ? 'fetchpriority="high"' : ""} decoding="async">`
    : "";
}
function current() {
  const q = new URLSearchParams(location.search);
  return {
    view: q.get("view") || "home",
    handle: q.get("handle"),
    collection: q.get("collection") || "all",
    offer: q.get("offer") || "pair",
    topic: q.get("topic") || "contact",
    query: q.get("q") || "",
    color: q.get("color") || "",
    sort: q.get("sort") || "featured",
    max: Number(q.get("max") || Infinity),
  };
}
function getCollection(handle) {
  return data.collections.find((c) => c.handle === handle);
}
function group(handle) {
  const handles = getCollection(handle)?.handles;
  return handles
    ? handles.map((h) => products.find((p) => p.handle === h)).filter(Boolean)
    : [];
}
function name(handle) {
  return dictionaries[lang][handle] || getCollection(handle)?.title || handle;
}
function price(p) {
  return Math.min(...p.variants.map((v) => v.price));
}
function siblings(p) {
  return products.filter((x) => x.title === p.title);
}
function swatches(p) {
  return `<div class="swatches">${siblings(p)
    .map((x) =>
      link(
        "product",
        x.handle,
        `<span class="swatch ${x.color} ${x.handle === p.handle ? "active" : ""}" title="${t(x.color)}" aria-label="${t(x.color)}"></span>`,
      ),
    )
    .join("")}</div>`;
}
function card(p) {
  return `<article class="product-card" data-product="${p.handle}"><div class="card-stage">${link("product", p.handle, image(p) + (p.images[1] ? image(p, 1, "alternate") : ""), "card-image")}<span class="card-badge">${p.type === "sets" ? t("sets") : t(p.type)}</span>${button(`quick:${p.handle}`, t("add"), "plus", "quick-add icon-button")}</div><div class="card-info">${link("product", p.handle, esc(p.title), "product-name")}<div class="card-meta"><span>${t(p.color)}</span><span>${money(price(p))}</span></div>${swatches(p)}</div></article>`;
}
function grid(items, cls = "") {
  return `<div class="product-grid ${cls}">${items.map(card).join("")}</div>`;
}
function sectionHead(title, view = "collection", value = "all") {
  return `<div class="section-head"><h2>${title}</h2>${link(view, value, `${t("viewAll")} ${icon("arrow-up-right")}`, "text-link")}</div>`;
}
function header() {
  const count = cartTotals(cart, products).quantity;
  return `<div class="preview-bar">${t("preview")}</div><div class="announcement">${link("bundle", "pair", `${t("pair")} <span> / </span> ${t("triple")}`)}<span class="announcement-end">${t("previewPricing")}</span></div><header class="header"><div class="header-main"><div class="desktop-nav"><div class="mega-wrap"><button class="nav-trigger" aria-expanded="false" data-action="mega">${t("collections")}${icon("chevron-down")}</button><nav class="mega-menu" aria-label="${t("collections")}"><div><p class="eyebrow">${t("collections")}</p>${themes.map((h) => link("collection", h, name(h))).join("")}${link("collections", "", t("viewAll"))}</div><div><p class="eyebrow">${t("all")}</p>${core.map((h) => link("collection", h, name(h))).join("")}</div><div class="mega-feature">${image(group("pendants")[0] || products[0])}${link("collection", "best-sellers", `${t("selected")} ${icon("arrow-right")}`)}</div></nav></div>${link("collection", "pendants", t("pendants"))}${link("collection", "sets", t("sets"))}</div>${button("menu", t("menu"), "menu", "mobile-menu icon-button")}${link("home", "", "LILCUTIE", "brand")}<div class="header-tools"><label class="language"><span class="sr-only">Language</span><select id="language" aria-label="Language">${Object.entries(
    languages,
  )
    .map(
      ([key, value]) =>
        `<option value="${key}" ${key === lang ? "selected" : ""}>${value}</option>`,
    )
    .join(
      "",
    )}</select>${icon("chevron-down")}</label>${button("search", t("search"), "search")}${link("help", "account", icon("user-round"), "account-link icon-button")}${button("cart", t("cart"), "shopping-bag")}<span class="bag-count" ${count ? "" : "hidden"}>${count}</span></div></div><nav class="quick-nav" aria-label="${t("browse")}">${link("collection", "crusades-collection", `<span class="status-dot"></span>${t("newDrop")}`)}${link("collection", "best-sellers", t("best-sellers"))}${link("bundle", "pair", t("pair"))}${link("bundle", "triple", t("triple"))}${core.map((h) => link("collection", h, name(h))).join("")}</nav></header>`;
}
function footer() {
  return `<footer><div class="footer-top"><div class="footer-identity">${link("home", "", "LILCUTIE", "brand")}<p>${t("footerLine")}</p><p class="muted small">${t("reference")}</p></div><nav><h3>${t("collections")}</h3>${core.map((h) => link("collection", h, name(h))).join("")}</nav><nav><h3>${t("help")}</h3>${["shipping", "returns", "track", "contact"].map((h) => link("help", h, t(h))).join("")}</nav><div class="newsletter"><h3>${t("newsletter")}</h3><p>${t("newsletterCopy")}</p><p class="muted small">${t("newsletterPending")}</p></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} LILCUTIE</span><div>${link("help", "privacy", t("privacy"))}${link("help", "terms", t("terms"))}<span>USD $</span></div></div></footer>`;
}
function home() {
  const best = group("best-sellers").slice(0, 8);
  const pendant = group("pendants")[0];
  const chain = group("chains")[0];
  return `<section class="campaign"><div class="campaign-media"><img src="${esc(data.hero)}" alt="Reference campaign — sculptural jewelry worn on an armored hand" fetchpriority="high"></div><div class="campaign-copy"><p class="eyebrow">${t("new")} / 01</p><h1>${t("hero")}</h1><p class="hero-subtitle">${t("heroCopy")}</p>${link("collection", "crusades-collection", `${t("shopCollection")} ${icon("arrow-right")}`, "button button-light")}<div class="campaign-index"><span>LILCUTIE — 001</span><span>${t("previewShort")}</span></div></div></section><section class="section offers"><div class="section-head"><h2>${t("offers")}</h2><span class="eyebrow muted">${t("previewPricing")}</span></div><div class="offer-grid"><a href="${route("bundle", "pair")}" data-route class="offer-tile"><div class="pair-images">${image(pendant)}<span>+</span>${image(group("bracelets")[0])}</div><div class="offer-caption"><div><p class="eyebrow">MIX & MATCH</p><h3>${t("pair")}</h3><p>${t("pairCopy")}</p></div><span class="circle-arrow">${icon("arrow-up-right")}</span></div></a><a href="${route("bundle", "triple")}" data-route class="offer-tile"><div class="chain-images">${image(chain)}${image(group("chains")[3])}${image(group("chains")[5])}</div><div class="offer-caption"><div><p class="eyebrow">THE CHAIN EDIT</p><h3>${t("triple")}</h3><p>${t("tripleCopy")}</p></div><span class="circle-arrow">${icon("arrow-up-right")}</span></div></a></div></section><section class="service-strip"><span>${icon("gem")}${t("pendants")} / ${t("rings")}</span><span>${icon("layers-2")}${t("buildStack")}</span><span>${icon("globe-2")}${t("previewShort")}</span></section><section class="section">${sectionHead(t("selected"), "collection", "best-sellers")}${grid(best)}</section><section class="section collection-section">${sectionHead(t("collections"), "collections", "")}<div class="collection-grid">${themes
    .map((h, i) => {
      const p = group(h)[0] || products[i];
      return `<a class="collection-tile" href="${route("collection", h)}" data-route>${image(p, Math.min(1, p.images.length - 1))}<div><span class="eyebrow">0${i + 1} / LILCUTIE</span><h3>${name(h)}</h3><span>${t("explore")} ${icon("arrow-up-right")}</span></div></a>`;
    })
    .join(
      "",
    )}</div></section><section class="section" id="shop-by"><div class="section-head"><h2>${t("shopBy")}</h2><div class="tabs" role="tablist">${core
    .slice(0, 4)
    .map(
      (h) =>
        `<button role="tab" aria-selected="${h === activeTab}" data-tab="${h}">${name(h)}</button>`,
    )
    .join(
      "",
    )}</div></div><div id="tab-products">${grid(group(activeTab).slice(0, 4))}</div><div class="section-end">${link("collection", activeTab, `${t("shopAll")} ${icon("arrow-right")}`, "button button-outline")}</div></section><section class="editorial"><div class="editorial-media">${image(group("pendants").find((p) => p.images.length >= 6) || pendant, 2)}</div><div class="editorial-copy"><p class="eyebrow">${t("editTag")}</p><h2>${t("editTitle")}</h2><p>${t("editCopy")}</p>${link("collection", "all", `${t("explore")} ${icon("arrow-right")}`, "text-link")}</div></section>${faq()}`;
}
function faq() {
  return `<section class="section faq"><h2>${t("faq")}</h2><div>${[1, 2, 3].map((n) => `<details><summary>${t(`faq${n}`)}${icon("plus")}</summary><p>${t(`faq${n}a`)}</p></details>`).join("")}</div></section>`;
}
function collectionPage() {
  const state = current();
  const results = filterProducts(products, state);
  const title = state.view === "search" ? t("search") : name(state.collection);
  const display = state.view === "search" ? state.query : title;
  return `<section class="section collection-intro"><div class="breadcrumb">${link("home", "", t("home"))}${icon("chevron-right")}<span>${title}</span></div><p class="eyebrow">LILCUTIE / ${t("previewShort")}</p><h1>${esc(display || title)}<sup>${results.length}</sup></h1><p>${t("collectionCopy")}</p>${state.view === "search" ? `<form class="page-search" id="page-search"><input name="q" type="search" value="${esc(state.query)}" placeholder="${t("searchHint")}" aria-label="${t("search")}" required><button aria-label="${t("search")}">${icon("search")}</button></form>` : `<div class="category-pills">${["all", ...core].map((h) => link("collection", h, name(h), h === state.collection ? "active" : "")).join("")}</div>`}</section><section class="section catalog-section"><div class="catalog-toolbar"><button class="filter-toggle" data-action="filters">${icon("sliders-horizontal")}${t("filter")}${state.color || state.max < Infinity ? '<span class="status-dot"></span>' : ""}</button><span class="result-count">${results.length} ${t("results")}</span><label class="sort-label"><span>${t("sort")}</span><select id="sort" aria-label="${t("sort")}">${["featured", "low", "high", "az"].map((key, i) => `<option value="${key}" ${state.sort === key ? "selected" : ""}>${t(["featured", "priceLow", "priceHigh", "az"][i])}</option>`).join("")}</select></label></div>${results.length ? `${grid(results.slice(0, shown))}<div class="section-end"><p class="muted small">${Math.min(shown, results.length)} / ${results.length}</p>${shown < results.length ? `<button class="button button-outline" data-action="more">${t("loadMore")}${icon("plus")}</button>` : ""}</div>` : `<div class="empty-state">${icon("search")}<h2>${t("noResults")}</h2><button class="button" data-action="reset">${t("reset")}</button></div>`}</section>`;
}
function collectionsPage() {
  return `<section class="section collection-intro"><p class="eyebrow">LILCUTIE / THE COLLECTIONS</p><h1>${t("collections")}</h1><p>${t("collectionCopy")}</p></section><section class="section"><div class="collection-grid all-collections">${[
    ...core,
    ...themes,
  ]
    .map((h) => {
      const items = group(h),
        p = items[0];
      return p
        ? `<a class="collection-tile" href="${route("collection", h)}" data-route>${image(p, Math.min(1, p.images.length - 1))}<div><span class="eyebrow">${items.length} ${t("pieces")}</span><h3>${name(h)}</h3><span>${t("explore")} ${icon("arrow-up-right")}</span></div></a>`
        : "";
    })
    .join("")}</div></section>`;
}
function productPage() {
  const p = products.find((p) => p.handle === current().handle);
  if (!p) return notFound();
  if (!p.variants.some((v) => v.id === selectedVariant))
    selectedVariant =
      p.variants.find((v) => v.available)?.id || p.variants[0].id;
  galleryIndex = Math.min(galleryIndex, p.images.length - 1);
  const v = p.variants.find((v) => v.id === selectedVariant);
  const peers = siblings(p);
  const recommendations = group(p.type)
    .filter((x) => x.title !== p.title)
    .slice(0, 4);
  return `<div class="section product-breadcrumb breadcrumb">${link("home", "", t("home"))}${icon("chevron-right")}${link("collection", p.type, name(p.type))}${icon("chevron-right")}<span>${esc(p.title)}</span></div><section class="section product-layout"><div class="product-gallery"><div class="main-image"><button class="zoom-target" data-action="zoom" aria-label="${t("zoom")}">${image(p, galleryIndex, "", true)}</button><span class="image-counter">${galleryIndex + 1} / ${p.images.length}</span><div class="gallery-arrows">${button("prev", t("previous"), "arrow-left")}${button("next", t("next"), "arrow-right")}</div></div><div class="thumbnails" role="group" aria-label="${t("gallery")}">${p.images.map((_, i) => `<button data-gallery="${i}" aria-label="${t("gallery")} ${i + 1}" aria-pressed="${galleryIndex === i}">${image(p, i)}</button>`).join("")}</div></div><div class="product-detail"><p class="eyebrow muted">LILCUTIE / ${p.replacementKey}</p><h1>${esc(p.title)}</h1><div class="pdp-price">${money(v.price)}<span>${t("previewPricing")}</span></div><div class="product-color"><p class="field-label">${t("color")}: <strong>${t(p.color)}</strong></p>${peers.length > 1 ? swatches(p) : `<span class="swatch ${p.color} active"></span>`}</div><label class="field-label" for="variant">${t("size")}</label><select id="variant" class="variant-select">${p.variants.map((x) => `<option value="${x.id}" ${x.id === v.id ? "selected" : ""} ${!x.available ? "disabled" : ""}>${esc(x.title === "Default Title" ? "One size" : x.title)}${x.available ? "" : ` — ${t("soldOut")}`}</option>`).join("")}</select><div class="purchase-row"><div class="quantity-control">${button("qty-down", t("quantity") + " −", "minus")}<output aria-label="${t("quantity")}">${qty}</output>${button("qty-up", t("quantity") + " +", "plus")}</div><button class="button add-main" data-action="add" ${v.available ? "" : "disabled"}>${icon("shopping-bag")}${v.available ? t("add") : t("soldOut")}</button></div><p class="reference-note">${icon("info")}<span>${t("reference")}</span></p><div class="pair-prompt">${icon("layers-2")}<div><strong>${t("pair")}</strong><p>${t("previewPricing")}</p></div>${link("bundle", "pair", icon("arrow-right"), "icon-button")}</div><div class="product-accordions">${[
    ["details", t("materialNote")],
    ["delivery", t("deliveryNote")],
    ["returns", t("returnsNote")],
    ["care", t("materialNote")],
  ]
    .map(
      ([key, copy], i) =>
        `<details ${i === 0 ? "open" : ""}><summary>${t(key)}${icon("plus")}</summary><p>${copy}</p></details>`,
    )
    .join(
      "",
    )}</div></div></section><section class="section">${sectionHead(t("youMayLike"), "collection", p.type)}${grid(recommendations)}</section>${faq()}<div class="mobile-purchase"><div><strong>${esc(p.title)}</strong><span>${money(v.price)}</span></div><button class="button" data-action="add" ${v.available ? "" : "disabled"}>${icon("plus")}${t("add")}</button></div>`;
}
function bundlePage() {
  const required = current().offer === "triple" ? 3 : 2;
  const total = bundlePrice(picks, required);
  const available = (
    required === 3
      ? group("chains").filter((p) => p.type === "chains")
      : products.filter((p) => p.type !== "sets" && p.type !== "custom-dogtag")
  ).filter((p) => p.variants.some((v) => v.available));
  return `<section class="section bundle-intro"><p class="eyebrow">LILCUTIE / MIX & MATCH</p><h1>${t(required === 3 ? "triple" : "pair")}</h1><p>${t(required === 3 ? "tripleCopy" : "pairCopy")}</p><div class="bundle-slots">${Array.from({ length: required }, (_, i) => `<div class="bundle-slot">${picks[i] ? `${image(picks[i].product)}<strong>${esc(picks[i].product.title)}</strong><span>${esc(picks[i].variant.title === "Default Title" ? "One size" : picks[i].variant.title)}</span><button class="remove-pick icon-button" data-remove-pick="${i}" title="${t("remove")}" aria-label="${t("remove")} ${i + 1}">${icon("x")}</button>` : `<span class="slot-number">0${i + 1}</span>${icon("plus")}<span>${t("choose")}</span>`}</div>`).join("")}</div><div class="bundle-summary"><span>${picks.length} / ${required} ${t("selection")}</span><strong>${t("bundleTotal")} ${total ? money(total) : "—"}</strong><button class="button" data-action="add-bundle" ${total ? "" : "disabled"}>${t("addPieces")}${icon("arrow-right")}</button></div><p class="muted small">${t("bundleNote")}</p></section><section class="section bundle-catalog"><h2>${t("choose")}</h2><div class="product-grid">${available.map((p) => `<article class="product-card"><div class="card-stage">${image(p)}<button class="quick-add icon-button" data-pick="${p.handle}" title="${t("choose")}" aria-label="${t("choose")} ${esc(p.title)}">${icon("plus")}</button></div><div class="card-info"><strong class="product-name">${esc(p.title)}</strong><div class="card-meta"><span>${t(p.color)}</span><span>${money(price(p))}</span></div></div></article>`).join("")}</div></section>`;
}
function helpPage() {
  const key = current().topic;
  const copy =
    {
      shipping: "deliveryNote",
      returns: "returnsNote",
      contact: "contactNote",
      privacy: "privacyNote",
      terms: "termsNote",
      track: "trackNote",
      account: "accountNote",
    }[key] || "reference";
  return `<section class="section help-page"><div class="breadcrumb">${link("home", "", t("home"))}${icon("chevron-right")}<span>${t(key)}</span></div><p class="eyebrow">LILCUTIE / ${t("help")}</p><h1>${t(key)}</h1><p>${t(copy)}</p>${link("collection", "all", `${t("continue")} ${icon("arrow-right")}`, "button button-outline")}</section>${faq()}`;
}
function notFound() {
  return `<section class="section empty-state"><h1>404</h1>${link("home", "", t("home"), "button")}</section>`;
}
function render({ keepScroll = false } = {}) {
  const scroll = scrollY;
  const state = current();
  document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  let html;
  switch (state.view) {
    case "home":
      html = home();
      break;
    case "collection":
    case "search":
      html = collectionPage();
      break;
    case "collections":
      html = collectionsPage();
      break;
    case "product":
      html = productPage();
      break;
    case "bundle":
      html = bundlePage();
      break;
    case "help":
      html = helpPage();
      break;
    default:
      html = notFound();
  }
  app.innerHTML =
    header() + `<main id="main" tabindex="-1">${html}</main>` + footer();
  document.title = `LILCUTIE — ${state.view === "product" ? products.find((p) => p.handle === state.handle)?.title || "Collection" : state.view === "collection" ? name(state.collection) : t("collections")}`;
  icons();
  if (keepScroll) window.scrollTo(0, scroll);
}
function icons() {
  window.lucide?.createIcons({ attrs: { "stroke-width": 1.5 } });
}
function navigate(href) {
  closeOverlay();
  history.pushState({}, "", href);
  shown = 24;
  galleryIndex = 0;
  selectedVariant = "";
  qty = 1;
  picks = [];
  render();
  window.scrollTo(0, 0);
  document.querySelector("#main")?.focus({ preventScroll: true });
}
function toast(copy) {
  const el = document.querySelector("#toast");
  el.textContent = copy;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 2500);
}
function saveCart() {
  store.set("lilcutie-store-cart", JSON.stringify(cart));
  const count = cartTotals(cart, products).quantity;
  const el = document.querySelector(".bag-count");
  if (el) {
    el.hidden = !count;
    el.textContent = count;
  }
}
function addItem(p, v, quantity = 1) {
  const existing = cart.find(
    (l) => l.handle === p.handle && l.variant === v.id && !l.bundle,
  );
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
  else cart.push({ handle: p.handle, variant: v.id, quantity });
  saveCart();
}
function openOverlay(content, kind = "panel", title = t("cart")) {
  if (!overlay.open) lastFocus = document.activeElement;
  overlay.className = kind;
  overlay.setAttribute("aria-label", title);
  overlay.innerHTML = content;
  if (kind === "cart-panel") {
    const totals = cartTotals(cart, products);
    if (totals.discount) {
      const row = document.createElement("p");
      row.className = "bundle-discount";
      row.textContent = `${t("discount")} −${money(totals.discount)}`;
      overlay.querySelector(".cart-bottom")?.prepend(row);
    }
  }
  icons();
  if (!overlay.open) overlay.showModal();
  document.body.classList.add("modal-open");
}
function closeOverlay() {
  if (overlay.open) overlay.close();
  document.body.classList.remove("modal-open");
  lastFocus?.focus?.();
}
function panelHead(title) {
  return `<div class="panel-head"><h2>${title}</h2>${button("close", t("close"), "x")}</div>`;
}
function cartPanel() {
  const { lines, quantity, subtotal } = cartTotals(cart, products);
  openOverlay(
    `${panelHead(`${t("cart")} (${quantity})`)}${lines.length ? `<div class="cart-items">${lines.map((line, i) => `<article class="cart-line">${link("product", line.handle, image(line.product))}<div>${link("product", line.handle, esc(line.product.title), "product-name")}<p class="muted small">${t(line.product.color)} · ${esc(line.selected.title === "Default Title" ? "One size" : line.selected.title)}</p><strong>${money(line.total)}</strong><div class="cart-line-controls"><div class="quantity-control"><button class="icon-button" data-cart-change="${i}" data-delta="-1" aria-label="${t("quantity")} −">${icon("minus")}</button><span>${line.quantity}</span><button class="icon-button" data-cart-change="${i}" data-delta="1" aria-label="${t("quantity")} +">${icon("plus")}</button></div><button class="remove-link" data-cart-remove="${i}">${t("remove")}</button></div></div></article>`).join("")}</div><div class="cart-bottom"><div><strong>${t("subtotal")}</strong><strong>${money(subtotal)}</strong></div><p class="muted small">${t("reference")}</p><button class="button" disabled>${icon("lock-keyhole")}${t("checkout")}</button><p class="small muted center">${t("saved")}</p></div>` : `<div class="empty-state">${icon("shopping-bag")}<h3>${t("empty")}</h3>${link("collection", "best-sellers", t("continue"), "button")}</div>`}`,
    "cart-panel",
    t("cart"),
  );
}
function searchPanel() {
  openOverlay(
    `${panelHead(t("search"))}<form id="search-form" class="search-form"><input type="search" name="q" placeholder="${t("searchHint")}" aria-label="${t("search")}" autocomplete="off"><button class="icon-button" title="${t("search")}" aria-label="${t("search")}">${icon("search")}</button></form><div id="search-results"><p class="eyebrow">${t("selected")}</p>${grid(group("best-sellers").slice(0, 4))}</div>`,
    "search-panel",
    t("search"),
  );
  overlay.querySelector("input").focus();
}
function filterPanel() {
  const state = current();
  openOverlay(
    `${panelHead(t("filter"))}<form id="filters-form"><fieldset><legend>${t("color")}</legend>${[
      ["", t("all")],
      ["gold", t("gold")],
      ["silver", t("silver")],
    ]
      .map(
        ([value, label]) =>
          `<label class="radio-label"><input type="radio" name="color" value="${value}" ${state.color === value ? "checked" : ""}>${value ? `<span class="swatch ${value}"></span>` : ""}${label}</label>`,
      )
      .join(
        "",
      )}</fieldset><label class="price-range">${t("maxPrice")} <output id="range-value">${money(Number.isFinite(state.max) ? state.max : 200)}</output><input type="range" name="max" min="20" max="200" step="5" value="${Number.isFinite(state.max) ? state.max : 200}"></label><button class="button" type="submit">${t("filter")}${icon("arrow-right")}</button><button class="remove-link" type="button" data-action="reset">${t("clear")}</button></form>`,
    "filter-panel",
    t("filter"),
  );
}
function menuPanel() {
  openOverlay(
    `${panelHead("LILCUTIE")}<nav class="mobile-links">${link("collection", "all", t("all"))}${link("collections", "", t("collections"))}${core.map((h) => link("collection", h, name(h))).join("")}${link("bundle", "pair", t("pair"))}${link("bundle", "triple", t("triple"))}${link("help", "contact", t("contact"))}</nav>`,
    "menu-panel",
    t("menu"),
  );
}
function variantPanel(p, forBundle = false) {
  openOverlay(
    `${panelHead(forBundle ? t("chooseVariant") : t("add"))}<div class="quick-product">${image(p)}<div><h3>${esc(p.title)}</h3><p>${t(p.color)}</p><p>${money(price(p))}</p></div></div><form id="quick-form" data-handle="${p.handle}" data-bundle="${forBundle}"><label class="field-label" for="quick-variant">${t("size")}</label><select id="quick-variant" name="variant" class="variant-select">${p.variants.map((v) => `<option value="${v.id}" ${!v.available ? "disabled" : ""}>${esc(v.title === "Default Title" ? "One size" : v.title)}${!v.available ? ` — ${t("soldOut")}` : ""}</option>`).join("")}</select><button class="button" ${p.variants.some((v) => v.available) ? "" : "disabled"}>${forBundle ? t("choose") : t("add")}${icon("plus")}</button><p class="muted small">${t("reference")}</p></form>`,
    "quick-panel",
    t("chooseVariant"),
  );
}
function zoomPanel() {
  const p = products.find((p) => p.handle === current().handle);
  openOverlay(
    `<div class="zoom-toolbar"><span>${esc(p.title)}</span>${button("close", t("close"), "x")}</div><div class="zoom-image">${image(p, galleryIndex, "", true)}</div><div class="zoom-controls">${button("zoom-prev", t("previous"), "arrow-left")}<span>${galleryIndex + 1} / ${p.images.length}</span>${button("zoom-next", t("next"), "arrow-right")}</div>`,
    "zoom-panel",
    t("zoom"),
  );
}
function updateQuery(values) {
  const q = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(values)) {
    if (value === "" || value === null) q.delete(key);
    else q.set(key, String(value));
  }
  navigate(`?${q}`);
}
document.addEventListener("click", (event) => {
  const a = event.target.closest("a[data-route]");
  if (a && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
    event.preventDefault();
    navigate(a.getAttribute("href"));
    return;
  }
  const el = event.target.closest("button");
  if (!el) return;
  const action = el.dataset.action;
  if (action?.startsWith("quick:"))
    return variantPanel(products.find((p) => p.handle === action.slice(6)));
  if (el.dataset.tab) {
    activeTab = el.dataset.tab;
    render({ keepScroll: true });
    return;
  }
  if (el.dataset.gallery !== undefined) {
    galleryIndex = Number(el.dataset.gallery);
    render({ keepScroll: true });
    return;
  }
  if (el.dataset.cartChange !== undefined) {
    const i = Number(el.dataset.cartChange);
    cart[i].quantity = Math.min(
      99,
      cart[i].quantity + Number(el.dataset.delta),
    );
    if (cart[i].quantity <= 0) cart.splice(i, 1);
    saveCart();
    cartPanel();
    return;
  }
  if (el.dataset.cartRemove !== undefined) {
    cart.splice(Number(el.dataset.cartRemove), 1);
    saveCart();
    cartPanel();
    return;
  }
  if (el.dataset.pick) {
    const required = current().offer === "triple" ? 3 : 2;
    if (picks.length >= required) {
      toast(t("chooseAll"));
      return;
    }
    return variantPanel(
      products.find((p) => p.handle === el.dataset.pick),
      true,
    );
  }
  if (el.dataset.removePick !== undefined) {
    picks.splice(Number(el.dataset.removePick), 1);
    render({ keepScroll: true });
    return;
  }
  switch (action) {
    case "menu":
      menuPanel();
      break;
    case "cart":
      cartPanel();
      break;
    case "search":
      searchPanel();
      break;
    case "close":
      closeOverlay();
      break;
    case "filters":
      filterPanel();
      break;
    case "mega": {
      const trigger = document.querySelector(".nav-trigger");
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!expanded));
      document
        .querySelector(".mega-wrap")
        .classList.toggle("expanded", !expanded);
      break;
    }
    case "more":
      shown += 24;
      render({ keepScroll: true });
      break;
    case "reset":
      updateQuery({ color: null, max: null });
      break;
    case "qty-down":
      qty = Math.max(1, qty - 1);
      render({ keepScroll: true });
      break;
    case "qty-up":
      qty = Math.min(99, qty + 1);
      render({ keepScroll: true });
      break;
    case "add": {
      const p = products.find((p) => p.handle === current().handle);
      const v = p.variants.find((v) => v.id === selectedVariant);
      if (v.available) {
        addItem(p, v, qty);
        cartPanel();
      }
      break;
    }
    case "prev":
    case "next":
    case "zoom-prev":
    case "zoom-next": {
      const p = products.find((p) => p.handle === current().handle);
      galleryIndex =
        (galleryIndex + (action.includes("prev") ? -1 : 1) + p.images.length) %
        p.images.length;
      render({ keepScroll: true });
      if (action.startsWith("zoom")) zoomPanel();
      break;
    }
    case "zoom":
      zoomPanel();
      break;
    case "add-bundle": {
      const required = current().offer === "triple" ? 3 : 2;
      if (bundlePrice(picks, required)) {
        const bundle = crypto.randomUUID();
        picks.forEach(({ product, variant }) =>
          cart.push({
            handle: product.handle,
            variant: variant.id,
            quantity: 1,
            bundle,
            bundleSize: required,
          }),
        );
        saveCart();
        picks = [];
        render({ keepScroll: true });
        cartPanel();
      }
      break;
    }
  }
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "language") {
    lang = el.value;
    store.set("lilcutie-store-language", lang);
    render({ keepScroll: true });
  }
  if (el.id === "sort") updateQuery({ sort: el.value });
  if (el.id === "variant") {
    selectedVariant = el.value;
    render({ keepScroll: true });
  }
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.name === "max") {
    document.querySelector("#range-value").textContent = money(
      Number(el.value),
    );
  }
  if (el.closest("#search-form")) {
    const results = filterProducts(products, { query: el.value }).slice(0, 8);
    overlay.querySelector("#search-results").innerHTML = results.length
      ? grid(results)
      : `<p>${t("noResults")}</p>`;
    icons();
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (
    !["search-form", "page-search", "filters-form", "quick-form"].includes(
      form.id,
    )
  )
    return;
  event.preventDefault();
  const fields = new FormData(form);
  if (["search-form", "page-search"].includes(form.id)) {
    const query = fields.get("q").trim();
    navigate(`?${new URLSearchParams({ view: "search", q: query })}`);
  }
  if (form.id === "filters-form")
    updateQuery({
      color: fields.get("color"),
      max: Number(fields.get("max")) >= 200 ? null : fields.get("max"),
    });
  if (form.id === "quick-form") {
    const p = products.find((p) => p.handle === form.dataset.handle);
    const v = p.variants.find((v) => v.id === fields.get("variant"));
    if (!v?.available) return;
    if (form.dataset.bundle === "true") {
      picks.push({ product: p, variant: v });
      closeOverlay();
      render({ keepScroll: true });
    } else {
      addItem(p, v);
      cartPanel();
    }
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeOverlay();
    document.querySelector(".mega-wrap")?.classList.remove("expanded");
    document
      .querySelector(".nav-trigger")
      ?.setAttribute("aria-expanded", "false");
  }
  if (
    overlay.open &&
    overlay.classList.contains("zoom-panel") &&
    ["ArrowLeft", "ArrowRight"].includes(event.key)
  ) {
    event.preventDefault();
    overlay
      .querySelector(
        `[data-action="zoom-${event.key === "ArrowLeft" ? "prev" : "next"}"]`,
      )
      ?.click();
  }
});
overlay.addEventListener("click", (event) => {
  if (event.target === overlay) {
    const rect = overlay.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeOverlay();
  }
});
overlay.addEventListener("close", () =>
  document.body.classList.remove("modal-open"),
);
window.addEventListener("popstate", () => {
  closeOverlay();
  selectedVariant = "";
  galleryIndex = 0;
  qty = 1;
  picks = [];
  render();
  window.scrollTo(0, 0);
});
try {
  const response = await fetch(
    new URL("./catalog.json?v=20261019-2", import.meta.url),
  );
  if (!response.ok) throw new Error("catalog");
  data = await response.json();
  products = data.products.map((p) => ({
    ...p,
    title: p.title.replace(/Humbler\s*/gi, ""),
  }));
  cart = restoreCart(store.get("lilcutie-store-cart", "[]"), products);
  render();
} catch (error) {
  console.error(error);
  app.innerHTML =
    '<div class="loading"><strong>LILCUTIE</strong><p>The collection could not load. Please refresh the page.</p><button onclick="location.reload()">Reload</button></div>';
}
