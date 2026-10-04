const SITE_URL = "https://truepower.co.ke";
export const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

export function createSeo({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
}) {
  const fullTitle = title
    ? `${title} | TruePower Kenya`
    : "TruePower Kenya | Instant Showers, Solar & Electrical Solutions";

  const url = new URL(path, SITE_URL).toString();

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: url,
    },
    robots: noindex ? "noindex,nofollow" : "index,follow",
    openGraph: {
      title: fullTitle,
      description,
      url,
      type,
      images: [{ url: image }],
      siteName: "TruePower Kenya",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

export { SITE_URL };
