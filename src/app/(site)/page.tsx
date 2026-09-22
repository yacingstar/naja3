import { AccueilClient } from "@/components/accueil/AccueilClient";
import { getProducts } from "@/lib/products";

// Prerender and serve from the CDN, re-rendering at most every 5 minutes.
//
// Before this, every visitor triggered a serverless invocation and a fresh
// Supabase query: measured ~800ms TTFB warm, and 3.9s when the function had
// gone cold. Ad traffic is exactly the case that hits cold functions, so a
// share of paid visitors were waiting ~4s for a first byte.
//
// 5 minutes is a backstop, not the main mechanism — the admin's product
// actions call revalidatePath on these routes, so an edit shows up straight
// away. The window only matters if on-demand revalidation ever fails, and it
// bounds how stale things can get to something a shop owner won't notice.
export const revalidate = 300;

// The homepage IS the configurator now. Everything the visitor needs to choose
// — every shape, every coloris and its photograph — is fetched once here and
// handed to the client, so switching colour is instant and costs no round
// trip. Only the selected photograph is ever downloaded (see Configurateur).
export default async function HomePage() {
  const produits = await getProducts();
  return <AccueilClient produits={produits} />;
}
