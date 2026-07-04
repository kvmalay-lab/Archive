/**
 * render.js
 * All DOM construction for every view (grid, modal, filters, homepage, etc).
 * Owns no application state — everything it draws is passed in by app.js.
 * Product grids use a single delegated click/keydown listener on the .grid
 * parent (via target.closest('.card')) rather than one listener per card.
 */

const Render = (() => {
  const root = document.getElementById('app-root');
  let previousActiveElement = null;

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function clear(node) {
    node.innerHTML = '';
  }

  // A deliberate plate for when no photograph is available — reads as a
  // considered object label, not a broken image.
  function placeholderPlate(brand, name) {
    return `<div class="ph-large"><span class="ph-large-brand">${brand}</span><span class="ph-large-rule"></span><span class="ph-large-name">${name}</span></div>`;
  }

  /**
   * A clickable/keyboard-activatable card used for the homepage's
   * editorial and collections lists. Wires up role=button semantics
   * and both click and Enter/Space activation.
   */
  function activatableCard(cls, innerHtml, onActivate) {
    const card = el('article', cls, innerHtml);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', onActivate);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    });
    return card;
  }

  /**
   * Product card: no event listeners attached here.
   * All events delegated to the parent .grid container.
   */
  function productCard(product) {
    const card = el('div', 'card');
    card.dataset.id = product.id; // Store product ID for delegation
    const imgWrap = el('div', 'card-img');

    if (product.thumbnail && !product.thumbnail.startsWith('placeholder')) {
      const img = document.createElement('img');
      img.src = product.thumbnail;
      img.alt = product.name;
      img.loading = 'lazy';
      img.onerror = function() {
        this.style.display = 'none';
        imgWrap.innerHTML = `<span class="ph">${product.brand}</span>`;
      };
      imgWrap.appendChild(img);
    } else {
      imgWrap.innerHTML = `<span class="ph">${product.brand}</span>`;
    }

    const body = el('div', 'card-body');
    body.innerHTML = `
      <div class="card-brand">${product.brand.toUpperCase()}</div>
      <div class="card-name">${product.name}</div>
    `;

    card.appendChild(imgWrap);
    card.appendChild(body);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${product.name} by ${product.brand}`);
    return card;
  }

  /**
   * Product grid with delegated event handling: one click listener and one
   * keydown listener on .grid, rather than one pair per card, identify the
   * activated card via target.closest('.card') and call onCardClick(productId).
   */
  function productGrid(products, onCardClick) {
    const grid = el('div', 'grid');
    if (products.length === 0) {
      grid.appendChild(el('div', 'empty-state', 'No products in this view. Try adjusting your filters or search.'));
      return grid;
    }

    products.forEach(p => {
      grid.appendChild(productCard(p));
    });

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card && card.dataset.id) {
        onCardClick(card.dataset.id);
      }
    });

    grid.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.card')) {
        e.preventDefault();
        const card = e.target.closest('.card');
        if (card && card.dataset.id) {
          onCardClick(card.dataset.id);
        }
      }
    });

    return grid;
  }

  /**
   * A radiogroup of filter pills. Each pill gets its own listener — filter
   * bars are small (a handful of categories), so delegation isn't worthwhile here.
   */
  function filterBar(label, options, activeValue, onSelect) {
    const bar = el('div', 'filter-bar');
    bar.setAttribute('role', 'radiogroup');
    bar.setAttribute('aria-label', `Filter by ${label}`);

    const allPill = el('button', 'filter-pill' + (!activeValue ? ' active' : ''), 'All');
    allPill.setAttribute('role', 'radio');
    allPill.setAttribute('aria-checked', !activeValue ? 'true' : 'false');
    allPill.addEventListener('click', () => onSelect(null));
    bar.appendChild(allPill);

    options.forEach(opt => {
      const pill = el('button', 'filter-pill' + (activeValue === opt ? ' active' : ''), opt);
      pill.setAttribute('role', 'radio');
      pill.setAttribute('aria-checked', activeValue === opt ? 'true' : 'false');
      pill.addEventListener('click', () => onSelect(opt));
      bar.appendChild(pill);
    });
    return bar;
  }

  /**
   * Product detail modal. Traps focus while open and restores focus to
   * whatever triggered it on close (see closeModal).
   */
  async function openProductModal(product) {
    previousActiveElement = document.activeElement;
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    clear(container);

    const modal = el('div', 'modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', `${product.brand} ${product.name}`);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close product details');
    closeBtn.addEventListener('click', closeModal);
    modal.appendChild(closeBtn);

    const grid = el('div', 'modal-grid');

    const imgSection = el('div', 'modal-img-section');
    const imgBox = el('div', 'modal-img');
    if (product.heroImage && !product.heroImage.startsWith('placeholder')) {
      const img = document.createElement('img');
      img.src = product.heroImage;
      img.alt = product.name;
      img.onerror = function() {
        this.style.display = 'none';
        imgBox.innerHTML = placeholderPlate(product.brand, product.name);
      };
      imgBox.appendChild(img);
    } else {
      imgBox.innerHTML = placeholderPlate(product.brand, product.name);
    }
    imgSection.appendChild(imgBox);

    // Optional gallery: additionalImages plus the named editorial slots.
    // Each thumbnail removes itself if the file doesn't exist, so the
    // schema can be populated later with zero code changes.
    const galleryImages = [
      ...(product.additionalImages || []),
      product.editorialImage, product.detailImage, product.materialImage
    ].filter(Boolean);
    if (galleryImages.length) {
      const gallery = el('div', 'modal-gallery');
      galleryImages.forEach(src => {
        const thumb = document.createElement('img');
        thumb.src = src;
        thumb.alt = '';
        thumb.className = 'modal-gallery-img';
        thumb.loading = 'lazy';
        thumb.onerror = function() { this.remove(); };
        thumb.addEventListener('click', () => {
          const main = imgBox.querySelector('img');
          if (main) main.src = src;
        });
        gallery.appendChild(thumb);
      });
      imgSection.appendChild(gallery);
    }
    grid.appendChild(imgSection);

    const info = el('div', 'modal-info');
    info.innerHTML = `
      <div class="modal-header">
        <div class="modal-brand">${product.brand.toUpperCase()}</div>
        <h2 class="modal-title">${product.name}</h2>
        ${product.description ? `<p class="modal-lead">${product.description}</p>` : ''}
      </div>
    `;

    // The emotional core of the piece, given the first word — before any spec sheet.
    if (product.whyThisFitsMyArchive) {
      const hero = el('div', 'modal-hero-quote');
      hero.innerHTML = `"${product.whyThisFitsMyArchive}"`;
      info.appendChild(hero);
    }

    const hasSpecs = product.price || product.subcategory || product.priority || product.purchasePriority ||
      product.bestSeason || product.bestOccasions ||
      (product.materials && product.materials.length) || (product.colours && product.colours.length);
    if (hasSpecs) {
      const specsHtml = document.createElement('div');
      specsHtml.className = 'modal-specs';
      if (product.price) specsHtml.innerHTML += metaRow('Price', product.price);
      if (product.subcategory) specsHtml.innerHTML += metaRow('Category', product.subcategory);
      if (product.materials && product.materials.length) specsHtml.innerHTML += metaRow('Materials', product.materials.join(', '));
      if (product.colours && product.colours.length) specsHtml.innerHTML += metaRow('Available in', product.colours.join(', '));
      if (product.bestSeason) specsHtml.innerHTML += metaRow('Best Season', product.bestSeason);
      if (product.bestOccasions) specsHtml.innerHTML += metaRow('Best Occasions', product.bestOccasions);
      if (product.priority) specsHtml.innerHTML += metaRow('Status', product.priority);
      if (product.purchasePriority) specsHtml.innerHTML += metaRow('Purchase Priority', product.purchasePriority);
      info.appendChild(specsHtml);
    }

    if (product.patina) {
      const patinaSection = el('div', 'modal-why-section');
      patinaSection.innerHTML = `<div class="modal-section-label">Current Patina &amp; Wear</div><div class="modal-why">"${product.patina}"</div>`;
      info.appendChild(patinaSection);
    }

    // The remaining first-person notes read as one continuous passage rather
    // than several separately-labelled spec-sheet entries. Includes the
    // archiveNotes/stylingNotes fields some older entries use in place of
    // the newer whyIChooseThis/whatItPairsWithInMyCollection/whatMakesItTimeless trio.
    const notes = [
      product.whatItReplaces, product.whyIChooseThis, product.whatItPairsWithInMyCollection,
      product.layeringCombinations, product.colourCombinations, product.costPerWearReasoning,
      product.whatMakesItTimeless, product.archiveNotes, product.stylingNotes
    ].filter(Boolean);
    if (notes.length) {
      const notesSection = el('div', 'modal-why-section');
      notesSection.innerHTML = `<div class="modal-section-label">Notes</div>${notes.map(n => `<p class="modal-body-text">${n}</p>`).join('')}`;
      info.appendChild(notesSection);
    }

    // Shopping section — buy recommendation, value score, where to buy, alternatives
    const hasShopping = product.buyRecommendation || product.valueScore || product.indianRetailers?.length || product.purchaseLinks;
    if (hasShopping) {
      const shopSection = el('div', 'modal-shop-section');

      if (product.buyRecommendation) {
        const rec = el('div', 'modal-buy-rec');
        const scoreHtml = product.valueScore ? `<span class="buy-score">${product.valueScore}/10</span>` : '';
        rec.innerHTML = `<div class="modal-section-label">Buy Recommendation ${scoreHtml}</div><p class="buy-rec-text">${product.buyRecommendation}</p>`;
        shopSection.appendChild(rec);
      }

      const retailers = product.indianRetailers;
      if (retailers && retailers.length) {
        const whereDiv = el('div', 'modal-where-to-buy');
        whereDiv.innerHTML = `<div class="modal-section-label">Where to Buy in India</div>`;
        const list = el('div', 'retailer-list');
        retailers.forEach(r => {
          if (r.url) {
            const a = document.createElement('a');
            a.href = r.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'retailer-link';
            a.textContent = r.name;
            list.appendChild(a);
          } else {
            const span = el('span', 'retailer-link retailer-link--no-url', r.name);
            list.appendChild(span);
          }
        });
        whereDiv.appendChild(list);
        shopSection.appendChild(whereDiv);
      }

      if (product.importNote) {
        const note = el('p', 'import-note', `⚠ ${product.importNote}`);
        shopSection.appendChild(note);
      }

      const hasAlts = product.alternativeUnder3000 || product.alternativeUnder10000 || product.premiumAlternative;
      if (hasAlts) {
        const altsDiv = el('div', 'modal-alternatives');
        altsDiv.innerHTML = `<div class="modal-section-label">Alternatives</div>`;
        if (product.alternativeUnder3000) {
          altsDiv.innerHTML += `<p class="alt-row"><span class="alt-tier">Under ₹3,000</span>${product.alternativeUnder3000}</p>`;
        }
        if (product.alternativeUnder10000) {
          altsDiv.innerHTML += `<p class="alt-row"><span class="alt-tier">Under ₹10,000</span>${product.alternativeUnder10000}</p>`;
        }
        if (product.premiumAlternative) {
          altsDiv.innerHTML += `<p class="alt-row"><span class="alt-tier">Premium</span>${product.premiumAlternative}</p>`;
        }
        shopSection.appendChild(altsDiv);
      }

      info.appendChild(shopSection);
    }

    const relatedIds = [...new Set([...(product.similarProducts || []), ...(product.relatedProducts || [])])];
    if (relatedIds.length) {
      const relatedProducts = (await Promise.all(relatedIds.map(rid => Store.getProduct(rid)))).filter(Boolean);
      if (relatedProducts.length) {
        const relatedSection = el('div', 'modal-why-section');
        relatedSection.innerHTML = `<div class="modal-section-label">Also In The Archive</div><div class="modal-chips"></div>`;
        const chipsContainer = relatedSection.querySelector('.modal-chips');

        relatedProducts.forEach(related => {
          const chip = el('button', 'chip', related.name);
          chip.addEventListener('click', () => Router.go(`/product/${related.id}`));
          chipsContainer.appendChild(chip);
        });
        info.appendChild(relatedSection);
      }
    }

    grid.appendChild(imgSection);
    grid.appendChild(info);
    modal.appendChild(grid);
    container.appendChild(modal);
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');

    // Focus trap in modal
    setTimeout(() => {
      const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        first.focus();

        modal.addEventListener('keydown', function(e) {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
              if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
          }
        });
      }
    }, 50);
  }

  function metaRow(label, value) {
    return `<div class="modal-meta-row"><span>${label}</span><span>${value}</span></div>`;
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    if (previousActiveElement) {
      setTimeout(() => previousActiveElement.focus(), 50);
    }
  }

  function searchView(results, query, onCardClick) {
    clear(root);
    root.className = 'search-view';

    const header = el('section', 'search-header');
    header.innerHTML = `
      <h1 class="search-title">Search Results</h1>
      <p class="search-desc" aria-live="polite">${results.length} match${results.length !== 1 ? 'es' : ''} for "<em>${query}</em>"</p>
    `;
    root.appendChild(header);

    const resultsSection = el('section', 'search-results');
    resultsSection.appendChild(productGrid(results, onCardClick));
    root.appendChild(resultsSection);
  }

  // Hand-picked lines drawn verbatim from the archive's own editorial voice
  // (see data/articles/*.json) — used as pull quotes rather than restating
  // the same ideas as new marketing copy.
  const ARTICLE_PULL_QUOTES = {
    'why-black': 'I stopped thinking about colour five years ago and it simplified everything.',
    'why-material-matters': 'I stopped trusting brands. I started trusting material.',
    'design-philosophy': 'I wear black because it works for me, not because everyone should wear black.',
    'building-capsule': 'I know what works. I know who I am. I don’t need more.',
    'quiet-luxury-explained': 'Quiet luxury isn’t about hiding wealth. It’s about demonstrating knowledge.'
  };

  const NAMED_SWATCHES = {
    black: '#0a0a0a', charcoal: '#36454f', 'off-white': '#e8e4dc',
    navy: '#1b263b', cream: '#f1e9db', taupe: '#b8a99a', white: '#f2f0ea',
    steel: '#71797e', gold: '#b08d57'
  };

  function swatchColor(value) {
    if (value.startsWith('#')) return value;
    return NAMED_SWATCHES[value.toLowerCase()] || '#5e5e5e';
  }

  function manifestoChapter(articles) {
    const quoted = articles.filter(a => ARTICLE_PULL_QUOTES[a.id]).slice(0, 3);
    if (!quoted.length) return null;

    const section = el('section', 'home-chapter');
    section.innerHTML = `<h2 class="section-label">What I Value</h2>`;
    const grid = el('div', 'quote-grid');
    quoted.forEach(article => {
      const quote = el('blockquote', 'pull-quote');
      quote.innerHTML = `
        <p class="pull-quote-text">${ARTICLE_PULL_QUOTES[article.id]}"</p>
        <cite class="pull-quote-cite">${article.title}</cite>
      `;
      quote.style.cursor = 'pointer';
      quote.addEventListener('click', () => Router.go(`/article/${article.id}`));
      grid.appendChild(quote);
    });
    section.appendChild(grid);
    return section;
  }

  // Colour and material read as one mood, not two separate inventories.
  // Capped and de-duplicated so the row reads as an edit, not an inventory.
  function paletteChapter(collections) {
    const names = [...new Set(collections.flatMap(c => c.colorPalette || []))].slice(0, 7);
    // A curated statement, not an inventory — six materials, hand-ranked by
    // how much of the wardrobe they actually describe.
    const MATERIAL_ORDER = ['Supima cotton', 'Selvedge denim', 'Natural fibres', 'Italian leather', 'Wool', 'Stainless steel'];
    const available = new Set(collections.flatMap(c => c.materials || []));
    const materials = MATERIAL_ORDER.filter(m => available.has(m));
    if (!names.length && !materials.length) return null;

    const section = el('section', 'home-chapter');
    section.innerHTML = `<h2 class="section-label">Palette</h2>`;
    if (names.length) {
      const row = el('div', 'swatch-row');
      names.forEach(name => {
        const swatch = el('div', 'swatch');
        swatch.style.background = swatchColor(name);
        swatch.innerHTML = `<span class="swatch-label">${name.replace('#', '')}</span>`;
        row.appendChild(swatch);
      });
      section.appendChild(row);
    }
    if (materials.length) {
      const line = el('p', 'material-line');
      line.innerHTML = materials.join('<span class="sep">&middot;</span>');
      section.appendChild(line);
    }
    return section;
  }

  // The five pieces that define the wardrobe — the daily default, named plainly.
  const UNIFORM_IDS = ['uniqlo-supima-tee', 'uniqlo-selvedge-jean', 'samba-og', 'cartier-santos', 'massimo-dutti-oxford'];

  function myUniformChapter(products) {
    const items = UNIFORM_IDS.map(id => products.find(p => p.id === id)).filter(Boolean);
    if (!items.length) return null;

    const section = el('section', 'home-chapter');
    section.innerHTML = `<h2 class="section-label">My Uniform</h2>`;
    const list = el('div', 'index-list');
    items.forEach((item, i) => {
      const row = el('div', 'index-item');
      row.innerHTML = `
        <span class="index-num">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <h3 class="index-title">${item.name}</h3>
          <p class="index-subtitle">${item.brand}</p>
        </div>
        <span class="index-meta">${item.category}</span>
      `;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.addEventListener('click', () => Router.go(`/product/${item.id}`));
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Router.go(`/product/${item.id}`); } });
      list.appendChild(row);
    });
    section.appendChild(list);
    return section;
  }

  function editorialChapter(articles) {
    if (!articles.length) return null;
    const section = el('section', 'home-chapter');
    section.innerHTML = `<h2 class="section-label">Editorial</h2>`;
    const list = el('div', 'index-list');
    articles.forEach((article, i) => {
      const item = el('div', 'index-item');
      item.innerHTML = `
        <span class="index-num">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <h3 class="index-title">${article.title}</h3>
          <p class="index-subtitle">${article.subtitle}</p>
        </div>
        <span class="index-meta">${article.readingTime}</span>
      `;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.addEventListener('click', () => Router.go(`/article/${article.id}`));
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Router.go(`/article/${article.id}`); } });
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  function exhibitionsChapter(collections) {
    if (!collections.length) return null;
    const section = el('section', 'home-chapter');
    section.innerHTML = `<h2 class="section-label">Collections</h2>`;
    const grid = el('div', 'exhibit-grid');
    collections.forEach(collection => {
      const card = activatableCard('exhibit-card', `
        <h3 class="exhibit-name">${collection.name}</h3>
        ${collection.description ? `<p class="exhibit-desc">${collection.description}</p>` : ''}
      `, () => Router.go(`/collection/${collection.id}`));
      grid.appendChild(card);
    });
    section.appendChild(grid);
    return section;
  }

  function homeView(products, collections, articles) {
    clear(root);
    root.className = 'home-view';

    const header = el('section', 'home-header');
    header.innerHTML = `
      <h1 class="home-title">My Aesthetic</h1>
      <p class="home-subtitle">Proportion, restraint, intention</p>
    `;
    root.appendChild(header);

    [
      manifestoChapter(articles || []),
      myUniformChapter(products || []),
      paletteChapter(collections || []),
      exhibitionsChapter(collections || []),
      editorialChapter(articles || [])
    ].forEach(chapter => { if (chapter) root.appendChild(chapter); });

    const cta = el('section', 'archive-cta');
    const link = el('span', 'archive-cta-link', 'Browse the full archive');
    link.setAttribute('role', 'button');
    link.setAttribute('tabindex', '0');
    link.addEventListener('click', () => Router.go('/browse'));
    link.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Router.go('/browse'); } });
    cta.appendChild(link);
    root.appendChild(cta);
  }

  function browseView(allProducts, filters, onFilterChange) {
    clear(root);
    root.className = 'browse-view';
    const filtered = Search.applyAll(allProducts, filters);

    const header = el('section', 'browse-header');
    header.innerHTML = `
      <h1 class="browse-title">Browse the Archive</h1>
      <p class="browse-desc">${filtered.length} of ${allProducts.length} pieces</p>
    `;
    root.appendChild(header);

    const filterSection = el('section', 'browse-filters');
    filterSection.appendChild(
      filterBar('Category', Store.getCategories(), filters.category, val =>
        onFilterChange({ ...filters, category: val })
      )
    );
    root.appendChild(filterSection);

    const productsSection = el('section', 'browse-products');
    productsSection.appendChild(productGrid(filtered, id => Router.go(`/product/${id}`)));
    root.appendChild(productsSection);
  }

  function collectionView(collection, products) {
    clear(root);
    root.className = 'collection-view';

    const backBtn = el('div', 'view-back');
    backBtn.innerHTML = '<button class="back-btn">← Back</button>';
    backBtn.querySelector('button').addEventListener('click', () => Router.go('/'));
    root.appendChild(backBtn);

    const lead = collection.introduction || collection.description;
    const leadHtml = lead ? lead.split('\n\n').map(p => `<p class="coll-intro">${p}</p>`).join('') : '';
    const header = el('section', 'coll-header');
    header.innerHTML = `
      <span class="section-label">Exhibition</span>
      <h1 class="coll-title">${collection.name}</h1>
      ${leadHtml}
      ${collection.philosophy ? `<p class="coll-quote">"${collection.philosophy}"</p>` : ''}
      <div class="coll-meta">${products.length} piece${products.length !== 1 ? 's' : ''}</div>
    `;
    root.appendChild(header);

    const hasMood = (collection.colorPalette && collection.colorPalette.length) || (collection.materials && collection.materials.length);
    if (hasMood) {
      const mood = el('section', 'coll-mood');
      if (collection.colorPalette && collection.colorPalette.length) {
        const row = el('div', 'swatch-row');
        collection.colorPalette.forEach(c => {
          const swatch = el('div', 'swatch');
          swatch.style.background = swatchColor(c);
          swatch.innerHTML = `<span class="swatch-label">${c.replace('#', '')}</span>`;
          row.appendChild(swatch);
        });
        mood.appendChild(row);
      }
      if (collection.materials && collection.materials.length) {
        mood.appendChild(el('p', 'material-line', collection.materials.join('<span class="sep">&middot;</span>')));
      }
      root.appendChild(mood);
    }

    const productsSection = el('section', 'coll-products');
    productsSection.appendChild(productGrid(products, id => Router.go(`/product/${id}`)));
    root.appendChild(productsSection);

    if (collection.curatorNotes) {
      const note = el('section', 'coll-note-section');
      note.innerHTML = `<p class="coll-note">"${collection.curatorNotes}"</p>`;
      root.appendChild(note);
    }
  }

  async function articleView(article) {
    clear(root);
    root.className = 'article-view';

    const backBtn = el('div', 'view-back');
    backBtn.innerHTML = '<button class="back-btn">← Back</button>';
    backBtn.querySelector('button').addEventListener('click', () => Router.go('/'));
    root.appendChild(backBtn);

    const header = el('header', 'article-header');
    header.innerHTML = `
      <h1 class="article-title-large">${article.title}</h1>
      <p class="article-subtitle-large">${article.subtitle}</p>
      <div class="article-meta-large">${article.readingTime} read</div>
    `;
    root.appendChild(header);

    const content = el('div', 'article-content');
    const paragraphs = article.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
    content.innerHTML = paragraphs;
    root.appendChild(content);

    if (article.relatedProducts && article.relatedProducts.length > 0) {
      const products = (await Promise.all(article.relatedProducts.map(id => Store.getProduct(id)))).filter(Boolean);
      if (products.length > 0) {
        const relatedSection = el('section', 'article-related');
        relatedSection.innerHTML = `<h2 class="section-label">Referenced Pieces</h2>`;
        relatedSection.appendChild(productGrid(products, id => Router.go(`/product/${id}`)));
        root.appendChild(relatedSection);
      }
    }
  }

  return {
    homeView,
    browseView,
    collectionView,
    articleView,
    searchView,
    openProductModal,
    closeModal,
    productGrid,
    filterBar,
    el,
    clear
  };
})();