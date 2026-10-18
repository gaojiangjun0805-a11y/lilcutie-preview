# LILCUTIE Reference Preview

This is an isolated design preview. The original storefront remains at
`../index.html`. All checkout controls are deliberately disabled.

## Reference Media

Catalog imagery and the campaign photograph currently refer to public Humbler
CDN URLs. These are temporary references, not LILCUTIE product photography or
evidence of a resale license. Replace them with authorized own-product media
before any commercial launch or advertising.

`assets/catalog.json` contains 125 reference product entries and 605 image slots.
Gold/silver counterparts are separate entries. Six core category memberships use
the captured public category feeds; secondary groups are design-preview
selections, not an exact mirror of the reference store's live merchandising.

## Replacing Products

- Product key: `LC-001`, `LC-002`, etc.
- Image slot: `LC-001-01`, `LC-001-02`, etc.
- Replace each `images[].src` with a licensed local or remote asset.
- Update title, handle, variants, options, price, category and finish together.
- Keep variant IDs stable when only replacing images.
- Validate actual materials, sizes, shipping and returns before opening checkout.
- AI-generated styling must preserve the supplied product's real details.

The retained `source` field records reference provenance. It is not a purchase
link or payment integration.

## Preview Architecture

Buildless static HTML, CSS and JavaScript. Shareable query URLs support category,
product, bundle, search and client-care pages on GitHub Pages. The shopping bag
and language preference remain in browser storage. No registration, email
submission, analytics pixels or real payments are connected.

Core logic tests: `node --test scripts/reference-store.test.mjs` from the repo root.
The icon library is Lucide (ISC license), pinned to 0.468.0.
