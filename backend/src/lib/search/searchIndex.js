const SEARCHABLE_ATTRIBUTES = [
  "productName",
  "vendorName",
  "subcategoryName",
  "categoryName",
  "products",
  "tags",
  "searchableText",
];

const FILTERABLE_ATTRIBUTES = [
  "type",
  "cities",
  "categorySlug",
  "subcategorySlug",
  "vendorId",
  "vendorStatus",
  "isStoreOpen",
  "rating",
];

const SORTABLE_ATTRIBUTES = ["rating", "reviews", "updatedAt"];

const RANKING_RULES = [
  "words",
  "typo",
  "proximity",
  "attribute",
  "sort",
  "exactness",
];

const TYPO_TOLERANCE = {
  minWordSizeForTypos: {
    oneTypo: 3,
    twoTypos: 7,
  },
};

const DEFAULT_SYNONYMS = {
  restro: ["restaurant"],
  resto: ["restaurant"],
  restraunt: ["restaurant"],
  resturant: ["restaurant"],
  hotle: ["hotel"],
  iphon: ["iphone"],
  samung: ["samsung"],
  electrian: ["electrician"],
  beautician: ["beauty"],
};

const configureSearchIndex = async (index) => {
  await index.updateSettings({
    searchableAttributes: SEARCHABLE_ATTRIBUTES,
    filterableAttributes: FILTERABLE_ATTRIBUTES,
    sortableAttributes: SORTABLE_ATTRIBUTES,
    rankingRules: RANKING_RULES,
    typoTolerance: TYPO_TOLERANCE,
    synonyms: DEFAULT_SYNONYMS,
  });
};

module.exports = {
  SEARCHABLE_ATTRIBUTES,
  FILTERABLE_ATTRIBUTES,
  SORTABLE_ATTRIBUTES,
  RANKING_RULES,
  TYPO_TOLERANCE,
  DEFAULT_SYNONYMS,
  configureSearchIndex,
};
