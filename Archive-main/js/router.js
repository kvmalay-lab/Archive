/**
 * router.js
 * Minimal hash router. Routes:
 *   #/                      -> home
 *   #/browse                -> all products with filters
 *   #/product/:id           -> opens product modal over current view
 *   #/collection/:id        -> collection detail
 *
 * App.js registers a single onRouteChange callback; router just parses
 * the hash and calls it with a parsed { path, params } object.
 */

const Router = (() => {
  let listener = null;

  function parseHash() {
    const hash = window.location.hash.replace(/^#/, '') || '/';
    const parts = hash.split('/').filter(Boolean);

    if (parts.length === 0) return { path: 'home', params: {} };
    if (parts[0] === 'browse') return { path: 'browse', params: {} };
    if (parts[0] === 'product' && parts[1]) return { path: 'product', params: { id: parts[1] } };
    if (parts[0] === 'collection' && parts[1]) return { path: 'collection', params: { id: parts[1] } };
    if (parts[0] === 'article' && parts[1]) return { path: 'article', params: { id: parts[1] } };

    return { path: 'home', params: {} };
  }

  function go(path) {
    window.location.hash = path;
  }

  function onChange(callback) {
    listener = callback;
    window.addEventListener('hashchange', () => listener(parseHash()));
  }

  function current() {
    return parseHash();
  }

  return { go, onChange, current };
})();
