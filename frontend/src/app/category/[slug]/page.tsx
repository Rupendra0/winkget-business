import CategoryPage from "@/components/CategoryPage";
import { categoryPages } from "@/data/categoryData";
import {
  buildFallbackCategoryPageData,
  fetchCities,
  fetchCategories,
  fetchSubcategories,
  fetchVendors,
  toCategoryPageDataFromCatalog,
} from "@/lib/catalogClient";

type Pageprops = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    city?: string;
    sublocality?: string;
    subcategoryId?: string;
  }>;
};

const normalizeQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim();
  }
  return String(value || "").trim();
};

export default async function categoryPage({ params, searchParams }: Pageprops) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const slug = resolvedParams.slug?.toLowerCase?.() ?? resolvedParams.slug;
  const selectedCity = normalizeQueryValue(resolvedSearchParams.city);
  const selectedSublocality = normalizeQueryValue(resolvedSearchParams.sublocality);
  const selectedSubcategoryId = normalizeQueryValue(resolvedSearchParams.subcategoryId);
  const categories = await fetchCategories();
  const category = categories.find((item) => item.slug === slug);

  if (category) {
    const [subcategories, vendors, cities] = await Promise.all([
      fetchSubcategories({ categoryId: category.id }),
      fetchVendors({
        categoryId: category.id,
        city: selectedCity || undefined,
        sublocality: selectedSublocality || undefined,
        subcategoryId: selectedSubcategoryId || undefined,
      }),
      fetchCities(),
    ]);

    const baseData = toCategoryPageDataFromCatalog({
      category,
      vendors,
      subcategories,
    });

    const cityNames = cities.map((item) => item.name);
    const localitiesByCity: Record<string, string[]> = {};
    cities.forEach((cityItem) => {
      localitiesByCity[cityItem.name] = cityItem.localities.map((locality) => locality.name);
    });

    const effectiveCity =
      selectedCity || (cityNames.includes(baseData.city) ? baseData.city : cityNames[0] || baseData.city);
    const effectiveSublocality =
      selectedSublocality && (localitiesByCity[effectiveCity] || []).includes(selectedSublocality)
        ? selectedSublocality
        : "All";

    const data = {
      ...baseData,
      selectedCity: effectiveCity,
      selectedSublocality: effectiveSublocality,
      availableCities: cityNames.length > 0 ? cityNames : baseData.city ? [baseData.city] : [],
      localitiesByCity,
      sublocalities: localitiesByCity[effectiveCity] || baseData.sublocalities,
    };

    return <CategoryPage data={data} />;
  }

  const data = categoryPages.find((item) => item.slug === slug);

  if (!data) {
    const fallback = buildFallbackCategoryPageData(String(slug));
    return <CategoryPage data={fallback} />;
  }

  const filteredListings = data.listings.filter((listing) => {
    const matchesCity = !selectedCity || listing.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesSublocality =
      !selectedSublocality || listing.sublocality.toLowerCase() === selectedSublocality.toLowerCase();
    return matchesCity && matchesSublocality;
  });

  const availableCities = Array.from(new Set(data.listings.map((listing) => listing.city).filter(Boolean)));
  const localitiesByCity = data.listings.reduce<Record<string, string[]>>((acc, listing) => {
    const cityName = String(listing.city || "").trim();
    const localityName = String(listing.sublocality || "").trim();
    if (!cityName || !localityName) return acc;

    const existing = acc[cityName] || [];
    if (!existing.includes(localityName)) {
      acc[cityName] = [...existing, localityName];
    }
    return acc;
  }, {});

  return (
    <CategoryPage
      data={{
        ...data,
        listings: filteredListings,
        selectedCity: selectedCity || data.city,
        selectedSublocality: selectedSublocality || "All",
        availableCities,
        localitiesByCity,
        sublocalities: localitiesByCity[selectedCity || data.city] || data.sublocalities,
      }}
    />
  );
}