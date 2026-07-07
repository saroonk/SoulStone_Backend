/* ============================================================
   SoulStones — Our Collection (catalogue) page
   Plain JS, no dependencies. Filtering, search, sort, and
   pagination all run through the Fetch API against views.products,
   which returns a rendered HTML partial (product grid + pagination)
   for AJAX requests. The page never reloads; the URL is kept in
   sync with history.pushState so results stay shareable and the
   browser Back/Forward buttons work.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------------------- Helpers ---------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PRODUCTS_URL = window.location.pathname;

  /* ---------------------------- Filter state ---------------------------- */
  function readStateFromLocation() {
    var params = new URLSearchParams(window.location.search);
    return {
      search: params.get("search") || "",
      category: params.getAll("category"),
      availability: params.getAll("availability"),
      price: params.getAll("price"),
      sort: params.get("sort") || "featured",
      page: params.get("page") || "1"
    };
  }

  var state = readStateFromLocation();

  function buildParams(s) {
    var params = new URLSearchParams();
    if (s.search) params.set("search", s.search);
    s.category.forEach(function (c) { params.append("category", c); });
    s.availability.forEach(function (a) { params.append("availability", a); });
    s.price.forEach(function (p) { params.append("price", p); });
    if (s.sort) params.set("sort", s.sort);
    if (s.page && s.page !== "1") params.set("page", s.page);
    return params;
  }

  function collectStateFromForm(resetPage) {
    var search = $("#toolbarSearch");
    state.search = search ? search.value.trim() : "";
    state.category = $$('input[name="category"]:checked').map(function (i) { return i.value; });
    state.availability = $$('input[name="availability"]:checked').map(function (i) { return i.value; });
    state.price = $$('input[name="price"]:checked').map(function (i) { return i.value; });
    if (resetPage !== false) state.page = "1";
  }

  function syncFormFromState() {
    var search = $("#toolbarSearch");
    if (search) search.value = state.search;

    $$('input[name="category"]').forEach(function (cb) { cb.checked = state.category.indexOf(cb.value) !== -1; });
    $$('input[name="availability"]').forEach(function (cb) { cb.checked = state.availability.indexOf(cb.value) !== -1; });
    $$('input[name="price"]').forEach(function (cb) { cb.checked = state.price.indexOf(cb.value) !== -1; });

    syncSortControls();
  }

  function syncSortControls() {
    var toolbarSort = $("#toolbarSort");
    if (toolbarSort) toolbarSort.value = state.sort;
    $$('input[name="sortBy"]').forEach(function (radio) { radio.checked = radio.value === state.sort; });
  }

  /* ---------------------------- Fetch + render ---------------------------- */
  function setLoading(isLoading) {
    var grid = $("#catalogueGrid");
    if (grid) grid.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  function fetchProducts(pushHistory) {
    var params = buildParams(state);
    var queryString = params.toString();
    var url = PRODUCTS_URL + (queryString ? "?" + queryString : "");

    setLoading(true);
    fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var results = $("#catalogueResults");
        if (results) results.innerHTML = data.html;

        var countEl = $("#toolbarCount");
        if (countEl) countEl.textContent = "Showing " + data.count + (data.count === 1 ? " Product" : " Products");

        var heroTitle = $("#catalogueHeroTitle");
        if (heroTitle && data.hero_title) heroTitle.textContent = data.hero_title;

        if (pushHistory) window.history.pushState(null, "", url || PRODUCTS_URL);
      })
      .catch(function () { /* keep whatever is currently on screen if the request fails */ })
      .finally(function () { setLoading(false); });
  }

  /* ---------------------------- Filter panel: Apply / Reset ---------------------------- */
  function applyFilters() {
    collectStateFromForm();
    fetchProducts(true);
    closeMobilePanel();
  }

  function resetFilters() {
    state = { search: "", category: [], availability: [], price: [], sort: "featured", page: "1" };
    syncFormFromState();
    fetchProducts(true);
    closeMobilePanel();
  }

  function bindFilterPanel() {
    var applyBtn = $("#applyFiltersBtn");
    if (applyBtn) applyBtn.addEventListener("click", applyFilters);

    // Reset/empty-state buttons: bound via delegation since #emptyResetBtn is
    // re-created on every AJAX render.
    document.addEventListener("click", function (e) {
      if (e.target.closest("#resetFiltersBtn") || e.target.closest("#emptyResetBtn")) {
        resetFilters();
      }
    });
  }

  /* ---------------------------- Search ---------------------------- */
  function bindSearch() {
    var search = $("#toolbarSearch");
    if (search) {
      search.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          collectStateFromForm();
          fetchProducts(true);
        }
      });
    }
    var searchBtn = $("#toolbarSearchBtn");
    if (searchBtn) {
      searchBtn.style.cursor = "pointer";
      searchBtn.addEventListener("click", function () {
        collectStateFromForm();
        fetchProducts(true);
      });
    }
  }

  /* ---------------------------- Sort (desktop select + mobile radios, synced) ---------------------------- */
  function bindSort() {
    var toolbarSort = $("#toolbarSort");
    if (toolbarSort) {
      toolbarSort.addEventListener("change", function () {
        state.sort = toolbarSort.value;
        state.page = "1";
        syncSortControls();
        fetchProducts(true);
      });
    }

    $$('input[name="sortBy"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        state.sort = radio.value;
        state.page = "1";
        syncSortControls();
        fetchProducts(true);
      });
    });
  }

  /* ---------------------------- Pagination (event delegation; grid is replaced on every fetch) ---------------------------- */
  function bindPagination() {
    var main = $(".catalogue-main");
    if (!main) return;
    main.addEventListener("click", function (e) {
      var link = e.target.closest("#paginationNav a.page-btn[data-page]");
      if (!link) return;
      e.preventDefault();
      state.page = link.dataset.page;
      fetchProducts(true);
      var grid = $("#catalogueGrid");
      if (grid) grid.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    });
  }

  /* ---------------------------- Browser Back / Forward ---------------------------- */
  function bindPopState() {
    window.addEventListener("popstate", function () {
      state = readStateFromLocation();
      syncFormFromState();
      fetchProducts(false);
    });
  }

  /* ---------------------------- Toolbar (view toggle only; unrelated to filtering) ---------------------------- */
  function bindToolbar() {
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

  /* ---------------------------- Init ---------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    syncFormFromState();
    bindFilterPanel();
    bindSearch();
    bindSort();
    bindPagination();
    bindPopState();
    bindToolbar();
    bindMobilePanel();
  });
})();
