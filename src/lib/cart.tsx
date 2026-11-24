"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Les couleurs choisies pièce par pièce, pour un produit personnalisable
// (l'horloge). Absent sur une veilleuse, qui n'a qu'un coloris.
export type CartPart = {
  slot: string;
  label: string;
  name: string;
  hex: string;
};

export type CartItem = {
  productId: number;
  productSlug: string;
  productName: string;
  colorId: number;
  colorName: string;
  unitPrice: number;
  photoUrl: string | null;
  quantity: number;
  parts?: CartPart[];
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  totalQuantity: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "naja-cart";

// Ce qui fait qu'une ligne du panier est la même qu'une autre.
//
// Le produit et son coloris n'y suffisent plus : une horloge noir / blanc /
// rouge et une horloge rouge / blanc / noir sont le même produit, le même
// coloris « Sur mesure », et deux objets différents. Les couleurs choisies
// entrent donc dans la clé, sinon la seconde incrémenterait la première et
// la cliente recevrait deux fois la même.
export function cleLigne(item: Pick<CartItem, "productId" | "colorId" | "parts">): string {
  const pieces = (item.parts ?? []).map((p) => `${p.slot}=${p.name}`).join(",");
  return `${item.productId}:${item.colorId}${pieces ? ":" + pieces : ""}`;
}

// The cart never decides what gets charged — it's just what's displayed
// while shopping. The checkout Server Action re-prices everything from the
// live database before an order is ever written.
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a browser-only API unavailable during SSR; matching server/client first render, then syncing post-mount is the standard fix, not a smell here
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // corrupted or unavailable storage — start with an empty cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return; // don't clobber storage with the pre-hydration empty state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity: number) => {
    setItems((current) => {
      const key = cleLigne(item);
      const existing = current.find((i) => cleLigne(i) === key);
      if (existing) {
        return current.map((i) =>
          cleLigne(i) === key ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...current, { ...item, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((i) => cleLigne(i) !== key)
        : current.map((i) => (cleLigne(i) === key ? { ...i, quantity } : i)),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((i) => cleLigne(i) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalQuantity = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, addItem, updateQuantity, removeItem, clear, totalQuantity, totalPrice }),
    [items, addItem, updateQuantity, removeItem, clear, totalQuantity, totalPrice],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
