"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export type RiderLang = "hi" | "en";

const STORAGE_KEY = "cc_rider_lang";

const TEXT = {
  en: {
    appName: "Rider app",
    signInTitle: "Rider sign in",
    signInBody: "Use the mobile number and PIN the shop gave you.",
    mobile: "Mobile number",
    pin: "PIN",
    signIn: "Sign in",
    forgotPin: "Forgot your PIN? Ask the shop to reset it.",
    riderLabel: "ChickenCrew rider",
    hi: "Hi",
    refresh: "Refresh",
    signOut: "Sign out",
    tryAgain: "Try again",
    toDeliver: "To deliver",
    deliveredToday: "Delivered today",
    cashWithYou: "Cash with you",
    sharing: "Sharing your location with the customer. Keep this screen open.",
    finding: "Finding your location…",
    locationBlocked: "Location is blocked. Allow location for this site in your browser settings so customers can track you.",
    locationUnsupported: "This browser can't share location.",
    noDeliveries: "No deliveries right now",
    noDeliveriesBody: "New orders show up here as soon as the shop assigns them to you.",
    cash: "Cash",
    upi: "UPI",
    prepaid: "Prepaid",
    callShop: "Call the shop",
    status_placed: "New",
    status_confirmed: "Confirmed",
    status_preparing: "Being packed",
    status_ready: "Ready to pick up",
    status_out_for_delivery: "On the way",
    near: "Near {place}",
    noPin: "No map pin. Navigation uses the typed address.",
    collect: "Collect on delivery",
    paidOnline: "Paid online, nothing to collect",
    call: "Call",
    whatsapp: "WhatsApp",
    navigate: "Navigate",
    codeLabel: "Delivery code from the customer",
    howPaid: "How did they pay {amount}?",
    upiToShop: "UPI to shop",
    startDelivery: "Picked up · Start delivery",
    back: "Back",
    confirmDelivery: "Confirm delivery",
    markDelivered: "Mark delivered",
    started: "Delivery started. Customer can now track you.",
    delivered: "Order #{number} delivered.",
    switchTo: "हिंदी",
  },
  hi: {
    appName: "राइडर ऐप",
    signInTitle: "राइडर लॉगिन",
    signInBody: "दुकान से मिला मोबाइल नंबर और PIN डालें।",
    mobile: "मोबाइल नंबर",
    pin: "PIN",
    signIn: "लॉगिन करें",
    forgotPin: "PIN भूल गए? दुकान से नया PIN मांगें।",
    riderLabel: "ChickenCrew राइडर",
    hi: "नमस्ते",
    refresh: "रीफ़्रेश करें",
    signOut: "लॉग आउट",
    tryAgain: "फिर से कोशिश करें",
    toDeliver: "डिलीवरी बाकी",
    deliveredToday: "आज डिलीवर किए",
    cashWithYou: "आपके पास कैश",
    sharing: "ग्राहक को आपकी लोकेशन दिख रही है। यह स्क्रीन खुली रखें।",
    finding: "आपकी लोकेशन ढूंढ रहे हैं…",
    locationBlocked: "लोकेशन बंद है। ब्राउज़र की सेटिंग में इस साइट के लिए लोकेशन चालू करें, ताकि ग्राहक आपको ट्रैक कर सकें।",
    locationUnsupported: "यह ब्राउज़र लोकेशन शेयर नहीं कर सकता।",
    noDeliveries: "अभी कोई डिलीवरी नहीं है",
    noDeliveriesBody: "दुकान जैसे ही आपको ऑर्डर देगी, वह यहाँ दिख जाएगा।",
    cash: "कैश",
    upi: "UPI",
    prepaid: "पहले से भुगतान",
    callShop: "दुकान को कॉल करें",
    status_placed: "नया",
    status_confirmed: "कन्फ़र्म",
    status_preparing: "पैक हो रहा है",
    status_ready: "पिकअप के लिए तैयार",
    status_out_for_delivery: "रास्ते में",
    near: "{place} के पास",
    noPin: "मैप पिन नहीं है। रास्ता लिखे हुए पते से दिखेगा।",
    collect: "डिलीवरी पर पैसे लें",
    paidOnline: "ऑनलाइन भुगतान हो चुका है, कुछ नहीं लेना",
    call: "कॉल",
    whatsapp: "WhatsApp",
    navigate: "रास्ता",
    codeLabel: "ग्राहक से डिलीवरी कोड पूछें",
    howPaid: "ग्राहक ने {amount} कैसे दिए?",
    upiToShop: "दुकान को UPI",
    startDelivery: "सामान ले लिया · डिलीवरी शुरू करें",
    back: "वापस",
    confirmDelivery: "डिलीवरी पक्की करें",
    markDelivered: "डिलीवर हो गया",
    started: "डिलीवरी शुरू हो गई। ग्राहक अब आपको ट्रैक कर सकता है।",
    delivered: "ऑर्डर #{number} डिलीवर हो गया।",
    switchTo: "English",
  },
} as const;

export type RiderTextKey = keyof (typeof TEXT)["en"];

const SERVER_ERRORS: Record<string, string> = {
  "Wrong number or PIN.": "नंबर या PIN गलत है।",
  "Please sign in again.": "कृपया फिर से लॉगिन करें।",
  "Please sign in to the rider app.": "कृपया राइडर ऐप में लॉगिन करें।",
  "This order is not assigned to you.": "यह ऑर्डर आपको नहीं दिया गया है।",
  "This order can't be started now.": "यह ऑर्डर अभी शुरू नहीं हो सकता।",
  "Start the delivery first.": "पहले डिलीवरी शुरू करें।",
  "That delivery code is wrong. Ask the customer to check their order page.":
    "डिलीवरी कोड गलत है। ग्राहक से ऑर्डर पेज पर कोड दोबारा देखने को कहें।",
  "Choose how the customer paid.": "चुनें कि ग्राहक ने कैसे भुगतान किया।",
  "Too many attempts. Please wait and try again.": "बहुत ज़्यादा कोशिशें हो गईं। थोड़ी देर बाद फिर कोशिश करें।",
  "Something went wrong. Please try again.": "कुछ गड़बड़ हो गई। फिर से कोशिश करें।",
  "Something went wrong.": "कुछ गड़बड़ हो गई। फिर से कोशिश करें।",
};

type RiderLangValue = {
  lang: RiderLang;
  setLang: (lang: RiderLang) => void;
  t: (key: RiderTextKey, vars?: Record<string, string>) => string;
  /** Server messages arrive in English; show the Hindi version when we have one. */
  tError: (message: string) => string;
};

const RiderLangContext = createContext<RiderLangValue | null>(null);

export function RiderLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<RiderLang>("hi");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "hi") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);

  function setLang(next: RiderLang) {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const value: RiderLangValue = {
    lang,
    setLang,
    t: (key, vars) => {
      let text: string = TEXT[lang][key];
      for (const [name, replacement] of Object.entries(vars || {})) text = text.replace(`{${name}}`, replacement);
      return text;
    },
    tError: (message) => (lang === "hi" ? SERVER_ERRORS[message] || message : message),
  };

  return <RiderLangContext.Provider value={value}>{children}</RiderLangContext.Provider>;
}

export function useRiderLang() {
  const value = useContext(RiderLangContext);
  if (!value) throw new Error("useRiderLang must be used inside RiderLangProvider");
  return value;
}

export function RiderLangSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useRiderLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "hi" ? "en" : "hi")}
      className={cn("flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold", className)}
      aria-label={lang === "hi" ? "Switch to English" : "हिंदी में बदलें"}
    >
      <Languages className="size-4" /> {t("switchTo")}
    </button>
  );
}
