/* ============================================================
   SoulStones — Our Collection (catalogue) page
   Plain JS, no dependencies. Renders the same .product-card
   markup/classes as main.js so the homepage and catalogue stay
   visually identical. Reuses main.js for header chrome and for
   the cart (catalogue item ids/prices match main.js's own
   PRODUCTS list, so Add to Cart works through its existing
   delegated click handler and drawer rendering).
   ============================================================ */
(function () {
  "use strict";

  var IMG = "static/images/";
  var PAGE_SIZE = 8;

  /* ---------------------------- Data ---------------------------- */
  // Same ids / names / images / prices as static/js/main.js's PRODUCTS,
  // so cart add/remove and the drawer total stay correct on this page.
  // category/inStock/popularity/dateAdded extend that data for filtering.
  var CATALOGUE = [
    { id: "neelam",   name: "Ceylon Blue Sapphire",   stone: "Neelam",        category: "Blue Sapphire",   carat: 5.2, price: 48000, img: "GM09395_FRONT_fffa00cc-f157-44fd-88c8-00c709c903d0.webp", isNew: true,  inStock: true,  popularity: 88, dateAdded: 9 },
    { id: "manik",    name: "Burmese Ruby",            stone: "Manik",         category: "Ruby",            carat: 4.1, price: 62000, img: "GM09610_FRONT_b9083458-a334-4585-b6d2-939d741e7225.webp", isNew: true,  inStock: true,  popularity: 95, dateAdded: 10 },
    { id: "panna",    name: "Zambian Emerald",         stone: "Panna",         category: "Emerald",         carat: 4.8, price: 41000, img: "GM09656_FRONT_fa2dff4c-569a-4169-b02b-ef805440efc9.webp", isNew: true,  inStock: true,  popularity: 81, dateAdded: 8 },
    { id: "pukhraj",  name: "Ceylon Yellow Sapphire",  stone: "Pukhraj",       category: "Yellow Sapphire", carat: 6.0, price: 37000, img: "GM09592_FRONT_b1965923-977d-4883-987a-076196fb558a.webp", isNew: true,  inStock: true,  popularity: 77, dateAdded: 7 },
    { id: "gomed",    name: "Hessonite Garnet",        stone: "Gomed",         category: "Hessonite",       carat: 7.3, price: 15500, img: "GM02832_FRONT_98ad636b-fc2f-4674-90ca-84dffc2ebd78.webp", isNew: false, inStock: true,  popularity: 54, dateAdded: 3 },
    { id: "moonga",   name: "Italian Red Coral",       stone: "Moonga",        category: "Coral",           carat: 8.1, price: 12800, img: "GM09798_BACK_10d467d5-6723-43aa-9e1c-6b73714b4a69.webp", isNew: true,  inStock: true,  popularity: 63, dateAdded: 6 },
    { id: "moti",     name: "Basra Pearl",             stone: "Moti",          category: "Pearl",           carat: 5.5, price: 9800,  img: "GM09862_BACK_ef1c9a47-1c0e-429b-ba4b-064de53006f2.webp", isNew: false, inStock: false, popularity: 48, dateAdded: 2 },
    { id: "lehsunia", name: "Cat's Eye Chrysoberyl",   stone: "Lehsunia",      category: "Cat's Eye",       carat: 6.4, price: 22000, img: "GM09864_BACK_199c02c1-d92f-4df2-98d8-105b6f93a3b5.webp", isNew: false, inStock: true,  popularity: 58, dateAdded: 4 },
    { id: "sphatik",  name: "White Sapphire",          stone: "Safed Pukhraj", category: "Yellow Sapphire", carat: 4.9, price: 18500, img: "GM09896_BACK_ce70a685-b98d-4fba-b863-df39b2d43e8c.webp", isNew: true,  inStock: true,  popularity: 67, dateAdded: 5 },
    { id: "neelam2",  name: "Kashmir Blue Sapphire",   stone: "Neelam",        category: "Blue Sapphire",   carat: 3.4, price: 91000, img: "GM09395_FRONT_fffa00cc-f157-44fd-88c8-00c709c903d0.webp", isNew: false, inStock: false, popularity: 92, dateAdded: 1 },
    { id: "manik2",   name: "Old Mine Ruby",           stone: "Manik",         category: "Ruby",            carat: 2.9, price: 44000, img: "GM09610_FRONT_b9083458-a334-4585-b6d2-939d741e7225.webp", isNew: false, inStock: true,  popularity: 71, dateAdded: 0 }
  ];

  /* ---------------------------- Helpers ---------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function inr(n) { return "₹" + n.toLocaleString("en-IN"); }
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------- State ---------------------------- */
  var filters = { categories: [], availability: [], price: [] };
  var sortBy = "featured";
  var searchTerm = "";
  var currentPage = 1;

  /* ---------------------------- Product card (matches main.js's markup) ---------------------------- */
  function productCard(p) {
    var li = el("li");
    var badges = "";
    if (p.isNew) badges += '<span class="badge-new">New</span>';
    if (!p.inStock) badges += '<span class="badge-stock">Out of Stock</span>';
    var addControl = p.inStock
      ? '<button class="add-btn" type="button" data-add="' + p.id + '">Add</button>'
      : '<button class="add-btn" type="button" disabled>Sold Out</button>';
    li.innerHTML =
      '<article class="product-card' + (p.inStock ? "" : " out-of-stock") + '">' +
        '<a class="product-media" href="product-detail.html" aria-label="View ' + p.name + '">' + badges +
          '<img src="' + IMG + p.img + '" alt="' + p.name + ', ' + p.carat.toFixed(1) + ' carat loose ' + p.stone + '" loading="lazy" />' +
        '</a>' +
        '<div class="product-body">' +
          '<span class="product-planet">' + p.category + '</span>' +
          '<span class="product-name">' + p.name + '</span>' +
          '<span class="product-meta">' + p.stone + ' · ' + p.carat.toFixed(1) + ' ct · certified</span>' +
          '<div class="product-foot">' +
            '<span class="product-price">' + inr(p.price) + '</span>' +
            addControl +
          '</div>' +
        '</div>' +
      '</article>';
    return li;
  }

  /* ---------------------------- Filtering / sorting ---------------------------- */
  function passesFilters(p) {
    if (filters.categories.length && filters.categories.indexOf(p.category) === -1) return false;
    if (filters.availability.length) {
      var stockKey = p.inStock ? "in-stock" : "out-of-stock";
      if (filters.availability.indexOf(stockKey) === -1) return false;
    }
    if (filters.price.length) {
      var inRange = filters.price.some(function (key) {
        var parts = key.split("-");
        return p.price >= Number(parts[0]) && p.price <= Number(parts[1]);
      });
      if (!inRange) return false;
    }
    if (searchTerm) {
      var hay = (p.name + " " + p.category + " " + p.stone).toLowerCase();
      if (hay.indexOf(searchTerm.toLowerCase()) === -1) return false;
    }
    return true;
  }

  function sortList(list) {
    var l = list.slice();
    if (sortBy === "price-asc") l.sort(function (a, b) { return a.price - b.price; });
    else if (sortBy === "price-desc") l.sort(function (a, b) { return b.price - a.price; });
    else if (sortBy === "popularity") l.sort(function (a, b) { return b.popularity - a.popularity; });
    else if (sortBy === "newest") l.sort(function (a, b) { return b.dateAdded - a.dateAdded; });
    return l;
  }

  /* ---------------------------- Render ---------------------------- */
  function renderGrid() {
    var grid = $("#catalogueGrid"), empty = $("#catalogueEmpty"), countEl = $("#toolbarCount");
    if (!grid) return;

    var filtered = sortList(CATALOGUE.filter(passesFilters));
    var total = filtered.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > pages) currentPage = pages;
    var start = (currentPage - 1) * PAGE_SIZE;

    grid.innerHTML = "";
    if (!total) {
      grid.hidden = true;
      empty.hidden = false;
    } else {
      grid.hidden = false;
      empty.hidden = true;
      filtered.slice(start, start + PAGE_SIZE).forEach(function (p) { grid.appendChild(productCard(p)); });
    }

    if (countEl) countEl.textContent = "Showing " + total + (total === 1 ? " Product" : " Products");
    renderPagination(total, pages);
  }

  function renderPagination(total, pages) {
    var nav = $("#paginationNav");
    if (!nav) return;
    nav.innerHTML = "";
    if (pages <= 1) { nav.hidden = true; return; }
    nav.hidden = false;

    function pageBtn(label, disabled, current, onClick) {
      var b = el("button", "page-btn", label);
      b.type = "button";
      if (disabled) b.disabled = true;
      if (current) b.setAttribute("aria-current", "page");
      if (onClick) b.addEventListener("click", onClick);
      return b;
    }

    nav.appendChild(pageBtn("‹ Previous", currentPage <= 1, false, function () {
      currentPage--; renderGrid(); scrollToGrid();
    }));
    for (var i = 1; i <= pages; i++) {
      (function (n) {
        nav.appendChild(pageBtn(String(n), false, n === currentPage, function () {
          currentPage = n; renderGrid(); scrollToGrid();
        }));
      })(i);
    }
    nav.appendChild(pageBtn("Next ›", currentPage >= pages, false, function () {
      currentPage++; renderGrid(); scrollToGrid();
    }));
  }

  function scrollToGrid() {
    var main = $(".catalogue-main");
    if (main) main.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }

  /* ---------------------------- Filter panel (staged: Apply / Reset) ---------------------------- */
  function applyFilters() {
    filters.categories = $$('input[name="category"]:checked').map(function (i) { return i.value; });
    filters.availability = $$('input[name="availability"]:checked').map(function (i) { return i.value; });
    filters.price = $$('input[name="price"]:checked').map(function (i) { return i.value; });
    currentPage = 1;
    renderGrid();
    closeMobilePanel();
  }

  function resetFilters() {
    $$('input[name="category"], input[name="availability"], input[name="price"]').forEach(function (i) { i.checked = false; });
    var featured = $('input[name="sortBy"][value="featured"]');
    if (featured) featured.checked = true;
    var toolbarSort = $("#toolbarSort");
    if (toolbarSort) toolbarSort.value = "featured";
    sortBy = "featured";
    filters = { categories: [], availability: [], price: [] };
    currentPage = 1;
    renderGrid();
    closeMobilePanel();
  }

  function bindFilterPanel() {
    var applyBtn = $("#applyFiltersBtn"), resetBtn = $("#resetFiltersBtn"), emptyResetBtn = $("#emptyResetBtn");
    if (applyBtn) applyBtn.addEventListener("click", applyFilters);
    if (resetBtn) resetBtn.addEventListener("click", resetFilters);
    if (emptyResetBtn) emptyResetBtn.addEventListener("click", resetFilters);

    // Sort applies instantly and stays in sync between sidebar and toolbar.
    $$('input[name="sortBy"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        sortBy = radio.value;
        var toolbarSort = $("#toolbarSort");
        if (toolbarSort) toolbarSort.value = sortBy;
        currentPage = 1;
        renderGrid();
      });
    });
  }

  /* ---------------------------- Toolbar ---------------------------- */
  function bindToolbar() {
    var search = $("#toolbarSearch");
    if (search) search.addEventListener("input", function () {
      searchTerm = search.value.trim();
      currentPage = 1;
      renderGrid();
    });

    var toolbarSort = $("#toolbarSort");
    if (toolbarSort) toolbarSort.addEventListener("change", function () {
      sortBy = toolbarSort.value;
      var radio = $('input[name="sortBy"][value="' + sortBy + '"]');
      if (radio) radio.checked = true;
      currentPage = 1;
      renderGrid();
    });

    var gridBtn = $("#viewGridBtn"), listBtn = $("#viewListBtn");
    function setView(mode) {
      var grid = $("#catalogueGrid");
      if (grid) grid.classList.toggle("list-view", mode === "list");
      if (gridBtn) gridBtn.setAttribute("aria-pressed", mode === "grid" ? "true" : "false");
      if (listBtn) listBtn.setAttribute("aria-pressed", mode === "list" ? "true" : "false");
    }
    if (gridBtn) gridBtn.addEventListener("click", function () { setView("grid"); });
    if (listBtn) listBtn.addEventListener("click", function () { setView("list"); });
  }

  /* ---------------------------- Mobile filter panel ---------------------------- */
  var lastFocusedFilter = null;
  function openMobilePanel(focusGroupId) {
    var panel = $("#filterPanel"), backdrop = $("#filterBackdrop");
    if (!panel || !backdrop) return;
    lastFocusedFilter = document.activeElement;
    backdrop.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add("show"); });
    panel.classList.add("open");
    document.body.style.overflow = "hidden";
    if (focusGroupId) {
      var grp = document.getElementById(focusGroupId);
      if (grp) {
        grp.open = true;
        grp.scrollIntoView({ block: "start", behavior: prefersReduced ? "auto" : "smooth" });
      }
    }
    var closeBtn = $("#filterCloseBtn");
    if (closeBtn) closeBtn.focus();
  }
  function closeMobilePanel() {
    var panel = $("#filterPanel"), backdrop = $("#filterBackdrop");
    if (!panel || !panel.classList.contains("open")) return;
    panel.classList.remove("open");
    backdrop.classList.remove("show");
    setTimeout(function () { backdrop.hidden = true; }, 280);
    document.body.style.overflow = "";
    if (lastFocusedFilter) lastFocusedFilter.focus();
  }
  function bindMobilePanel() {
    var filterBtn = $("#mobileFilterBtn"), sortBtn = $("#mobileSortBtn"), closeBtn = $("#filterCloseBtn"), backdrop = $("#filterBackdrop");
    if (filterBtn) filterBtn.addEventListener("click", function () { openMobilePanel(); });
    if (sortBtn) sortBtn.addEventListener("click", function () { openMobilePanel("filterSortGroup"); });
    if (closeBtn) closeBtn.addEventListener("click", closeMobilePanel);
    if (backdrop) backdrop.addEventListener("click", closeMobilePanel);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMobilePanel();
    });
  }

  /* ---------------------------- Deep-link: ?category=Ruby ---------------------------- */
  function initFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var cat = params.get("category");
    if (!cat) return;
    $$('input[name="category"]').forEach(function (cb) {
      if (cb.value === cat) cb.checked = true;
    });
    filters.categories = $$('input[name="category"]:checked').map(function (i) { return i.value; });
  }

  /* ---------------------------- Init ---------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initFromQuery();
    bindFilterPanel();
    bindToolbar();
    bindMobilePanel();
    renderGrid();
  });
})();
