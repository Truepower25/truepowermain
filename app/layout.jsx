import "./globals.css";
import { DEFAULT_IMAGE, SITE_URL } from "@/components/Seo";
import { Suspense } from "react";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest.webmanifest",
  title: {
    default: "TruePower Kenya",
    template: "%s | TruePower Kenya",
  },
  description:
    "Instant showers, solar, pumps, and electrical solutions for Kenyan homes.",
  applicationName: "TruePower Kenya",
  authors: [{ name: "TruePower Kenya" }],
  creator: "TruePower Kenya",
  publisher: "TruePower Kenya",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TruePower",
  },
  openGraph: {
    siteName: "TruePower Kenya",
    type: "website",
    images: [{ url: DEFAULT_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_IMAGE],
  },
};

export const viewport = {
  themeColor: "#1B4FD8",
};

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import RouteAnalytics from "@/components/RouteAnalytics";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import RouteResume from "@/components/RouteResume";
import FloatingActions from "@/components/FloatingActions";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>
            <Suspense fallback={null}>
              <RouteAnalytics />
            </Suspense>
            <Suspense fallback={null}>
              <RouteResume />
            </Suspense>
            <ServiceWorkerRegistration />
            <CartDrawer></CartDrawer>
            <FloatingActions />
            {children}
            <Footer></Footer>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
