/**
 * data.js
 * Reads from the in-memory bundle (js/data-bundle.js) rather than fetching
 * JSON over the network, so the site works when opened directly via
 * file:// (browsers block fetch() of local files under that origin).
 * Public API is unchanged — everything still returns Promises.
 */

const Store = (() => {
  let manifest = null;
  const cache = {
    products: new Map(),
    collections: new Map(),
    articles: new Map()
  };

  async function loadIndex() {
    manifest = window.ARCHIVE_DATA.index;
    return manifest;
  }

  // Lazy-load a single product
  async function getProduct(id) {
    if (cache.products.has(id)) return cache.products.get(id);
    const product = window.ARCHIVE_DATA.products[id] || null;
    if (product) cache.products.set(id, product);
    return product;
  }

  // Lazy-load a single collection
  async function getCollection(id) {
    if (cache.collections.has(id)) return cache.collections.get(id);
    const collection = window.ARCHIVE_DATA.collections[id] || null;
    if (collection) cache.collections.set(id, collection);
    return collection;
  }

  // Lazy-load a single article
  async function getArticle(id) {
    if (cache.articles.has(id)) return cache.articles.get(id);
    const article = window.ARCHIVE_DATA.articles[id] || null;
    if (article) cache.articles.set(id, article);
    return article;
  }

  // Batch load for views that require the full dataset (Search, Browse)
  async function loadAllProducts() {
    if (cache.products.size === manifest.products.length) return Array.from(cache.products.values());
    const promises = manifest.products.map(filename => getProduct(filename.replace('.json', '')));
    const products = await Promise.all(promises);
    return products.filter(Boolean);
  }

  async function loadAllCollections() {
    if (cache.collections.size === manifest.collections.length) return Array.from(cache.collections.values());
    const promises = manifest.collections.map(filename => getCollection(filename.replace('.json', '')));
    const collections = await Promise.all(promises);
    return collections.filter(Boolean);
  }

  // Batch load for the homepage editorial section
  async function loadAllArticles() {
    if (cache.articles.size === manifest.articles.length) return Array.from(cache.articles.values());
    const promises = manifest.articles.map(filename => getArticle(filename.replace('.json', '')));
    const articles = await Promise.all(promises);
    return articles.filter(Boolean);
  }

  return {
    loadIndex,
    getProduct,
    getCollection,
    getArticle,
    loadAllProducts,
    loadAllCollections,
    loadAllArticles,
    getCategories: () => [...new Set(Array.from(cache.products.values()).map(p => p.category))]
  };
})();
