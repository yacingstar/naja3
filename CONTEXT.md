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

Signature element, **as originally briefed** (see "pre-deploy frontend
feedback" further down for the actual current state): every product photo
sits in an organic blob shape with a soft warm glow behind it, like it's
plugged in. **This was overridden after real product photos went in** — the
organic blob shape read as "weird"/distracting against an actual photo and
was replaced with a plain rounded square (`border-radius: 2rem`); the warm
glow behind it is the part that survived and still carries the "plugged in"
feel. Everything else (nav, buttons, forms) stays quiet: pill buttons,
hairline borders, generous whitespace.

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
6. **Animation & polish** — ✅ done, see below. Caught and fixed a real
   scroll-snap bug during verification — see below before touching this again.
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

## What's actually been built (Phase 6 detail)

No animation library — everything is CSS transitions plus a small amount of
JS to toggle state (IntersectionObserver for reveals, a scroll listener for
the header, a mount/unmount effect for scroll-snap). `prefers-reduced-motion`
neutralizes all of it in one place (`globals.css`), which wasn't explicitly
asked for but is a real accessibility case, not scope creep.

- **`src/components/site/Reveal.tsx`** — generic fade/slide-in wrapper,
  fires once per element via `IntersectionObserver` then disconnects
  (doesn't re-animate on scroll-back). Wraps section headings on the
  homepage, boutique, and every `ProductCard` (embedded inside the card
  component itself, not at each call site, so both the homepage preview
  grid and the full `/boutique` listing get it for free, staggered by
  index — `(index % 4) * 80ms`).
- **Hover lift/scale** — `ProductCard`'s link: `hover:-translate-y-1
  hover:scale-[1.03]`, pure Tailwind, no JS.
- **Sticky nav shrink** — `Header` is now a Client Component tracking
  `window.scrollY` (RAF-throttled). Shrink is applied via an **inline**
  `style={{ transform: "scale(0.92)" }}`, not a Tailwind `scale-*` class —
  see the bug below for why.
- **Homepage-only scroll-snap** — `ScrollSnapHomepage.tsx` toggles a
  `.snap-homepage` class on `<html>` for exactly as long as the homepage is
  mounted (cleanup on unmount), rather than wrapping content in a nested
  scroll container. This keeps real body/window scroll as the scroll
  mechanism (sticky positioning, mobile browser chrome, etc. all behave
  normally) and makes it structurally impossible for `.snap-homepage` to
  leak onto any other route, since nothing outside `(site)/page.tsx` renders
  that component. Uses `proximity`, not `mandatory` — deliberately, since
  the brief itself warned this could fight normal page flow, and the
  homepage's sections have organic, varying heights rather than being
  designed as fixed-height slides; `mandatory` would force a hard stop at
  every boundary regardless of scroll speed.

### Two real bugs, found only by actually scrolling the page, not by reading the code

**1. Scroll-snap + the shrinking header combined to trap scrolling partway
down the page.** First implementation shrank the header via `padding`/
`font-size` (layout-affecting properties). On the homepage, with
`scroll-snap-type` on `<html>`, that dynamic layout shift during scroll fed
back into the browser's max-scroll calculation and **permanently capped
scrolling before the FAQ section** — confirmed with `window.scrollTo({top:
100000})`, an extreme forced jump, which still landed short and couldn't be
scrolled further by any means. Diagnosed by freezing the header's padding
via an injected style and re-testing — scrolling immediately reached the
true document end, isolating the cause precisely. Fixed by rebuilding the
shrink effect around `transform: scale()` instead, which never affects
layout, since it composites in the paint stage rather than participating in
box layout/reflow — the whole class of bug is structurally impossible once
nothing layout-affecting changes during scroll.

**2. Even after that fix, the very last snap point (FAQ) sat ~58px short of
the true page end, so proximity-snap scrolling settled there and further
wheel input didn't reach the footer at all.** Root cause: nothing past the
last snap-aligned section had its own snap point for the browser to settle
at next, and proximity snap doesn't force scrolling past the last defined
point. Fixed by giving `Footer` a `snap-section` class too (harmless
everywhere else — `scroll-snap-align` is inert without an ancestor
`scroll-snap-type`, which only exists on the homepage), making the actual
end of the page a valid snap point instead of leaving a dead zone after the
last section.

A third thing turned out to be a **false alarm, not a bug**: hover lift and
the header shrink both initially looked broken when checked via
`getComputedStyle(el).transform` (`"none"`). Root cause was the check, not
the app — Tailwind v4 generates its `scale-*`/`translate-*` utilities using
the native CSS `scale`/`translate` properties, not the legacy composed
`transform` property, so `getComputedStyle(el).scale` /`.translate` showed
the correct values all along. Worth remembering before "fixing" a transform
utility that looks inert: check the right computed style property first.

**Verification**: seeded 3 temporary products (deleted after) to give the
reveal/hover effects real cards to animate. Confirmed via direct
`window.scrollY`/`scrollHeight` checks (not just visual screenshots) that
the homepage now scrolls to its true end, `.snap-homepage` never appears on
`/boutique` or any other route, `prefers-reduced-motion: reduce` correctly
sets reveal opacity to 1 immediately and `scroll-snap-type: none`, and both
bugs above are fixed. `npm run lint` and `npm run build` both pass.

## Pre-deploy frontend feedback pass (post-Phase 6, before Phase 7)

Before deploying, the user wants the frontend fully nailed down — they have
specific "reclamations" (feedback) they're going through one at a time.
First one: the hero section.

### Hero redesign: text left / lamp right, aardvarkbookclub.com-style hanging accent

**Reference research, not guesswork**: user linked aardvarkbookclub.com and
described wanting the same treatment with lamps instead of books. Rather
than build from the text description alone, screenshotted the reference site
directly and read its DOM/computed styles to understand the actual
mechanism: text bold/left, a large object floating on the right with a
gentle idle bob+rotate (confirmed by diffing two screenshots ~1s apart), and
a second smaller object hanging from the top of the section, overlapping the
top-left corner of the headline's first line, rendered in front of the text.
Their version is a `<canvas>`-driven pre-rendered image-sequence player —
confirmed via DOM inspection, not worth replicating mechanically (heavy,
and the brief says keep it subtle) — so only the **visual effect** was
rebuilt, in plain CSS. User explicitly said aardvark's full-viewport-height
treatment "is not the MVP" — this redesign does not force 100vh.

**Why lamps work better here than books did there**: a pendant lamp
genuinely hangs from a cord, so "a lamp dangling from the top, overlapping
the headline" reads as a natural object, not a borrowed stylistic trick.

**New files**:
- `src/components/site/LampIllustration.tsx` — hand-built inline SVG (no
  external asset, no photo dependency): a soft dome/shade shape (organic
  bottom edge, nods to the blob-shape signature), a thin cord, a blurred
  `--lueur` glow beneath (same layered-div technique as `BlobPhoto`: blurred
  circle behind, content in front). One component, three `size` variants
  (`lg`/`sm`/`xs`) — same object reused for both the big floating lamp and
  the small hanging one, mirroring how aardvark's two books are the same
  kind of object, not two different ones.
- `globals.css` — `lamp-float` (translateY bob ± rotate wobble, ~5s) and
  `lamp-swing` (rotate oscillation, `transform-origin: top center`, ~4s)
  keyframes, both added to the *existing* `prefers-reduced-motion` block
  rather than a new query.

**`Hero.tsx` rewrite**: two-column grid (`sm:grid-cols-2`), text
left-aligned instead of centered, `LampIllustration size="lg"` floating
right. Old centered blurred-circle decoration removed — the lamp's own
built-in glow replaced it, avoiding a redundant/competing glow now that
the layout isn't centered anymore.

**The hanging-lamp overlap took real iteration to get right — worth knowing
if this gets touched again.** First attempt positioned it by guessing
Tailwind spacing values and eyeballing screenshots; it kept landing wrong
(floating disconnected above the text, then covering the tag line, then
fully obscuring the "U" in "Une"). What actually worked: measuring exact
pixel positions via `getBoundingClientRect()` on the H1's first line and the
lamp SVG, computing the offset mathematically (accounting for the fact that
the SVG's own bounding box includes the thin cord, so what needs to align
with the text is specifically where the *shade* starts within the
viewBox — 23% down from the top — not the SVG element's own top edge), then
verifying with a fresh measurement after each change rather than re-guessing
visually. Final state: `size="xs"`, positioned so the shade grazes just the
top-left corner of "Une" without sitting on top of the letter, cord clears
the tag line above it entirely.

**Mobile**: the hanging lamp is `hidden sm:block` — on narrow viewports the
text is centered and reflows across more lines, so a fixed pixel-based
overlap position that works at one width doesn't hold at another. Rather
than ship an overlap that lands wrong on phones, it simply doesn't render
below `sm:`; the main floating lamp still carries the visual identity on
mobile, stacked below the text.

**Verified in browser, not just build-clean**: desktop and mobile
screenshots at each iteration (not just once at the end), a
`getComputedStyle().transform` diff ~1s apart confirming both lamps are
actually animating, `prefers-reduced-motion: reduce` emulation confirming
`animationName: none`, and a full scroll-to-bottom check confirming the
Phase 6 scroll-snap fix still holds after this DOM change (still reaches
the true document end). `npm run lint` / `npm run build` clean.

## Second round of frontend feedback (same pre-deploy pass)

User added a real product through the admin panel themselves — **Akari**
(id 9, slug `akari`), a table lamp with a pleated shade, 6 color variants,
one photo each. First real content in the catalog, not seeded by me. Then
gave four more pieces of feedback, all addressed:

1. **`BlobPhoto` was cropping product photos** (`object-cover` on a
   `aspect-square` container). Akari's photo is 720×1080 (portrait,
   2:3) — cover was cropping into the top of the lampshade itself, not just
   trimming background. Changed to `object-contain` in
   `src/components/site/BlobPhoto.tsx`. Since product photos come with their
   own solid-color studio background (Akari's is navy), the letterboxed
   space around a contained portrait photo reads as an intentional colored
   backdrop inside the blob shape, not empty space — confirmed by looking at
   it, not just assuming it'd be fine.
2. **Real product now sits in the hero**, replacing the illustrated lamp —
   user picked this explicitly over a separate "featured product" section
   when asked. `Hero.tsx` is now an **async Server Component**
   (`getFeaturedProducts(1)`), rendering the real photo wrapped in a `Link`
   to `/boutique/[slug]` when a product exists, falling back to the
   illustrated `LampIllustration` when the catalog is empty (keeps the
   "graceful empty state, no fake content" pattern intact for whenever a
   fresh/dev database has nothing yet). The small hanging lamp stays the
   illustrated version either way — user's explicit choice, decorative
   accent vs. the real product being the main visual.
3. **`WavyBackground.tsx`** (new) — two layered SVG wave paths in `--blush`
   at different opacities behind the hero content, same idea as
   aardvarkbookclub.com's layered background waves, rebuilt in the brand
   palette rather than copied.
4. **Headline bumped to `text-6xl sm:text-7xl font-bold`** (from
   `text-5xl sm:text-6xl`, no explicit weight before). At this size "Une
   lumière chaude," wraps across two sub-lines within the narrower
   two-column layout's text width — initially looked like a bug, but
   aardvark's own reference headline wraps to three natural lines too
   ("Unbox stories" / "worth talking" / "about"), so a big bold headline
   organically wrapping across several lines is consistent with the
   reference being followed, not a regression to fix.

**One real bug hit while verifying, worth remembering**: after several rapid
edits, the dev server briefly served a stale build where the headline
rendered *smaller* than before despite the size classes being bigger in the
source — a stale `.next`/HMR cache issue, not a code bug. Confirmed by
clearing `.next` and restarting clean, which fixed it immediately. If a
Tailwind class change ever appears to have "no effect" or the opposite
effect during active dev-server iteration, check for this before assuming
the CSS itself is wrong.

**Verified**: full-height desktop and mobile screenshots (not just a
top-of-viewport crop — the first crop made the layout look broken when it
wasn't, just cut off), animation diffs confirming both lamps still animate,
`prefers-reduced-motion` still disables them, and a full scroll-to-bottom
check confirming the Phase 6 scroll-snap fix still holds with the new async
`Hero` and taller content. `npm run lint` / `npm run build` clean.

**Not fixed, flagged instead**: Akari's 6 colors all share the exact same
`color_hex` (`#5ab0f2`, a light blue) despite having different names (Bleu
Nuit, Beige, Rouge, Rose, Rouge Rose, Vert) — looks like a data-entry
placeholder left over from testing the admin color form, not intentional.
Didn't silently "fix" it by guessing correct hex values per color name.
Worth the user updating for each color in `/admin/produits/9` before this
matters anywhere hex is used for a swatch — hasn't been added anywhere in
the UI yet, so it isn't visibly broken, just quietly wrong.

## Third round: dropped the organic blob shape entirely

Attempted client-side chroma-key background removal for the hero's Akari
photo (`CutoutImage.tsx`, canvas-based, sampled backdrop color from the
photo's corners). It technically worked (CORS cooperated, background did go
transparent) but the result was bad **for a reason specific to this
photo, not a bug**: Akari's lamp base is painted nearly the same navy as
its studio backdrop, so a color-distance cutout can't tell "base" from
"background" — the base got eaten along with the backdrop, leaving a
floating-shade look plus leftover noise where a soft shadow gradient didn't
match the sampled corner color closely enough. Explained this to the user
with the actual screenshot rather than continuing to tune thresholds blind;
they rejected the whole direction ("didnt work at all") and asked for a
different fix instead. **`CutoutImage.tsx` was deleted** and the `cutout`
prop backed out of `BlobPhoto`/`Hero` — don't reintroduce this technique
without a photo that actually has color contrast between subject and
backdrop; the code no longer exists, so it'd need rebuilding from scratch
if ever revisited.

Bigger change from the same message: the user rejected the **organic blob
shape itself** — the brief's original signature element ("every product
photo sits in an organic blob shape... the glow-blob treatment is the thing
this site is remembered for") — as "weird" and "stupid" once seen against a
real product photo. This is a real, deliberate reversal of a decision that
was documented as core brand identity from the very first planning phase —
worth remembering if anything downstream still assumes the blob is the
signature look (it isn't anymore).

**Fix, scoped once, applied everywhere automatically**: `.blob-a/.blob-b/
.blob-c` in `globals.css` changed from organic multi-value `border-radius`
paths to a plain `border-radius: 2rem` — a clean rounded square. Since
every product-photo spot (`Hero`, `CatalogPreview`, the `/boutique` listing,
the `/boutique/[slug]` gallery, eventually cart) renders through the same
`BlobPhoto` component and the same three CSS classes, fixing the shape in
one place changed it consistently everywhere in a single edit — matches
what the user asked for ("apply these changes to the products section as
well") without touching every call site individually. The warm blurred glow
behind the card (the other half of the original signature element) was kept
— only the shape itself was criticized, not the glow.

`BlobPhoto`'s `variant` prop (`"a"`/`"b"`/`"c"`) is still there structurally
(all three classes now render identically) — harmless to leave as-is, no
call sites needed changing. Verified the new shape renders identically
across hero, homepage catalog, and product detail page via screenshots.
`npm run lint` / `npm run build` clean.

## Fourth round: dedicated cutout photo per color (user's own cutouts, not chroma-key)

User found their own way to remove backgrounds from their lamp photos
externally (proper quality, not the chroma-key approach that failed) and
wants a deliberate split: **cutout (no background) on cards — hero,
homepage catalog, `/boutique` listing — but the normal full studio photo on
the product detail page**, to showcase the real product at the point of
purchase. Discussed this with the user in plan mode before building (they
explicitly asked "what do u think... dont do anything just talking" first) —
confirmed it's a sound, common e-commerce pattern (cutouts for browsing,
real photos for the purchase decision) before writing anything.

**Schema**: `product_colors.cutout_photo_url` (nullable text,
`supabase/migrations/20260812173005_add_cutout_photo.sql`). Lives per-color,
not per-product — each color already has its own distinct photographed
lamp/gallery, so the cutout is naturally the same granularity. No RLS/grants
changes needed (grants are table-level, already cover the new column).

**Admin** (`src/components/admin/ColorRow.tsx`): a second, clearly-labeled
upload slot per color — "Photo sans fond (cartes — accueil, boutique)" —
separate from the existing photo gallery, same upload/delete interaction
pattern. New Server Actions `uploadCutoutPhoto`/`deleteCutoutPhoto`
(`src/app/admin/(espace)/produits/actions.ts`) write/clear the single
`cutout_photo_url` column instead of inserting/deleting a `product_photos`
row; storage filenames prefixed `cutout-` to stay visually distinguishable
in the bucket. `deleteColor` was also updated to clean up a color's cutout
file from Storage (previously only cleaned up gallery photos).

**Data layer split** (`src/lib/products.ts`): `getFeaturedProducts()` and
`getProducts()` (every card/thumbnail spot) now prefer
`color.cutout_photo_url` when set, falling back to the normal first gallery
photo when it's `null` (graceful — a color without a cutout yet just shows
its normal photo on cards rather than nothing).  `getProductBySlug()` (the
detail page) is **deliberately untouched** — never reads
`cutout_photo_url`, always shows the full gallery with real backdrops. No
changes needed to `BlobPhoto`, `ProductCard`, `Hero`, `CatalogPreview`, or
the `/boutique` pages themselves — they already just render whatever
`photoUrl` the data layer hands them, so the split lives entirely in the
query layer.

**Verified live**, not just build-clean: recreated a temporary admin
account (same pattern as Phase 5 — created, tested, deleted after),
uploaded a test image to Bleu Nuit's new cutout slot, confirmed via actual
`<img src>` inspection that the homepage card and `/boutique` listing both
switched to the `cutout-...` file while `/boutique/akari`'s detail page
kept showing the original `akari_blue.jpeg`. Also tested the delete path —
removing the cutout correctly reverted cards to the normal photo, not a
blank state. Cleaned up the test upload and test admin account afterward;
confirmed via a fresh query that `cutout_photo_url` is back to `null`.
`npm run lint` / `npm run build` clean.

## Fifth round: hero image loses its card, catalog card gains color swatches

Two independent changes in the same message:

**Hero product image no longer goes through `BlobPhoto` at all.** User
asked to make it "way bigger" and to remove its "card" — the rounded-square
blush-background container `BlobPhoto` gives every other product image.
`Hero.tsx` now renders the hero's photo as a **plain `<img>`**, sized
`w-72 sm:w-96 lg:w-[28rem]` (up from `w-56 sm:w-72` inside `BlobPhoto`
before), with a standalone blurred `bg-lueur/40` glow div behind it
(same blurred-circle technique `BlobPhoto` uses internally, just not
wrapped in the rounded-square/blush card) — keeps the "plugged in" warm
glow the brand thesis calls for without any card/frame around it. Falls
back to `LampIllustration` when `heroProduct?.photoUrl` is falsy (covers
both "no product yet" and "product exists but has no photo yet"). Every
other `BlobPhoto` usage (catalog, `/boutique` listing, product detail) is
**unchanged** — only the hero stopped using the shared card component.
This only really pays off once a real cutout PNG is uploaded to Akari's
colors (still empty as of this round, deleted after Phase-5-style testing
last round) — verified the mechanism is correct by screenshotting with the
current fallback (normal photo), which confirmed bigger + no-card-frame
even though the navy backdrop rectangle is still visible until a cutout
gets uploaded for real.

**Catalog cards (`ProductCard.tsx`, used by `CatalogPreview` *and* the
`/boutique` listing — one component, both places) now show color
swatches** — small dots per color using `colorHex`, dimmed
(`opacity-30`) for out-of-stock colors rather than hidden, same
show-but-disable convention as the product detail page's color picker.
Required extending `FeaturedProduct` (`src/lib/products.ts`) with a new
`colors: FeaturedProductColor[]` field and selecting `id, color_name,
color_hex, in_stock` in `getFeaturedProducts`/`getProducts`'s existing
`product_colors` join (`getProductBySlug`, the detail page's query,
already had this data and is untouched). Verified visually on both the
homepage and `/boutique` — Akari's 6 real colors (Bleu Nuit, Beige, Rouge,
Rose, Rouge Rose, Vert) render as 6 distinct-colored dots under the price.

`npm run lint` / `npm run build` clean both times.

## Real bug (not feedback): admin photo uploads silently failing above 1MB

User was using the admin panel for real — adding a second product
("Japandi", id 10) — and hit photo uploads that showed no thumbnail and,
after reload, hadn't saved at all. Not a design request, an actual
production bug. Root cause visible directly in their terminal output:

```
Error: Body exceeded 1 MB limit.
To configure the body size limit for Server Actions, see: .../serverActions#bodySizeLimit
```

Next.js Server Actions cap request bodies at **1MB by default**. Every
photo upload in this admin panel (`uploadPhoto`/`uploadCutoutPhoto` in
`src/app/admin/(espace)/produits/actions.ts`) sends the raw file through a
Server Action call via `FormData` — so any real phone/camera photo (routinely
3-10MB) gets rejected outright. It worked "before, on another product"
purely because that photo happened to be under 1MB by luck.

**Two real bugs, both fixed**:
1. The limit itself — `next.config.ts` now sets
   `experimental.serverActions.bodySizeLimit: "15mb"` (confirmed the exact
   config shape against the bundled Next 16 docs, not assumed — it's still
   under `experimental.serverActions`, unchanged from earlier Next
   versions). Worth re-checking against Netlify's own request body limits
   once deployed (Phase 7) — this config only controls Next's own cap, not
   whatever the hosting platform imposes on top.
2. **Silent failure on top of the size limit** — `ColorRow.tsx`'s upload
   handlers called `await uploadPhoto(...)` with no `try/catch`. A rejected
   Server Action (body-size 413, or any network failure) throws *before*
   reaching `uploadPhoto`'s own internal error handling, so the promise
   rejects outright — with no `try/catch` around the call, that's an
   unhandled rejection: no error message, no thumbnail, `uploading` state
   stuck `true` forever. Both `handleFileChange` and `handleCutoutFileChange`
   now wrap the call in `try/catch/finally`, surfacing a clear French error
   message on any failure instead of doing nothing.

**Verified with an actual >1MB file**, not just reasoning about it:
recreated a temp admin account (same create-test-verify-delete pattern as
every previous admin verification), uploaded a real 2MB file to the user's
actual in-progress "Japandi" product's "Rouge" color, confirmed via a fresh
page reload that it persisted (thumbnail — well, broken-image icon, since
the test file was garbage bytes with a fake JPEG header, not real image
content; the point was proving the *size limit* fix, not image validity).
Deleted the test photo (both the Storage object and the `product_photos`
row) and the temp admin account afterward — Japandi's real data untouched.
`npm run lint` / `npm run build` clean.

## Sixth round: hero still didn't feel like the aardvark reference — diagnosed precisely instead of guessing again

User now has 4 real products (Akari, Japandi, Champignon, Capricorne) with
real cutout PNGs (proper RGBA transparency, good quality — confirmed by
downloading and viewing one directly) uploaded for every color. Pasted the
aardvark screenshot again, frustrated: "cant do it like that cmon man."

Rather than iterate blindly again, screenshotted the **current live hero
with the real cutout data** first and diagnosed concrete, specific gaps
against the reference side by side:
1. Aardvark's background is 100% saturated color, edge-to-edge, no pale
   areas anywhere. Ours only picked up color ~40% down the section — the
   top was still plain `--papier`, which is most of why it read as flat.
2. Aardvark's books sit at dynamic, non-vertical angles and bleed off the
   frame. Ours was dead upright and fully contained — reads static/polite
   by comparison regardless of the palette.
3. Aardvark's text is pure black on saturated yellow (maximum contrast);
   ours uses `--encre` (soft plum-brown) on a soft palette — **this one
   was named explicitly and left alone**, since the user's own original
   brief specifically chose "soft plum-brown instead of black" and a quiet
   palette everywhere except the (now-removed) blob-glow signature. Pointed
   out this is a deliberate brand-tone difference from the reference, not
   an execution gap, and didn't touch it without being asked to.

Fixed #1 and #2 — pure technique, independent of color mood:
- **`WavyBackground.tsx`**: added a full-bleed base `<rect>` fill (`--blush`,
  100% opacity, covers the entire viewBox) underneath the existing wave
  paths, so the section is never pale/uncolored anywhere. Re-tinted the
  waves themselves — a light `--papier` wave for movement, a `--lueur`
  wave that pools toward the *bottom* specifically (warmth pooling low,
  like light spilling from a lamp — ties back to the brand thesis rather
  than being arbitrary).
- **`globals.css`'s `lamp-float` keyframe**: was `rotate(-1deg)` to
  `rotate(1deg)` (barely perceptible, wobbles through upright). Changed to
  `rotate(-7deg)` to `rotate(-3deg)` — stays visibly tilted through the
  *entire* animation cycle, never returns to vertical. This one change is
  what makes the hero image read as "just set down at an angle" instead of
  "centered catalog shot," the single biggest contributor to aardvark's
  dynamic feel. `lamp-swing` (the small hanging lamp) deliberately
  untouched — it swings symmetrically through center because it's meant to
  read as physically hanging from a cord, unlike the free-standing main
  lamp.

**Verified**: screenshotted desktop and mobile with real product data (not
a placeholder), confirmed full color coverage top-to-bottom, confirmed the
Phase 6 scroll-snap fix still holds (`scrollY` still reaches the true
document end) since this touched CSS adjacent to the scroll-snap-sensitive
hero section. `npm run lint` / `npm run build` clean.

## Seventh round: full-viewport hero, way bigger text/image, more active float

User explicitly asked for the 100vh treatment this time (their very first
hero message had said full-viewport-height "is not the MVP" — that's now
superseded; this is a case where an earlier stated preference changed, not
a contradiction to flag). Also asked for way bigger headline, bigger hero
image, and more active up/down motion.

**`Hero.tsx`**: section is now `flex min-h-screen items-center` (was
padding-driven height). Headline pushed from `text-6xl sm:text-7xl` to
`text-6xl sm:text-7xl lg:text-8xl` with `leading-[0.95]` — **first attempt
used `lg:text-9xl`, which measured out at a 1230px-tall section against a
900px viewport (330px of actual overflow, not just header-height
overflow)** — dialed back to `lg:text-8xl` and tightened the vertical
spacing between tag/headline/paragraph/CTA (`mt-6`→`mt-4`, `mt-10`→`mt-6`,
section `py-28`→`py-20`) until the section measured 976px against a 900px
viewport — the remaining ~76px is just the sticky header's own height
(section `min-h-screen` is measured from *after* the header in document
flow), which is normal and expected, not overflow to fix further. Verified
this by literally reading `section.getBoundingClientRect().height` in the
browser at each step rather than eyeballing screenshots for "does it look
like it fits."

Hero image bumped `w-72/w-96/w-[28rem]` → `w-80/w-[28rem]/w-[34rem]`.

**`globals.css`'s `lamp-float` keyframe**: amplitude ±14px→±30px (`0` to
`-30px`), duration 5s→3s — noticeably active motion now, not a gentle
drift. Confirmed via two `getComputedStyle().transform` reads 750ms apart
showing real movement (translateY -15 → -30), not just trusting the CSS
change compiled.

**Hanging lamp recalibrated twice** for the much bigger headline — same
measurement-driven approach as the very first hero build (Phase-adjacent,
"pre-deploy frontend feedback" section above): bumped from `size="xs"` to
`size="sm"` (bigger headline needs a proportionally bigger accent to still
read as intentional rather than swallowed by the text), then had to push
its vertical position down twice (first attempt landed on top of the
"fait main" tag line instead of the headline, since the accent's size grew
but its position hadn't been re-measured yet) — final: `size="sm"`,
`top-36 -left-12`, shade grazes the top-left corner of "Une" cleanly with
the cord clearing the tag line above it.

**Verified**: desktop and mobile screenshots, animation activity confirmed
via live transform reads (not assumed from the CSS), scroll-snap still
reaches the true document end after this round of changes too. `npm run
lint` / `npm run build` clean.

## Eighth round: "Nouveau" badge instead of multiple hero products, transparent header over the hero

Two asks from the same message. First, an exploratory one: now that there
are several products, should the hero show multiple of them, or stay
single-product with a "new arrival" callout? Recommended staying
single-product (multi-product hero would need real curation/rotation logic
for little payoff at this catalog size) — user agreed. Second: the header's
pale bar read as visually clashing sitting on top of the new bold hero
gradient.

**"Nouveau" badge** — `Hero.tsx`: a small rotated pill
(`-rotate-6 rounded-full bg-crepuscule ... text-papier`, reading "Nouveau")
anchored `absolute -top-2 right-6` on the product-image wrapper, alongside
the existing glow div. Purely additive, no data-layer change — still one
product, just labeled.

**Transparent header over the hero — real bug, not just a styling tweak.**
First attempt: added a `transparent` boolean to `Header.tsx` (true only on
`/` above a scroll threshold) toggling `bg-transparent`/`border-transparent`
vs the existing solid classes. A verification script's JS-level check
reported success (`getComputedStyle` showed `rgba(0,0,0,0)` at scroll=0),
but screenshots looked visually unchanged — flagged as suspicious rather
than trusting the JS check, since a color can correctly be "transparent"
while still showing nothing interesting behind it. A follow-up diagnostic
measuring `header.getBoundingClientRect()` vs the hero
`section.getBoundingClientRect()` directly found the real cause: the header
was `position: sticky`, which sits in normal document flow until the scroll
threshold — at scroll=0 it doesn't overlap the hero at all, it just sits
above it (header: y 0–69px, hero section: y starting at 69px). "Transparent"
was correctly revealing the plain page background, never the hero's color.

Fix: header changed from `sticky top-0` to `fixed inset-x-0 top-0`, which
always overlays whatever's beneath it regardless of scroll position. That
removes it from document flow, so every page needs compensating top
padding — added `--header-height: 69px` (measured via
`getBoundingClientRect()`, not guessed) to `:root` in `globals.css` as a
single source of truth, referenced by `(site)/layout.tsx`'s
`paddingTop: var(--header-height)` wrapper div and by `.snap-section`'s
`scroll-margin-top` (previously a hardcoded `4.5rem` guess). `Hero.tsx`
alone cancels that padding with `marginTop: calc(-1 * var(--header-height))`
on its `<section>`, so only the homepage hero bleeds up to y=0 behind the
transparent header — every other page keeps the padding and a solid header
(no clash there; their backgrounds are plain papier).

**Verified**: `header.getBoundingClientRect()` vs hero `section`'s now
match at y=0 (confirmed overlap, not adjacency) — header genuinely
transparent over the colorful hero at scroll=0, turns solid
(`bg-papier/90`) past the scroll threshold. `/boutique` (and by extension
every other page) has a solid header immediately at scroll=0, with content
starting at y=165, well clear of the 69px fixed header — nothing hidden
underneath. Scroll-snap still reaches the true document end (the
established Phase 6 regression check). Desktop (1440px) and mobile (390px)
screenshots both confirm the badge and transparent-header effect read
correctly. `npm run lint` / `npm run build` clean.

## Ninth round: animated blob background + hero photo entrance motion

Explicitly scoped as visual/animation-only — wordmark, nav, headline,
subhead, CTA, and the product photo itself were not to change, only motion
added around them.

**Background blobs — `WavyBackground.tsx`.** Added 3 soft organic blobs on
top of the existing full-bleed base+wave fill (unchanged), each its own
full-bleed `<svg>` (not paths sharing one svg) so each can drift
independently via a plain CSS transform. No internet access to an actual
tool like haikei/blobmaker, so the shapes were generated with the same
technique those tools use under the hood: a closed Catmull-Rom spline
through a randomized ring of points, computed once via a throwaway Node
script and hardcoded as static path data (not `Math.random()` at render
time — Hero is an async Server Component with no client hydration for this
part, but a stable build-to-build shape was preferred over one that
reshuffles per request anyway). Colors are `--papier`/`--lueur`/`--blush` at
low opacity (0.25–0.4) — close enough in shade to the existing base fill
that they read as gentle life, not new decoration.

Each blob gets the same `.blob-drift` class (`globals.css`) driving one
shared `@keyframes blob-drift` (`translate(0,0) scale(1)` →
`translate(2%,-3%) scale(1.05)`), but a different `animation-duration` via
Tailwind arbitrary properties on each `<svg>` (16s/19s/15s) and one blob set
to `alternate-reverse` instead of `alternate` — confirmed via
`getComputedStyle` that all three actually differ and that the transform
genuinely changes over a 2s window (not just trusting the CSS compiled).

**Hero photo entrance — `Hero.tsx` + `globals.css`.** New `.hero-photo-enter`
class replaces the bare `animate-lamp-float` on both the real product photo
link and the `LampIllustration` fallback. It's two animations on one
element (CSS `animation` accepts a comma-separated list): `hero-photo-in`
(700ms, fade + `translateY(16px)→0` + `rotate(-8deg)→(-7deg)` +
`scale(0.96)→1`, eased with a settle-in curve, runs once) immediately
followed by the existing `lamp-float` loop, delayed by exactly the
entrance's own duration (`700ms`) so it starts right as the entrance ends —
`hero-photo-in`'s final transform (`translateY(0) rotate(-7deg)`) was
deliberately matched to `lamp-float`'s own `0%`/`100%` state, so the handoff
has no visible jump. Confirmed via `getComputedStyle(...).animationName`
returning `"hero-photo-in, lamp-float"`. Only one product image exists
today, so no stagger was implemented — `.hero-photo-enter` is written so a
future second image could stagger in via an inline `animationDelay`, but
that's speculative and wasn't built.

**`prefers-reduced-motion`**: extended the existing reduced-motion block —
`.blob-drift` now included alongside `.animate-lamp-float`/
`.animate-lamp-swing` in the `animation: none !important` group, and
`.hero-photo-enter` gets its own override forcing `animation: none`,
`opacity: 1`, `transform: none` (so the photo is simply present, not stuck
mid-fade). Verified both with `page.emulateMedia({ reducedMotion: "reduce" })`
— blob and photo `animationName` both report `"none"`, photo opacity `1`
and transform `none`.

**Verified**: desktop screenshot shows the blobs blending softly into the
existing background without reading as busy; live transform sampling
confirms real independent movement; reduced-motion emulation confirms full
shutdown of both new animations. `npm run lint` / `npm run build` clean.

## Tenth round: image/text vertical alignment, rounded-bottom hero that peeks past the fold, and a real scroll-snap bug at the very top

Three asks: nudge the product image so it reads level with the headline
text, make the hero extend a little past one screen with a big rounded
bottom corner (so scrolling reveals a sliver of hero background closing
off into a rounded edge before the next section), and fix an actual bug —
scrolling down even slightly from the very top of the page was getting
forcibly sucked back toward y=0.

**Image/text vertical alignment — real gap, not a layout mistake.** The
grid row uses `items-center`, so in principle both columns should already
center against each other. Measured anyway rather than eyeballing:
`img.naturalWidth/naturalHeight` came back `720×1080` — a portrait cutout
PNG with a lot of baked-in transparent padding around the actual lamp
pixels (confirmed no CSS bug once the numbers were compared against the
screenshot: the *element's* box was genuinely that tall, `items-center` was
correctly centering it, the padding is just inside the image asset
itself). Visually the lamp's own pixels sat about 124px higher than the
text block's center as a result. Fix was a pragmatic visual nudge, not a
"correct" recentering (can't reprocess the client's source PNG from here):
added `sm:mt-16` to the image column's wrapper in `Hero.tsx`. Re-measured
after — image-center-to-text-center gap dropped from ~124px to ~8px.
`sm:`-scoped only; mobile stacks the columns vertically where this offset
doesn't apply or matter.

**Rounded-bottom hero, extends past 100vh — `Hero.tsx`.** Changed
`min-h-screen` to `min-h-[calc(100vh+4rem)]` and added
`rounded-b-[clamp(2rem,6vw,4rem)]` (a single arbitrary-value class so the
radius scales with viewport instead of needing per-breakpoint overrides).
The section already had `overflow-hidden` (from the very first hero
build), which is what actually makes the border-radius clip
`WavyBackground`'s absolutely-positioned base/blob layers into the rounded
shape rather than just rounding an invisible box corner. In practice the
real rendered height ended up taller than the requested +4rem (measured
1040px against a 900px viewport, i.e. ~140px of "extra hero" rather than
64px) because `min-height` is a floor, not a fixed height, and the
content itself (bigger image column, `sm:mt-16` nudge) pushed the row
past that floor — confirmed this reads fine at 140px, still "a little,"
not fixed further.

Verifying the actual visual effect took a second attempt: an initial
`window.scrollTo(0, 900)` + short wait produced a screenshot with *zero*
hero visible, which looked like the corner wasn't rendering at all — turned
out `scroll-snap-type: y proximity` was auto-correcting that programmatic
scroll forward to the catalog section's own snap point before the
screenshot fired (confirmed by reading `catalog#creations`'s document-Y
directly: 1040, matching the settle destination). Scrolling to a value
comfortably inside the mid-transition zone (`scrollTo(0, 600)`, ~440px from
either snap point) held still long enough to screenshot and shows exactly
the intended effect: the pink/orange hero closing off in a big rounded
sweep with "Nos créations" already visible starting cleanly below it.

**Real bug: forced snap-to-top on small scrolls — root cause found via
measurement, not guessing.** Reported by the user as "I scroll a little
and it snaps back to the top." Measured `hero.offsetTop` (0) and its
computed `scroll-margin-top` (69px, from the shared `--header-height`
variable) — `scroll-snap-align: start` was trying to land the scroll
position at `0 - 69 = -69`, which the browser clamps to `0`. That put a
proximity snap point essentially *at* the top of the page, so any small
scroll near y=0 kept getting pulled back down to it. Confirmed by
scripted wheel input before the fix: 300px of cumulative wheel delta only
net 7px of actual scroll. Fix: removed the `snap-section` class from
`Hero.tsx` entirely — the hero is the entry point, there's nothing above
it a user would ever want to snap back to, so it doesn't need to be a snap
target at all. Every other section (`CatalogPreview`, `HowItWorks`, `Faq`,
`Footer`) keeps `snap-section` unchanged. Re-tested the same wheel
sequence after the fix: 100px wheel → 100px scroll, +200px wheel → 300px
scroll — moves normally now. Re-ran the established true-bottom regression
check too (still reaches the exact document end).

**Verified**: alignment gap measured before/after, rounded-corner peek
screenshotted mid-scroll, snap-to-top bug reproduced then confirmed fixed
via scripted wheel input, true-bottom regression check still passes,
header transparency (ninth round) unaffected, mobile screenshot confirms
the `sm:`-scoped image nudge doesn't affect the stacked mobile layout.
`npm run lint` / `npm run build` clean.

## Eleventh round: hidden native scrollbar, cute loading screen

Two small asks. First was ambiguous as worded ("remove the scroll thing on
the left") — checked the codebase for any custom left-side scroll UI
(dot-nav, progress indicator) first and found none; also inspected the
actual DOM element sitting at that screen position across every earlier
screenshot (`document.elementFromPoint`), which turned out to be
`<nextjs-portal>` — the Next.js dev-mode toolbar, not app code. Asked the
user directly rather than guessing between "disable the dev toolbar" and
"something else" (materially different fixes); they meant the plain
browser scrollbar. Fix, `globals.css`: `scrollbar-width: none` +
`-ms-overflow-style: none` on `html`, plus `html::-webkit-scrollbar {
display: none; }` for Chromium/WebKit — hides the OS scrollbar chrome
globally (storefront and admin both, single global stylesheet) without
touching scroll behavior itself. Verified `getComputedStyle(document
.documentElement).scrollbarWidth === "none"` and that wheel-scrolling still
moves `window.scrollY` normally.

**Loading screen** — new `src/app/(site)/loading.tsx`, the standard
Next.js Suspense-fallback file convention (confirmed against the bundled
docs at `node_modules/next/dist/docs/.../loading.md` per this repo's
"read the docs before writing code" rule — nothing unusual for this Next
version, works as documented). Since it lives in `(site)/`, the *same*
segment as `(site)/layout.tsx`, per that doc it wraps `page.js` and nested
routes but **not** the layout itself — meaning `Header`/`Footer` (rendered
by the layout) stay mounted and interactive the whole time, and only the
middle content area swaps to the loading UI while a page's data (e.g. the
Supabase product queries `Hero`/`CatalogPreview` run) is still resolving.
Content: the existing `LampIllustration` (`size="lg"`, its already-built
warm glow) with `animate-lamp-float`, plus "ça s'allume…" in the site's
hand-drawn accent font — reuses established brand pieces rather than
building new ones, so it's consistent with the rest of the site for free.
This also directly helps with the Supabase free-tier cold-start latency
flagged earlier (Phase 7 section) — a paused database waking up now shows
a deliberate, on-brand loading moment instead of a blank page.

**Verified**: real navigation is fast enough locally that the fallback
would flash by unnoticed, so throttled the network via a CDP session
(`Network.emulateNetworkConditions`, 50kbps) to force the Suspense
boundary to hold, then screenshotted mid-navigation — confirms the lamp
and "ça s'allume…" text render correctly with header/footer intact around
them. `npm run lint` / `npm run build` clean.

## Twelfth round: smooth loading-screen handoff, and a navbar redesign (transparent bar, pill buttons, independent logo motion)

**Loading-screen handoff felt like a hard cut — fixed two ways.** The
Suspense fallback (eleventh round's `loading.tsx`) was on a plain papier
background while the homepage's real content sits on `WavyBackground`'s
colorful gradient, so the swap read as a flat-to-colorful jump no matter
how nice either screen looked alone. Split into a shared
`src/components/site/LoadingScreen.tsx` taking a `wavy?: boolean` prop:
`(site)/loading.tsx` (the fallback the homepage actually uses, since
nothing more specific overrides it there) renders it with `wavy`, matching
Hero.tsx's own background exactly. Added three sibling overrides —
`boutique/loading.tsx`, `panier/loading.tsx`, `commande/loading.tsx` — each
rendering the plain (non-wavy) version, since Next's `loading.tsx`
inheritance means without these, those routes would've inherited the wavy
one too and gotten a *new* mismatch (colorful loader → their actual plain
pages). Each nests correctly per the file-convention docs: `boutique/`'s
override also covers `boutique/[slug]`, `commande/`'s also covers
`commande/confirmation`, without needing separate files there.

Second half — the swap itself was still an instant snap even with
backgrounds matching. Added `.page-enter` (`globals.css`) using
`@starting-style`, a CSS feature (not JS) that defines the "before" frame
for any element's first paint after being newly connected to the DOM —
covers a `loading.tsx` → real-page swap the same as a normal mount, so
Hero.tsx (given the class alongside its existing utilities) now fades up
into place instead of popping in. No fallback needed for older browsers —
they just skip straight to the end state. `.page-enter` also drives
`LoadingScreen.tsx`'s own entrance for symmetry. Extended the
`prefers-reduced-motion` block to force it to its end state instantly,
matching the pattern already used for every other animation in this file.

Verified via the same CDP-throttled-network technique as the eleventh
round (screenshotted mid-navigation): the loading screen and the real hero
now share the exact same wavy backdrop, with the header's pill buttons
already visible and correctly styled even during the loading state.

**Navbar redesign — transparent bar, pill buttons, independent logo
motion.** Three asks in one message: nav "buttons" get background colors,
the bar itself goes transparent (previously solid `bg-papier/90
backdrop-blur` past a scroll threshold, ninth round), and on scroll only
"the company name" should move while the buttons "stay consistent."

`Header.tsx`: removed the `pathname === "/"` transparency conditional
entirely — the header is now `bg-transparent` unconditionally, on every
page, at every scroll position, no more solid-on-scroll swap and no more
`border-b`. Legibility no longer depends on the bar having a solid
backing; each nav item now carries its own pill instead
(`rounded-full bg-papier/85 ... shadow-sm`, shared as a `NAV_PILL`
constant) — same treatment reads fine over the colorful hero, a plain
papier page, or a product photo on the detail page (checked all three).
`CartLink.tsx` got the same pill treatment for consistency (it's the one
other nav-row link, previously plain text).

The old shared `scale(0.92)` wrapper (Phase 6, applied to the *entire*
logo+nav+CTA row together on scroll) is gone. In its place: only the
"Naja" wordmark `Link` gets a scroll-linked inline
`transform: translateY(-6px) scale(0.85)`, independent of everything else
in the header — the nav pills, cart, and CTA now render with no transform
at all, confirmed via `getComputedStyle(...).transform === "none"` before
and after scrolling. Still a plain CSS `transform`, never padding/font-size
— the file's existing comment about why (Phase 6's scroll-snap-trapping
bug from a layout-affecting shrink) still applies and was kept, just
reworded for the new scoping.

**Verified**: `header` background is `rgba(0,0,0,0)` on homepage-top,
homepage-scrolled, and `/boutique` alike (all three now behave
identically, by design). Logo's computed transform changes on scroll
(`matrix(0.85, 0, 0, 0.85, 0, -6)`) while the nav's stays `none` both
before and after. Screenshots confirm the pills read clearly over the
hero, over plain papier, and on mobile (where only Panier + Découvrir
show, matching the existing `hidden sm:flex` nav-link breakpoint,
untouched). True-bottom scroll-snap regression check and reduced-motion
checks both still pass. `npm run lint` / `npm run build` clean.

## Thirteenth round: loading screen reverted, "Nouveau" badge dropped, product card fully redesigned

User changed their mind on the loading screen from the twelfth round —
asked to remove it entirely rather than iterate on it further. Deleted
`(site)/loading.tsx`, `boutique/loading.tsx`, `panier/loading.tsx`,
`commande/loading.tsx`, and `LoadingScreen.tsx` outright. Also removed
`.page-enter` (the `@starting-style` fade built specifically for that
loading→content handoff) from both `globals.css` and `Hero.tsx` — it had
no purpose once there's no loading screen to hand off from, so it was
cut rather than left as orphaned dead weight. Without a `loading.tsx`,
these routes are back to blocking navigation (no interim UI at all) —
confirmed via the same CDP-throttled-network technique as before: no lamp
fallback appears mid-navigation anymore. Also dropped the ninth round's
"Nouveau" badge from `Hero.tsx` (the small rotated pill on the product
photo) — a one-line removal, no data-layer impact since the hero has
always shown a single product regardless.

**Product card — full redesign, `ProductCard.tsx` only.** The prior
version put the product photo directly on the page with only a soft pink
blob-shaped glow behind it and the name/price floating below, unbordered
— client feedback: "what is that... it's just the product on a pink
background," doesn't read as a card at all. Rebuilt as an actual
rectangular card: a bordered, shadowed `rounded-3xl` container
(`border-encre/10`, `shadow-sm` → `shadow-lg` on hover) with two visually
distinct zones inside it — a colored photo panel on top, a plain-papier
name/price/color-swatch section on the bottom, both inside the same
card boundary so it reads as one object instead of loose elements on the
page. The panel color rotates per card through a small brand-palette set
(`blush/60`, `sauge/40`, `crepuscule/25`, `lueur/30` at index % 4) so a
grid of these has some variety ("be creative") without turning into an
arbitrary rainbow — same four tints used elsewhere in the brand (blob
background rotation, badges), not new colors invented for this. Hover:
the whole card lifts (`-translate-y-1`) and its shadow grows, while the
photo itself scales up slightly inside its panel (`group-hover:scale-105`)
— a two-layer hover response instead of one flat card-wide scale.

Deliberately scoped to `ProductCard.tsx` only, not `BlobPhoto.tsx` — that
component is still used as-is for the product detail page's main image
(`ProductGallery.tsx`) and the cart line-item thumbnails (`panier/page.tsx`),
neither of which were part of the complaint (both are single large/small
images in a different context, not a grid of "cards"), so touching
`BlobPhoto.tsx` itself would have changed those too without being asked.
`ProductCard.tsx` no longer imports `BlobPhoto` at all — renders its own
`<img>` directly inside the new colored panel now that the panel/shape
logic lives at the card level instead.

**Verified**: `"Nouveau"` text confirmed absent from the DOM. New cards
screenshotted on the homepage's 4-column grid, `/boutique`'s 3-column
grid, and mobile's single-column stack — all read as real bordered cards
with distinct panel colors and clean bottom sections. `npm run lint` /
`npm run build` clean.

## Fourteenth round: homepage catalog becomes an arrow-driven carousel of bigger, cleaner cards

Client sent a reference screenshot — a shoe-shopping app's product screen
(big centered photo on a plain light background, bold title, small color
dots, price) — asking the card look move toward that, and separately asked
for the homepage's "Nos créations" section to hold roughly 5 big cards per
screen with the rest reachable by scrolling, plus a left arrow to drive
that scroll, with hover animation.

**Card, `ProductCard.tsx` — third redesign this pass.** Dropped the
thirteenth round's four-color rotating panel background in favor of one
consistent soft `blush → papier` gradient behind every card, so the photo
stays the visual focal point the way it does in the reference (a busy
rotating rainbow of panel colors was working against "big clean photo,"
not for it). Aspect ratio went from square to `4:5` (taller) for more
presence. Name/price/swatches restructured into the reference's row
layout — swatches left, price right, both bottom of the card, name bold
above. Hover response now has two layers: the whole card lifts + its
shadow deepens (unchanged from thirteenth round), and now the photo
*inside* also scales up and rotates slightly on its own
(`group-hover:scale-110 group-hover:-rotate-2`) — the "animate on hover
and stuffs" ask, layered on top of what already existed rather than
replacing it.

**New `ProductCarousel.tsx`** (client component) wraps `ProductCard` for
the homepage preview only — `/boutique`'s full listing stays a plain
wrapped grid on purpose (that page is "browse the whole catalog
systematically," a carousel would work against that; the *card* redesign
still applies there since both consume the same `ProductCard`, just not
the carousel behavior). Structure: a `flex overflow-x-auto snap-x
snap-mandatory` scroller with `w-64 sm:w-72 shrink-0 snap-start` cards —
fixed-width cards rather than a hardcoded "5," so however many actually
fit a given viewport is just a function of its width, not a number chosen
up front. Own scrollbar hidden via a new reusable `.scrollbar-hidden`
utility in `globals.css` (same technique as the site-wide native-scrollbar
hide from an earlier round, factored out since this is the first *inner*
scroll container that needed the same treatment) — the arrow buttons are
the intended scroll affordance, not a visible track.

Left/right arrow buttons are circular, positioned absolutely at the
scroller's vertical center just outside its edges, each an inline SVG
chevron (not a text glyph — renders consistently across platforms/fonts
unlike `←`/`→` characters). Only asked for "an arrow by left," but a
carousel with no way to advance past the first screen is broken UX, so
built both — and both are visibility-tracked against real scroll position
(`scrollLeft`/`scrollWidth`/`clientWidth`, updated on `scroll` and
`resize`) rather than always shown: left hidden until you've scrolled
right at all, right hidden once you've reached the actual end. Clicking
steps by exactly one card's rendered width + the gap (read directly off
the first `[data-carousel-card]` element via `offsetWidth`, not a hardcoded
guess), via `scrollBy({ behavior: "smooth" })`.

**Verified**: initial load shows only the right arrow (nothing to go back
to yet, confirmed via `aria-label` visibility checks); clicking it moves
`scrollLeft` and reveals the left arrow; screenshotted the initial state,
the hover state on both an arrow (scale + color swap) and a card (lift +
shadow), the scrolled-to-the-end state (right arrow correctly gone, last
card fully visible), mobile (single-card view, swipeable, arrow still
usable as a tap target), and `/boutique`'s plain grid to confirm it picked
up the new card look without inheriting the carousel behavior. `npm run
lint` / `npm run build` clean.

## Fifteenth round: way bigger cards, a resting tilt per card, hover wobble

Client sent a second reference (a book-club site's card carousel) and
asked for three concrete changes on top of the fourteenth round's
carousel: much bigger cards (photo scaling with them), each card resting
at its own slight crooked angle "like scattered cards," and a wobble on
hover instead of a flat lift.

**Size — `ProductCarousel.tsx`.** Card width jumped from `w-64/sm:w-72`
(256/288px) to `w-72/sm:w-96/lg:w-[26rem]` (288/384/416px) — since the
photo area is a fixed-aspect (`4:5`) fraction of the card, it scales up
for free with the container; no separate photo-sizing change needed.
Carousel gap widened `gap-6` → `gap-8` and scroller padding `px-1` →
`px-4` to give the now-bigger, now-tilted cards enough clearance that
their corners don't clip against the container edge (see below).

**Resting tilt + hover wobble — new `.product-card` class in
`globals.css`, applied in `ProductCard.tsx`.** Each card gets an
independent resting rotation from a small fixed set (`ROTATIONS = [-3,
2.5, -2, 3, -1.5, 2]` degrees, cycling by index) passed through as a
`--card-rotate` CSS custom property via inline `style` — done as a custom
property rather than a Tailwind `rotate-*` class specifically so the
`@keyframes card-wobble` hover animation could re-center itself on each
card's own resting angle (`calc(var(--card-rotate) - 7deg)` etc.) instead
of wobbling around a shared 0deg, which would have made every card
straighten out before wobbling — visibly wrong once cards don't all share
the same tilt. The wobble is a one-shot `animation` (spring-like overshoot
past ±7deg, settling back to resting-angle + a `translateY(-6px)` lift)
rather than a `transition`, since a transition can't overshoot past its
own end value. `prefers-reduced-motion` forces both the resting tilt and
the hover wobble/lift to `none` — cards sit flat and don't move at all,
the most conservative fallback available, consistent with this file's
existing pattern of fully disabling motion rather than a reduced version
of it.

**Real bug caught during verification, not shipped**: the initial
carousel screenshot showed the left ("previous") arrow visible on first
load, before any scrolling had happened — wrong, since there was nothing
to scroll back to yet. Measured the scroller's actual `scrollLeft` at
rest and found it was `8` (matching the horizontal padding added for tilt
clearance), just above the arrow-visibility check's `> 4` threshold, so
the container's own padding was being misread as "already scrolled."
Fixed by raising the threshold to `16` — comfortably above the resting
`scrollLeft` (which became exactly `16` once the padding was also bumped
to `px-4` for the bigger cards), while still far below any real scroll
movement (a full card width, hundreds of px). Confirmed via direct
`scrollLeft` inspection before and after: left arrow now correctly absent
at rest, present only once the user has actually scrolled.

**Verified**: computed `transform` on each resting card confirms distinct
rotation angles; screenshots of the resting state (varied tilts, only the
right arrow present), hover mid-wobble (exaggerated rotation + lift), and
hover settled (back to resting angle + lift + zoomed photo, no jump from
where the wobble ended). `/boutique`'s grid and mobile both confirmed to
pick up the same tilt/wobble treatment correctly, no clipping at any
card's edge. True-bottom scroll-snap regression check and reduced-motion
check (`transform: none` on a hovered card) both pass. `npm run lint` /
`npm run build` clean.

## Sixteenth round: carousel cards dialed back down a notch, more gap, a mobile overflow bug fixed

Positive but corrective feedback right after seeing the fifteenth round's
"way bigger" cards live: wanted a bit more space between them, and — read
as "the thing can't take the entire length of the screen" — the cards
themselves were now dominating too much of the viewport (vertically, since
height scales with width at a fixed `4:5` aspect ratio; the wording is
ambiguous between width and height, but dialing size back addresses both
readings at once, so no need to guess further).

**`ProductCarousel.tsx`**: card width stepped back down from
`w-72/sm:w-96/lg:w-[26rem]` (288/384/416px) to `w-60/sm:w-72/lg:w-80`
(240/288/320px) — still bigger than the pre-fifteenth-round size
(256/288px), just not as extreme, and height shrinks proportionally for
free since the photo area is a fixed-aspect fraction of the card width.
Gap widened `gap-8` → `gap-10` for the requested breathing room. Also
fixed `scrollByCards`'s step calculation, which had a stale hardcoded
`+ 24` gap baked in from before the gap became `gap-8` and now `gap-10` —
reads the real gap via `getComputedStyle(el).columnGap` instead, so this
can't silently drift out of sync with the Tailwind class again the next
time card spacing changes.

**Real bug caught during verification, not requested but fixed anyway**:
the mobile screenshot showed the price wrapping onto a second line for
any product with enough color swatches to fill the row (Akari's 6, at the
new narrower `w-60` mobile width) — the swatch row and price were
fighting for the same horizontal space with nothing to yield gracefully.
Fixed in `ProductCard.tsx`: swatches wrap onto a second row
(`flex-wrap`) instead, and the price gets `shrink-0 whitespace-nowrap` so
it always stays intact on one line and never loses the tug-of-war.
Confirmed fixed via a fresh mobile screenshot — swatches wrap 4+2, price
reads cleanly as "2 500 DA" on one line.

**Verified**: screenshots at the new size (desktop — three cards
comfortably visible with real gaps between them, section height ~911px
against a 900px viewport instead of towering over it; mobile — one card
plus a clear peek of the next, confirming it no longer reads as "full
screen"), arrow-at-rest state still correct (only right arrow, left
absent) since the padding/threshold relationship from the previous round
was untouched. `/boutique`'s grid unaffected — its `ProductCard` instances
size from the CSS grid column, not the carousel's fixed-width wrapper, so
this round's width change was carousel-only by construction, not
something that needed separate checking. `npm run lint` / `npm run build`
clean.

## Seventeenth round: carousel goes full-bleed, arrows dropped for native touch-swipe + mouse-drag

Three asks: more gap between cards (again — kept nudging up round over
round as bigger sizes made the previous gap read as tight), the carousel
should start at the actual left edge of the screen instead of centered
in the site's normal content column, and the arrows should go entirely in
favor of "just built-in scroll and capability to hold with mouse and
swipe like on a phone."

**Full-bleed layout — `CatalogPreview.tsx` + `ProductCarousel.tsx`.** The
section's own `mx-auto max-w-6xl px-6` (which constrained everything,
including the carousel) was moved down onto just the heading and the
"Voir toute la collection" link — the carousel itself now sits directly
in the full-width `<section>` with no wrapping constraint, so it spans
the entire viewport width. The scroller keeps a small `pl-8/pr-8` edge
gutter (not `px-6` like the rest of the site — see the real bug below for
why) rather than zero, so cards don't render flush against the literal
browser edge.

**Real bug found during verification, not requested but fixed**: after
removing the centered wrapper, the first card's rendered position measured
at **x = -13.27** — part of its corner was rendering *off* the left edge
of the browser window, invisible. Root cause, confirmed by testing
multiple padding values and watching the number not change: plain CSS
`padding` on a `scroll-snap-type` container doesn't reserve real
clearance from the snap algorithm's point of view — at rest, the browser
auto-scrolls exactly far enough to flush the first `scroll-snap-align:
start` element's edge against the *padding edge* (the scrollport
boundary), consuming the padding as pure scroll offset regardless of its
size — increasing `px-6` to `px-8` made no difference for exactly this
reason, still landing on the same negative x. Padding was never going to
fix this alone.

The actual fix is `scroll-padding-left`/`scroll-padding-right`
(`scroll-pl-8`/`scroll-pr-8`) *combined with* the plain padding — these
tell the snap algorithm "the true start of the scrollport is inset by
this much," so it stops trying to scroll the visual gutter away. With
both applied, the first card measured at **x = +18.7** — comfortably
inside the viewport, confirmed via direct `getBoundingClientRect()`
inspection before and after, not by eyeballing a screenshot. `px-8`
specifically (not `px-6`) because these cards sit at a resting tilt
(`--card-rotate`, fourteenth/fifteenth round) and a rotated rectangle's
axis-aligned bounding box is measurably wider than the rectangle itself —
the overhang from a ~3° tilt on one of these tall (`4:5`) cards is closer
to 14px than the few px a straight card would need.

**Arrows removed — `ProductCarousel.tsx`.** `Arrow`, `canScrollLeft`/
`canScrollRight`, and the scroll-position-tracking `useEffect` from the
fourteenth round are gone entirely. In their place: touch-swipe needs no
JS at all (`overflow-x-auto` on a touch device already pans natively),
but **mouse click-and-drag isn't a native browser behavior** the way
touch is, so it's hand-rolled — `onMouseDown` records the starting
pointer X and `scrollLeft`, `onMouseMove` (while a state flag is active)
directly sets `scrollLeft` to follow the pointer, `onMouseUp`/
`onMouseLeave` end the drag. `scroll-snap-type` is temporarily set to
`none` for the drag's duration (snap fights a manually-assigned
`scrollLeft` mid-gesture, causing jank) and restored on release, so the
carousel still settles onto the nearest card afterward — same "swipe and
settle" feel as a phone, just mouse-driven. Cursor swaps `grab` ↔
`grabbing` for the affordance, and text selection is disabled
(`select-none`) so dragging doesn't accidentally highlight card text.

A drag that moves the scroller shouldn't *also* fire the dragged card's
`<Link>` navigation on release — a `draggedRef` flag (set once pointer
movement exceeds a 4px threshold) is checked in an `onClickCapture` on
the scroller, which `preventDefault`s + `stopPropagation`s exactly once
per drag, letting genuine no-movement clicks navigate normally.

**Verified**: `getBoundingClientRect()` on the first card confirmed the
padding fix (x: -13.27 → +18.7); zero arrow buttons in the DOM on both
desktop and mobile; a scripted mouse-drag gesture (`mousedown` → move
150px → `mouseup`) moved `scrollLeft` and did **not** navigate, confirmed
via `page.url()` staying on `/`; a plain click with no movement **did**
navigate correctly to `/boutique/akari` (this took two attempts to prove
cleanly — the first attempt used an ambiguous selector that accidentally
matched Hero.tsx's own product-photo link, which shares the same
`/boutique/akari` href and happened to resolve first in DOM order; a
second attempt scoped precisely to the carousel's own anchor confirmed
navigation genuinely works, `defaultPrevented: false`); document-level
horizontal overflow checked and absent (`scrollWidth` == `clientWidth`,
so no accidental page-wide scrollbar from the full-bleed layout); true-
bottom scroll-snap and reduced-motion regression checks both still pass.
`npm run lint` / `npm run build` clean.

## Eighteenth round: hero's hanging accent redesigned to use a real product photo, plus 5 fake demo products for volume-testing

Two asks. First: the small hanging-bulb SVG accent near the headline (Phase-6-era illustration) "is not very cool" — make something cooler, bigger, and consider using real product photos instead of the abstract illustration. Second: add some placeholder/fake products with throwaway SVG images so the site could be previewed with more than 4 items — explicitly offered to answer questions if any came up; none were blocking, since "you decide what's best" covered the open design choices.

**New `HeroHangingPhoto.tsx`** replaces the plain-SVG accent in `Hero.tsx`. A cord (thin line) + a small ring down to a tilted, framed photo tag (`rounded-2xl`, papier border, the same soft gradient panel treatment as `ProductCard.tsx`'s photo area, for visual consistency across the site's product-photo treatments) — reads as something physically clipped up, not an abstract drawing. It's a real `<Link>` to the pictured product's detail page, with its own hover response (straightens from its resting `-rotate-6` tilt to `rotate-0` and scales up slightly) independent of the existing swing animation, which still wraps the whole cord+tag unit via the existing `.animate-lamp-swing` class (unchanged — still a `transform`, not padding/font-size, for the established Phase-6 scroll-snap reason).

`Hero.tsx` now fetches `getFeaturedProducts(2)` instead of `(1)` — first product is the existing big centered hero image (unchanged), second is a *different* product used for the hanging accent (a small preview of another catalog item, not a repeat of the main photo). Falls back to reusing the same product if only one exists, and to the original `LampIllustration` SVG if the catalog is empty — same graceful-empty-state pattern used everywhere else in this app, not a hard requirement on data existing.

Getting the position right took several iterations of measure-and-adjust (established pattern for this file): the first attempt heavily overlapped the "U" in "Une" (client's original small accent only grazed a corner, not covered half a letter) — `getBoundingClientRect()` showed why: the available clear margin between the viewport edge and the headline's left edge is only ~144px, and the initial tag size (144px) filled that exactly with zero room for the cord above it, let alone clearance. Solved by shrinking the tag (`h-24/w-24` → `h-16/w-16`, i.e. `sm:h-20/w-20`) and retuning its horizontal offset (`-left-32`) until measurement showed a comfortable ~28px gap with no overlap at all.

**Fake demo products** — seeded directly via a one-off Node script (`@supabase/supabase-js` + the service-role key already in `.env.local`, same credentials the admin panel itself uses) rather than through the admin UI, since this was five products' worth of setup work better scripted than clicked through. 5 products (`Nova`, `Luna`, `Halo`, `Écrin`, `Volute`), 2–3 colors each, matching the real `products`/`product_colors`/`product_photos` schema exactly (checked against the actual migration SQL and the admin `actions.ts` insert shapes first, not guessed). Slugs prefixed `demo-` (`demo-nova`, etc.) so they're easy to find and bulk-delete later — via a Supabase SQL Editor query (`delete from products where slug like 'demo-%'`, cascades to colors/photos) or one-by-one through `/admin/produits` — while the display names stay plausible-sounding so they preview realistically rather than reading as obviously-fake test rows.

"Some SVG crap" taken fairly literally: each color gets a small flat-color lamp-silhouette SVG (one of four shape variants — dome/cone/globe/pleated — cycling for visual variety), generated by a template function and uploaded directly to the `product-photos` Storage bucket as real `.svg` files (`image/svg+xml`), set as both the color's `cutout_photo_url` (feeds the homepage/carousel/boutique cards) and a `product_photos` row (feeds the detail page gallery) — so clicking into a demo product's own page isn't broken either. Total catalog is now 9 products (4 real + 5 demo).

**Real "bug" chased during verification, turned out to be a test artifact worth noting**: a full-page screenshot of `/boutique` showed only 2 of 3 grid rows, with a large blank gap where the middle row should be. Direct `getBoundingClientRect()` inspection showed all 9 cards had valid, correctly-laid-out positions — so it wasn't a layout bug. Checking each card's `data-reveal` attribute (`Reveal.tsx`'s IntersectionObserver-driven fade-in) explained it precisely: the verification script had jumped straight from the top of the page to the bottom and back (`scrollTo` twice, no steps in between), which skipped over the exact scroll range where the middle row would have crossed the 15% visibility threshold, so those three `Reveal` wrappers legitimately never fired and sat at `opacity: 0`. A normal, gradual scroll (`mouse.wheel` in several steps, mimicking how a real visitor scrolls) triggered all nine correctly. Documented here because it's the same shape of false alarm as several earlier ones in this project (Tailwind's native `scale`/`translate` properties, `waitForSelector`'s default visibility requirement, ambiguous ` a[href^=...]` selectors matching Hero's own product link) — the fix each time is the same: verify against the actual DOM/behavior before concluding the app is broken.

**Verified**: hanging photo position confirmed gap-free via direct measurement; hover state confirmed both visually (screenshot) and structurally; click-through confirmed navigates to the pictured product's real page; accent confirmed hidden on mobile (unchanged `hidden sm:block` breakpoint, by original design — the swap didn't touch that); `getFeaturedProducts(2)` confirmed returning two genuinely different products (`Akari` main, `Japandi` accent) via direct DOM inspection after an initial test-script mix-up; all 9 products confirmed rendering correctly (both grid and, implicitly, carousel — same `ProductCard`/`ProductCarousel` components, unmodified this round) via a properly-scrolled full-page screenshot. True-bottom scroll-snap regression check still passes. `npm run lint` / `npm run build` clean.

## Nineteenth round: real mobile audit after "half the things aren't even rendering" — one confirmed cross-browser bug fixed, root cause of the rest still open

User reported the live site looking broken on their actual phone. Every prior mobile check in this project (including this session) had used Chromium's viewport-resize emulation, which turned out to be an important gap — it doesn't reproduce real mobile-Safari-specific behavior. Installed Playwright's actual WebKit engine (`npx playwright install webkit`, not previously installed) and tested under `devices["iPhone 13"]` across both engines side by side, plus Chromium under Pixel 7 and iPhone SE profiles for width coverage.

**Found and fixed a real bug**: the hero `<h1>` — the single most prominent element on the page, the only spot using `font-bold` — renders visibly thin in WebKit despite `getComputedStyle` correctly reporting `font-weight: 700`. Root cause: `layout.tsx` loaded all three fonts (Fredoka, Work Sans, Caveat) with `weight: "variable"`, meaning the browser has to interpolate the requested weight along the font's `wght` axis at render time — a class of bug with a documented history of inconsistent behavior in Safari specifically (the CSS is honored, the interpolation isn't, and there's no CSSOM signal exposing the mismatch — `getComputedStyle` reports what was requested, not what got painted). Fixed by switching all three to explicit static weights, requesting only what the codebase actually uses (grepped first, not guessed): Fredoka `["400", "700"]` (every heading defaults to 400; the one `font-bold` spot is 700), Work Sans `["400", "500"]` (body copy + the ~50 `font-medium` spots), Caveat `["400"]` (never used with a weight modifier). Confirmed via `document.fonts` that this produces genuinely separate static font files per weight (before: one `"300 700"` variable face; after: distinct `"400"` and `"700"` faces, both `status: "loaded"`) — a strictly safer setup regardless of whether it's the whole story, since it removes a known bug class entirely.

Also added `text-size-adjust: 100%` / `-webkit-text-size-adjust: 100%` to `html` in `globals.css` while investigating — iOS's separate "text autosizing" behavior (inflating rendered text size independent of declared `font-size`, also invisible to `getComputedStyle`) was an early hypothesis, ruled out once `getBoundingClientRect()` on the h1 came back pixel-identical between Chromium and WebKit at the same device profile. Left the rule in regardless — harmless, and a reasonable default against a real (if not the active) class of mobile bug.

**Honest gap**: after the font-weight fix, the WebKit screenshot still showed thinner-looking text than Chromium's — but by that point `document.fonts` confirmed the *correct* static 700-weight file was genuinely loaded and mapped. That points at a rendering/rasterization difference between the two engines for the same font file, not a misconfigured weight — plausible, but not confirmed, and Playwright's WebKit build is a Windows-hosted port, not real Apple Safari, so it's an imperfect proxy for the user's actual phone regardless. Beyond this, extensive checking (console errors, failed network requests, horizontal overflow, layout structure — all clean across every device profile tried) turned up nothing else concretely broken; touch-swipe on the carousel was explicitly tested via synthesized `TouchEvent`s and scrolls correctly. Given the user's phrasing ("half the things aren't even rendering") is vague and this session's testing has been Chromium-only throughout, there is real risk something device- or browser-specific is still being missed. Asked the user for a screenshot or more specifics (which phone/browser) rather than continuing to guess blind.

**Verified**: `npm run lint` / `npm run build` clean; dev server restarted (font config changes need a fresh boot, not just hot-reload) and re-tested after the fix.

## Twentieth round: hero rebuilt as an aardvarkbookclub.com-style row of hanging, swinging lamps

User asked for the hero to match the aardvarkbookclub.com reference directly: big type, a row of cute items hanging and wobbling — lamps instead of books — using their own products. They also asked a design question: aardvark hangs *generic* book covers rather than real products, should Naja do the same?

**Answered: no, use real products.** Aardvark's catalog is a rotating surprise subscription box, so it genuinely can't show real titles — generic covers are a constraint of their model, not a style choice. Naja is the opposite: a small fixed catalog, cutout (background-removed) photos already exist for exactly this kind of treatment, and every hanging lamp can double as a shortcut straight to its own product page. User did not object; built with real products.

**Layout rewrite — `Hero.tsx`.** The old two-column split (text left, one big product photo right, one small hanging accent) is gone entirely. Now: a full-width rail of five lamps suspended from cords at the section's top edge, with big centered type below. The single large product photo and the previous single-accent design are both replaced by the rail — that's a real removal, deliberate, since the reference layout has no big standalone product shot.

**New `HangingLamp.tsx`**, replacing `HeroHangingPhoto.tsx` (deleted — was single-purpose; every reference removed, checked by grep). Deliberately content-agnostic (takes `children`) so the same cord + swing rig hangs either a real product photo or the `LampIllustration` fallback when the catalog is empty — which keeps that component meaningful rather than becoming dead code after the redesign.

**Rig table (`LAMP_RIG` in Hero.tsx)** drives per-lamp cord length, photo width, swing duration and drop-in delay by position. Two deliberate choices there:
- Cord lengths and widths are `clamp()` expressions, not fixed px or Tailwind breakpoint classes — they scale continuously from a 320px phone to a wide desktop, so there's no second mobile rig to keep in sync. This is why `HangingLamp`'s `cordLength` is typed `string` (a CSS length) rather than `number`.
- Positioning is `justify-between` on a flex rail, **not** absolute left offsets — so hiding the two `hideOnMobile` lamps simply lets the remaining three re-spread evenly, again with no separate mobile position table.

**Animation — `.hanging-lamp` in `globals.css`.** `transform-origin: top center` is the whole trick: the pivot is where the cord meets the top edge, so cord+lamp swing as one pendulum rather than the lamp spinning about its own middle. Two animations on one element: a one-shot `lamp-drop` entrance, then the endless existing `lamp-swing`. `lamp-drop` ends on `rotate(-3deg)` — exactly `lamp-swing`'s 0%/100% state — and the swing's delay is the drop's duration plus that lamp's own stagger, so the handoff has no visible jump (same pattern already used by `.hero-photo-enter`). Per-instance `--swing-duration` (3.3s–4.7s, all different) is what keeps the row from swinging in lockstep, same technique as the background blobs. `prefers-reduced-motion` disables the whole thing to a static, fully-visible state.

**Real mobile bug found by measuring, not eyeballing.** First build looked fine on desktop but was badly broken on a phone: measured `window.innerHeight` at 664 on the iPhone 13 profile, with the CTA sitting at 696–744 — **entirely below the fold**, the paragraph half-cut, and a 100–140px dead band between the lamps and the headline. Root cause was a desktop-tuned `pt-[19rem]` (304px) plus a `text-6xl` headline wrapping to four lines at 390px wide. Fixed by scoping the padding responsively (`pt-52` mobile / `sm:pt-[24rem]`), dropping the mobile headline to `text-5xl`, and shortening the `clamp()` cord minimums so the lamps hang higher on narrow screens. Re-measured after: CTA bottom 633 vs 664 innerHeight (above the fold), lamps→text gap down to 58px, section height exactly `100vh+4rem`. Confirmed in **real WebKit** on the phone profile too, not just Chromium — that gap is what let the previous round's mobile problems through.

**Test artifact worth recording** (same class as several earlier ones): clicking a lamp in an automated test did *not* navigate, which looked like a broken link. It isn't — with `prefers-reduced-motion` freezing the swing, the same click navigates correctly to `/boutique/akari`, and `pointer-events` verified correct (`auto` on the link, `none` on the rail so it can overlap the headline harmlessly). The lamp physically moves between Playwright computing click coordinates and dispatching them, so `force: true` lands on empty space. Real pointers track a moving target fine, and the swing is only ±3°.

**Verified**: five lamps on desktop at staggered heights with five distinct swing durations; three on mobile, no horizontal overflow on either; swing confirmed actually moving via two transform samples; drop-in→swing handoff; lamp→product navigation (frozen-motion); `prefers-reduced-motion` fully static; scroll-snap still reaches the true document end; real-WebKit phone pass clean with zero page errors. `npm run lint` / `npm run build` clean.

## Twenty-first round: catalogue cards restyled aardvark-fashion, plus a homepage loading veil that dissolves into the hero

Two asks: bring the homepage catalogue cards to the aardvarkbookclub.com style, and add a loading animation like theirs that "seamlessly blends into the wavy background" — explicitly a lamp or something creative, and explicitly **not** one of the real products.

**Card restyle — `ProductCard.tsx`.** Reworked to aardvark's card anatomy, taken from the reference screenshot the client shared earlier in this feedback pass (solid saturated card, cover inset on top of it, a row of small multi-coloured pills, bold title, short blurb):
- Card background is now a **solid block of colour** rotating through four brand hues at full strength (`bg-blush` / `bg-sauge` / `bg-crepuscule` / `bg-lueur`), replacing the previous white card with a faint tinted photo panel. Deliberately the brand's *own* palette at full saturation rather than aardvark's louder hues — the soft palette is a brief-level brand decision recorded earlier in this doc, so the structure was copied and the colours weren't.
- The photo sits **inset** on a `bg-papier` panel with the card colour framing it on all sides — aardvark's cover treatment.
- **Colour swatches became pills**, filling the role aardvark's genre tags play: same visual device, driven by data the catalogue already had. Previously these were tiny anonymous dots; now each shows its colour name on its own colour.
- Bold `text-2xl` name, a 3-line-clamped blurb, and the price below.

The pills needed a real fix, not a guess: swatch hexes are **admin-entered** and range from near-white (`Ivoire`, `Blanche`) to near-black (`Bleu Nuit`, `Charbon`), so a hardcoded label colour would be unreadable at one end or the other. Added `labelColorOn()`, which derives the label colour from the swatch's own WCAG relative luminance and returns encre or papier. Verified against the client's real data — "Bleu Nuit" renders white-on-navy, "Beige" renders dark-on-cream, in the same row.

**Data-layer change**: cards now show a blurb, so `FeaturedProduct` gained `description` and both card queries (`getFeaturedProducts`, `getProducts`) select it. `getProductBySlug` already had it and was untouched.

**Loading veil — new `HomeLoader.tsx`**, homepage-only (verified absent on `/boutique`). The thing that makes it read as seamless rather than as a page swap: the veil renders **the same `WavyBackground` the hero sits on**, full-bleed at the same position, so when it fades the only thing that actually disappears is the lamp and its glow — the background underneath is already identical and never moves. This is precisely the failure mode of the earlier loading screen that was rejected in this same feedback pass (a plain-background Suspense fallback snapping to a colourful hero), now addressed directly.

The animation: a **hand-drawn pendant lamp** (not a catalogue product, as asked — and a pendant specifically so it hangs from the top, echoing the hero's rail) drops in, then settles into the very same `lamp-swing` keyframe the hero rail uses; its `loader-lamp-in` ends on `rotate(-3deg)`, which is `lamp-swing`'s 0% state, so the handoff doesn't jump. Meanwhile a glow blooms outward past the viewport, so the veil's opacity fade lands on an already blown-out screen instead of cutting mid-scene. `prefers-reduced-motion` skips the veil entirely via CSS `display: none` (rather than branching in the component, which would risk a first-frame flash and a hydration mismatch) — a motionless loading veil is just a delay.

Replay policy is a **module-level flag, deliberately not `sessionStorage`**: a full document load resets the module so the veil plays on every real page load (and stays reviewable on reload), while client-side navigation away and back doesn't replay it.

**Real bug found and fixed — React StrictMode.** First implementation left the veil stuck over the homepage forever: polled it at 0.5s→4s and it sat at `opacity: 1`, never fading, never unmounting. Not slow hydration (confirmed by warming the route first and re-polling). Cause: the effect guarded on the module flag (`if (hasPlayed) return`) *and* set it. StrictMode double-invokes effects in development — mount → cleanup → mount — so invocation 1 scheduled the timers and claimed the flag, the cleanup cleared those timers, and invocation 2 hit the guard and bailed without rescheduling. Net: no timers at all. Fixed by deciding once per mount whether to play and parking that in a `useRef`, which is stable across StrictMode's re-runs, so each invocation schedules its own timers and the last wins. A follow-up lint error (`react-hooks/refs`: cannot read a ref during render) was fixed properly rather than suppressed — the `useState` initialiser and the ref now each read the module flag directly and never each other. Re-polled after: opacity 0.22 at 2.5s, gone by 3.2s.

**Verified**: veil present at 0.5s and fully unmounted by 3.0s; four cards rendering the four distinct palette backgrounds with pills and blurbs present on each; luminance-derived pill labels correct against real dark and light swatches; all 9 cards render on `/boutique` (same component, no carousel behaviour); no horizontal overflow on mobile; reduced-motion veil `display: none`; scroll-snap still reaches the true document end. `npm run lint` / `npm run build` clean.

## Twenty-second round: reverted — wave-ribbon background and intro sequencing were built, then rolled back

Client asked for the hero background to be rebuilt as aardvarkbookclub.com-style waves, and for the loading veil to transition into that background before the elements appeared. Both were built and verified, then the client reviewed it live and rejected the result outright ("that ain't smooth at all"), asking to return to the previous state. **Everything from that round was reverted**; the tree is back to the twenty-first round. Recorded here so a future session doesn't rebuild it assuming it was never tried.

What was built and then removed:
- `WavyBackground.tsx` rebuilt from the three drifting blobs into five stacked sine ribbons, each a 200%-wide `<svg>` drifting horizontally with wavelengths chosen to divide the viewBox so the loop was seamless. Restored to the blob version.
- An `--intro-delay` / `[data-intro]` mechanism holding the hero's entrance animations until the veil had dissolved, so the sequence read background-then-elements. This needed a synchronous inline script on the homepage (an effect runs too late — the CSS animations have already started by hydration), which in turn needed `suppressHydrationWarning` on `<html>` to silence the resulting attribute mismatch. All three pieces removed: the script, the CSS variable and `.hero-intro` class, and the `suppressHydrationWarning`.
- `HomeLoader` gained flag-clearing logic for that mechanism; reverted to the simpler timer-only version.
- `Hero.tsx`'s copy elements had `hero-intro` classes and per-element `--intro-stagger` values; reverted to plain markup.

**Revert verified** by grepping the source for every identifier the round introduced (`wave-drift`, `hero-intro`, `intro-delay`, `intro-stagger`, `data-intro`, `dataset.intro`, `suppressHydrationWarning` — all zero hits) and confirming `blob-drift` is referenced again. Homepage re-checked live: veil plays and clears, three drifting blobs back in the hero, hero copy visible immediately with no intro hold, zero console errors, scroll-snap still reaches the true document end. `npm run lint` / `npm run build` clean.

**Worth knowing for a future attempt**: the reference's background could not be inspected — fetching aardvarkbookclub.com returns HTML/text only, and its backgrounds are `.webp` image assets with no inline SVG or CSS rules to read. The wave shapes were therefore guessed from the description, which is the likeliest reason the result missed. Any retry should start by getting actual visual reference from the client (a screenshot or a recording) rather than rebuilding blind.

## Twenty-third round: per-product ad landing pages at `/lampe/[slug]`

Client asked for "a landing page for each product," pointing at a Claude Design
mockup (`Naja Champignon.dc.html`, project `d04fbdcb`) built on that tool's
**Modernist** design system. Pulled the mockup and its `styles.css` down with
the DesignSync tool and built it against the live catalogue.

**The design is deliberately not the storefront's.** Modernist is Archivo at
weight 800, one hard red (`#ec3013`), zero border-radius, 2px rules everywhere,
uppercase poster type on a cold grey ground — the exact opposite of Naja's warm
papier/encre/lueur, Fredoka, 2rem-radius shop. That is the point: this is the
far end of an Instagram ad click, not a shop shelf. Both looks now live in one
app, which drove most of the structural decisions below.

**New route, nothing replaced.** `/lampe/[slug]` sits beside `/boutique/[slug]`,
which is untouched. Its own route segment with its own `layout.tsx`, a sibling
of `(site)` rather than a page inside it — the mockup carries its own nav and
its own footer as part of the poster, so inheriting the shop's fixed header and
blush footer would stack two of each. The layout keeps `CartProvider` and
`MetaPixel` from `(site)`. A second `CartProvider` is not a second cart: state
lives in `localStorage` under one key, so adding a lamp here and clicking
through to `/panier` reads back exactly what this tree wrote (verified).

**Style isolation.** `src/app/lampe/landing.css`, imported by that layout only.
Every token is scoped under `.lp` and every class prefixed `lp-`, because
`globals.css` is shared with the shop *and* the admin and already owns `.input`
— an unprefixed `.btn`/`.card` set would be a landmine. Turbopack emits it as
its own 13KB chunk loaded only on these routes; the storefront's CSS is
untouched (confirmed in the built chunks). Archivo is declared in the landing
layout rather than the root one, so a shopper who never sees a landing page
never downloads it.

**Content is generated per product, not per page** — adding a lamp in the admin
gets a landing page for free, with no second description field to keep in sync:
- Headline is `{NAME}` + "qui s'allume" in the accent colour. The mockup's "Un
  champignon qui s'allume" is a pun on that one product being a real object;
  Akari/Nami/Origami aren't, so the generalised formula drops the article.
- `lib/productCopy.ts` splits the one admin description on sentence boundaries:
  first two sentences to the hero (its 34ch measure holds about that much),
  the rest to the "Chez vous" card, and the "Imprimée à la main, pièce par
  pièce…" tail — identical in all six descriptions — dropped outright, because
  the "Petit grain / Un caractère à elle" promise directly above already says
  it with its own heading. Short descriptions (Origami, Akari) leave nothing
  over and fall back to a generic line.
- "Lampe nº 3" is the lamp's index in `getProducts()` order, so the number
  matches the order it's met in on `/boutique`.

**Interactive bits are real, not mocked.** The colour picker drives the hero
cutout, the state badge, the in-situ photo and what both add-to-cart buttons
put in the cart; add-to-cart goes through the same `useCart` + `trackAddToCart`
path as `ProductDetail`, and `trackViewContent` fires on mount. The mockup's
lit/unlit toggle survives as one `data-lit` attribute on `.lp` that re-points
four CSS custom properties — the whole light switch is CSS, no per-element
inline styles.

**Three real bugs caught by rendering it, not by reading it:**
- `overflow-x: hidden` on `.lp` (as the mockup had it) makes that element a
  scroll container, which silently kills `position: sticky` on the nav inside
  it. `overflow-x: clip` contains the ticker and glow without doing that.
- The column bands draw their 2px rules as grid **gaps** showing the
  container's background, not as borders on the cells — borders leave a stray
  rule hanging at the end of a short `auto-fit` row. Consequence caught later:
  `opacity` on a disabled swatch let that dark ground through, so an
  out-of-stock colour rendered as a grey block. Fixed by fading the chip and
  greying the text instead of the whole button.
- The hero's price/payment pair has a vertical rule between them that, once
  the pair wrapped on a narrow phone, stood next to nothing and read as a
  stray indent. Dropped below 40rem, where the flex gap already separates them.

**Not a bug, worth recording**: the first full-page screenshot showed the
in-situ photo broken, with `upstream image response timed out` in the server
log. That file is multi-MB and Supabase exceeded Next's image-fetch timeout on
a cold request; it serves 200 on retry, and `/boutique/[slug]` would do the
same. Not introduced here.

**Two judgement calls flagged rather than silently taken**: the nav is sticky
(the mockup's is not) because the CTA is the page's only job and the shop's own
header is already fixed; and the in-situ photograph keeps the design system's
`grayscale` filter, which is faithful to the mockup but does desaturate the
colour the customer just picked — both are one-line reversals.

**Verified**: all six landing pages prerendered as static at build; copy split
correct on a long description (Champignon → 2 sentences hero, 1 sentence room)
and on a short one (Origami → fallback room copy); colours in-stock-first with
the first selected and "Vert" showing "En rupture"; price rendering `2 800 DA`
through the shared `formatPrice`; Archivo variable applied and the landing CSS
in its own chunk; desktop 1440 and mobile 390 both clean with no horizontal
overflow. `npx eslint src/`, `npx tsc --noEmit` and `next build` all clean.

**Known gap**: the landing pages are intentionally unlinked from the storefront
— they're ad destinations, so nothing on the shop points at them. Nothing to
fix unless the client wants them discoverable.

## Status: twenty-first-round storefront unchanged (see above), plus a new per-product ad landing page at `/lampe/[slug]` — Modernist poster styling (Archivo 800, red `#ec3013`, zero radius, 2px rules) fully scoped under `.lp` so it cannot reach the shop or the admin; headline, hero copy, "Chez vous" copy, colours, photos and catalogue number all generated from the existing product row; working colour picker, lit/unlit switch and add-to-cart sharing the storefront's cart and Meta pixel; `/boutique/[slug]` untouched and still the ad destination until the client says otherwise — awaiting review before Phase 7
