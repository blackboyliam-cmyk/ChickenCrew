import "server-only";

import { AsyncLocalStorage } from "async_hooks";
import { randomInt, randomUUID } from "crypto";
import { loadSnapshot, saveEvents, saveSnapshot, usingMongo } from "./db-backend";
import { ApiError } from "./errors";
import { optimizeImage } from "./images";
import { hashPin, verifyPin } from "./pin";
import { formatINR, rupeesToPaise } from "./money";
import { computeDeliveryFee, discountPercent, evaluateCoupon, isSlotBookable } from "./pricing";
import { parseGrams } from "./weights";
import {
  addDaysKey,
  dayLabel,
  formatSlotLabel,
  kolkataParts,
  parseHHMM,
  todayKey,
  weekdayOfKey,
} from "./time";
import type {
  Address,
  AnalyticsEvent,
  AnalyticsEventName,
  Cart,
  CartView,
  Category,
  Coupon,
  DB,
  DeliverySlotOption,
  Faq,
  Offer,
  Order,
  OrderItem,
  OrderStatus,
  OtpRecord,
  PaymentMethod,
  Product,
  ProductCardData,
  PublicSettings,
  Rider,
  ShopSettings,
  SlotTemplate,
  User,
  Variant,
} from "./types";
import { ANALYTICS_EVENTS } from "./types";
import {
  asNonNegativeInt,
  asPositiveInt,
  cleanText,
  isEmail,
  isIndianMobile,
  isPincode,
  normalizeMobile,
} from "./validators";

const RESERVE_MS = 20 * 60 * 1000;
const PAGE_SIZE_MAX = 48;

const SAVE_ATTEMPTS = 5;

type RequestDb = {
  db: DB;
  dirty: boolean;
  checked: boolean;
  events: AnalyticsEvent[];
  afterSave: (() => Promise<void>)[];
};

const requestDb = new AsyncLocalStorage<RequestDb>();

/**
 * Loads the shop once, runs `fn` against it, and saves once at the end if anything changed.
 * If another request saved in between, the work is re-run on the fresh data.
 */
export async function withDb<T>(fn: () => T | Promise<T>): Promise<T> {
  if (requestDb.getStore()) return fn();
  for (let attempt = 0; attempt < SAVE_ATTEMPTS; attempt += 1) {
    const snapshot = await loadSnapshot();
    const scope: RequestDb = {
      db: normalizeDb(snapshot.db),
      dirty: false,
      checked: false,
      events: [],
      afterSave: [],
    };
    const result = await requestDb.run(scope, fn);
    if (scope.dirty && !(await saveSnapshot(scope.db, snapshot.version))) continue;
    await saveEvents(scope.events);
    for (const task of scope.afterSave) await task();
    return result;
  }
  throw new ApiError(503, "The shop is busy right now. Please try again.");
}

/** Side effects that must not repeat when withDb retries, e.g. sending an SMS. */
export function afterSave(task: () => Promise<void>) {
  currentScope().afterSave.push(task);
}

function currentScope(): RequestDb {
  const scope = requestDb.getStore();
  if (!scope) throw new Error("Shop data was used outside withDb().");
  return scope;
}

function normalizeDb(db: DB): DB {
  if (!db.schemaVersion) db.schemaVersion = 1;
  db.bookings ||= [];
  db.payments ||= [];
  db.analytics ||= [];
  db.riders ||= [];
  db.settings.gstin ??= "";
  db.settings.fssai ??= "";
  db.otps = (db.otps || [])
    .map((otp) => {
      const legacy = otp as OtpRecord & { phone?: string };
      const target = legacy.target || legacy.phone || "";
      return target ? { target, codeHash: otp.codeHash, expiresAt: otp.expiresAt, attempts: otp.attempts || 0 } : null;
    })
    .filter((otp): otp is OtpRecord => Boolean(otp));
  for (const user of db.users) {
    user.emailVerified ??= Boolean(user.googleId && user.email);
  }
  return db;
}

function readDb(): DB {
  const scope = currentScope();
  if (!scope.checked) {
    scope.checked = true;
    const before = scope.db.orders.map((order) => order.status).join("|");
    releaseExpired(scope.db);
    const after = scope.db.orders.map((order) => order.status).join("|");
    if (before !== after) scope.dirty = true;
  }
  return scope.db;
}

/** Runs `fn` on a copy so a thrown error leaves the request's data untouched. */
function update<T>(fn: (db: DB) => T): T {
  const scope = currentScope();
  const draft = structuredClone(readDb());
  const result = fn(draft);
  scope.db = draft;
  scope.dirty = true;
  return result;
}

function releaseExpired(db: DB, now = Date.now()) {
  for (const order of db.orders) {
    if (order.status !== "pending_payment") continue;
    if (now - new Date(order.createdAt).getTime() < RESERVE_MS) continue;
    restoreInventory(db, order);
    restoreCoupon(db, order);
    order.status = "cancelled";
    order.paymentStatus = "failed";
    order.cancelReason = "Payment was not completed.";
    order.updatedAt = new Date(now).toISOString();
  }
}

function restoreInventory(db: DB, order: Order) {
  if (!order.inventoryHeld) return;
  for (const item of order.items) {
    const product = db.products.find((entry) => entry.id === item.productId);
    const variant = product?.variants.find((entry) => entry.id === item.variantId);
    if (variant) variant.stock += item.qty;
  }
  const booking = db.bookings.find(
    (entry) => entry.date === order.slot.date && entry.templateId === order.slot.templateId,
  );
  if (booking) booking.count = Math.max(0, booking.count - 1);
  order.inventoryHeld = false;
}

function restoreCoupon(db: DB, order: Order) {
  if (!order.couponHeld || !order.couponCode) return;
  const coupon = db.coupons.find((entry) => entry.code === order.couponCode);
  if (coupon) {
    coupon.usedCount = Math.max(0, coupon.usedCount - 1);
    coupon.usedBy = coupon.usedBy.filter((phone) => phone !== order.phone);
  }
  order.couponHeld = false;
}

function holdInventory(db: DB, order: Order) {
  for (const item of order.items) {
    const product = db.products.find((entry) => entry.id === item.productId);
    const variant = product?.variants.find((entry) => entry.id === item.variantId);
    if (!variant || variant.stock < item.qty) {
      throw new ApiError(409, `Only ${variant?.stock ?? 0} units of ${item.name} are currently available.`);
    }
    variant.stock -= item.qty;
  }
  const booking = db.bookings.find(
    (entry) => entry.date === order.slot.date && entry.templateId === order.slot.templateId,
  );
  if (booking) booking.count += 1;
  else db.bookings.push({ date: order.slot.date, templateId: order.slot.templateId, count: 1 });
  order.inventoryHeld = true;
}

function publicSettings(settings: ShopSettings): PublicSettings {
  const key = process.env.RAZORPAY_KEY_ID || null;
  const secret = process.env.RAZORPAY_KEY_SECRET || null;
  const onlineReady = Boolean(settings.onlinePaymentEnabled && key && secret);
  const googleSignIn = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return { ...settings, razorpayKeyId: onlineReady ? key : null, onlineReady, googleSignIn };
}

export function getPublicSettings(): PublicSettings {
  return publicSettings(readDb().settings);
}

export function getSettingsAdmin(): ShopSettings {
  return readDb().settings;
}

function categoryById(db: DB, id: string) {
  return db.categories.find((category) => category.id === id);
}

function preferredVariant(product: Product): Variant | null {
  const active = product.variants.filter((variant) => variant.active);
  const inStock = active.filter((variant) => variant.stock > 0);
  const pool = (inStock.length ? inStock : active).slice();
  if (!pool.length) return null;
  return (
    pool.find((variant) => variant.label === "500g") ||
    pool.find((variant) => variant.label === "1 kg") ||
    pool.sort((a, b) => a.price - b.price)[0]
  );
}

export function toCard(db: DB, product: Product): ProductCardData {
  const category = categoryById(db, product.categoryId);
  const variant = preferredVariant(product);
  const image = product.images[0];
  const inStock = product.active && product.variants.some((item) => item.active && item.stock > 0);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: image ? optimizeImage(image.url, 800) : null,
    imageAlt: image?.alt || product.name,
    weightLabel: variant?.label || "",
    price: variant?.price || 0,
    mrp: variant?.mrp || 0,
    discountPercent: variant ? discountPercent(variant.price, variant.mrp) : 0,
    inStock,
    featured: product.featured,
    categorySlug: category?.slug || "",
    categoryName: category?.name || "",
    defaultVariantId: variant?.id || null,
    variants: product.variants
      .filter((item) => item.active)
      .sort((a, b) => labelGrams(a.label) - labelGrams(b.label) || a.price - b.price)
      .map((item) => ({
        id: item.id,
        label: item.label,
        price: item.price,
        mrp: item.mrp,
        inStock: item.stock > 0,
        maxQty: Math.max(0, Math.min(item.maxQty, item.stock)),
      })),
  };
}

function labelGrams(label: string) {
  return parseGrams(label) ?? Number.MAX_SAFE_INTEGER;
}

export function listCategories() {
  const db = readDb();
  return db.categories
    .filter((category) => category.active)
    .sort((a, b) => a.sort - b.sort)
    .map((category) => ({
      ...category,
      image: optimizeImage(category.image, 800),
      productCount:
        category.slug === "offers"
          ? db.products.filter((product) => product.active && product.variants.some((variant) => discountPercent(variant.price, variant.mrp) > 0)).length
          : db.products.filter((product) => product.active && product.categoryId === category.id).length,
    }));
}

export function listWeights(): string[] {
  const db = readDb();
  const labels = new Set<string>();
  for (const product of db.products) {
    if (!product.active) continue;
    for (const variant of product.variants) if (variant.active) labels.add(variant.label);
  }
  return [...labels].sort((a, b) => labelGrams(a) - labelGrams(b));
}

export type ProductQuery = {
  q?: string;
  category?: string;
  min?: string;
  max?: string;
  available?: string;
  weight?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

export function listProducts(query: ProductQuery = {}) {
  const db = readDb();
  const q = (query.q || "").trim().toLowerCase();
  const min = query.min ? rupeesToPaise(Number(query.min)) : null;
  const max = query.max ? rupeesToPaise(Number(query.max)) : null;
  const availableOnly = query.available === "1" || query.available === "true";
  const weight = (query.weight || "").trim().toLowerCase();
  const category = db.categories.find((item) => item.slug === query.category);
  let products = db.products.filter((product) => product.active);

  if (query.category === "offers") {
    products = products.filter((product) => product.variants.some((variant) => discountPercent(variant.price, variant.mrp) > 0));
  } else if (query.category) {
    if (!category) return { items: [], total: 0, page: 1, pageSize: PAGE_SIZE_MAX };
    products = products.filter((product) => product.categoryId === category.id);
  }
  if (q) {
    products = products.filter((product) => {
      const cat = categoryById(db, product.categoryId);
      const hay = `${product.name} ${product.description} ${cat?.name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if (weight) {
    products = products.filter((product) =>
      product.variants.some((variant) => variant.active && variant.label.toLowerCase() === weight),
    );
  }

  let cards = products.map((product) => toCard(db, product));
  if (availableOnly) cards = cards.filter((card) => card.inStock);
  if (min != null && Number.isFinite(min)) cards = cards.filter((card) => card.price >= min);
  if (max != null && Number.isFinite(max)) cards = cards.filter((card) => card.price <= max);

  const sort = query.sort || "popular";
  cards.sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "newest") return b.slug.localeCompare(a.slug);
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  if (sort === "newest") {
    cards.sort((a, b) => {
      const ap = db.products.find((product) => product.id === a.id)!;
      const bp = db.products.find((product) => product.id === b.id)!;
      return bp.createdAt.localeCompare(ap.createdAt);
    });
  }

  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number(query.pageSize) || 24));
  const page = Math.max(1, Number(query.page) || 1);
  const total = cards.length;
  const items = cards.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize };
}

export function listFeatured() {
  const db = readDb();
  return db.products
    .filter((product) => product.active && product.featured)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => toCard(db, product));
}

export function getProduct(slug: string) {
  const db = readDb();
  const product = db.products.find((item) => item.slug === slug && item.active);
  if (!product) throw new ApiError(404, "We could not find that product.");
  const category = categoryById(db, product.categoryId);
  const related = db.products
    .filter((item) => item.active && item.categoryId === product.categoryId && item.id !== product.id)
    .slice(0, 4)
    .map((item) => toCard(db, item));
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    details: product.details,
    storage: product.storage,
    preparation: product.preparation,
    featured: product.featured,
    category: category ? { slug: category.slug, name: category.name } : null,
    images: product.images.map((image) => ({ url: optimizeImage(image.url, 1400), alt: image.alt })),
    variants: product.variants
      .filter((variant) => variant.active)
      .map((variant) => ({
        id: variant.id,
        label: variant.label,
        sku: variant.sku,
        price: variant.price,
        mrp: variant.mrp,
        stock: variant.stock,
        inStock: variant.stock > 0,
        minQty: variant.minQty,
        maxQty: Math.min(variant.maxQty, variant.stock),
        discountPercent: discountPercent(variant.price, variant.mrp),
      })),
    related,
    reviewCount: 0,
  };
}

export function listOffers() {
  return readDb()
    .offers.filter((offer) => offer.active)
    .sort((a, b) => a.sort - b.sort)
    .map((offer) => ({
      ...offer,
      image: optimizeImage(offer.image, 1200),
      discountPercent: offer.price != null && offer.mrp != null ? discountPercent(offer.price, offer.mrp) : 0,
    }));
}

export function buildFaqs(settings: PublicSettings, slotLabels: string[]): Faq[] {
  const feeLine =
    settings.freeDeliveryAbove != null
      ? `Delivery is ${formatINR(settings.deliveryFee)} below ${formatINR(settings.freeDeliveryAbove)}, and free at or above that.`
      : `Delivery is ${formatINR(settings.deliveryFee)}.`;
  const slots = slotLabels.length
    ? `Published slots: ${slotLabels.join(", ")}.`
    : "The shop has not published delivery slots yet.";
  const area = settings.servicePincodes.length
    ? `Current delivery pincodes: ${settings.servicePincodes.join(", ")}.`
    : "Any Indian pincode can be used until the shop publishes its delivery list.";
  const payment = [
    settings.onlineReady
      ? "Yes. Online payment is confirmed only after the server verifies the payment gateway."
      : "Online payment is not available until the shop connects its payment gateway.",
    settings.codEnabled ? "Cash on delivery is available." : "",
  ]
    .filter(Boolean)
    .join(" ");
  const contact = settings.phone
    ? `Call ${settings.phone}${settings.whatsapp ? ` or WhatsApp ${settings.whatsapp}` : ""}.`
    : "Phone and WhatsApp appear on the contact page once the shop adds them.";
  return [
    {
      q: "How do I place an order?",
      a: "Pick a cut and weight, add it to your cart, enter a delivery address inside the service area, choose a slot, and place the order. You will be asked to log in with your mobile number before the order is placed.",
    },
    { q: "What delivery slots are available?", a: `${slots} ${feeLine}` },
    { q: "Do you accept online payments?", a: payment },
    {
      q: "Can I cancel an order?",
      a: "You can cancel on the order page while it is still placed or confirmed, and before the slot cutoff. Once preparation has started, online cancellation closes.",
    },
    {
      q: "How is the chicken packed?",
      a: "Orders are packed for the delivery slot you choose. Keep the pack refrigerated and cook it the same day.",
    },
    { q: "What areas do you deliver to?", a: area },
    { q: "How can I contact the shop?", a: contact },
    ...settings.extraFaqs,
  ];
}

export function getHome() {
  const settings = getPublicSettings();
  const slots = listDeliverySlots().flatMap((group) => group.slots.map((slot) => `${group.label} ${slot.label}`)).slice(0, 4);
  return {
    settings,
    categories: listCategories(),
    featured: listFeatured(),
    offers: listOffers(),
    faqs: buildFaqs(settings, slots),
    delivery: {
      fee: settings.deliveryFee,
      freeAbove: settings.freeDeliveryAbove,
      slotSummary: slots,
      pincodes: settings.servicePincodes,
    },
  };
}

export function listDeliverySlots(now = new Date()): { date: string; label: string; slots: DeliverySlotOption[] }[] {
  const db = readDb();
  const parts = kolkataParts(now);
  const today = todayKey(now);
  const nowMinutes = parts.hour * 60 + parts.minute;
  const groups = [];
  for (let offset = 0; offset < 3; offset += 1) {
    const date = addDaysKey(today, offset);
    const weekday = weekdayOfKey(date);
    const slots: DeliverySlotOption[] = [];
    for (const template of db.slots) {
      const start = parseHHMM(template.start);
      if (start == null) continue;
      const booked = db.bookings.find((booking) => booking.date === date && booking.templateId === template.id)?.count || 0;
      if (
        !isSlotBookable({
          active: template.active,
          days: template.days,
          weekday,
          dateKey: date,
          todayKey: today,
          nowMinutes,
          startMinutes: start,
          cutoffMinutes: template.cutoffMinutes,
          booked,
          capacity: template.capacity,
        })
      ) {
        continue;
      }
      slots.push({
        id: template.id,
        date,
        dayLabel: dayLabel(date, today),
        label: template.label,
        start: template.start,
        end: template.end,
        remaining: template.capacity - booked,
      });
    }
    if (slots.length) groups.push({ date, label: dayLabel(date, today), slots });
  }
  return groups;
}

function servesPincode(settings: { servicePincodes: string[] }, pincode: string) {
  if (!settings.servicePincodes.length) return true;
  return settings.servicePincodes.includes(pincode);
}

export function checkPincode(pincode: string) {
  if (!isPincode(pincode)) throw new ApiError(400, "Enter a 6-digit pincode.");
  const settings = getPublicSettings();
  if (!servesPincode(settings, pincode)) {
    return { ok: false, pincode, message: "We're not delivering to this location yet." };
  }
  return { ok: true, pincode, message: `Delivering to ${pincode}` };
}

function findCart(db: DB, cartId: string | null): Cart | null {
  if (!cartId) return null;
  return db.carts.find((cart) => cart.id === cartId) || null;
}

function viewCart(db: DB, cart: Cart): CartView {
  const warnings: string[] = [];
  const items = cart.items.flatMap((item) => {
    const product = db.products.find((entry) => entry.id === item.productId);
    const variant = product?.variants.find((entry) => entry.id === item.variantId);
    if (!product || !product.active || !variant || !variant.active) {
      warnings.push("A product in your cart is no longer available.");
      return [
        {
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          slug: product?.slug || "",
          name: product?.name || "Unavailable product",
          weight: variant?.label || "",
          qty: item.qty,
          unitPrice: 0,
          mrp: 0,
          lineTotal: 0,
          image: null,
          imageAlt: "",
          stock: 0,
          minQty: 1,
          maxQty: 0,
          inStock: false,
          message: "This product is no longer available.",
        },
      ];
    }
    const maxQty = Math.min(variant.maxQty, variant.stock);
    let message: string | null = null;
    if (variant.stock <= 0) message = "Out of stock.";
    else if (item.qty > variant.stock) message = `Only ${variant.stock} units are currently available.`;
    return [
      {
        id: item.id,
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        weight: variant.label,
        qty: item.qty,
        unitPrice: variant.price,
        mrp: variant.mrp,
        lineTotal: variant.price * item.qty,
        image: product.images[0] ? optimizeImage(product.images[0].url, 400) : null,
        imageAlt: product.images[0]?.alt || product.name,
        stock: variant.stock,
        minQty: variant.minQty,
        maxQty,
        inStock: variant.stock > 0,
        message,
      },
    ];
  });
  const subtotal = items.reduce((sum, item) => sum + (item.inStock ? item.lineTotal : 0), 0);
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  return { id: cart.id, items, subtotal, count, warnings };
}

export function getCart(cartId: string | null): CartView {
  const db = readDb();
  const cart = findCart(db, cartId);
  if (!cart) return { id: cartId || "", items: [], subtotal: 0, count: 0, warnings: [] };
  return viewCart(db, cart);
}

export function ensureCart(cartId: string | null, userId: string | null): CartView {
  return update((db) => {
    let cart = findCart(db, cartId);
    if (!cart) {
      cart = { id: randomUUID(), userId, items: [], updatedAt: new Date().toISOString() };
      db.carts.push(cart);
    } else if (userId && !cart.userId) {
      cart.userId = userId;
    }
    return viewCart(db, cart);
  });
}

export function mergeCarts(guestCartId: string | null, userId: string): string {
  return update((db) => {
    const userCart =
      db.carts.find((cart) => cart.userId === userId) ||
      ({ id: randomUUID(), userId, items: [], updatedAt: new Date().toISOString() } as Cart);
    if (!db.carts.includes(userCart)) db.carts.push(userCart);
    const guest = guestCartId ? db.carts.find((cart) => cart.id === guestCartId && cart.id !== userCart.id) : null;
    if (guest) {
      for (const item of guest.items) {
        const existing = userCart.items.find((entry) => entry.variantId === item.variantId);
        if (existing) existing.qty += item.qty;
        else userCart.items.push({ ...item, id: randomUUID() });
      }
      db.carts = db.carts.filter((cart) => cart.id !== guest.id);
    }
    userCart.updatedAt = new Date().toISOString();
    return userCart.id;
  });
}

function mutateCart(cartId: string, fn: (db: DB, cart: Cart) => void): CartView {
  return update((db) => {
    const cart = findCart(db, cartId);
    if (!cart) throw new ApiError(404, "Your cart could not be found.");
    fn(db, cart);
    cart.updatedAt = new Date().toISOString();
    return viewCart(db, cart);
  });
}

function assertQtyAllowed(nextQty: number, variant: Variant) {
  if (nextQty > variant.stock && variant.stock <= variant.maxQty) {
    throw new ApiError(409, `Only ${variant.stock} units are currently available.`);
  }
  if (nextQty > variant.maxQty) {
    throw new ApiError(400, `You can add up to ${variant.maxQty} of this cut.`);
  }
  if (nextQty > variant.stock) {
    throw new ApiError(409, `Only ${variant.stock} units are currently available.`);
  }
  if (nextQty < variant.minQty) throw new ApiError(400, `Minimum quantity is ${variant.minQty}.`);
}

export function addToCart(cartId: string, productId: string, variantId: string, qty: number): CartView {
  const amount = asPositiveInt(qty);
  if (!amount) throw new ApiError(400, "Quantity must be a positive number.");
  return mutateCart(cartId, (db, cart) => {
    const product = db.products.find((item) => item.id === productId && item.active);
    const variant = product?.variants.find((item) => item.id === variantId && item.active);
    if (!product || !variant) throw new ApiError(404, "That product is not available.");
    if (variant.stock <= 0) throw new ApiError(409, "Out of stock.");
    const existing = cart.items.find((item) => item.variantId === variantId);
    const nextQty = (existing?.qty || 0) + amount;
    assertQtyAllowed(nextQty, variant);
    if (existing) existing.qty = nextQty;
    else cart.items.push({ id: randomUUID(), productId, variantId, qty: nextQty });
  });
}

export function setCartQty(cartId: string, itemId: string, qty: number): CartView {
  return mutateCart(cartId, (db, cart) => {
    const item = cart.items.find((entry) => entry.id === itemId);
    if (!item) throw new ApiError(404, "That item is not in your cart.");
    if (qty <= 0) {
      cart.items = cart.items.filter((entry) => entry.id !== itemId);
      return;
    }
    const amount = asPositiveInt(qty);
    if (!amount) throw new ApiError(400, "Quantity must be a positive number.");
    const product = db.products.find((entry) => entry.id === item.productId);
    const variant = product?.variants.find((entry) => entry.id === item.variantId);
    if (!product || !product.active || !variant || !variant.active) {
      throw new ApiError(409, "This product is no longer available.");
    }
    assertQtyAllowed(amount, variant);
    item.qty = amount;
  });
}

export function removeCartItem(cartId: string, itemId: string): CartView {
  return setCartQty(cartId, itemId, 0);
}

export function quoteCoupon(code: string, subtotal: number, phone: string | null) {
  const db = readDb();
  const coupon = db.coupons.find((item) => item.code === code.trim().toUpperCase());
  if (!coupon) return { ok: false as const, message: "Invalid coupon." };
  const result = evaluateCoupon(coupon, subtotal, phone);
  if (!result.ok) return result;
  return { ok: true as const, code: coupon.code, discount: result.discount, message: `You saved ${formatINR(result.discount)}` };
}

export type AddressInput = {
  label?: string;
  name?: string;
  phone?: string;
  house?: string;
  building?: string;
  street?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: unknown;
  lng?: unknown;
};

function parsePin(lat: unknown, lng: unknown) {
  const la = Number(lat);
  const ln = Number(lng);
  if (lat == null || lng == null || lat === "" || lng === "") return null;
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return { lat: Math.round(la * 1e6) / 1e6, lng: Math.round(ln * 1e6) / 1e6 };
}

export function parseAddress(input: AddressInput, fallbackPhone = ""): Omit<Address, "id" | "userId"> {
  const phone = normalizeMobile(String(input.phone || fallbackPhone || ""));
  if (!isIndianMobile(phone)) throw new ApiError(400, "Enter a valid Indian mobile number.");
  const pincode = cleanText(input.pincode, 6);
  if (!isPincode(pincode)) throw new ApiError(400, "Enter a 6-digit pincode.");
  const label = input.label === "work" || input.label === "other" ? input.label : "home";
  const name = cleanText(input.name, 80);
  if (name.length < 2) throw new ApiError(400, "Enter the full name for this address.");
  const house = cleanText(input.house, 80);
  const street = cleanText(input.street, 120);
  const area = cleanText(input.area, 80);
  const city = cleanText(input.city, 80);
  const state = cleanText(input.state, 80);
  if (!house || !area || !city) {
    throw new ApiError(400, "House, area, and city are required.");
  }
  const pin = parsePin(input.lat, input.lng);
  return {
    label,
    name,
    phone,
    house,
    building: cleanText(input.building, 80),
    street,
    area,
    landmark: cleanText(input.landmark, 80),
    city,
    state,
    pincode,
    lat: pin?.lat,
    lng: pin?.lng,
  };
}

export function listAddresses(userId: string) {
  return readDb().addresses.filter((address) => address.userId === userId);
}

export function createAddress(userId: string, input: AddressInput) {
  return update((db) => {
    const address: Address = { id: randomUUID(), userId, ...parseAddress(input) };
    db.addresses.push(address);
    return address;
  });
}

export function updateAddress(userId: string, id: string, input: AddressInput) {
  return update((db) => {
    const address = db.addresses.find((item) => item.id === id && item.userId === userId);
    if (!address) throw new ApiError(404, "Address not found.");
    Object.assign(address, parseAddress(input));
    return address;
  });
}

export function deleteAddress(userId: string, id: string) {
  return update((db) => {
    const before = db.addresses.length;
    db.addresses = db.addresses.filter((item) => !(item.id === id && item.userId === userId));
    if (db.addresses.length === before) throw new ApiError(404, "Address not found.");
    return { ok: true };
  });
}

export function getUser(id: string): User | null {
  return readDb().users.find((user) => user.id === id) || null;
}

export function getUserByPhone(phone: string): User | null {
  return readDb().users.find((user) => user.phone === phone) || null;
}

export function upsertUser(phone: string, name = ""): User {
  return update((db) => {
    const existing = db.users.find((user) => user.phone === phone);
    if (existing) {
      if (!existing.name && name) existing.name = name;
      return existing;
    }
    const user: User = {
      id: randomUUID(),
      name,
      phone,
      email: "",
      savedProductIds: [],
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return user;
  });
}

/**
 * Accounts are matched on the Google account id only. Emails typed into a profile are not
 * verified, so matching on email would let someone claim another person's Google sign-in.
 */
export function upsertGoogleUser(profile: { sub: string; email: string; name: string }): User {
  return update((db) => {
    const existing =
      db.users.find((user) => user.googleId === profile.sub) ||
      db.users.find((user) => user.emailVerified && user.email === profile.email);
    if (existing) {
      existing.googleId ||= profile.sub;
      existing.emailVerified = true;
      if (!existing.name) existing.name = cleanText(profile.name, 80);
      if (!existing.email) existing.email = profile.email;
      return existing;
    }
    const user: User = {
      id: randomUUID(),
      name: cleanText(profile.name, 80),
      phone: "",
      email: profile.email,
      googleId: profile.sub,
      emailVerified: true,
      savedProductIds: [],
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return user;
  });
}

/**
 * Email OTP only opens accounts that already proved this inbox (email OTP or Google).
 * A phone account that typed the same address into the profile is not a match.
 */
export function upsertEmailUser(email: string, name = ""): User {
  return update((db) => {
    const existing = db.users.find((user) => user.email === email && (user.emailVerified || user.googleId));
    if (existing) {
      existing.emailVerified = true;
      if (!existing.name && name) existing.name = name;
      return existing;
    }
    const user: User = {
      id: randomUUID(),
      name,
      phone: "",
      email,
      emailVerified: true,
      savedProductIds: [],
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return user;
  });
}

export function updateProfile(userId: string, input: { name?: string; email?: string }) {
  return update((db) => {
    const user = db.users.find((item) => item.id === userId);
    if (!user) throw new ApiError(404, "Account not found.");
    const name = cleanText(input.name, 80);
    if (name && name.length < 2) throw new ApiError(400, "Enter your name.");
    if (input.email) {
      const email = cleanText(input.email, 120).toLowerCase();
      if (email && !isEmail(email)) throw new ApiError(400, "Enter a valid email address.");
      if (email !== user.email) {
        user.email = email;
        user.emailVerified = false;
      }
    } else if (input.email === "") {
      user.email = "";
      user.emailVerified = false;
    }
    if (name) user.name = name;
    return publicUser(user);
  });
}

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    savedProductIds: user.savedProductIds,
  };
}

export function toggleSaved(userId: string, productId: string) {
  return update((db) => {
    const user = db.users.find((item) => item.id === userId);
    const product = db.products.find((item) => item.id === productId && item.active);
    if (!user) throw new ApiError(401, "Please log in to continue.");
    if (!product) throw new ApiError(404, "We could not find that product.");
    const has = user.savedProductIds.includes(productId);
    user.savedProductIds = has
      ? user.savedProductIds.filter((id) => id !== productId)
      : [...user.savedProductIds, productId];
    return { saved: !has, savedProductIds: user.savedProductIds };
  });
}

export function listSaved(userId: string) {
  const db = readDb();
  const user = db.users.find((item) => item.id === userId);
  if (!user) return [];
  return user.savedProductIds
    .map((id) => db.products.find((product) => product.id === id && product.active))
    .filter((product): product is Product => Boolean(product))
    .map((product) => toCard(db, product));
}

export function listPublicCoupons(phone: string | null) {
  const now = Date.now();
  return readDb()
    .coupons.filter((coupon) => coupon.active)
    .filter((coupon) => !coupon.expiresAt || new Date(coupon.expiresAt).getTime() > now)
    .filter((coupon) => coupon.phones.length === 0 || (phone && coupon.phones.includes(phone)))
    .map((coupon) => ({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder,
      description:
        coupon.type === "flat"
          ? `${formatINR(coupon.value)} off on orders of ${formatINR(coupon.minOrder)} or more`
          : `${coupon.value}% off on orders of ${formatINR(coupon.minOrder)} or more`,
    }));
}

type CheckoutInput = {
  cartId: string;
  userId: string;
  name: string;
  email?: string;
  address: AddressInput;
  saveAddress?: boolean;
  slotDate: string;
  slotTemplateId: string;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  seenPrices?: Record<string, number>;
  idempotencyKey: string;
};

export function createOrder(input: CheckoutInput): Order {
  return update((db) => {
    const user = db.users.find((item) => item.id === input.userId);
    if (!user) throw new ApiError(401, "Please log in to continue.");
    const existing = db.orders.find((order) => order.userId === user.id && order.idempotencyKey === input.idempotencyKey);
    if (existing) return existing;

    const name = cleanText(input.name, 80);
    if (name.length < 2) throw new ApiError(400, "Enter your full name.");
    const email = cleanText(input.email, 120);
    if (email && !isEmail(email)) throw new ApiError(400, "Enter a valid email address.");
    user.name = name;
    if (email) user.email = email;

    const settings = db.settings;
    const address = parseAddress({ ...input.address, name, phone: input.address.phone || user.phone }, user.phone);
    const buyerPhone = user.phone || address.phone;
    const area = checkAgainst(settings, address.pincode);
    if (!area.ok) throw new ApiError(400, area.message);

    const cart = findCart(db, input.cartId);
    if (!cart || cart.items.length === 0) throw new ApiError(400, "Your cart is empty.");

    const changed: string[] = [];
    const items: OrderItem[] = [];
    for (const line of cart.items) {
      const product = db.products.find((item) => item.id === line.productId);
      const variant = product?.variants.find((item) => item.id === line.variantId);
      if (!product || !product.active || !variant || !variant.active) {
        throw new ApiError(409, `${product?.name || "An item"} is no longer available. Please review your cart.`);
      }
      if (line.qty < variant.minQty) throw new ApiError(400, `Minimum quantity for ${product.name} is ${variant.minQty}.`);
      if (line.qty > variant.maxQty) throw new ApiError(400, `Maximum quantity for ${product.name} is ${variant.maxQty}.`);
      if (line.qty > variant.stock) {
        throw new ApiError(409, `Only ${variant.stock} units of ${product.name} are currently available.`);
      }
      const seen = input.seenPrices?.[variant.id];
      if (typeof seen === "number" && seen !== variant.price) changed.push(product.name);
      items.push({
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        weight: variant.label,
        qty: line.qty,
        unitPrice: variant.price,
        mrp: variant.mrp,
        image: product.images[0]?.url || null,
      });
    }
    if (changed.length) {
      throw new ApiError(
        409,
        `The price of ${changed.join(", ")} has changed. Please review your cart.`,
        "price_changed",
      );
    }

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    let discount = 0;
    let couponCode: string | null = null;
    const code = cleanText(input.couponCode, 30).toUpperCase();
    if (code) {
      const coupon = db.coupons.find((item) => item.code === code);
      if (!coupon) throw new ApiError(400, "Invalid coupon.");
      const result = evaluateCoupon(coupon, subtotal, buyerPhone);
      if (!result.ok) throw new ApiError(400, result.message);
      discount = result.discount;
      couponCode = coupon.code;
      coupon.usedCount += 1;
      coupon.usedBy.push(buyerPhone);
    }

    const payable = subtotal - discount;
    const deliveryFee = computeDeliveryFee(payable, settings);
    const slot = assertSlot(db, input.slotDate, input.slotTemplateId);
    const method = input.paymentMethod;
    if (method === "cod" && !settings.codEnabled) throw new ApiError(400, "Cash on delivery is not available.");
    if (method === "razorpay") {
      const ready = publicSettings(settings).onlineReady;
      if (!ready) throw new ApiError(503, "Online payment is not available right now. You can place the order with cash on delivery.");
    }

    if (input.saveAddress) {
      db.addresses.push({ id: randomUUID(), userId: user.id, ...address });
    }

    const now = new Date().toISOString();
    db.orderSeq += 1;
    const order: Order = {
      id: randomUUID(),
      number: `KCC${db.orderSeq}`,
      userId: user.id,
      phone: buyerPhone,
      email: user.email,
      items,
      address,
      slot,
      subtotal,
      discount,
      deliveryFee,
      total: payable + deliveryFee,
      couponCode,
      paymentMethod: method,
      paymentStatus: "unpaid",
      status: method === "cod" ? "placed" : "pending_payment",
      inventoryHeld: false,
      couponHeld: Boolean(couponCode),
      idempotencyKey: input.idempotencyKey,
      riderId: null,
      deliveryCode: String(randomInt(1000, 10000)),
      collection: null,
      createdAt: now,
      updatedAt: now,
    };
    holdInventory(db, order);
    db.orders.push(order);
    cart.items = [];
    return order;
  });
}

function checkAgainst(settings: ShopSettings, pincode: string) {
  if (!servesPincode(settings, pincode)) {
    return { ok: false, message: "We're not delivering to this location yet." };
  }
  return { ok: true, message: "" };
}

function assertSlot(db: DB, date: string, templateId: string) {
  const template = db.slots.find((slot) => slot.id === templateId);
  if (!template) throw new ApiError(400, "Choose a delivery slot.");
  const groups = listDeliverySlotsFrom(db);
  const match = groups.flatMap((group) => group.slots).find((slot) => slot.date === date && slot.id === templateId);
  if (!match) throw new ApiError(400, "That delivery slot is not available.");
  return { date, label: template.label, templateId };
}

function listDeliverySlotsFrom(db: DB) {
  const now = new Date();
  const parts = kolkataParts(now);
  const today = todayKey(now);
  const nowMinutes = parts.hour * 60 + parts.minute;
  const groups: { date: string; label: string; slots: DeliverySlotOption[] }[] = [];
  for (let offset = 0; offset < 3; offset += 1) {
    const date = addDaysKey(today, offset);
    const weekday = weekdayOfKey(date);
    const slots: DeliverySlotOption[] = [];
    for (const template of db.slots) {
      const start = parseHHMM(template.start);
      if (start == null) continue;
      const booked = db.bookings.find((booking) => booking.date === date && booking.templateId === template.id)?.count || 0;
      if (
        !isSlotBookable({
          active: template.active,
          days: template.days,
          weekday,
          dateKey: date,
          todayKey: today,
          nowMinutes,
          startMinutes: start,
          cutoffMinutes: template.cutoffMinutes,
          booked,
          capacity: template.capacity,
        })
      )
        continue;
      slots.push({
        id: template.id,
        date,
        dayLabel: dayLabel(date, today),
        label: template.label,
        start: template.start,
        end: template.end,
        remaining: template.capacity - booked,
      });
    }
    if (slots.length) groups.push({ date, label: dayLabel(date, today), slots });
  }
  return groups;
}

export function listOrders(userId: string, filter?: string) {
  const orders = readDb()
    .orders.filter((order) => order.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return orders.filter((order) => matchesFilter(order, filter)).map(publicOrder);
}

function matchesFilter(order: Order, filter?: string) {
  if (!filter || filter === "all") return true;
  if (filter === "delivered") return order.status === "delivered";
  if (filter === "cancelled") return order.status === "cancelled";
  if (filter === "active") return !["delivered", "cancelled"].includes(order.status);
  return true;
}

export function getOrderForUser(userId: string, id: string) {
  const order = readDb().orders.find((item) => item.userId === userId && (item.id === id || item.number === id));
  if (!order) throw new ApiError(404, "We could not find that order.");
  return publicOrder(order);
}

export function publicOrder(order: Order) {
  return {
    id: order.id,
    number: order.number,
    items: order.items,
    address: order.address,
    slot: order.slot,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryFee: order.deliveryFee,
    total: order.total,
    couponCode: order.couponCode,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    cancelReason: order.cancelReason || "",
    createdAt: order.createdAt,
    razorpayOrderId: order.razorpayOrderId || null,
    riderId: order.riderId || null,
    deliveryCode: order.deliveryCode || null,
    outForDeliveryAt: order.outForDeliveryAt || null,
    deliveredAt: order.deliveredAt || null,
    collection: order.collection || null,
  };
}

export function cancelOrder(userId: string, id: string) {
  return update((db) => {
    const order = db.orders.find((item) => item.userId === userId && item.id === id);
    if (!order) throw new ApiError(404, "We could not find that order.");
    if (!["placed", "confirmed", "pending_payment"].includes(order.status)) {
      throw new ApiError(400, "This order can no longer be cancelled online.");
    }
    if (order.status !== "pending_payment") {
      const start = parseHHMM(order.slot.label ? slotStart(db, order.slot.templateId) : "");
      const today = todayKey();
      const parts = kolkataParts();
      const template = db.slots.find((slot) => slot.id === order.slot.templateId);
      const cutoff = template?.cutoffMinutes ?? 90;
      const startMinutes = start ?? parseHHMM(template?.start || "") ?? 0;
      if (order.slot.date < today || (order.slot.date === today && parts.hour * 60 + parts.minute + cutoff > startMinutes)) {
        throw new ApiError(400, "This order can no longer be cancelled online.");
      }
    }
    restoreInventory(db, order);
    restoreCoupon(db, order);
    order.status = "cancelled";
    if (order.paymentStatus === "paid") order.paymentStatus = "refund_pending";
    order.cancelReason = "Cancelled by customer.";
    order.updatedAt = new Date().toISOString();
    return publicOrder(order);
  });
}

function slotStart(db: DB, templateId: string) {
  return db.slots.find((slot) => slot.id === templateId)?.start || "";
}

export function reorder(userId: string, orderId: string, cartId: string) {
  return update((db) => {
    const order = db.orders.find((item) => item.userId === userId && item.id === orderId);
    const cart = findCart(db, cartId);
    if (!order) throw new ApiError(404, "We could not find that order.");
    if (!cart) throw new ApiError(404, "Your cart could not be found.");
    const notes: string[] = [];
    for (const item of order.items) {
      const product = db.products.find((entry) => entry.id === item.productId && entry.active);
      const variant = product?.variants.find((entry) => entry.id === item.variantId && entry.active);
      if (!product || !variant || variant.stock <= 0) {
        notes.push(`${item.name} is currently unavailable.`);
        continue;
      }
      const qty = Math.min(item.qty, variant.stock, variant.maxQty);
      if (qty < item.qty) notes.push(`Only ${qty} of ${item.name} ${item.weight} were available and added.`);
      if (variant.price !== item.unitPrice) {
        notes.push(`${item.name} is now ${formatINR(variant.price)}.`);
      }
      const existing = cart.items.find((line) => line.variantId === variant.id);
      if (existing) existing.qty = Math.min(variant.stock, existing.qty + qty);
      else cart.items.push({ id: randomUUID(), productId: product.id, variantId: variant.id, qty });
    }
    cart.updatedAt = new Date().toISOString();
    return { cart: viewCart(db, cart), notes };
  });
}

export function attachRazorpayOrder(orderId: string, razorpayOrderId: string, amount: number) {
  return update((db) => {
    const order = db.orders.find((item) => item.id === orderId);
    if (!order) throw new ApiError(404, "We could not find that order.");
    order.razorpayOrderId = razorpayOrderId;
    order.updatedAt = new Date().toISOString();
    db.payments.push({
      id: randomUUID(),
      orderId: order.id,
      razorpayOrderId,
      amount,
      status: "created",
      createdAt: new Date().toISOString(),
    });
    return order;
  });
}

export function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string) {
  return update((db) => {
    const order = db.orders.find((item) => item.razorpayOrderId === razorpayOrderId);
    if (!order) throw new ApiError(404, "We could not find that payment.");
    if (order.paymentStatus === "paid") return publicOrder(order);
    if (order.status === "cancelled") throw new ApiError(409, "This payment is for a cancelled order.");
    order.paymentStatus = "paid";
    order.razorpayPaymentId = razorpayPaymentId;
    if (order.status === "pending_payment") order.status = "placed";
    order.updatedAt = new Date().toISOString();
    const payment = db.payments.find((item) => item.razorpayOrderId === razorpayOrderId);
    if (payment) payment.status = "paid";
    return publicOrder(order);
  });
}

export function markPaymentFailed(razorpayOrderId: string) {
  return update((db) => {
    const order = db.orders.find((item) => item.razorpayOrderId === razorpayOrderId);
    if (!order || order.paymentStatus === "paid") return null;
    order.paymentStatus = "failed";
    order.updatedAt = new Date().toISOString();
    return publicOrder(order);
  });
}

export function recordAnalytics(event: string, props: Record<string, unknown>) {
  if (!ANALYTICS_EVENTS.includes(event as AnalyticsEventName)) {
    throw new ApiError(400, "Unknown event.");
  }
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(props || {})) {
    if (["phone", "email", "name", "address", "otp"].includes(key.toLowerCase())) continue;
    if (typeof value === "string") safe[key] = value.slice(0, 120);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) safe[key] = value;
  }
  const entry: AnalyticsEvent = { id: randomUUID(), event, props: safe, at: new Date().toISOString() };
  if (usingMongo()) {
    currentScope().events.push(entry);
    return { ok: true };
  }
  update((db) => {
    db.analytics.push(entry);
    if (db.analytics.length > 500) db.analytics = db.analytics.slice(-500);
  });
  return { ok: true };
}

export function saveOtp(target: string, codeHash: string) {
  update((db) => {
    db.otps = db.otps.filter((otp) => otp.target !== target);
    db.otps.push({ target, codeHash, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });
  });
}

export function consumeOtp(target: string, codeHash: string) {
  return update((db) => {
    const otp = db.otps.find((item) => item.target === target);
    if (!otp || otp.expiresAt < Date.now()) throw new ApiError(400, "That code has expired. Request a new one.");
    otp.attempts += 1;
    if (otp.attempts > 5) throw new ApiError(429, "Too many attempts. Request a new code.");
    if (otp.codeHash !== codeHash) throw new ApiError(400, "That code is incorrect.");
    db.otps = db.otps.filter((item) => item.target !== target);
    return true;
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function adminListProducts() {
  const db = readDb();
  return db.products.map((product) => ({ ...product, category: categoryById(db, product.categoryId)?.name || "" }));
}

export function adminSaveProduct(input: Record<string, unknown>, id?: string) {
  return update((db) => {
    const name = cleanText(input.name, 80);
    if (name.length < 2) throw new ApiError(400, "Product name is required.");
    const slug = slugify(cleanText(input.slug, 80) || name);
    if (!slug) throw new ApiError(400, "Slug is required.");
    if (db.products.some((product) => product.slug === slug && product.id !== id)) {
      throw new ApiError(400, "That slug is already used.");
    }
    const categoryId = cleanText(input.categoryId, 40);
    if (!db.categories.some((category) => category.id === categoryId)) throw new ApiError(400, "Choose a category.");
    const images = Array.isArray(input.images)
      ? input.images
          .map((image) => {
            const row = image as { url?: string; alt?: string };
            const url = cleanText(row.url, 400);
            if (!url) return null;
            return { url, alt: cleanText(row.alt, 160) || name };
          })
          .filter((image): image is { url: string; alt: string } => Boolean(image))
      : [];
    const variants = Array.isArray(input.variants)
      ? input.variants.map((row, index) => {
          const variant = row as Record<string, unknown>;
          const label = cleanText(variant.label, 20);
          const price = rupeesToPaise(Number(variant.price));
          const mrp = rupeesToPaise(Number(variant.mrp || variant.price));
          const stock = asNonNegativeInt(variant.stock);
          if (!label || !Number.isFinite(price) || price < 0 || stock == null) {
            throw new ApiError(400, "Each weight needs a label, price, and stock.");
          }
          return {
            id: cleanText(variant.id, 40) || randomUUID(),
            label,
            sku: cleanText(variant.sku, 40) || `${slug}-${index + 1}`.toUpperCase(),
            price,
            mrp: Number.isFinite(mrp) ? Math.max(mrp, price) : price,
            stock,
            active: variant.active !== false,
            minQty: asPositiveInt(variant.minQty) || 1,
            maxQty: asPositiveInt(variant.maxQty) || 10,
          };
        })
      : [];
    if (!variants.length) throw new ApiError(400, "Add at least one weight.");
    const next: Product = {
      id: id || randomUUID(),
      slug,
      name,
      description: cleanText(input.description, 600),
      details: cleanText(input.details, 600),
      storage: cleanText(input.storage, 300),
      preparation: cleanText(input.preparation, 300),
      categoryId,
      images,
      featured: Boolean(input.featured),
      active: input.active !== false,
      variants,
      createdAt: new Date().toISOString(),
    };
    if (id) {
      const index = db.products.findIndex((product) => product.id === id);
      if (index < 0) throw new ApiError(404, "Product not found.");
      next.createdAt = db.products[index].createdAt;
      db.products[index] = next;
    } else db.products.push(next);
    return next;
  });
}

export function adminDeleteProduct(id: string) {
  return update((db) => {
    db.products = db.products.filter((product) => product.id !== id);
    return { ok: true };
  });
}

export function adminListCategories() {
  return readDb().categories;
}

export function adminSaveCategory(input: Record<string, unknown>, id?: string) {
  return update((db) => {
    const name = cleanText(input.name, 60);
    if (name.length < 2) throw new ApiError(400, "Category name is required.");
    const slug = slugify(cleanText(input.slug, 60) || name);
    if (db.categories.some((category) => category.slug === slug && category.id !== id)) {
      throw new ApiError(400, "That slug is already used.");
    }
    const next: Category = {
      id: id || randomUUID(),
      slug,
      name,
      image: cleanText(input.image, 400),
      imageAlt: cleanText(input.imageAlt, 160) || name,
      sort: asNonNegativeInt(input.sort) ?? 0,
      active: input.active !== false,
    };
    if (id) {
      const index = db.categories.findIndex((category) => category.id === id);
      if (index < 0) throw new ApiError(404, "Category not found.");
      db.categories[index] = next;
    } else db.categories.push(next);
    return next;
  });
}

export function adminListOffers() {
  return readDb().offers;
}

export function adminSaveOffer(input: Record<string, unknown>, id?: string) {
  return update((db) => {
    const title = cleanText(input.title, 80);
    if (title.length < 2) throw new ApiError(400, "Offer title is required.");
    const price = input.price === "" || input.price == null ? null : rupeesToPaise(Number(input.price));
    const mrp = input.mrp === "" || input.mrp == null ? null : rupeesToPaise(Number(input.mrp));
    const next: Offer = {
      id: id || randomUUID(),
      title,
      description: cleanText(input.description, 240),
      image: cleanText(input.image, 400),
      imageAlt: cleanText(input.imageAlt, 160) || title,
      href: cleanText(input.href, 200) || "/shop",
      price: price != null && Number.isFinite(price) ? price : null,
      mrp: mrp != null && Number.isFinite(mrp) ? mrp : null,
      active: input.active !== false,
      sort: asNonNegativeInt(input.sort) ?? 0,
    };
    if (id) {
      const index = db.offers.findIndex((offer) => offer.id === id);
      if (index < 0) throw new ApiError(404, "Offer not found.");
      db.offers[index] = next;
    } else db.offers.push(next);
    return next;
  });
}

export function adminDeleteOffer(id: string) {
  return update((db) => {
    db.offers = db.offers.filter((offer) => offer.id !== id);
    return { ok: true };
  });
}

export function adminListCoupons() {
  return readDb().coupons;
}

export function adminSaveCoupon(input: Record<string, unknown>, id?: string) {
  return update((db) => {
    const code = cleanText(input.code, 30).toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new ApiError(400, "Coupon code must be 3–20 letters or numbers.");
    if (db.coupons.some((coupon) => coupon.code === code && coupon.id !== id)) throw new ApiError(400, "That code already exists.");
    const type = input.type === "percent" ? "percent" : "flat";
    const rawValue = Number(input.value);
    const value = type === "percent" ? Math.round(rawValue) : rupeesToPaise(rawValue);
    if (!Number.isFinite(value) || value <= 0) throw new ApiError(400, "Enter a coupon value.");
    if (type === "percent" && value > 90) throw new ApiError(400, "Percent coupons cannot exceed 90%.");
    const existing = id ? db.coupons.find((coupon) => coupon.id === id) : null;
    const next: Coupon = {
      id: id || randomUUID(),
      code,
      type,
      value,
      minOrder: rupeesToPaise(Number(input.minOrder || 0)) || 0,
      maxDiscount:
        input.maxDiscount === "" || input.maxDiscount == null ? null : rupeesToPaise(Number(input.maxDiscount)),
      maxUses: input.maxUses === "" || input.maxUses == null ? null : asNonNegativeInt(input.maxUses),
      usedCount: existing?.usedCount || 0,
      usedBy: existing?.usedBy || [],
      phones: cleanText(input.phones as string, 200)
        .split(",")
        .map((phone) => normalizeMobile(phone))
        .filter(Boolean),
      expiresAt: cleanText(input.expiresAt, 40) || null,
      active: input.active !== false,
    };
    if (id) {
      const index = db.coupons.findIndex((coupon) => coupon.id === id);
      if (index < 0) throw new ApiError(404, "Coupon not found.");
      db.coupons[index] = next;
    } else db.coupons.push(next);
    return next;
  });
}

export function adminListSlots() {
  return readDb().slots;
}

export function adminSaveSlot(input: Record<string, unknown>, id?: string) {
  return update((db) => {
    const start = cleanText(input.start, 5);
    const end = cleanText(input.end, 5);
    if (!parseHHMM(start) || !parseHHMM(end)) throw new ApiError(400, "Use 24-hour times like 18:00.");
    const capacity = asPositiveInt(input.capacity);
    const cutoffMinutes = asNonNegativeInt(input.cutoffMinutes);
    if (!capacity || cutoffMinutes == null) throw new ApiError(400, "Capacity and cutoff are required.");
    const days = Array.isArray(input.days) ? input.days.map(Number).filter((day) => day >= 0 && day <= 6) : [];
    const next: SlotTemplate = {
      id: id || randomUUID(),
      start,
      end,
      label: formatSlotLabel(start, end),
      capacity,
      cutoffMinutes,
      active: input.active !== false,
      days,
    };
    if (id) {
      const index = db.slots.findIndex((slot) => slot.id === id);
      if (index < 0) throw new ApiError(404, "Slot not found.");
      db.slots[index] = next;
    } else db.slots.push(next);
    return next;
  });
}

export function adminListOrders() {
  return readDb()
    .orders.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicOrder);
}

const STATUSES: OrderStatus[] = [
  "pending_payment",
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export function adminUpdateOrder(id: string, input: { status?: unknown; riderId?: unknown }) {
  const status = input.status == null || input.status === "" ? null : String(input.status);
  if (status && !STATUSES.includes(status as OrderStatus)) throw new ApiError(400, "Unknown status.");
  return update((db) => {
    const order = db.orders.find((item) => item.id === id);
    if (!order) throw new ApiError(404, "Order not found.");
    const now = new Date().toISOString();
    if (input.riderId !== undefined) {
      const riderId = input.riderId ? String(input.riderId) : null;
      if (riderId && !db.riders.some((rider) => rider.id === riderId && rider.active)) {
        throw new ApiError(400, "Choose an active rider.");
      }
      if (order.status === "delivered" || order.status === "cancelled") {
        throw new ApiError(400, "This order is already closed.");
      }
      order.riderId = riderId;
    }
    if (status && status !== order.status) {
      const next = status as OrderStatus;
      if (next === "cancelled") {
        restoreInventory(db, order);
        restoreCoupon(db, order);
        if (order.paymentStatus === "paid") order.paymentStatus = "refund_pending";
        order.cancelReason = "Cancelled by the shop.";
      }
      if (next === "out_for_delivery") order.outForDeliveryAt ||= now;
      if (next === "delivered") {
        order.deliveredAt = now;
        if (order.paymentMethod === "cod" && order.paymentStatus !== "paid") {
          order.paymentStatus = "paid";
          order.collection = {
            amount: order.total,
            mode: "cash",
            riderId: order.riderId || null,
            at: now,
            settledAt: order.riderId ? null : now,
          };
        }
      }
      order.status = next;
    }
    order.updatedAt = now;
    return publicOrder(order);
  });
}

/** Newly placed orders, for the admin's new-order alert. */
export function adminOrderFeed() {
  return readDb()
    .orders.filter((order) => order.status === "placed")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map((order) => ({ id: order.id, number: order.number, total: order.total, name: order.address.name, createdAt: order.createdAt }));
}

/* ------------------------------------------------------------------ Riders */

const RIDER_OPEN: OrderStatus[] = ["placed", "confirmed", "preparing", "ready", "out_for_delivery"];

function cashInHand(db: DB, riderId: string) {
  return db.orders.reduce(
    (sum, order) =>
      order.collection && order.collection.riderId === riderId && order.collection.mode === "cash" && !order.collection.settledAt
        ? sum + order.collection.amount
        : sum,
    0,
  );
}

function deliveredToday(db: DB, riderId: string) {
  const today = todayKey();
  return db.orders.filter(
    (order) => order.riderId === riderId && order.status === "delivered" && order.deliveredAt && todayKey(new Date(order.deliveredAt)) === today,
  );
}

export function adminListRiders() {
  const db = readDb();
  return db.riders.map((rider) => ({
    id: rider.id,
    name: rider.name,
    phone: rider.phone,
    active: rider.active,
    createdAt: rider.createdAt,
    openOrders: db.orders.filter((order) => order.riderId === rider.id && RIDER_OPEN.includes(order.status)).length,
    deliveredToday: deliveredToday(db, rider.id).length,
    cashInHand: cashInHand(db, rider.id),
  }));
}

export function adminSaveRider(input: Record<string, unknown>, id?: string) {
  return update((db) => {
    const name = cleanText(input.name, 60);
    if (name.length < 2) throw new ApiError(400, "Enter the rider's name.");
    const phone = normalizeMobile(String(input.phone || ""));
    if (!isIndianMobile(phone)) throw new ApiError(400, "Enter a valid 10-digit mobile number.");
    if (db.riders.some((rider) => rider.phone === phone && rider.id !== id)) {
      throw new ApiError(400, "Another rider already uses this number.");
    }
    const pin = String(input.pin || "").trim();
    if (pin && !/^\d{4,6}$/.test(pin)) throw new ApiError(400, "The PIN must be 4 to 6 digits.");
    const existing = id ? db.riders.find((rider) => rider.id === id) : null;
    if (id && !existing) throw new ApiError(404, "Rider not found.");
    if (!existing && !pin) throw new ApiError(400, "Set a PIN for the rider.");
    const rider: Rider = {
      id: existing?.id || randomUUID(),
      name,
      phone,
      pinHash: pin ? hashPin(pin) : existing!.pinHash,
      active: input.active !== false,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    if (existing) Object.assign(existing, rider);
    else db.riders.push(rider);
    if (!rider.active) {
      for (const order of db.orders) {
        if (order.riderId === rider.id && RIDER_OPEN.includes(order.status) && order.status !== "out_for_delivery") order.riderId = null;
      }
    }
    return { id: rider.id };
  });
}

/** Marks all cash the rider is holding as handed over to the shop. */
export function adminSettleRider(id: string) {
  return update((db) => {
    if (!db.riders.some((rider) => rider.id === id)) throw new ApiError(404, "Rider not found.");
    const now = new Date().toISOString();
    let amount = 0;
    for (const order of db.orders) {
      const c = order.collection;
      if (c && c.riderId === id && c.mode === "cash" && !c.settledAt) {
        c.settledAt = now;
        amount += c.amount;
      }
    }
    return { settled: amount };
  });
}

export function riderLogin(phone: string, pin: string) {
  const rider = readDb().riders.find((item) => item.phone === normalizeMobile(phone));
  if (!rider || !rider.active || !verifyPin(pin, rider.pinHash)) {
    throw new ApiError(401, "Wrong number or PIN.");
  }
  return { id: rider.id, name: rider.name };
}

export function getActiveRider(id: string | null) {
  if (!id) return null;
  return readDb().riders.find((rider) => rider.id === id && rider.active) || null;
}

function riderOrder(order: Order) {
  const due = order.paymentMethod === "cod" && order.paymentStatus !== "paid" ? order.total : 0;
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    slot: order.slot,
    address: order.address,
    items: order.items.map((item) => ({ name: item.name, weight: item.weight, qty: item.qty })),
    total: order.total,
    paymentMethod: order.paymentMethod,
    due,
    needsCode: Boolean(order.deliveryCode),
    deliveredAt: order.deliveredAt || null,
    collection: order.collection || null,
  };
}

export function riderDashboard(riderId: string) {
  const db = readDb();
  const rider = db.riders.find((item) => item.id === riderId);
  if (!rider) throw new ApiError(401, "Please sign in again.");
  const open = db.orders
    .filter((order) => order.riderId === riderId && RIDER_OPEN.includes(order.status))
    .sort((a, b) => (a.slot.date + a.slot.label).localeCompare(b.slot.date + b.slot.label));
  const done = deliveredToday(db, riderId).sort((a, b) => (b.deliveredAt || "").localeCompare(a.deliveredAt || ""));
  return {
    rider: { id: rider.id, name: rider.name, phone: rider.phone },
    orders: open.map(riderOrder),
    delivered: done.map(riderOrder),
    cashInHand: cashInHand(db, riderId),
    shopPhone: db.settings.phone,
  };
}

export function riderUpdateOrder(riderId: string, orderId: string, input: Record<string, unknown>) {
  return update((db) => {
    const order = db.orders.find((item) => item.id === orderId && item.riderId === riderId);
    if (!order) throw new ApiError(404, "This order is not assigned to you.");
    const now = new Date().toISOString();
    if (input.action === "start") {
      if (!["confirmed", "preparing", "ready", "placed"].includes(order.status)) {
        throw new ApiError(400, "This order can't be started now.");
      }
      order.status = "out_for_delivery";
      order.outForDeliveryAt = now;
    } else if (input.action === "deliver") {
      if (order.status !== "out_for_delivery") throw new ApiError(400, "Start the delivery first.");
      if (order.deliveryCode && String(input.code || "").trim() !== order.deliveryCode) {
        throw new ApiError(400, "That delivery code is wrong. Ask the customer to check their order page.");
      }
      if (order.paymentMethod === "cod" && order.paymentStatus !== "paid") {
        const mode = input.mode === "upi" ? "upi" : input.mode === "cash" ? "cash" : null;
        if (!mode) throw new ApiError(400, "Choose how the customer paid.");
        order.paymentStatus = "paid";
        order.collection = { amount: order.total, mode, riderId, at: now, settledAt: mode === "upi" ? now : null };
      }
      order.status = "delivered";
      order.deliveredAt = now;
    } else {
      throw new ApiError(400, "Unknown action.");
    }
    order.updatedAt = now;
    return riderOrder(order);
  });
}

/** What the customer's order page needs to show the rider on a map. */
export function getTracking(userId: string, id: string) {
  const db = readDb();
  const order = db.orders.find((item) => item.userId === userId && (item.id === id || item.number === id));
  if (!order) throw new ApiError(404, "We could not find that order.");
  const rider = order.riderId ? db.riders.find((item) => item.id === order.riderId) : null;
  const pin = order.address.lat != null && order.address.lng != null ? { lat: order.address.lat, lng: order.address.lng } : null;
  return {
    status: order.status,
    riderId: rider?.id || null,
    rider: rider ? { name: rider.name, phone: rider.phone } : null,
    destination: pin,
  };
}

/** The bill is visible to the shop admin and to the customer who placed the order. */
export function getBill(id: string, access: { userId: string | null; admin: boolean }) {
  const db = readDb();
  const order = db.orders.find((item) => item.id === id || item.number === id);
  if (!order) return null;
  if (!access.admin && order.userId !== access.userId) return null;
  if (order.status === "pending_payment") return null;
  return { order, settings: db.settings };
}

export function adminCustomers() {
  const db = readDb();
  return db.users.map((user) => ({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    orders: db.orders.filter((order) => order.userId === user.id && order.status !== "pending_payment").length,
    createdAt: user.createdAt,
  }));
}

export function adminUpdateSettings(input: Record<string, unknown>) {
  return update((db) => {
    const settings = db.settings;
    const textKeys = [
      "name",
      "brand",
      "tagline",
      "phone",
      "whatsapp",
      "email",
      "addressLine",
      "area",
      "city",
      "state",
      "pincode",
      "hours",
      "mapUrl",
      "about",
      "gstin",
      "fssai",
    ] as const;
    for (const key of textKeys) {
      if (key in input) settings[key] = cleanText(input[key], key === "about" ? 1200 : 200);
    }
    settings.gstin = settings.gstin.toUpperCase().replace(/\s/g, "");
    if (settings.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(settings.gstin)) {
      throw new ApiError(400, "GSTIN should be 15 characters, like 32ABCDE1234F1Z5.");
    }
    settings.fssai = settings.fssai.replace(/\s/g, "");
    if (settings.fssai && !/^\d{14}$/.test(settings.fssai)) throw new ApiError(400, "The FSSAI licence number has 14 digits.");
    if (typeof input.servicePincodes === "string") {
      settings.servicePincodes = input.servicePincodes
        .split(/[\s,]+/)
        .map((pin) => pin.trim())
        .filter((pin) => isPincode(pin));
    }
    if (input.deliveryFee != null) {
      const fee = rupeesToPaise(Number(input.deliveryFee));
      if (!Number.isFinite(fee) || fee < 0) throw new ApiError(400, "Delivery fee is invalid.");
      settings.deliveryFee = fee;
    }
    if ("freeDeliveryAbove" in input) {
      if (input.freeDeliveryAbove === "" || input.freeDeliveryAbove == null) settings.freeDeliveryAbove = null;
      else {
        const value = rupeesToPaise(Number(input.freeDeliveryAbove));
        if (!Number.isFinite(value) || value < 0) throw new ApiError(400, "Free delivery threshold is invalid.");
        settings.freeDeliveryAbove = value;
      }
    }
    if ("codEnabled" in input) settings.codEnabled = Boolean(input.codEnabled);
    if ("onlinePaymentEnabled" in input) settings.onlinePaymentEnabled = Boolean(input.onlinePaymentEnabled);
    if ("starterCatalogue" in input) settings.starterCatalogue = Boolean(input.starterCatalogue);
    const policies = input.policies as ShopSettings["policies"] | undefined;
    if (policies) {
      settings.policies = {
        privacy: cleanText(policies.privacy, 2000) || settings.policies.privacy,
        terms: cleanText(policies.terms, 2000) || settings.policies.terms,
        refund: cleanText(policies.refund, 2000) || settings.policies.refund,
        shipping: cleanText(policies.shipping, 2000) || settings.policies.shipping,
      };
    }
    return publicSettings(settings);
  });
}

export function deliveryQuote(subtotal: number, discount: number) {
  const settings = getPublicSettings();
  const fee = computeDeliveryFee(Math.max(0, subtotal - discount), settings);
  return { deliveryFee: fee, freeDeliveryAbove: settings.freeDeliveryAbove, total: Math.max(0, subtotal - discount) + fee };
}
