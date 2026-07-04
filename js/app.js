/**
 * app.js
 * State management, event binding, and route orchestration.
 * Owns no DOM construction — that's render.js's job.
 */

(async function App() {
  let allProducts = [];
  let activeFilters = { query: '', category: null, brand: null, colour: null, collection: null };

  const navLinks = document.getElementById('nav-links');
  const searchInput = document.getElementById('search-input');
  const modalOverlay = document.getElementById('modal-overlay');

  init();

  async function init() {
    await Store.loadIndex(); // Boot is now instantaneous. Only manifest loads.

    buildNav();
    bindSearch();
    bindModalClose();

    Router.onChange(handleRoute);
    handleRoute(Router.current());
  }

  function buildNav() {
    navLinks.innerHTML = '';
    navLinks.appendChild(makeNavLink('Browse all', () => Router.go('/browse')));
  }

  function makeNavLink(label, onClick) {
    const a = document.createElement('button');
    a.className = 'nav-link';
    a.textContent = label;
    a.addEventListener('click', onClick);
    a.setAttribute('type', 'button');
    return a;
  }

  /**
   * Search input binding: purely state management.
   * Delegates all rendering to Render.searchView().
   */
  function bindSearch() {
    searchInput.addEventListener('input', async (e) => {
      activeFilters.query = e.target.value.trim();
      if (activeFilters.query.length > 0) {
        const searchableProducts = await Store.loadAllProducts();
        const results = Search.applyAll(searchableProducts, activeFilters);

        Render.searchView(results, activeFilters.query, id => {
          searchInput.blur();
          Router.go(`/product/${id}`);
        });
      } else {
        handleRoute(Router.current());
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        activeFilters.query = '';
        handleRoute(Router.current());
      }
    });
  }

  function bindModalClose() {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) Render.closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') Render.closeModal();
    });
  }

  async function onBrowseFilterChange(newFilters) {
    activeFilters = newFilters;
    Render.browseView(allProducts, activeFilters, onBrowseFilterChange);
  }

  // Everything the homepage needs, fetched in parallel rather than sequentially.
  async function loadHomeData() {
    const [products, collections, articles] = await Promise.all([
      Store.loadAllProducts(),
      Store.loadAllCollections(),
      Store.loadAllArticles()
    ]);
    return { products, collections, articles };
  }

  async function handleRoute(route) {
    Render.closeModal();

    if (route.path === 'home') {
      const { products, collections, articles } = await loadHomeData();
      Render.homeView(products, collections, articles);
    } else if (route.path === 'browse') {
      allProducts = await Store.loadAllProducts();
      Render.browseView(allProducts, activeFilters, onBrowseFilterChange);
    } else if (route.path === 'collection') {
      const collection = await Store.getCollection(route.params.id);
      if (!collection) { Router.go('/'); return; }

      // Lazy fetch only the products needed for this collection
      const productPromises = (collection.productIds || []).map(id => Store.getProduct(id));
      const products = (await Promise.all(productPromises)).filter(Boolean);
      Render.collectionView(collection, products);
    } else if (route.path === 'article') {
      const article = await Store.getArticle(route.params.id);
      if (!article) { Router.go('/'); return; }
      await Render.articleView(article);
    } else if (route.path === 'product') {
      const product = await Store.getProduct(route.params.id);
      if (!product) { Router.go('/'); return; }

      // If direct linking, lazy-render the home view beneath the modal for context
      if (document.getElementById('app-root').innerHTML === '') {
        const { products, collections, articles } = await loadHomeData();
        Render.homeView(products, collections, articles);
      }
      await Render.openProductModal(product);
    }
  }
})();