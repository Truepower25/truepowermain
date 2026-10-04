"use client";
import Link from "next/link";
import {
  Heart,
  Search,
  Menu,
  X,
  ShoppingBag,
  User,
  LayoutDashboard,
  UserCog,
  ShieldCheck,
  LockOpen,
  LogOut,
  ChevronDown,
  Download,
  Share2,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";

import TruePowerLogo from "./TruePowerLogo";
import SearchProducts from "./SearchProducts";
import ShoppingTagButton from "@/components/product/ShoppingTagButton";
import WishListCountLink from "@/components/product/WishListCountLink";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const categories = [
    { key: "water_heaters", label: "Instant Showers" },
    { key: "bulbs_lighting", label: "Bulbs & Lighting" },
    { key: "switches_sockets", label: "Switches & Sockets" },
    { key: "solar_solutions", label: "Solar Solutions" },
    { key: "water_pumps", label: "Water Pumps" },
  ];

  const links = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/portfolio", label: "Portfolio" },
    { to: "/services", label: "Services" },
    { to: "/blog", label: "Blog" },
    { to: "/about", label: "About" },
  ];

  const CATS = [
    { key: "all_products", to: "/shop", label: "All Products" },
    { key: "water_heaters", to: "/shop?category=water_heaters", label: "Instant Showers" },
    { key: "bulbs_lighting", to: "/shop?category=bulbs_lighting", label: "Bulbs & Lighting" },
    { key: "switches_sockets", to: "/shop?category=switches_sockets", label: "Switches & Sockets" },
    { key: "solar_solutions", to: "/shop?category=solar_solutions", label: "Solar Solutions" },
    { key: "water_pumps", to: "/shop?category=water_pumps", label: "Water Pumps" },
  ];
  const auth = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = pathname === "/shop" ? searchParams.get("category") || "all_products" : "";
  const { user, isAdmin, signOut = async () => {}, profile } = auth ?? {};

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [categoryScrollable, setCategoryScrollable] = useState(false);
  const accountRef = useRef(null);
  const accountBtnRef = useRef(null);
  const accountMenuRef = useRef(null);
  const categoryRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
    setIsIos(ios);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    if (ios) {
      setShowInstall(true);
    }

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const container = categoryRef.current;
    if (!container) return;

    const updateScroll = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 0) {
        setCategoryScrollable(false);
        setScrollProgress(0);
        return;
      }
      setCategoryScrollable(true);
      setScrollProgress((container.scrollLeft / maxScroll) * 100);
    };

    updateScroll();
    container.addEventListener("scroll", updateScroll);
    window.addEventListener("resize", updateScroll);

    return () => {
      container.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [categoryRef.current]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  const handleIosInstallClick = () => {
    if (typeof window === "undefined") return;
    window.alert(
      "Use your browser menu, then choose 'Add to Home Screen'."
    );
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setOpen(false);
      router.push("/");
    }
  };
  return (
    <>
      {/* Announcement bar (UNCHANGED) */}
      <div className="bg-blue-600 text-white text-xs text-center py-2 px-4 md:block hidden">
        📞 +254 701 039 256 · Nyamakima, Nairobi CBD · Mon–Sat 8am–6pm
      </div>

      <nav className="bg-white">
        <div className="w-full mx-auto container">
          <div className="flex items-center justify-between gap-6 h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <TruePowerLogo size={40} />
              <span className="font-bold">
                True<span className="text-blue-500">Power</span>
              </span>
            </Link>

            {/* SEARCH (UPGRADED ONLY) */}

            <div className="grow md:block hidden">
              <Suspense fallback={<div className="h-10" />}>
                <SearchProducts />
              </Suspense>
            </div>

            {/* RIGHT ICONS (UNCHANGED) */}
            <div className="flex items-center md:gap-4 sm:gap-3  gap-2">
              {/* Desktop profile / Login button placed next to wishlist/cart */}
              {showInstall && !isStandalone ? (
                <button
                  type="button"
                  onClick={deferredPrompt ? handleInstallClick : handleIosInstallClick}
                  className="btn-secondary inline-flex items-center gap-1 text-xs py-2 px-3"
                >
                  <Download size={14} />
                  {deferredPrompt ? "Install" : isIos ? "Add to Home" : "Install"}
                </button>
              ) : null}
              {user ? (
                <>
                  {isAdmin && (
                    <div>
                      <Link href="/admin" title="Access Admin Page">
                        <ShieldCheck size={16} />
                      </Link>
                    </div>
                  )}
                  <div className="inline-flex items-center" ref={accountRef}>
                    <button
                      type="button"
                      ref={accountBtnRef}
                      onClick={() => {
                        if (!accountMenuOpen) {
                          const r =
                            accountBtnRef.current.getBoundingClientRect();
                          setMenuPos({
                            top: Math.round(r.bottom + 8),
                            left: Math.round(r.right - 160),
                          });
                        }
                        setAccountMenuOpen((s) => !s);
                      }}
                      className="flex relative"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User size={16} />
                      )}
                      <ChevronDown className="absolute w-3 h-3 -right-2 -bottom-0.5" />
                    </button>
                  </div>

                  {accountMenuOpen && menuPos && (
                    <div
                      ref={accountMenuRef}
                      style={{
                        position: "fixed",
                        top: menuPos.top,
                        left: menuPos.left,
                        width: 160,
                      }}
                      className="bg-white border border-border rounded-lg shadow-lg z-[9999]"
                    >
                      <div className="flex flex-col py-1">
                        <Link
                          href="/profile"
                          onClick={() => setAccountMenuOpen(false)}
                          className="px-4 py-2 text-sm text-ink hover:bg-muted"
                        >
                          Profile
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setAccountMenuOpen(false)}
                          className="px-4 py-2 text-sm text-ink hover:bg-muted"
                        >
                          Orders
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setAccountMenuOpen(false)}
                            className="px-4 py-2 text-sm text-ink hover:bg-muted"
                          >
                            Admin Dashboard
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setAccountMenuOpen(false);
                            handleLogout();
                          }}
                          className="text-left px-4 py-2 text-sm text-sub hover:bg-muted"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-brand-600"
                >
                  <User size={16} className="hidden md:inline-flex" />
                  Login
                </Link>
              )}
              {/* Wishlist */}
              <WishListCountLink />

              {/* Shopping Tag */}
              <ShoppingTagButton />

              {/* Menu button open */}
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-label={open ? "Close menu" : "Open menu"}
                title={open ? "Close menu" : "Open menu"}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 p-2 text-slate-700 transition-colors hover:bg-slate-200 md:hidden"
              >
                <Menu />
              </button>
            </div>
          </div>
        </div>
        <div className="relative border-b border-border">
          <div className="w-full mx-auto container overflow-x-auto scrollbar-hide border-t border-border py-3 md:py-2 -mx-4 px-4 md:-mx-0 md:px-0 bg-white">
            <div className="flex gap-2 min-w-max whitespace-nowrap snap-x snap-mandatory px-1" ref={categoryRef}>
              {CATS.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                  <Link
                    key={cat.key}
                    href={cat.to}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex items-center justify-center snap-center whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-extrabold transition duration-200 ease-in-out ${
                      isActive
                        ? "bg-brand-500 text-white shadow-sm border border-brand-500"
                        : "bg-white text-ink border border-border hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                    }`}
                  >
                    {cat.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent md:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent md:hidden" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 md:hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-200"
              style={{ width: `${Math.max(16, Math.min(84, 100 - scrollProgress))}%`, transform: `translateX(${scrollProgress}% )` }}
            />
          </div>
        </div>
        {/* SEARCH (UPGRADED ONLY) */}
        <div className="px-4 pt-3 sm:px-6 lg:px-10 xl:px-1 md:hidden block">
          <Suspense fallback={<div className="h-10" />}>
            <SearchProducts />
          </Suspense>
        </div>

        {/* Announcement bar (UNCHANGED) */}
        <div className="bg-blue-600 text-white text-xs text-center py-2 mt-3 px-4 block md:hidden">
          📞 +254 701 039 256 · Nyamakima, Nairobi CBD · Mon–Sat 8am–6pm
        </div>

        {/* links */}
        {open && (
          <div
            className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />
        )}
        <div
          className={`fixed top-0 right-0  h-full bg-white z-50 px-4 py-3
  transition-transform duration-300 ease-in-out
  w-full md:w-[300px]
  ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="pt-3 text-right">
            <button onClick={() => setOpen(!open)}>
              <X />
            </button>
          </div>
          <div className="flex flex-col uppercase ">
            {links.map((l) => (
              <Link
                key={l.to}
                href={l.to}
                onClick={() => setOpen(!open)}
                className="px-3 pb-3 font-extrabold"
              >
                {l.label}
              </Link>
            ))}
            {(showInstall && !isStandalone) && (
              <button
                type="button"
                onClick={deferredPrompt ? handleInstallClick : handleIosInstallClick}
                className="btn-secondary mt-4 px-3 py-3 text-left"
              >
                <Download size={16} />
                <span className="ml-2">
                  {deferredPrompt ? "Install TruePower" : isIos ? "Add to Home Screen" : "Install App"}
                </span>
              </button>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="px-3 pb-3 font-extrabold text-blue-600"
              >
                Admin Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
