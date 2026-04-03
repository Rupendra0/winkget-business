import CategoryPage from "@/components/CategoryPage";
import { categoryPages } from "@/data/categoryData";
import {
  buildFallbackCategoryPageData,
  fetchCategories,
  fetchSubcategories,
  fetchVendors,
  toCategoryPageDataFromCatalog,
} from "@/lib/catalogClient";

type Pageprops = {
  params: Promise<{ slug: string }>;
};

export default async function categoryPage({ params }: Pageprops) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.toLowerCase?.() ?? resolvedParams.slug;
  const categories = await fetchCategories();
  const category = categories.find((item) => item.slug === slug);

  if (category) {
    const [subcategories, vendors] = await Promise.all([
      fetchSubcategories({ categoryId: category.id }),
      fetchVendors({ categoryId: category.id }),
    ]);

    const data = toCategoryPageDataFromCatalog({
      category,
      vendors,
      subcategories,
    });

    return <CategoryPage data={data} />;
  }

  const data = categoryPages.find((item) => item.slug === slug);

  if (!data) {
    return <CategoryPage data={buildFallbackCategoryPageData(String(slug))} />;
  }

  return <CategoryPage data={data} />;
}