"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  productId: number;
  productSlug: string;
  productName: string;
  colorId: number;
  colorName: string;
  unitPrice: number;
  photoUrl: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (productId: number, colorId: number, quantity: number) => void;
  removeItem: (productId: number, colorId: number) => void;
  clear: () => void;
  totalQuantity: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "naja-cart";

function keyOf(productId: number, colorId: number) {
  return `${productId}:${colorId}`;
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
      const key = keyOf(item.productId, item.colorId);
      const existing = current.find((i) => keyOf(i.productId, i.colorId) === key);
      if (existing) {
        return current.map((i) =>
          keyOf(i.productId, i.colorId) === key
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...current, { ...item, quantity }];
    });
  }, []);

  const updateQuantity = useCallback(
    (productId: number, colorId: number, quantity: number) => {
      const key = keyOf(productId, colorId);
      setItems((current) =>
        quantity <= 0
          ? current.filter((i) => keyOf(i.productId, i.colorId) !== key)
          : current.map((i) =>
              keyOf(i.productId, i.colorId) === key ? { ...i, quantity } : i,
            ),
      );
    },
    [],
  );

  const removeItem = useCallback((productId: number, colorId: number) => {
    const key = keyOf(productId, colorId);
    setItems((current) => current.filter((i) => keyOf(i.productId, i.colorId) !== key));
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
