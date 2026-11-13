import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { round2 } from '../lib/format';
import type { Product, Settings } from '../lib/types';

export type CartLine = {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  quantity: number;
};

export type Coupon = { code: string; kind: 'percent' | 'fixed'; value: number };

export type Totals = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  itemCount: number;
};

const STORAGE_KEY = 'bh-cart-v1';

type Stored = { lines: CartLine[]; coupon: Coupon | null };

function readStorage(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [], coupon: null };
    const parsed = JSON.parse(raw) as Stored;
    const lines = Array.isArray(parsed.lines)
      ? parsed.lines.filter(
          (line) =>
            line &&
            Number.isInteger(line.id) &&
            typeof line.name === 'string' &&
            Number.isFinite(line.price) &&
            Number(line.quantity) > 0
        )
      : [];
    return { lines, coupon: parsed.coupon ?? null };
  } catch {
    return { lines: [], coupon: null };
  }
}

type CartValue = {
  lines: CartLine[];
  coupon: Coupon | null;
  isOpen: boolean;
  itemCount: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (id: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  totalsFor: (settings: Settings) => Totals;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readStorage, []);
  const [lines, setLines] = useState<CartLine[]>(initial.lines);
  const [coupon, setCoupon] = useState<Coupon | null>(initial.coupon);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, coupon }));
    } catch {
      /* storage can be unavailable in private mode */
    }
  }, [lines, coupon]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.id === product.id
            ? { ...line, quantity: Math.min(20, line.quantity + quantity) }
            : line
        );
      }
      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: product.finalPrice,
          originalPrice: product.price,
          image: product.image,
          quantity: Math.min(20, Math.max(1, quantity)),
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id: number) => {
    setLines((current) => current.filter((line) => line.id !== id));
  }, []);

  const setQuantity = useCallback((id: number, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.id !== id)
        : current.map((line) => (line.id === id ? { ...line, quantity: Math.min(20, quantity) } : line))
    );
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setCoupon(null);
  }, []);

  const totalsFor = useCallback(
    (settings: Settings): Totals => {
      const subtotal = round2(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
      let discount = 0;
      if (coupon && subtotal > 0) {
        const raw = coupon.kind === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
        discount = round2(Math.min(raw, subtotal));
      }
      const deliveryFee =
        subtotal === 0 || subtotal >= settings.freeDeliveryOver ? 0 : round2(settings.deliveryFee);
      const tax = round2(Math.max(subtotal - discount, 0) * (settings.taxRate || 0));
      const total = round2(Math.max(subtotal - discount, 0) + deliveryFee + tax);
      return {
        subtotal,
        discount,
        deliveryFee,
        tax,
        total,
        itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      };
    },
    [lines, coupon]
  );

  const value = useMemo<CartValue>(
    () => ({
      lines,
      coupon,
      isOpen,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      applyCoupon: (next) => setCoupon(next),
      removeCoupon: () => setCoupon(null),
      totalsFor,
    }),
    [lines, coupon, isOpen, addItem, removeItem, setQuantity, clearCart, totalsFor]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
