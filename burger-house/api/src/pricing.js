import crypto from 'node:crypto';
import { query, DEFAULT_SETTINGS } from './db.js';

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
];

export const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export async function loadSettings() {
  const { rows } = await query('SELECT data FROM settings WHERE id = 1');
  const stored = rows[0]?.data || {};
  return { ...DEFAULT_SETTINGS, ...stored, social: { ...DEFAULT_SETTINGS.social, ...(stored.social || {}) } };
}

export function publicSettings(settings) {
  return {
    name: settings.name,
    tagline: settings.tagline,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    hours: settings.hours,
    deliveryFee: Number(settings.deliveryFee),
    freeDeliveryOver: Number(settings.freeDeliveryOver),
    taxRate: Number(settings.taxRate),
    social: settings.social,
    hero: settings.hero,
    deal: settings.deal,
  };
}

export async function findCoupon(code) {
  if (!code) return null;
  const { rows } = await query(
    'SELECT code, kind, value, min_subtotal FROM coupons WHERE active = true AND upper(code) = upper($1)',
    [String(code).trim()]
  );
  return rows[0] || null;
}

export function couponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (subtotal < Number(coupon.min_subtotal)) return 0;
  const raw = coupon.kind === 'percent' ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  return round(Math.min(raw, subtotal));
}

export function customerUnitPrice(product) {
  const discount = Math.min(Math.max(Number(product.discount_percent) || 0, 0), 90);
  return round(Number(product.price) * (1 - discount / 100));
}

export function computeTotals({ items, settings, coupon }) {
  const subtotal = round(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  const discount = couponDiscount(coupon, subtotal);
  const deliveryFee =
    subtotal === 0 || subtotal >= Number(settings.freeDeliveryOver) ? 0 : round(settings.deliveryFee);
  const tax = round(Math.max(subtotal - discount, 0) * Number(settings.taxRate || 0));
  const total = round(Math.max(subtotal - discount, 0) + deliveryFee + tax);
  return { subtotal, discount, deliveryFee, tax, total };
}

export async function makeOrderNumber() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = crypto.randomInt(0, 36 ** 5).toString(36).toUpperCase().padStart(5, '0');
    const candidate = `BH-${suffix}`;
    const { rows } = await query('SELECT 1 FROM orders WHERE order_number = $1', [candidate]);
    if (rows.length === 0) return candidate;
  }
  return `BH-${Date.now().toString(36).toUpperCase()}`;
}

export function serializeOrder(row, items = []) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] || row.status,
    paymentMethod: row.payment_method,
    customer: {
      name: row.customer_name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
    },
    couponCode: row.coupon_code,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    discount: Number(row.discount),
    tax: Number(row.tax),
    total: Number(row.total),
    createdAt: row.created_at,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.name,
      image: item.image,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
    })),
  };
}

export function serializeProduct(row) {
  const price = Number(row.price);
  const discountPercent = Number(row.discount_percent) || 0;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price,
    finalPrice: customerUnitPrice(row),
    discountPercent,
    image: row.image,
    badge: row.badge || null,
    rating: Number(row.rating),
    popular: row.popular,
    active: row.active,
    category: row.category_slug || null,
    categoryName: row.category_name || null,
    createdAt: row.created_at,
  };
}
