# Naja — project context

This file exists so a new Claude Code session (or a human) can pick this project
up cold. Read this before doing anything else. Update it at the end of every
phase — don't let it go stale.

## What this is

**Naja** — a storefront for a friend's small business selling handmade,
made-to-order 3D-printed lamps in Algeria. Cash on delivery only, ever — no
payment gateway, no card UI. All user-facing text is in **French**; code,
comments, and dev discussion are in English.

The client is non-technical. The project owner (the person you're talking to)
is building this *with* Claude Code, phase by phase, specifically to learn
Next.js and Supabase — not asking for it to be built on autopilot. **Stop at
the end of each phase, explain what was built and why in plain terms, and wait
for explicit confirmation before starting the next phase.** Don't add features
that weren't asked for (no email signup, no newsletter, no payment gateway, no
inventory/stock-count system beyond a per-color in-stock toggle).

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- Supabase: Postgres + Auth (`@supabase/ssr`) + Storage (product photos)
- Hosting: Netlify, connected to GitHub for auto-deploy (not set up yet — Phase 7)
- Package manager: npm
- Project lives at `D:/CODE/naja3`, not yet pushed to a GitHub remote (local git
  repo only, initialized by `create-next-app`)

## Prior attempts — read this before reusing anything

Two earlier full builds of this same idea exist as siblings: `D:/CODE/naja`
(JavaScript) and `D:/CODE/naja2` (TypeScript, more refined). **naja3 is a
deliberate clean restart, not a continuation.** Do not port code from them
without checking with the user first — the design system and some
architecture choices are intentionally different this time:

| | naja2 (prior) | naja3 (this project) |
|---|---|---|
| Palette | cream/night, Fraunces + Nunito | papier/encre/lueur/blush/crépuscule/sauge — see below |
| Fonts | Fraunces + Nunito | Fredoka + Work Sans + Caveat |
| Commune field | dropdown fed by a 1,521-commune dataset | **free text** (confirmed with user) |
| Admin identity | `admin_users` table + `is_admin()` SQL function | **plain Supabase Auth users, no custom table** (confirmed with user) |
| Product visuals | generated SVG lamp shapes | real product photos in an organic "blob" mask |
| Smooth scroll | Lenis-driven | not decided yet — scroll-snap only on homepage per brief |

What *does* carry forward from naja2 as validated, hard-won lessons (see
"Known gotchas" below): the RLS-vs-grants footgun, the `middleware.ts` →
`proxy.ts` rename in Next 16, the service-role-key-server-only discipline, and
the general shape of "admin panel needs its own layout tree." These are
already folded into this project's structure — see Phase 0 below.

## Design direction

Visual reference: aardvarkbookclub.com — warm, editorial product grid, clear
"how it works" steps, scroll fade/slide-ins, hover lift/scale on product
cards, sticky nav that shrinks on scroll, scroll-snap **on the homepage
only** (flag it if scroll-snap fights normal page flow anywhere else).

**Brand thesis: a lamp switched on at dusk.** Not generic warm-cream-and-
terracotta. Small, glowing, slightly imperfect, handmade objects.

CSS variable palette (use only these, don't invent others — not yet wired
into `globals.css`, that's Phase 2):
```
--papier      #FFF6EE   background, warm ivory
--encre       #3A2E36   text, soft plum-brown instead of black
--lueur       #F2A65A   primary accent / CTAs — the color of a lit lamp
--blush       #F6C6CE   secondary accent, card backgrounds, soft tags
--crepuscule  #A79BE0   cool contrast accent, dusk lavender
--sauge       #A8C3A0   status tags like "en stock" (avoid default red/green)
```

Typography (also Phase 2, not wired yet):
- **Fredoka** — headlines, product names
- **Work Sans** — body text, forms, nav
- **Caveat** — sparingly, small handwritten touches only (e.g. "fait main"), never body copy

Signature element: every product photo sits in an **organic blob shape** (not
a rounded rectangle) with a soft warm glow behind it, like it's plugged in.
Everything else (nav, buttons, forms) stays quiet: pill buttons, hairline
borders, generous whitespace. The blob-glow treatment is the one bold move —
don't dilute it by decorating elsewhere.

## Data model — live in Supabase as of Phase 1

The original draft below was adjusted during Phase 1 (see "What's actually
been built (Phase 1 detail)" for the reasoning) and is now the **actual live
schema**, not a draft. Source of truth is `supabase/migrations/*.sql`.

```
products
  id (bigint identity), slug (unique), name, description, price (integer DZD), created_at

product_colors
  id, product_id → products, color_name, color_hex (nullable), in_stock (boolean), created_at
  unique (product_id, color_name)

product_photos
  id, product_color_id → product_colors, url, position

delivery_rates
  id, wilaya (text, unique), domicile_price (integer), stopdesk_price (integer, nullable),
  created_at, updated_at (auto-maintained by trigger)
  -- fully admin-managed (add/edit/delete rows) — do NOT hardcode wilayas in app code.
  -- Algeria moved from 58 to 69 wilayas in April 2026 (Loi 26-06); confirmed the
  -- original 01-58 numbering/names are unaffected — the 11 new ones are numbered
  -- 59-69, still transitioning through end of 2026, carriers not caught up yet.
  -- Admin adds new rows herself from /admin/livraison when needed — no code change.
  -- stopdesk_price nullable because not every wilaya has a stopdesk option.

orders
  id, created_at, status (enum: nouvelle, confirmée, expédiée, livrée, annulée),
  customer_first_name, customer_last_name, phone,
  wilaya (FK → delivery_rates.wilaya, on delete restrict), commune (free text),
  delivery_method (enum: domicile, stopdesk), delivery_fee (integer, snapshot at order time),
  products_total (integer), order_total (GENERATED ALWAYS AS products_total + delivery_fee),
  notes_client, internal_notes (admin-only, not shown to customer)
  -- delivery_fee is a snapshot, not a live join — rates can change later without
  -- touching past orders. order_total can't drift from reality since it's DB-computed.

order_items
  id, order_id → orders (on delete cascade),
  product_id → products (on delete restrict), product_color_id → product_colors (on delete restrict),
  quantity (check > 0), price_at_order (integer)
  -- restrict, not cascade: a product/color that's ever been ordered can never be
  -- deleted, only retired via the in_stock toggle. Keeps order history intact.

-- admin identity handled entirely by Supabase Auth users — no custom admin table.
```

Seed data for `delivery_rates`: 58 rows, the wilaya list from the original
brief, `domicile_price`/`stopdesk_price` = 0 as placeholders — client fills
in real numbers from the admin panel. Verified against current sources
(April 2026 split confirmed 01-58 unchanged) before seeding — see Phase 1 detail.

## Known gotchas — don't repeat these

- **RLS policies AND base table grants are both required.** A fresh Supabase
  project can leave `anon`/`authenticated`/`service_role` with zero
  privileges on `public` even with RLS fully written — every query fails
  `42501 permission denied for table …`, including from `service_role` (it
  bypasses RLS but not GRANTs). Set up both together, every time, every
  table. (Validated the hard way in naja2.)
- **Env var changes require a dev server restart.** Not always obvious when
  something "isn't working."
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`.** Confirmed against the
  actual bundled docs in `node_modules/next/dist/docs/01-app/03-api-reference/
  03-file-conventions/proxy.md` — file must be named `proxy.ts`, function
  `proxy` (default or named export), root layout still requires `html`/`body`
  tags. This project's `AGENTS.md` (auto-generated by `create-next-app`) warns
  that Next 16 has real breaking changes vs. training data — check
  `node_modules/next/dist/docs/` before writing anything that touches
  routing/middleware/caching APIs.
- **Admin panel must live in its own route group/layout tree**, never nested
  inside the public site's root layout. Already solved structurally in Phase
  0 — see below.
- **Writes from the admin panel use the `service_role` key strictly inside
  Server Actions** — never client-side. `src/lib/supabase/admin.ts` is
  guarded with `import "server-only"` specifically so this can't happen by
  accident.
- **`cookies()` from `next/headers` is async** in this Next.js version — must
  `await cookies()`. Already handled correctly in `src/lib/supabase/server.ts`.

## Phases (from the original brief) and current status

0. **Project setup** — ✅ done.
1. **Database schema** — ✅ done, see below.
2. **Public storefront shell** — ✅ done, see below. Animations (scroll
   fade/slide-in, hover lift, sticky-nav shrink) deliberately deferred to
   Phase 6 — user initially asked for them now, confirmed keeping the phases
   split instead: static/structural first, animated pass later.
3. **Catalog & product detail** — ✅ done, see below.
4. **Cart & checkout** — ✅ done, see below.
5. **Admin dashboard** — ✅ done, see below. Scope grew beyond the brief's
   literal text — see "Decisions" at the bottom.
6. **Animation & polish** — not started. Scroll fade/slide-in, hover
   lift/scale, sticky nav shrink, homepage-only scroll-snap. Keep subtle.
7. **Deploy** — not started. Netlify + GitHub auto-deploy, env vars on
   Netlify (not just local), flag Supabase free-tier inactivity pause +
   mention UptimeRobot as a fix (don't implement, just flag).

## What's actually been built (Phase 0 detail)

Ran, in order:
```
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
npm install @supabase/supabase-js @supabase/ssr server-only
npx supabase init
```

Verified versions at scaffold time: Next.js 16.3.0, Tailwind 4.3.3,
`@supabase/ssr` 0.12.4, React 19.2.8.

**Folder structure:**
```
src/app/
├── layout.tsx            bare root shell — html/body, metadata, font vars
│                          (placeholder Geist fonts — real fonts land in Phase 2)
│                          NO Header/Footer, NO theme tokens yet
├── globals.css            still create-next-app's default (Tailwind v4
│                          zero-config: @import "tailwindcss" + @theme inline,
│                          no tailwind.config.js file — that's normal for v4)
├── (site)/                route group for the public storefront
│   ├── layout.tsx          placeholder passthrough, gets Header/Footer in Phase 2
│   └── page.tsx            placeholder homepage stub
└── admin/                 sibling of (site), NOT nested inside it
    ├── layout.tsx          placeholder passthrough, gets auth guard + nav in Phase 5
    └── page.tsx            placeholder stub

src/lib/supabase/
├── client.ts               browser client (createBrowserClient, anon key)
├── server.ts                server client (createServerClient, anon key,
│                            session cookies via async next/headers cookies())
└── admin.ts                 service-role client, `import "server-only"` guard,
                              not used anywhere yet — exists so Phase 5 writes
                              never reach for the anon client by mistake

supabase/                  from `supabase init` — config.toml + its own
                            .gitignore (.branches, .temp, .env.local). No
                            migrations/seed files yet — that's Phase 1.
                            Not linked to a cloud project yet (`supabase link`
                            deferred until Phase 1, needs `supabase login`).

.env.local.example          committed, three var names, no values:
                            NEXT_PUBLIC_SUPABASE_URL
                            NEXT_PUBLIC_SUPABASE_ANON_KEY
                            SUPABASE_SERVICE_ROLE_KEY
.env.local                  created, gitignored, populated with a real
                            Supabase project's credentials (new-style
                            `sb_publishable_...` / `sb_secret_...` keys, not
                            the legacy JWT anon/service_role format — these
                            slot into the same anon-key/service-role-key
                            parameters in @supabase/supabase-js and
                            @supabase/ssr, no code difference). Verified live:
                            project's /auth/v1/health endpoint returns 200
                            with the publishable key, and `npm run dev`
                            picked up .env.local (logged
                            "Environments: .env.local") with both routes
                            still responding 200.
.gitignore                  patched: default Next.js .gitignore blanket-
                            ignores `.env*`, which would've also hidden the
                            committed example file — added
                            `!.env.local.example` to un-ignore it specifically
```

Verified working: `npm run build` (both `/` and `/admin` compile as static
routes), `npm run lint` (clean), and a live `npm run dev` smoke test — both
routes return 200 with no shared chrome between them.

Not yet committed to git — nothing has been committed this session. `git
status` as of end of Phase 0 shows the above files modified/untracked on
branch `master`, no commits beyond `create-next-app`'s initial one.

Auto-generated by `create-next-app` and left alone (not part of my plan, just
noting they exist): `AGENTS.md` (Next 16's own warning to check
`node_modules/next/dist/docs/` before assuming API behavior — genuinely worth
reading, this Next version has real breaking changes), `.claude/settings.json`
(one allowed Bash command from the scaffold step), default `README.md`
(untouched, still create-next-app boilerplate).

## What's actually been built (Phase 1 detail)

Adjustments made to the user's draft schema, confirmed with them before
writing SQL (3-5 sentence architecture check per the "describe the plan
first" rule in this file's intro):
- **bigint identity PKs, not UUIDs** — simpler, no extension dependency,
  readable order numbers (#482) for the shop owner.
- **Prices are plain integers in DZD**, no decimals — matches how dinars are
  actually quoted (same call naja2 made).
- **`orders.order_total` is a generated column** (`products_total +
  delivery_fee`, `STORED`) instead of an app-supplied value — structurally
  cannot drift from the truth.
- **`orders.wilaya` is a real FK into `delivery_rates.wilaya`** (`on update
  cascade on delete restrict`) — an order can never reference a nonexistent
  wilaya, while `delivery_fee` stays an independent snapshot.
- **Single write path, no exceptions**: `anon` and `authenticated` get
  SELECT-only grants everywhere (anon: catalog + delivery_rates only;
  authenticated: same plus orders/order_items for the admin dashboard). No
  role has direct INSERT/UPDATE/DELETE anywhere. Every write — checkout in
  Phase 4, every admin edit in Phase 5 — goes through a Server Action using
  `src/lib/supabase/admin.ts` (service_role), which re-validates and
  recomputes before writing. This generalizes the brief's own gotcha
  ("service_role strictly inside Server Actions") to every table instead of
  just some.

Files created:
```
supabase/migrations/
├── 20260811131001_init_schema.sql   enums, 6 tables, FKs, checks, indexes
├── 20260811131002_rls.sql            RLS enabled everywhere; SELECT-only
│                                      policies (see below)
├── 20260811131003_grants.sql         base table grants — required in addition
│                                      to RLS, see "Known gotchas"
└── 20260811131004_storage.sql        public `product-photos` bucket +
                                       SELECT policy on storage.objects
supabase/seed.sql                     58 wilayas, idempotent (ON CONFLICT DO
                                       NOTHING), 0 DZD placeholders
```

RLS policies in plain terms:
- `products`/`product_colors`/`product_photos`/`delivery_rates`: readable by
  **everyone**, including logged-out visitors (needed for the public site and
  checkout's wilaya dropdown).
- `orders`/`order_items`: readable **only by a logged-in admin**
  (`authenticated`). A customer can't read back their own just-placed order —
  matches the brief, no account system or order-lookup-by-reference exists.
- No INSERT/UPDATE/DELETE policy exists on any table, anywhere, on purpose —
  see "single write path" above.

Wilaya list verified via web search before seeding (user's brief explicitly
asked not to trust it blindly): the April 2026 split to 69 wilayas (loi
26-06) added 11 *new* wilayas numbered 59-69 as carve-outs from existing
ones; the original 01-58 numbers/names are confirmed unchanged. So the
brief's 58-wilaya list is still accurate — seeded as-is.

Applied by the user directly via Supabase Studio's SQL Editor (their choice
over sharing the DB password for a CLI push). Verified live afterward via
`curl` against the project's REST/Storage APIs using the anon and
service_role keys:
- `delivery_rates`: 58 rows confirmed via `Content-Range` header, sample
  rows match.
- `products`: table exists, empty (expected, catalog seeding is Phase 3).
- `orders` via anon key: correctly rejected —
  `{"code":"42501","message":"permission denied for table orders"}` — proves
  the grants layer is working, not just RLS.
- `product-photos` bucket: exists, `public: true` (confirmed via
  service_role — the anon key can't read bucket *metadata*, that's a
  separate RLS surface on `storage.buckets` we didn't grant, which is
  correct/intentional). Public object downloads confirmed working via
  `/storage/v1/object/public/product-photos/...` (returns "Object not
  found" for a missing file, not "Bucket not found").

One hiccup, resolved: user re-ran `storage.sql` a second time to double-check
it, which errored on `create policy ... already exists` (policies aren't
idempotent like the `ON CONFLICT DO NOTHING` bucket insert is) — this
confirmed the file succeeded the first time rather than indicating a
problem. No fix needed.

Supabase CLI is still not linked to the cloud project (`supabase link` /
`supabase login` never run) — all schema changes so far went through the
dashboard SQL Editor. Decide in a later phase whether that's worth setting
up, or whether pasting SQL into the editor stays the workflow for the rest
of the project.

## What's actually been built (Phase 2 detail)

Scope check before building: the user's first message about Phase 2 asked
for animations "like that inspiration website" included now. Flagged that
the brief itself splits this — Phase 2 is structure/visual identity, Phase 6
is the scroll/hover/sticky-nav animation pass — and asked which they wanted.
Confirmed: keep the split, static/structural now, animate later.

**Theme wiring** (`src/app/globals.css`, `src/app/layout.tsx`):
- All 6 palette variables (`--papier`/`--encre`/`--lueur`/`--blush`/
  `--crepuscule`/`--sauge`) defined on `:root` and mapped into a Tailwind v4
  `@theme inline` block, so they're usable as `bg-papier`, `text-encre`,
  `bg-lueur/40`, etc. — including opacity modifiers, which Tailwind v4
  supports on any theme color.
- **Removed** create-next-app's default `prefers-color-scheme: dark`
  override entirely — Naja has one fixed warm brand identity, not an
  adaptive light/dark theme. Worth remembering if a future dark-mode request
  ever comes up: it wasn't an oversight, it was deliberate.
- Fredoka (headings), Work Sans (body — exported as `Work_Sans` from
  `next/font/google`, underscore not space), and Caveat (handwritten
  accents) all loaded as **variable-weight** fonts (all three support a
  `wght` axis, confirmed by inspecting
  `next/font/google`'s bundled `font-data.json` directly rather than
  guessing), exposed as `font-heading`/`font-body`/`font-hand` Tailwind
  utilities via CSS variables set in the root layout.

**Signature blob-glow treatment** (`src/components/site/BlobPhoto.tsx`):
Two stacked divs — a blurred `bg-lueur/50` glow shape behind, a
`overflow-hidden` photo container in front — both clipped with the same
organic `border-radius` (three hand-picked variants: `.blob-a/b/c` in
`globals.css`, cycled by card index so a grid doesn't look stamped from one
template). **First attempt at the border-radius values read as a plain
circle in the screenshot** (percentages too close together, e.g. `63% 37%`
vs needing something like `42% 58% 70% 30%` for real visual asymmetry) —
caught by actually rendering it, not by eyeballing the CSS, and fixed by
widening the spread. Falls back to a plain `bg-blush` swatch when there's no
photo yet (no upload pipeline until Phase 5) — no fake/placeholder photos.

**Homepage sections** (`src/components/site/`): `Header` (sticky, no
shrink-on-scroll yet), `Footer`, `Hero` (decorative glow blob, no product
photo needed), `CatalogPreview` (server component, queries real Supabase
data via `src/lib/products.ts`'s `getFeaturedProducts()`, shows an honest
"Les premières lampes arrivent très bientôt" empty state rather than mock
products — the catalog genuinely is empty until Phase 5), `ProductCard`
(uses `BlobPhoto`), `HowItWorks` (4 static steps), `Faq` (client component,
CSS grid-template-rows accordion — not a scroll/hover animation, so
in-scope for Phase 2 under the split above). All FAQ and hero copy is draft
French marketing copy the user will likely want to revise — flagged, not
hidden.

`src/app/(site)/layout.tsx` now renders `Header`/`children`/`Footer`;
`src/app/(site)/page.tsx` composes `Hero`/`CatalogPreview`/`HowItWorks`/`Faq`.

**Verification:** No `chromium-cli` or system browser available in this
environment, so set up a throwaway Playwright + Chromium install in the
scratchpad directory (outside the project, not a project dependency) to
actually screenshot the running dev server rather than trust the build
output alone. Confirmed: palette/fonts/layout render correctly, FAQ
accordion opens/closes, no console errors. Also **temporarily inserted one
throwaway product + color via the service-role key** specifically to see the
blob-glow card render with real data flowing through the query (the empty
state never exercises that code path) — this is what caught the
circle-not-blob issue above — then **deleted both rows immediately after**
and confirmed `products` is empty again via a fresh query. The live database
was never left with fake data.

`npm run lint` and `npm run build` both pass. `/` is now server-rendered
per-request (`ƒ`, not static `○`) since `CatalogPreview` reads cookies via
the Supabase server client — expected, not a bug.

## What's actually been built (Phase 3 detail)

**Data layer** (`src/lib/products.ts`, extended): `getProducts()` for the
full listing, `getProductBySlug()` for detail — both real Supabase queries,
still return empty/`null` gracefully since the catalog is genuinely empty
until Phase 5. Colors come back sorted in-stock-first, so the gallery's
default selection is always something a customer could actually buy rather
than defaulting to an unavailable one. New `src/lib/format.ts` with
`formatPrice()` (`Intl.NumberFormat("fr-FR")` + " DA") so price formatting
isn't reimplemented per component.

**Pages**: `src/app/(site)/boutique/page.tsx` (listing, reuses `ProductCard`)
and `src/app/(site)/boutique/[slug]/page.tsx` (detail, calls Next's
`notFound()` for an unknown slug). `ProductCard` now links to
`/boutique/[slug]` and uses `formatPrice`.

**Interactive gallery** (`src/components/site/ProductGallery.tsx`, client
component): picking a color swaps the photo set and resets to photo 0;
multiple photos per color get a thumbnail row. Out-of-stock colors render
**visibly but disabled** (`opacity-50`, `cursor-not-allowed`, a "(rupture)"
label) rather than hidden or using red — matches the brief's "avoid default
red/green" status-tag note. No "add to cart" button anywhere yet — that's
explicitly Phase 4's job once the cart exists.

**Fixed while here**: the `(site)` `Header` now has real pages to link to
(`Boutique`), and its "Comment ça marche"/FAQ links and CTA switched from
page-relative `#hash` anchors (which only worked *on* the homepage — a real
bug that only surfaced once other pages existed) to `/#hash`/`/boutique`.
Also added `src/app/(site)/not-found.tsx` with French copy — Next's default
404 text is English, and the brief requires French everywhere; caught by
actually navigating to a bad slug during verification, not by inspection.

**Verification**: same throwaway-data pattern as Phase 2 — temporarily
seeded one product with an in-stock color (2 placeholder photos, to test
thumbnail switching) and an out-of-stock color via the service-role key,
confirmed by screenshot: listing → detail navigation, color switching,
disabled-color click has no effect, photo thumbnail switching updates the
main image, and the new French 404 page. Deleted all three temp rows
(photos, colors, product) immediately after and confirmed all three tables
empty again via a fresh query. `npm run lint` and `npm run build` both pass.

## What's actually been built (Phase 4 detail)

Plan was described and confirmed before building, per the brief's
architecture-level-decision rule (cart strategy, checkout flow are both
explicitly named). One real fork point was asked rather than assumed: how
the confirmation page gets its order data. Confirmed **sessionStorage
handoff** — the Server Action returns the order summary, the browser stashes
it in sessionStorage, the confirmation page reads-and-clears it once. No
order is ever fetchable by ID/reference (matches naja2's validated privacy
reasoning, restated fresh here): a shared or guessed confirmation link can't
leak another customer's name/phone/address. Tradeoff accepted: a page
refresh loses the detail and falls back to a generic "commande confirmée"
message.

**Cart** (`src/lib/cart.tsx`): React Context + `localStorage`, hydrated
post-mount (empty on both server render and first client render to avoid a
hydration mismatch, then synced from storage in a `useEffect` — the standard
fix for "state from a browser-only API," not a smell, despite
`eslint-plugin-react-hooks`'s newer `set-state-in-effect` rule flagging it;
disabled inline with a reason at both call sites, here and in the
confirmation page). Line items keyed by `productId:colorId`, storing a
*display* price snapshot only — quantity, product/color names, a photo URL.
That price is never what gets charged.

**Add-to-cart lives inside `ProductGallery`** (extended, not a new
component) rather than as a sibling — it already owns `selectedColorId`
state for the photo gallery, and add-to-cart needs to know exactly the same
thing (which color is selected). A separate component would've meant two
copies of that state that could drift out of sync (swatch shows "Lavande"
selected, cart button silently adds "Ambre").

**Checkout is the single write path applied for real** (Phase 1 set this up
structurally, Phase 4 is where it's actually exercised): `CheckoutForm`
(client) collects the form + reads cart context for display totals only.
`src/app/(site)/commande/actions.ts`'s `placeOrder` Server Action —
`service_role`, the only role with INSERT on `orders`/`order_items` — is
where the real order gets built: re-fetches every product/color by ID from
the live database, rejects if a color is no longer `in_stock` or a
product/color no longer exists, re-derives `delivery_fee` from
`delivery_rates` by wilaya + method (rejects `stopdesk` if that wilaya's
`stopdesk_price` is `null`), and only then inserts. `products_total` is
computed server-side from re-fetched prices; `order_total` is the Phase 1
generated column, never set directly. A tampered cart in devtools changes
nothing about what's actually charged.

**Routes**: `/panier` (cart, client), `/commande` (checkout — server
component fetches `delivery_rates` live via `getDeliveryRates()`, passes to
`CheckoutForm`), `/commande/confirmation` (client, sessionStorage read).
Header gained `CartLink` (client component showing a live item-count badge,
composed into the otherwise-server `Header` — Server Components can render
Client Components as children without becoming client themselves).

New `.input` utility class in `globals.css` for form fields (hairline
border, `papier` background, `lueur` focus ring) — first form on the site,
so this didn't exist before.

**Verified with a full live run, not just component-level checks**: seeded
one real product + in-stock color, temporarily set Alger's rates to
600/400 DZD (seed placeholders are 0, which would've made the fee math
untestable), then drove the entire flow with Playwright — add to cart
(header badge updates), `/panier` (quantity controls, line totals), 
`/commande` (fee/total updates live when switching wilaya or
domicile→stopdesk), submit, confirmation page. Queried the resulting
`orders`/`order_items` rows directly afterward and confirmed every value was
correct, including `order_total` computing itself via the generated column.
Deleted the order, order_items, product, color, and reverted Alger's rates
back to 0/0 — confirmed via fresh queries that everything is back to exactly
the state the client left it in.

## What's actually been built (Phase 5 detail)

**Scope was expanded before building, flagged rather than assumed.** The
brief's Phase 5 text literally only lists orders management + delivery
rates — it never mentions product/catalog management, yet nothing else in
the brief gives the non-technical client any way to populate the catalog.
Flagged this as a likely oversight; confirmed with the user to fold product
management (create/edit/delete products, colors, photo upload) into Phase 5
too. Also confirmed how the admin login gets created: the user sets it up
themselves via the Supabase dashboard (Authentication → Users → Add user) —
I never handle her real credentials.

**Auth — three layers, matching the plan confirmed before building:**
1. `src/proxy.ts` (Next 16's renamed middleware) — refreshes the Supabase
   session cookie on every `/admin/*` request via `@supabase/ssr`'s
   `createServerClient` with request/response cookie handlers, and redirects
   to `/admin/connexion` if there's no user (except the login route itself).
2. `src/app/admin/(espace)/layout.tsx` — server-side backstop, re-checks
   `auth.getUser()` and redirects if somehow reached without a session.
3. `src/lib/adminAuth.ts`'s `requireAdminUser()` — called at the top of
   **every** admin Server Action. This one matters most: a Server Action is
   its own POST endpoint, not protected by proxy.ts's page-navigation
   redirect, so without this a write could be invoked directly bypassing the
   UI entirely.

No `admin_users` table anywhere (per the standing decision) — "has a valid
Supabase session" is the entire authorization check, since there's exactly
one admin. Login (`/admin/connexion`) and sign-out
(`src/components/admin/SignOutButton.tsx`) both use the plain browser
Supabase client (`signInWithPassword`/`signOut`) — no custom auth endpoints.

**Every admin Server Action returns `ActionResult<T>`
(`src/lib/actionResult.ts`, `{ ok: true; data?: T } | { ok: false; error }`)
instead of throwing.** This wasn't the original approach — orders/delivery-
rates actions initially threw `Error`s, which the calling client components
called without try/catch, so a real failure (e.g. deleting a wilaya an order
still references) would have failed silently with just a console warning.
Caught and fixed before building products, so every write path is
consistent. This also sidesteps a real Next.js footgun: `redirect()` thrown
inside a Server Action gets swallowed if the caller wraps the call in
try/catch, since redirect works by throwing — returning a result and doing
`router.push()` client-side avoids that entirely (see `ProductForm`'s create
flow).

**Data integrity from Phase 1 is now load-bearing, not theoretical**: tried
to delete a color that a real order referenced during verification, and got
exactly the intended `ON DELETE RESTRICT` failure, surfaced as
"Impossible de supprimer cette couleur — elle fait peut-être partie d'une
commande existante." — not a raw Postgres error. Same protection applies to
products and delivery rates. `src/lib/orders.ts`'s admin reads never fall
back to anything on error (unlike the public `src/lib/products.ts`) —
showing stale/fake data in the admin screens would let someone believe
they'd saved a real edit that didn't happen; mirrored in the new
`src/lib/adminProducts.ts`.

**Photo upload** (`uploadPhoto` in `produits/actions.ts`) takes a `FormData`
with a `File`, uploads to the `product-photos` bucket at
`${colorId}/${timestamp}-${sanitizedFilename}`, gets the public URL via
`getPublicUrl()`, and inserts the `product_photos` row — all through the
service-role client, consistent with the single-write-path pattern (the
bucket has no write policy for `anon`/`authenticated`, only the Phase 1
public-read policy). Deleting a photo derives its storage path by string-
splitting the stored public URL rather than keeping a separate path column
— simple since the bucket name is fixed and never appears twice in a path.

**Status badges avoid red/green** (`src/components/admin/StatusBadge.tsx`):
nouvelle→crépuscule, confirmée→lueur, expédiée→sauge, livrée→solid encre,
annulée→muted blush — five brand colors instead of a semaphore.

**Client/server import boundary bug, caught by the build, not by review**:
`OrderStatusControl` (a Client Component) originally imported `OrderStatus`
from `src/lib/orders.ts`, which imports the server-only Supabase client —
Turbopack correctly refused to build ("You're importing a module that
depends on next/headers... in the Pages Router" — misleading message, real
issue was the client/server boundary). Fixed by splitting the pure
type/constant into `src/lib/orderStatus.ts` with zero server imports, and
pointing every Client Component at that file instead of `orders.ts`.

**Verification was the most thorough yet, and found two real things**:
created a throwaway admin account via `auth.admin.createUser()` (service-
role, not the user's real credentials), then drove login → delivery-rate
add → product create → color add → **real photo upload** (generated a
minimal valid PNG, uploaded it, confirmed both the `product_photos` row and
the actual Storage object exist and are downloadable) → confirmed the new
product appears live on the public `/boutique` → placed a **real order**
through checkout against it → confirmed the order in admin (list, status
filter, detail, status change, internal note) → tried deleting the
in-use color and got the expected `ON DELETE RESTRICT` error → signed out
and confirmed the guard re-engages. Two real bugs surfaced this way, not by
reading the code: (1) a screenshot taken before `router.refresh()` finished
made photo upload look broken until a fresh page load proved otherwise —
harmless, just a test-timing issue; (2) my own verification script's
`waitForSelector("text=Enregistré ✓")` matched a *different*, already-visible
"saved" indicator (the status control's) instead of the note form's own,
so an early screenshot appeared to show the note unsaved — re-verified with
a proper wait condition and confirmed via direct query that the note really
did persist. Cleaned up everything after: order, order_items, product
(cascaded colors/photos), the Storage object, the test delivery rate row,
and the test admin account itself — confirmed all empty/gone via fresh
queries.

## Status: Phase 5 complete, ready for Phase 6

**Next up: Phase 6 — animation & polish**: scroll fade/slide-in on sections
and product cards, hover lift/scale on product cards, sticky nav that
shrinks on scroll, homepage-only scroll-snap (flag it if it fights normal
page flow anywhere else — checkout/product pages must not scroll-snap).
Keep it subtle per the brief — support the content, don't upstage it. Not
started yet — waiting on the user to say go.

## Decisions explicitly confirmed with the user (don't re-litigate)

- TypeScript, not JavaScript.
- Brand new Supabase project, not reusing naja2's.
- Commune field is free text, not a dataset-backed dropdown (naja2 had the
  dropdown; explicitly rejected for naja3).
- Admin identity is plain Supabase Auth users, no `admin_users` table
  (naja2 had the table; explicitly rejected for naja3). Any authenticated
  Supabase Auth user is treated as the admin — there's exactly one owner.
- The two items above were the only points where the user's "reuse naja2's
  admin panel and commune dataset" request conflicted with the original
  written brief; both were resolved in favor of the original brief after
  asking directly.
- Animations stay in Phase 6, not pulled into Phase 2, despite the user's
  initial "I want all its animations" ask for Phase 2 — confirmed after
  clarifying the brief already splits static structure from animation.
- Order confirmation uses sessionStorage handoff, not fetch-by-order-ID —
  confirmed with the user (Phase 4) after presenting the privacy tradeoff.
  No order is ever fetchable by reference; a refresh loses the detail view.
- Phase 5 scope includes full product/catalog management (not just orders +
  delivery rates as the brief literally says) — confirmed with the user
  after flagging the gap: without it, the client would have no way to ever
  populate the catalog herself.
- The admin login account is created by the user directly via the Supabase
  dashboard, not by Claude — confirmed with the user; her real credentials
  are never handled in this session. (Verification instead used a throwaway
  test account created via the service-role admin API and deleted after.)
