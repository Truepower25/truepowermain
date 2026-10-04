import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/products";
import { createSeo, SITE_URL, DEFAULT_IMAGE } from "@/components/Seo";
import ProductContent from "@/ui/ProductContent";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = params;
  const product = await getProduct(id);

  if (!product) {
    return createSeo({
      title: "Product not found",
      description: "The product you are looking for does not exist.",
      path: `/product/${id}`,
      noindex: true,
    });
  }

  const images = Array.isArray(product.images)
    ? product.images
    : product.images
      ? [product.images]
      : [];

  const productImage = images[0] || DEFAULT_IMAGE;
  const productDescription =
    product.description || `Buy ${product.name} from TruePower Kenya.`;

  return createSeo({
    title: product.name,
    description: productDescription,
    path: `/product/${product.id}`,
    image: productImage,
    type: "product",
  });
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const { data: related } = await getProducts({
    category: product.cat,
    limit: 5,
    excludeId: product.id,
  });

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.length ? product.images : [DEFAULT_IMAGE],
    description:
      product.description || `Buy ${product.name} from TruePower Kenya.`,
    sku: product.model || String(product.id),
    brand: {
      "@type": "Brand",
      name: "TruePower Kenya",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "KES",
      price: String(product.price),
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/product/${product.id}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />
      <ProductContent product={product} related={related} />
    </>
  );
}
