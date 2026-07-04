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
  var stockLimit = Infinity;
  function bindQuantity() {
    var qtyGroup = $(".pd-qty");
    var valEl = $("#pdQtyVal"), minus = $("#pdQtyMinus"), plus = $("#pdQtyPlus");
    if (!valEl) return;
    if (qtyGroup && qtyGroup.dataset.stock) {
      var parsed = parseInt(qtyGroup.dataset.stock, 10);
      if (!isNaN(parsed) && parsed > 0) stockLimit = parsed;
    }
    function setQuantity(n) {
      quantity = Math.max(1, Math.min(stockLimit, 20, n));
      valEl.textContent = String(quantity);
    }
    if (minus) minus.addEventListener("click", function () { setQuantity(quantity - 1); });
    if (plus) plus.addEventListener("click", function () { setQuantity(quantity + 1); });
  }

  /* ---------------------------- Add to Cart / Buy Now ---------------------------- */
  // Validates the chosen quantity against stock before ever contacting the
  // backend (which validates again — never trust the frontend alone), then
  // calls the shared cart module directly so the button's "Added to Cart"
  // feedback only fires once we know the add actually succeeded.
  function addQuantityToCart(buttonEl) {
    var cartApi = window.SoulStonesCart;
    if (!cartApi) return Promise.resolve({ ok: false });

    var addBtn = $("#pdAddToCart");
    var slug = addBtn ? addBtn.getAttribute("data-slug") : null;
    if (!slug) return Promise.resolve({ ok: false });

    if (quantity > stockLimit) {
      cartApi.showToast(
        stockLimit > 0
          ? "Only " + stockLimit + " item" + (stockLimit === 1 ? "" : "s") + " currently available."
          : "This product is out of stock.",
        false
      );
      return Promise.resolve({ ok: false });
    }

    return cartApi.addToCart(slug, quantity, buttonEl);
  }

  function bindPurchaseActions() {
    var addBtn = $("#pdAddToCart"), buyBtn = $("#pdBuyNow");
    if (addBtn) addBtn.addEventListener("click", function () {
      addQuantityToCart(addBtn).then(function (result) {
        if (!result.ok) return;
        var original = addBtn.textContent;
        addBtn.classList.add("added");
        addBtn.textContent = "Added to Cart";
        setTimeout(function () {
          addBtn.classList.remove("added");
          addBtn.textContent = original;
        }, 1400);
      });
    });
    if (buyBtn) buyBtn.addEventListener("click", function () {
      addQuantityToCart(buyBtn).then(function (result) {
        if (!result.ok) return;
        var cartButton = $("#cartButton");
        if (cartButton) cartButton.click();
      });
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
