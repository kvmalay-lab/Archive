/**
 * search.js
 * Pure functions: take a product list + query/filters, return a filtered list.
 * No DOM access here — render.js owns the DOM.
 */

const Search = (() => {
  function byQuery(products, query) {
    if (!query || query.trim().length < 1) return products;
    const q = query.toLowerCase();
    return products.filter(p => {
      const haystack = [
        p.name,
        p.brand,
        p.category,
        p.subcategory,
        ...(p.colours || []),
        ...(p.materials || [])
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  function byCategory(products, category) {
    if (!category) return products;
    return products.filter(p => p.category === category);
  }

  function byBrand(products, brand) {
    if (!brand) return products;
    return products.filter(p => p.brand === brand);
  }

  function byColour(products, colour) {
    if (!colour) return products;
    return products.filter(p => (p.colours || []).includes(colour));
  }

  function byMinConfidence(products, min) {
    if (!min) return products;
    return products.filter(p => p.confidence >= min);
  }

  function byCollection(products, collectionId) {
    if (!collectionId) return products;
    return products.filter(p => (p.collections || []).includes(collectionId));
  }

  /**
   * Applies an arbitrary set of active filters in one pass.
   * filters: { query, category, brand, colour, minConfidence, collection }
   */
  function applyAll(products, filters) {
    let result = products;
    if (filters.query) result = byQuery(result, filters.query);
    if (filters.category) result = byCategory(result, filters.category);
    if (filters.brand) result = byBrand(result, filters.brand);
    if (filters.colour) result = byColour(result, filters.colour);
    if (filters.minConfidence) result = byMinConfidence(result, filters.minConfidence);
    if (filters.collection) result = byCollection(result, filters.collection);
    return result;
  }

  return { byQuery, byCategory, byBrand, byColour, byMinConfidence, byCollection, applyAll };
})();
