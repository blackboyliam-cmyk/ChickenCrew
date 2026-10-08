"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Mode = "none" | "prompt" | "ios";

const DISMISS_KEY = "cc-install-dismissed";
const DISMISS_DAYS = 14;

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    listeners.forEach((notify) => notify());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((notify) => notify());
  });
}

function installed() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function useInstall() {
  const [mode, setMode] = useState<Mode>("none");
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (installed()) setMode("none");
      else if (deferred) setMode("prompt");
      else setMode(isIosSafari() ? "ios" : "none");
    };
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  async function install() {
    if (mode === "ios") {
      setIosHelp(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    deferred = null;
    setMode("none");
  }

  return { mode, install, iosHelp, closeIosHelp: () => setIosHelp(false) };
}

function IosHelp({ appName, onClose }: { appName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Install the app"
        className="w-full max-w-sm rounded-2xl bg-white p-5 text-sm text-foreground shadow-float"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-bold">Install {appName}</p>
          <button type="button" onClick={onClose} className="-m-1 grid size-8 place-items-center rounded-lg hover:bg-muted" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <ol className="mt-3 space-y-2.5">
          <li className="flex items-center gap-2">
            1. Tap <Share className="size-4 text-sky-600" aria-label="Share" /> <b>Share</b> at the bottom of Safari
          </li>
          <li>
            2. Scroll down and tap <b>Add to Home Screen</b>
          </li>
          <li>
            3. Tap <b>Add</b>. Open it from your home screen like any app.
          </li>
        </ol>
      </div>
    </div>
  );
}

/** A slim, dismissible "install the app" strip. Hidden once installed or where the browser can't install. */
export function InstallBanner({ appName, className }: { appName: string; className?: string }) {
  const { mode, install, iosHelp, closeIosHelp } = useInstall();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    setHidden(Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setHidden(true);
  }

  if (mode === "none" || (hidden && !iosHelp)) return iosHelp ? <IosHelp appName={appName} onClose={closeIosHelp} /> : null;
  return (
    <>
      <div className={cn("flex items-center gap-3 bg-primary px-4 py-2 text-xs text-white sm:text-sm", className)}>
        <Download className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Get the {appName} app on your phone</span>
        <button type="button" onClick={() => void install()} className="shrink-0 rounded-full bg-white px-3 py-1 font-bold text-primary">
          Install
        </button>
        <button type="button" onClick={dismiss} className="-mr-1 grid size-7 shrink-0 place-items-center rounded-full hover:bg-white/15" aria-label="Not now">
          <X className="size-4" />
        </button>
      </div>
      {iosHelp && <IosHelp appName={appName} onClose={closeIosHelp} />}
    </>
  );
}

/** An "Install app" link for menus and footers; renders nothing when install isn't possible. */
export function InstallLink({ appName, className }: { appName: string; className?: string }) {
  const { mode, install, iosHelp, closeIosHelp } = useInstall();
  if (mode === "none") return null;
  return (
    <>
      <button type="button" onClick={() => void install()} className={cn("inline-flex items-center gap-2", className)}>
        <Download className="size-4" aria-hidden /> Install app
      </button>
      {iosHelp && <IosHelp appName={appName} onClose={closeIosHelp} />}
    </>
  );
}
