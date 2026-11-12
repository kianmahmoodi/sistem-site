export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  finalPrice: number;
  discountPercent: number;
  image: string;
  badge: string | null;
  rating: number;
  popular: boolean;
  active: boolean;
  category: string | null;
  categoryName: string | null;
  createdAt?: string;
};

export type Category = { id: number; slug: string; name: string };

export type HeroSlide = {
  eyebrow: string;
  title: string;
  subtitle: string;
  note: string;
  price: number;
  image: string;
};

export type Deal = {
  title: string;
  subtitle: string;
  description: string;
  comboPrice: number;
  originalPrice: number;
  freeDelivery: boolean;
  endsAt: string;
};

export type Settings = {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  deliveryFee: number;
  freeDeliveryOver: number;
  taxRate: number;
  social: { facebook: string; instagram: string; twitter: string; tiktok: string };
  hero: HeroSlide[];
  deal: Deal;
};

export type Review = {
  id: number;
  name: string;
  rating: number;
  body: string;
  created_at: string;
  approved?: boolean;
};

export type OrderItem = {
  id: number;
  productId: number | null;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: number;
  orderNumber: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  customer: { name: string; phone: string; email: string; address: string; notes: string };
  couponCode: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

export type User = { id: number; name: string; email: string; phone?: string | null; role: string };
