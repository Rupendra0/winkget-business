import ProductDetailPageClient from "@/components/ProductDetailPageClient";
import { resolveProductBySlug } from "@/lib/storeCatalog";
import { notFound } from "next/navigation";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolveProductBySlug(slug);

  if (!resolved) {
    notFound();
  }

  return <ProductDetailPageClient key={resolved.product.id} product={resolved.product} relatedProducts={resolved.relatedProducts} />;
}
