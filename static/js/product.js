/* ============================================================
   SoulStones — Our Collection (catalogue) page
   Plain JS, no dependencies. The product grid, sort, and
   pagination are now server-rendered by Django (see product.html
   and views.products). This file only wires up UI chrome that
   has no backend counterpart yet: the mobile filter panel, the
   grid/list view toggle, and forwarding sort changes to the
   backend via query-string navigation.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------------------- Helpers ---------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------- Sort (backend-driven) ---------------------------- */
  // The sort UI predates the backend's sort keys, so map the existing
  // option values to the ones views.products understands.
  var SORT_MAP = {
    featured: "newest",
    popularity: "newest",
    "price-asc": "price_low",
    "price-desc": "price_high",
    newest: "newest"
  };

  function navigateWithSort(uiValue) {
    var backendSort = SORT_MAP[uiValue] || "newest";
    var url = new URL(window.location.href);
    url.searchParams.set("sort", backendSort);
    url.searchParams.set("page", "1");
    window.location.href = url.toString();
  }

  /* ---------------------------- Filter panel (staged: Apply / Reset) ---------------------------- */
  // Category/availability/price filtering isn't implemented on the backend
  // yet, so these controls only manage the panel UI for now.
  function applyFilters() {
    closeMobilePanel();
  }

  function resetFilters() {
    $$('input[name="category"], input[name="availability"], input[name="price"]').forEach(function (i) { i.checked = false; });
    var featured = $('input[name="sortBy"][value="featured"]');
    if (featured) featured.checked = true;
    var toolbarSort = $("#toolbarSort");
    if (toolbarSort) toolbarSort.value = "featured";
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
        var toolbarSort = $("#toolbarSort");
        if (toolbarSort) toolbarSort.value = radio.value;
        navigateWithSort(radio.value);
      });
    });
  }

  /* ---------------------------- Toolbar ---------------------------- */
  function bindToolbar() {
    var toolbarSort = $("#toolbarSort");
    if (toolbarSort) toolbarSort.addEventListener("change", function () {
      var radio = $('input[name="sortBy"][value="' + toolbarSort.value + '"]');
      if (radio) radio.checked = true;
      navigateWithSort(toolbarSort.value);
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
  }

  /* ---------------------------- Init ---------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initFromQuery();
    bindFilterPanel();
    bindToolbar();
    bindMobilePanel();
  });
})();
