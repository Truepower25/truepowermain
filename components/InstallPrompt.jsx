"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Share2, X } from "lucide-react";

const DISMISS_KEY = "tp_install_prompt_dismissed";

function isIosSafari() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return isIos && isSafari;
}

export default function InstallPrompt({ onVisibilityChange }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const isVisible = showBanner || showIos || !!deferredPrompt;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    const ios = isIosSafari();

    if (dismissed || standalone) return;

    const onBeforeInstallPrompt = (event) => {
      if (window.localStorage.getItem(DISMISS_KEY)) return;
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    let iosTimer = null;
    if (ios) {
      iosTimer = window.setTimeout(() => setShowIos(true), 1800);
    }

    const bannerTimer = window.setTimeout(() => setShowBanner(true), 900);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      if (iosTimer) window.clearTimeout(iosTimer);
      window.clearTimeout(bannerTimer);
    };
  }, []);

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setShowBanner(false);
    setShowIos(false);
    setDeferredPrompt(null);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      dismiss();
    }
  }

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-4 sm:right-auto sm:w-[22rem] z-[999]">
      <div className="rounded-2xl border border-border bg-white shadow-lg p-4 flex items-start gap-3">
        <Image
          src="/icons/icon-192.png"
          alt=""
          className="w-11 h-11 rounded-xl bg-brand-50 object-cover shrink-0"
          width={44}
          height={44}
        />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-sm text-ink">
            Install TruePower
          </p>
          {deferredPrompt ? (
            <>
              <p className="text-sub text-xs mt-0.5 mb-3">
                Add the site to your home screen and open it like an app.
              </p>
              <button
                type="button"
                onClick={handleInstall}
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
              >
                <Download size={14} /> Install
              </button>
            </>
          ) : showIos ? (
            <>
              <p className="text-sub text-xs mt-0.5 mb-3">
                Tap <Share2 size={12} className="inline -mt-0.5" /> Share, then
                choose <span className="font-semibold">Add to Home Screen</span>.
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
              >
                <Share2 size={14} /> Got it
              </button>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-faint hover:text-ink shrink-0"
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
