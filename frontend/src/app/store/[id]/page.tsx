import StorePage from "@/components/StorePage";
import { resolveStoreDataById } from "@/lib/storeCatalog";
import { notFound } from "next/navigation";

export const revalidate = 30;

export default async function StoreProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storeData = await resolveStoreDataById(id);

  if (!storeData) {
    notFound();
  }

  return <StorePage data={storeData} />;
}
