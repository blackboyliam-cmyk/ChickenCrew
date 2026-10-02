export type ImageRef = {
  url: string;
  alt: string;
};

export type Variant = {
  id: string;
  label: string;
  sku: string;
  price: number;
  mrp: number;
  stock: number;
  active: boolean;
  minQty: number;
  maxQty: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string;
  storage: string;
  preparation: string;
  categoryId: string;
  images: ImageRef[];
  featured: boolean;
  active: boolean;
  variants: Variant[];
  createdAt: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  image: string;
  imageAlt: string;
  sort: number;
  active: boolean;
};

export type Offer = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
  price: number | null;
  mrp: number | null;
  active: boolean;
  sort: number;
};

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  usedBy: string[];
  phones: string[];
  expiresAt: string | null;
  active: boolean;
};

export type SlotTemplate = {
  id: string;
  start: string;
  end: string;
  label: string;
  capacity: number;
  cutoffMinutes: number;
  active: boolean;
  days: number[];
};

export type AddressLabel = "home" | "work" | "other";

export type Address = {
  id: string;
  userId: string;
  label: AddressLabel;
  name: string;
  phone: string;
  house: string;
  building: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  /** Pinned on the map at checkout; riders navigate here. */
  lat?: number;
  lng?: number;
};

export type User = {
  id: string;
  name: string;
  /** Empty for accounts created with Google sign-in. */
  phone: string;
  email: string;
  googleId?: string;
  savedProductIds: string[];
  createdAt: string;
};

export type Rider = {
  id: string;
  name: string;
  phone: string;
  /** scrypt salt and hash, hex, joined with ":". */
  pinHash: string;
  active: boolean;
  createdAt: string;
};

export type RiderLocation = {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  at: string;
};

export type Collection = {
  amount: number;
  mode: "cash" | "upi";
  /** Null when the shop collected it directly. */
  riderId: string | null;
  at: string;
  /** Set once the cash reaches the shop. UPI goes straight to the shop, so it is settled immediately. */
  settledAt: string | null;
};

export type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  qty: number;
};

export type Cart = {
  id: string;
  userId: string | null;
  items: CartItem[];
  updatedAt: string;
};

export type OrderItem = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  weight: string;
  qty: number;
  unitPrice: number;
  mrp: number;
  image: string | null;
};

export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "razorpay";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refund_pending" | "refunded";

export type Order = {
  id: string;
  number: string;
  userId: string;
  phone: string;
  email: string;
  items: OrderItem[];
  address: Omit<Address, "id" | "userId">;
  slot: { date: string; label: string; templateId: string };
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: OrderStatus;
  inventoryHeld: boolean;
  couponHeld: boolean;
  idempotencyKey?: string;
  cancelReason?: string;
  riderId?: string | null;
  /** The customer reads this to the rider at the door. Older orders have none. */
  deliveryCode?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  collection?: Collection | null;
  createdAt: string;
  updatedAt: string;
};

export type Faq = { q: string; a: string };

export type ShopSettings = {
  name: string;
  brand: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  addressLine: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  hours: string;
  mapUrl: string;
  about: string;
  servicePincodes: string[];
  deliveryFee: number;
  freeDeliveryAbove: number | null;
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
  starterCatalogue: boolean;
  /** Printed on bills when set. */
  gstin: string;
  fssai: string;
  policies: {
    privacy: string;
    terms: string;
    refund: string;
    shipping: string;
  };
  extraFaqs: Faq[];
};

export type OtpRecord = {
  phone: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
};

export type AnalyticsEvent = {
  id: string;
  event: string;
  props: Record<string, string | number | boolean | null>;
  at: string;
};

export type Booking = {
  date: string;
  templateId: string;
  count: number;
};

export type PaymentRecord = {
  id: string;
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  status: string;
  createdAt: string;
};

export type DB = {
  schemaVersion: number;
  settings: ShopSettings;
  categories: Category[];
  products: Product[];
  offers: Offer[];
  coupons: Coupon[];
  slots: SlotTemplate[];
  users: User[];
  addresses: Address[];
  carts: Cart[];
  orders: Order[];
  otps: OtpRecord[];
  orderSeq: number;
  analytics: AnalyticsEvent[];
  bookings: Booking[];
  payments: PaymentRecord[];
  riders: Rider[];
};

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  imageAlt: string;
  weightLabel: string;
  price: number;
  mrp: number;
  discountPercent: number;
  inStock: boolean;
  featured: boolean;
  categorySlug: string;
  categoryName: string;
  defaultVariantId: string | null;
  variants: CardVariant[];
};

export type CardVariant = {
  id: string;
  label: string;
  price: number;
  mrp: number;
  inStock: boolean;
  /** Most packs of this weight one order can take (stock and per-order limit). */
  maxQty: number;
};

export type CartLine = {
  id: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  weight: string;
  qty: number;
  unitPrice: number;
  mrp: number;
  lineTotal: number;
  image: string | null;
  imageAlt: string;
  stock: number;
  minQty: number;
  maxQty: number;
  inStock: boolean;
  message: string | null;
};

export type CartView = {
  id: string;
  items: CartLine[];
  subtotal: number;
  count: number;
  warnings: string[];
};

export type PublicSettings = ShopSettings & {
  razorpayKeyId: string | null;
  onlineReady: boolean;
  googleSignIn: boolean;
};

export type DeliverySlotOption = {
  id: string;
  date: string;
  dayLabel: string;
  label: string;
  start: string;
  end: string;
  remaining: number;
};

export const ANALYTICS_EVENTS = [
  "page_view",
  "product_view",
  "search",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "coupon_applied",
  "payment_started",
  "purchase",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];
