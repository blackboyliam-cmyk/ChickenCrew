import { formatSlotLabel } from "./time";
import type { Category, Coupon, DB, Offer, Product, ShopSettings, SlotTemplate, Variant } from "./types";

const POLICIES = {
  privacy:
    "Karthika Chicken Centre collects your name, mobile number, optional email, delivery address, and order details so the shop can prepare and deliver your order. Payment card details are handled by the payment gateway, not stored on this site. Session cookies keep you signed in. The shop does not sell your personal information.",
  terms:
    "An order is placed only after the server checks the current price, stock, delivery pincode, and slot. The price stored on the server at checkout is the price you pay. Cuts that are unavailable are not substituted. Delivery is limited to pincodes and slots the shop has published.",
  refund:
    "You can cancel from the order page while the order is still placed or confirmed, and before the delivery slot cutoff. Cash on delivery orders are not charged. If you paid online, the shop marks the payment for refund after the cancellation is confirmed. The bank and payment gateway decide how long a refund takes to appear.",
  shipping:
    "This shop uses scheduled delivery slots. It does not promise instant delivery. The delivery fee and any free-delivery threshold are calculated on the server and shown in your cart before you pay. Orders outside the published delivery area cannot be placed.",
};

function variant(
  id: string,
  label: string,
  sku: string,
  priceRupees: number,
  mrpRupees: number,
  stock: number,
): Variant {
  return {
    id,
    label,
    sku,
    price: priceRupees * 100,
    mrp: mrpRupees * 100,
    stock,
    active: true,
    minQty: 1,
    maxQty: 10,
  };
}

function category(id: string, slug: string, name: string, image: string, imageAlt: string, sort: number): Category {
  return { id, slug, name, image, imageAlt, sort, active: true };
}

export function createSeed(): DB {
  const categories: Category[] = [
    category("cat_whole", "whole-chicken", "Whole Chicken", "/media/whole.jpg", "Raw whole chicken on a wooden board", 1),
    category("cat_curry", "curry-cut", "Curry Cut", "/media/curry.jpg", "Raw curry-cut chicken pieces", 2),
    category("cat_boneless", "boneless", "Boneless", "/media/boneless.jpg", "Raw boneless chicken cubes", 3),
    category("cat_breast", "chicken-breast", "Chicken Breast", "/media/breast.jpg", "Raw chicken breast on a board", 4),
    category("cat_legs", "chicken-legs", "Chicken Legs", "/media/legs.jpg", "Raw chicken drumsticks", 5),
    category("cat_wings", "chicken-wings", "Chicken Wings", "/media/wings.jpg", "Raw chicken wings", 6),
    category("cat_liver", "liver", "Liver", "/media/liver.jpg", "Chicken liver in a steel bowl", 7),
    category("cat_gizzard", "gizzard", "Gizzard", "/media/gizzard.jpg", "Chicken gizzard in a steel bowl", 8),
    category("cat_special", "special-cuts", "Special Cuts", "/media/wings.jpg", "Raw chicken wings for special cuts", 9),
    category("cat_combos", "combos", "Combos", "/media/curry.jpg", "Raw curry-cut chicken for a family pack", 10),
    category("cat_offers", "offers", "Offers", "/media/curry.jpg", "Chicken pieces on offer", 11),
  ];

  const products: Product[] = [
    product({
      id: "prd_whole",
      slug: "whole-chicken",
      name: "Whole Chicken",
      categoryId: "cat_whole",
      featured: true,
      description: "Whole bird with skin, cleaned for home cooking. The weight is the packed weight.",
      details: "Skin on. Cleaned whole bird.",
      images: [{ url: "/media/whole.jpg", alt: "Raw whole chicken on a wooden board" }],
      variants: [
        variant("var_whole_1", "1 kg", "KCC-WHOLE-1KG", 249, 249, 20),
        variant("var_whole_15", "1.5 kg", "KCC-WHOLE-1.5KG", 369, 369, 12),
      ],
      createdAt: "2026-09-01T04:00:00.000Z",
    }),
    product({
      id: "prd_curry",
      slug: "curry-cut",
      name: "Curry Cut",
      categoryId: "cat_curry",
      featured: true,
      description: "Bone-in pieces cut for the pot. Skin on.",
      details: "Mixed curry pieces. Bone in. Skin on.",
      images: [{ url: "/media/curry.jpg", alt: "Raw curry-cut chicken pieces" }],
      variants: [
        variant("var_curry_500", "500g", "KCC-CURRY-500", 139, 149, 30),
        variant("var_curry_1", "1 kg", "KCC-CURRY-1KG", 259, 279, 24),
      ],
      createdAt: "2026-09-02T04:00:00.000Z",
    }),
    product({
      id: "prd_boneless",
      slug: "boneless-chicken",
      name: "Boneless Chicken",
      categoryId: "cat_boneless",
      featured: true,
      description: "Boneless cubes for curry or frying. No bone in this pack.",
      details: "Boneless cubes.",
      images: [{ url: "/media/boneless.jpg", alt: "Raw boneless chicken cubes" }],
      variants: [
        variant("var_bone_250", "250g", "KCC-BONE-250", 149, 149, 18),
        variant("var_bone_500", "500g", "KCC-BONE-500", 279, 299, 22),
        variant("var_bone_1", "1 kg", "KCC-BONE-1KG", 529, 569, 10),
      ],
      createdAt: "2026-09-03T04:00:00.000Z",
    }),
    product({
      id: "prd_breast",
      slug: "chicken-breast",
      name: "Chicken Breast",
      categoryId: "cat_breast",
      featured: true,
      description: "Boneless breast. No bone in this pack.",
      details: "Boneless, skinless breast.",
      images: [
        { url: "/media/breast.jpg", alt: "Raw chicken breast on a wooden board" },
        { url: "/media/combo.jpg", alt: "Grilled chicken breast, shown cooked" },
      ],
      variants: [
        variant("var_breast_250", "250g", "KCC-BRST-250", 169, 169, 16),
        variant("var_breast_500", "500g", "KCC-BRST-500", 319, 349, 18),
        variant("var_breast_1", "1 kg", "KCC-BRST-1KG", 599, 649, 8),
      ],
      createdAt: "2026-09-04T04:00:00.000Z",
    }),
    product({
      id: "prd_legs",
      slug: "chicken-legs",
      name: "Chicken Legs",
      categoryId: "cat_legs",
      featured: true,
      description: "Skin-on drumsticks.",
      details: "Drumsticks. Skin on. Bone in.",
      images: [{ url: "/media/legs.jpg", alt: "Raw chicken drumsticks" }],
      variants: [
        variant("var_legs_500", "500g", "KCC-LEG-500", 169, 169, 20),
        variant("var_legs_1", "1 kg", "KCC-LEG-1KG", 319, 339, 14),
      ],
      createdAt: "2026-09-05T04:00:00.000Z",
    }),
    product({
      id: "prd_wings",
      slug: "chicken-wings",
      name: "Chicken Wings",
      categoryId: "cat_wings",
      featured: true,
      description: "Whole wings, skin on.",
      details: "Whole wings.",
      images: [{ url: "/media/wings.jpg", alt: "Raw chicken wings on stone" }],
      variants: [
        variant("var_wings_500", "500g", "KCC-WING-500", 149, 159, 20),
        variant("var_wings_1", "1 kg", "KCC-WING-1KG", 279, 299, 12),
      ],
      createdAt: "2026-09-06T04:00:00.000Z",
    }),
    product({
      id: "prd_liver",
      slug: "chicken-liver",
      name: "Chicken Liver",
      categoryId: "cat_liver",
      featured: false,
      description: "Chicken liver, cleaned.",
      details: "Cleaned liver.",
      images: [{ url: "/media/liver.jpg", alt: "Chicken liver in a steel bowl" }],
      variants: [
        variant("var_liver_250", "250g", "KCC-LIV-250", 49, 49, 15),
        variant("var_liver_500", "500g", "KCC-LIV-500", 89, 89, 10),
      ],
      createdAt: "2026-09-07T04:00:00.000Z",
    }),
    product({
      id: "prd_gizzard",
      slug: "chicken-gizzard",
      name: "Chicken Gizzard",
      categoryId: "cat_gizzard",
      featured: false,
      description: "Chicken gizzard, cleaned.",
      details: "Cleaned gizzard.",
      images: [{ url: "/media/gizzard.jpg", alt: "Chicken gizzard in a steel bowl" }],
      variants: [
        variant("var_giz_250", "250g", "KCC-GIZ-250", 45, 45, 12),
        variant("var_giz_500", "500g", "KCC-GIZ-500", 85, 85, 8),
      ],
      createdAt: "2026-09-08T04:00:00.000Z",
    }),
    product({
      id: "prd_lolli",
      slug: "chicken-lollipop",
      name: "Chicken Lollipop",
      categoryId: "cat_special",
      featured: false,
      description: "Wingette cut into a lollipop.",
      details: "Lollipop cut from the wingette.",
      images: [{ url: "/media/wings.jpg", alt: "Raw chicken wings used for lollipop cuts" }],
      variants: [variant("var_lolli_500", "500g", "KCC-LOL-500", 199, 219, 10)],
      createdAt: "2026-09-09T04:00:00.000Z",
    }),
    product({
      id: "prd_neck",
      slug: "chicken-neck",
      name: "Chicken Neck",
      categoryId: "cat_special",
      featured: false,
      description: "Chicken neck for stock.",
      details: "Neck pieces.",
      images: [{ url: "/media/whole.jpg", alt: "Raw whole chicken" }],
      variants: [variant("var_neck_500", "500g", "KCC-NECK-500", 79, 79, 0)],
      createdAt: "2026-09-10T04:00:00.000Z",
    }),
    product({
      id: "prd_family",
      slug: "family-curry-pack",
      name: "Family Curry Pack",
      categoryId: "cat_combos",
      featured: true,
      description: "1 kg curry cut and 250 g liver, packed as one order.",
      details: "Contains 1 kg curry cut and 250 g liver.",
      images: [{ url: "/media/curry.jpg", alt: "Raw curry-cut chicken in the family pack" }],
      variants: [variant("var_family_1", "1.25 kg", "KCC-FAM-125", 299, 339, 10)],
      createdAt: "2026-09-11T04:00:00.000Z",
    }),
  ];

  const offers: Offer[] = [
    {
      id: "off_curry",
      title: "Curry cut, 1 kg",
      description: "Bone-in curry pieces at the shop's offer price.",
      image: "/media/curry.jpg",
      imageAlt: "Raw curry-cut chicken pieces",
      href: "/product/curry-cut",
      price: 25900,
      mrp: 27900,
      active: true,
      sort: 1,
    },
    {
      id: "off_family",
      title: "Family curry pack",
      description: "Curry cut and liver, packed together.",
      image: "/media/curry.jpg",
      imageAlt: "Raw curry-cut chicken for the family pack",
      href: "/product/family-curry-pack",
      price: 29900,
      mrp: 33900,
      active: true,
      sort: 2,
    },
  ];

  const coupons: Coupon[] = [
    {
      id: "cpn_welcome",
      code: "WELCOME50",
      type: "flat",
      value: 5000,
      minOrder: 49900,
      maxDiscount: null,
      maxUses: 1000,
      usedCount: 0,
      usedBy: [],
      phones: [],
      expiresAt: "2027-09-30T18:29:00.000Z",
      active: true,
    },
  ];

  const slots: SlotTemplate[] = [
    ["17:00", "18:00"],
    ["18:00", "19:00"],
    ["19:00", "20:00"],
    ["20:00", "21:00"],
  ].map(([start, end], index) => ({
    id: `slot_${index + 1}`,
    start,
    end,
    label: formatSlotLabel(start, end),
    capacity: 25,
    cutoffMinutes: 90,
    active: true,
    days: [],
  }));

  const settings: ShopSettings = {
    name: "Karthika Chicken Centre",
    brand: "ChickenCrew",
    tagline: "Fresh chicken. Honest prices.",
    phone: "",
    whatsapp: "",
    email: "",
    addressLine: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    hours: "",
    mapUrl: "",
    about:
      "Karthika Chicken Centre is a local chicken shop. ChickenCrew is the name on this ordering site. Browse the cuts, pick a weight, and choose a delivery slot where the shop delivers.",
    servicePincodes: [],
    deliveryFee: 4000,
    freeDeliveryAbove: 79900,
    codEnabled: true,
    onlinePaymentEnabled: true,
    starterCatalogue: true,
    policies: POLICIES,
    extraFaqs: [],
  };

  return {
    schemaVersion: 1,
    settings,
    categories,
    products,
    offers,
    coupons,
    slots,
    users: [],
    addresses: [],
    carts: [],
    orders: [],
    otps: [],
    orderSeq: 10050,
    analytics: [],
    bookings: [],
    payments: [],
  };
}

function product(input: {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  featured: boolean;
  description: string;
  details: string;
  images: Product["images"];
  variants: Variant[];
  createdAt: string;
}): Product {
  return {
    ...input,
    storage: "Refrigerate as soon as it arrives. Cook the same day.",
    preparation: "Cook until the meat is fully done.",
    active: true,
  };
}
