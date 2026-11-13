export type Role = 'customer' | 'cashier' | 'manager' | 'super_admin';

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
  timezone?: string;
  currency?: string;
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
  paymentStatus?: string;
  channel?: string;
  cashierName?: string | null;
  cancelReason?: string | null;
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

export type User = {
  id: number;
  name: string;
  email: string;
  username?: string | null;
  phone?: string | null;
  role: Role | string;
  status?: string;
  last_login_at?: string | null;
  created_at?: string;
  two_factor_enabled?: boolean;
};

export type PanelState = {
  panel: 'manager' | 'cashier';
  locked: boolean;
  mode: 'auto' | 'locked' | 'unlocked' | 'emergency';
  reason: string | null;
  timezone: string;
  scheduleEnabled: boolean;
  enabled: boolean;
  opensAt: string | null;
  closesAt: string | null;
  hours: string | null;
  updatedAt?: string | null;
};

export type PanelSchedule = {
  id: number;
  panel_name: 'manager' | 'cashier';
  is_enabled: boolean;
  schedule_enabled: boolean;
  lock_time: string;
  unlock_time: string;
  selected_days: number[];
  windows: { days: number[]; start: string; end: string }[];
  timezone: string;
  updated_at: string;
};

export type ActivityLog = {
  id: number;
  user_id: number | null;
  actor_name: string;
  actor_role: string;
  action: string;
  detail: string;
  ip: string | null;
  user_email?: string | null;
  created_at: string;
};

export type InventoryItem = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  threshold: number;
  updated_at: string;
};

export type InventoryLog = {
  id: number;
  item_id: number;
  item_name: string;
  user_name: string | null;
  change: number;
  quantity_after: number;
  note: string;
  created_at: string;
};
