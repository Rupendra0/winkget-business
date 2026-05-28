const { MeiliSearch } = require("meilisearch");

const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700";
const MEILI_API_KEY = process.env.MEILISEARCH_API_KEY || "";
const MEILI_INDEX = process.env.MEILISEARCH_INDEX || "winkget-search";

const client = new MeiliSearch({
  host: MEILI_HOST,
  apiKey: MEILI_API_KEY,
});

const getSearchIndex = () => client.index(MEILI_INDEX);

module.exports = {
  client,
  getSearchIndex,
  MEILI_INDEX,
};
