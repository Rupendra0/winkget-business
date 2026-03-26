import CategoryPage from "@/components/CategoryPage";
import { categoryPages } from "@/data/categoryData";

type Pageprops = {
  params: Promise<{ slug: string }>;
};

export default async function categoryPage({ params }: Pageprops) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.toLowerCase?.() ?? resolvedParams.slug;
  const data = categoryPages.find((item) => item.slug === slug);

  if (!data) {
    const prettyTitle = String(slug)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return (
      <CategoryPage
        data={{
          slug: String(slug),
          title: prettyTitle,
          city: "Your City",
          banner: {
            title: `${prettyTitle} near you`,
            subtitle: "We are onboarding trusted vendors in your area.",
            imageUrl:
              "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=60",
            cta: "Get notified",
          },
          subcategories: [],
          sublocalities: [],
          listings: [],
          exploreTitle: "Explore",
          exploreInsertAfter: 6,
          exploreTiles: [
            {
              label: "Popular",
              imageUrl: "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=400&q=60",
            },
            {
              label: "Top Rated",
              imageUrl: "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=400&q=60",
            },
            {
              label: "Nearby",
              imageUrl: "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=400&q=60",
            },
            {
              label: "Deals",
              imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60",
            },
            {
              label: "More",
              imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=60",
            },
          ],
        }}
      />
    );
  }

  return <CategoryPage data={data} />;
}