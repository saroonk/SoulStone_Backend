/* ============================================================
   SoulStones — Product Detail page
   Plain JS, no dependencies. Gallery thumbnail switching, the
   quantity stepper, and info tabs. Product fields and the
   "Related Products" rail are server-rendered by Django.
   Add to Cart / Buy Now route through a hidden [data-add] bridge
   so the existing cart system in main.js (unmodified) handles
   the cart state and drawer rendering.
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------- Helpers ---------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------------------------- Gallery ---------------------------- */
  function bindGallery() {
    var main = $("#pdMainImage");
    var thumbs = $$(".pd-thumb");
    if (!main || !thumbs.length) return;

    function select(thumb) {
      if (thumb.classList.contains("is-active")) return;
      thumbs.forEach(function (t) {
        t.classList.remove("is-active");
        t.removeAttribute("aria-current");
      });
      thumb.classList.add("is-active");
      thumb.setAttribute("aria-current", "true");

      var swap = function () {
        main.src = thumb.getAttribute("data-full");
        main.alt = thumb.getAttribute("data-alt") || "";
        main.classList.remove("pd-fade");
      };
      if (prefersReduced) {
        swap();
      } else {
        main.classList.add("pd-fade");
        setTimeout(swap, 180);
      }
    }

    thumbs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          var next = thumbs[(i + 1) % thumbs.length];
          next.focus(); select(next);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          var prev = thumbs[(i - 1 + thumbs.length) % thumbs.length];
          prev.focus(); select(prev);
        }
      });
    });
  }

  /* ---------------------------- Quantity stepper ---------------------------- */
  var quantity = 1;
  function bindQuantity() {
    var valEl = $("#pdQtyVal"), minus = $("#pdQtyMinus"), plus = $("#pdQtyPlus");
    if (!valEl) return;
    function setQuantity(n) {
      quantity = Math.max(1, Math.min(20, n));
      valEl.textContent = String(quantity);
    }
    if (minus) minus.addEventListener("click", function () { setQuantity(quantity - 1); });
    if (plus) plus.addEventListener("click", function () { setQuantity(quantity + 1); });
  }

  /* ---------------------------- Add to Cart / Buy Now ---------------------------- */
  // Adds `quantity` units through main.js's own delegated [data-add] handler
  // (dispatched on a hidden bridge button) so the cart, badge, and drawer
  // all stay driven by the existing, unmodified cart system.
  function addQuantityToCart() {
    var bridge = $("#pdCartBridge");
    if (!bridge) return;
    for (var i = 0; i < quantity; i++) {
      bridge.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
  }

  function bindPurchaseActions() {
    var addBtn = $("#pdAddToCart"), buyBtn = $("#pdBuyNow");
    if (addBtn) addBtn.addEventListener("click", function () {
      addQuantityToCart();
      var original = addBtn.textContent;
      addBtn.classList.add("added");
      addBtn.textContent = "Added to Cart";
      setTimeout(function () {
        addBtn.classList.remove("added");
        addBtn.textContent = original;
      }, 1400);
    });
    if (buyBtn) buyBtn.addEventListener("click", function () {
      addQuantityToCart();
      var cartButton = $("#cartButton");
      if (cartButton) cartButton.click();
    });
  }

  /* ---------------------------- Gemstone information tabs ---------------------------- */
  function bindTabs() {
    var tabs = $$(".pd-tab");
    if (!tabs.length) return;

    function panelFor(tab) { return document.getElementById(tab.getAttribute("aria-controls")); }

    function activate(tab, focusTab) {
      var panel = panelFor(tab);
      if (!panel || tab.classList.contains("is-active")) return;

      tabs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
        t.tabIndex = -1;
        var p = panelFor(t);
        if (p) { p.classList.remove("is-active"); p.hidden = true; }
      });

      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      tab.tabIndex = 0;
      panel.hidden = false;
      if (prefersReduced) {
        panel.classList.add("is-active");
      } else {
        requestAnimationFrame(function () { panel.classList.add("is-active"); });
      }
      if (focusTab) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { activate(tab, false); });
      tab.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          activate(tabs[(i + 1) % tabs.length], true);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          activate(tabs[(i - 1 + tabs.length) % tabs.length], true);
        } else if (e.key === "Home") {
          e.preventDefault();
          activate(tabs[0], true);
        } else if (e.key === "End") {
          e.preventDefault();
          activate(tabs[tabs.length - 1], true);
        }
      });
    });
  }

  /* ---------------------------- Init ---------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    bindGallery();
    bindTabs();
    bindQuantity();
    bindPurchaseActions();
  });
})();
