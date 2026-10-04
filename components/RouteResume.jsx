"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const STORAGE_KEY = "tp_last_route";
const SKIP_ROUTES = ["/login", "/reset-password"];

function isStandaloneApp() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function RouteResume() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const search = searchParams.toString();
    const currentRoute = search ? `${pathname}?${search}` : pathname;

    if (!SKIP_ROUTES.includes(pathname)) {
      window.localStorage.setItem(STORAGE_KEY, currentRoute);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isStandaloneApp()) return;

    const search = searchParams.toString();
    const currentRoute = search ? `${pathname}?${search}` : pathname;
    const savedRoute = window.localStorage.getItem(STORAGE_KEY);

    if (pathname === "/" && savedRoute && savedRoute !== currentRoute) {
      if (!savedRoute.startsWith("/login") && !savedRoute.startsWith("/reset-password")) {
        router.replace(savedRoute);
      }
    }
  }, [pathname, router, searchParams]);

  return null;
}
