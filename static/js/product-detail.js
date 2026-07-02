/* ============================================================
   SoulStones — Product Detail page
   Plain JS, no dependencies. Gallery thumbnail switching, the
   quantity stepper, and a "Related Products" rail rendered with
   the exact same .product-card markup as main.js/product.js.
   Add to Cart / Buy Now route through a hidden [data-add] bridge
   so the existing cart system in main.js (unmodified) handles
   the cart state and drawer rendering.
   ============================================================ */
(function () {
  "use strict";

  var IMG = "static/images/";
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* ---------------------------- Related products ---------------------------- */
  // Same ids/prices as main.js's PRODUCTS, so Add to Cart on these cards
  // also flows correctly through main.js's existing cart/drawer logic.
  var RELATED = [
    { id: "neelam",  name: "Ceylon Blue Sapphire",  stone: "Neelam",  category: "Blue Sapphire",   carat: 5.2, price: 48000, img: "GM09395_FRONT_fffa00cc-f157-44fd-88c8-00c709c903d0.webp", isNew: true },
    { id: "panna",   name: "Zambian Emerald",       stone: "Panna",   category: "Emerald",         carat: 4.8, price: 41000, img: "GM09656_FRONT_fa2dff4c-569a-4169-b02b-ef805440efc9.webp", isNew: true },
    { id: "pukhraj", name: "Ceylon Yellow Sapphire", stone: "Pukhraj", category: "Yellow Sapphire", carat: 6.0, price: 37000, img: "GM09592_FRONT_b1965923-977d-4883-987a-076196fb558a.webp", isNew: true },
    { id: "manik2",  name: "Old Mine Ruby",         stone: "Manik",   category: "Ruby",            carat: 2.9, price: 44000, img: "GM09610_FRONT_b9083458-a334-4585-b6d2-939d741e7225.webp", isNew: false }
  ];

  function productCard(p) {
    var li = el("li");
    var badge = p.isNew ? '<span class="badge-new">New</span>' : "";
    li.innerHTML =
      '<article class="product-card">' +
        '<a class="product-media" href="#consult" aria-label="View ' + p.name + '">' + badge +
          '<img src="' + IMG + p.img + '" alt="' + p.name + ', ' + p.carat.toFixed(1) + ' carat loose ' + p.stone + '" loading="lazy" />' +
        '</a>' +
        '<div class="product-body">' +
          '<span class="product-planet">' + p.category + '</span>' +
          '<span class="product-name">' + p.name + '</span>' +
          '<span class="product-meta">' + p.stone + ' · ' + p.carat.toFixed(1) + ' ct · certified</span>' +
          '<div class="product-foot">' +
            '<span class="product-price">' + inr(p.price) + '</span>' +
            '<button class="add-btn" type="button" data-add="' + p.id + '">Add</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    return li;
  }

  function renderRelated() {
    var grid = $("#relatedGrid");
    if (!grid) return;
    RELATED.forEach(function (p) { grid.appendChild(productCard(p)); });
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
    renderRelated();
  });
})();
