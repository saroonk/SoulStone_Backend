/* ============================================================
   SoulStones — homepage interactivity
   Plain JS, no dependencies. Cart state is backend-driven (see the
   Cart section below); everything else here is UI chrome.
   ============================================================ */
(function () {
  "use strict";

  var IMG = "static/images/";

  /* ---------------------------- Data ---------------------------- */
  // Video posters reuse gem imagery until real customer videos exist.
  var STORIES = [
    { name: "Sunita's story", stone: "Found her Pukhraj", poster: "GM09592_FRONT_b1965923-977d-4883-987a-076196fb558a.webp" },
    { name: "Devan's story",  stone: "A ruby for his father", poster: "GM09610_FRONT_b9083458-a334-4585-b6d2-939d741e7225.webp" },
    { name: "Kavya's story",  stone: "Her first emerald", poster: "GM09656_FRONT_fa2dff4c-569a-4169-b02b-ef805440efc9.webp" }
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
  var WA_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.05L2 22l5.1-1.34A10 10 0 1 0 12 2Z"/></svg>';

  /* ---------------------------- New arrivals rail ---------------------------- */
  // Card markup for this rail is now server-rendered by Django (see index.html /
  // product_card.html), so this only wires up the scroll controls.
  function renderRail() {
    var rail = $("#newArrivalsRail");
    if (!rail) return;

    var prev = $("[data-rail-prev]"), next = $("[data-rail-next]");
    function step() { return Math.max(260, rail.firstElementChild ? rail.firstElementChild.getBoundingClientRect().width + 22 : 280); }
    function update() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max;
    }
    if (next) next.addEventListener("click", function () { rail.scrollBy({ left: step(), behavior: prefersReduced ? "auto" : "smooth" }); });
    if (prev) prev.addEventListener("click", function () { rail.scrollBy({ left: -step(), behavior: prefersReduced ? "auto" : "smooth" }); });
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------------------------- Filters + grid (Collections section) ---------------------------- */
  // Category chips and product cards here are server-rendered by Django
  // (see index.html / product_card.html) with data-category / data-featured /
  // data-created / data-price attributes. This just filters and reorders
  // those existing DOM nodes in place, so switching a tab or the sort
  // order never reloads the page.
  var activeCategory = "all";
  var activeSort = "featured";

  function bindChips() {
    var wrap = $("#planetChips");
    if (!wrap) return;
    $$(".chip", wrap).forEach(function (chip) {
      chip.addEventListener("click", function () {
        activeCategory = chip.dataset.category;
        $$(".chip", wrap).forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
        renderGrid();
      });
    });
  }

  function sortCards(cards) {
    var list = cards.slice();
    if (activeSort === "price-asc") list.sort(function (a, b) { return Number(a.dataset.price) - Number(b.dataset.price); });
    else if (activeSort === "price-desc") list.sort(function (a, b) { return Number(b.dataset.price) - Number(a.dataset.price); });
    else if (activeSort === "newest") list.sort(function (a, b) { return Number(b.dataset.created) - Number(a.dataset.created); });
    else if (activeSort === "oldest") list.sort(function (a, b) { return Number(a.dataset.created) - Number(b.dataset.created); });
    else if (activeSort === "featured") list.sort(function (a, b) { return Number(b.dataset.featured) - Number(a.dataset.featured); });
    return list;
  }

  function renderGrid() {
    var grid = $("#productGrid"), empty = $("#emptyState");
    if (!grid) return;
    var cards = $$("li[data-category]", grid);
    var visible = cards.filter(function (li) { return activeCategory === "all" || li.dataset.category === activeCategory; });
    var toHide = cards.filter(function (li) { return visible.indexOf(li) === -1; });

    toHide.forEach(function (li) { li.hidden = true; });
    sortCards(visible).forEach(function (li) {
      li.hidden = false;
      grid.appendChild(li);
    });

    grid.hidden = !visible.length;
    if (empty) empty.hidden = !!visible.length;
  }

  function bindSort() {
    var sel = $("#sortSelect");
    if (sel) sel.addEventListener("change", function () { activeSort = sel.value; renderGrid(); });
  }

  /* Reviews are now rendered server-side by Django directly into
     #reviewColumns (see index.html / views.index), so there is no
     client-side rendering step for them here. */

  /* ---------------------------- Video testimonials ---------------------------- */
  function renderVideos() {
    var grid = $("#videoGrid");
    if (!grid) return;
    STORIES.forEach(function (s) {
      var li = el("li");
      var btn = el("button", "video-card");
      btn.type = "button";
      btn.setAttribute("aria-label", "Play " + s.name + ", " + s.stone);
      btn.innerHTML =
        '<span class="video-poster" style="background-image:url(' + IMG + s.poster + ')"></span>' +
        '<span class="video-play"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>' +
        '<span class="video-info"><span class="video-name">' + s.name + '</span><span class="video-stone">' + s.stone + '</span></span>';
      btn.addEventListener("click", function () { openVideo(); });
      li.appendChild(btn);
      grid.appendChild(li);
    });
  }

  /* ---------------------------- Cart (backend-driven) ---------------------------- */
  // Cart state lives in the Django backend (session cart for guests, user
  // cart when logged in — see cart_utils.py). This talks to it over fetch()
  // and re-renders the same drawer/badge markup from the JSON it returns.
  var CART_URLS = {
    data: "/cart/data/",
    add: "/cart/add/",
    increase: "/cart/increase/",
    decrease: "/cart/decrease/",
    remove: "/cart/remove/"
  };

  function getCsrfToken() {
    var match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  // Success/error feedback for cart actions, using Bootstrap's own toast
  // component (already loaded sitewide) so no new CSS is needed.
  function showToast(message, isSuccess) {
    var toastEl = $("#cartToast");
    if (!message || !toastEl || typeof bootstrap === "undefined") {
      announce(message);
      return;
    }
    var body = $("#cartToastBody", toastEl);
    if (body) body.textContent = message;
    // Success uses the brand gold accent (not Bootstrap's default green);
    // errors keep Bootstrap's standard red.
    toastEl.classList.remove("text-bg-success", "text-bg-danger", "cart-toast-success");
    toastEl.classList.add(isSuccess ? "cart-toast-success" : "text-bg-danger");
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2600 }).show();
    announce(message);
  }

  function postCart(url, body) {
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCsrfToken(),
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: new URLSearchParams(body || {}).toString()
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    });
  }

  function fetchCart() {
    return fetch(CART_URLS.data, {
      credentials: "same-origin",
      headers: { "X-Requested-With": "XMLHttpRequest" }
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderDrawer(data.cart);
        updateCartBadge(data.cart.count, false);
      });
  }

  function addToCart(slug, quantity, buttonEl) {
    return postCart(CART_URLS.add, { slug: slug, quantity: quantity || 1 }).then(function (result) {
      renderDrawer(result.data.cart);
      updateCartBadge(result.data.cart.count, result.ok);
      showToast(result.data.message, result.ok);
      if (!result.ok && buttonEl) flashButtonMessage(buttonEl, result.data.message);
      return result;
    });
  }

  function setQty(slug, delta) {
    var url = delta > 0 ? CART_URLS.increase : CART_URLS.decrease;
    return postCart(url, { slug: slug }).then(function (result) {
      renderDrawer(result.data.cart);
      updateCartBadge(result.data.cart.count, false);
      if (!result.ok) showToast(result.data.message, false);
      return result;
    });
  }

  function removeFromCart(slug) {
    return postCart(CART_URLS.remove, { slug: slug }).then(function (result) {
      renderDrawer(result.data.cart);
      updateCartBadge(result.data.cart.count, false);
      return result;
    });
  }

  function flashButtonMessage(btn, message) {
    var original = btn.textContent;
    btn.textContent = message && message.length < 20 ? message : "Unavailable";
    setTimeout(function () { btn.textContent = original; }, 1600);
  }

  function updateCartBadge(count, bump) {
    var badge = $("#cartCount"), btn = $("#cartButton");
    if (!badge) return;
    badge.textContent = count;
    badge.setAttribute("data-empty", count === 0 ? "true" : "false");
    if (btn) btn.setAttribute("aria-label", "Open cart, " + count + (count === 1 ? " item" : " items"));
    if (bump && !prefersReduced) {
      badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump");
    }
  }

  function renderDrawer(cartData) {
    var items = $("#drawerItems"), emptyEl = $("#drawerEmpty"), foot = $("#drawerFoot");
    if (!items || !cartData) return;
    items.innerHTML = "";
    if (!cartData.items.length) {
      emptyEl.hidden = false; foot.hidden = true; items.hidden = true; return;
    }
    emptyEl.hidden = true; foot.hidden = false; items.hidden = false;
    cartData.items.forEach(function (it) {
      var li = el("li", "drawer-row");
      li.innerHTML =
        '<img class="drawer-thumb" src="' + it.image + '" alt="" />' +
        '<div class="drawer-info">' +
          '<div class="drawer-info-name">' + it.name + '</div>' +
          '<div class="drawer-info-meta">' + it.meta + '</div>' +
          '<div class="drawer-qty">' +
            '<button class="qty-btn" type="button" data-dec="' + it.slug + '" aria-label="Decrease quantity">−</button>' +
            '<span class="qty-val">' + it.quantity + '</span>' +
            '<button class="qty-btn" type="button" data-inc="' + it.slug + '" aria-label="Increase quantity">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="drawer-line-end">' +
          '<span class="drawer-price">' + inr(Math.round(parseFloat(it.line_total))) + '</span>' +
          '<button class="remove-btn" type="button" data-remove="' + it.slug + '">Remove</button>' +
        '</div>';
      items.appendChild(li);
    });
    $("#drawerSubtotal").textContent = inr(Math.round(parseFloat(cartData.subtotal)));
  }

  /* ---------------------------- Drawer open/close + focus trap ---------------------------- */
  var lastFocused = null;
  function trapFocus(e, container) {
    if (e.key !== "Tab") return;
    var f = container.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])');
    f = Array.prototype.filter.call(f, function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openDrawer() {
    var drawer = $("#cartDrawer"), overlay = $("#drawerOverlay");
    lastFocused = document.activeElement;
    overlay.hidden = false; requestAnimationFrame(function () { overlay.classList.add("show"); });
    drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $("#drawerClose").focus();
  }
  function closeDrawer() {
    var drawer = $("#cartDrawer"), overlay = $("#drawerOverlay");
    drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true");
    overlay.classList.remove("show");
    setTimeout(function () { overlay.hidden = true; }, 280);
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  /* ---------------------------- Video dialog ---------------------------- */
  var lastFocusedVideo = null;
  function openVideo() {
    var overlay = $("#videoOverlay");
    lastFocusedVideo = document.activeElement;
    overlay.hidden = false; requestAnimationFrame(function () { overlay.classList.add("show"); });
    document.body.style.overflow = "hidden";
    $("#videoClose").focus();
  }
  function closeVideo() {
    var overlay = $("#videoOverlay");
    overlay.classList.remove("show");
    setTimeout(function () { overlay.hidden = true; }, 260);
    document.body.style.overflow = "";
    if (lastFocusedVideo) lastFocusedVideo.focus();
  }

  /* ---------------------------- Misc UI ---------------------------- */
  function announce(msg) { var r = $("#liveRegion"); if (r) { r.textContent = ""; setTimeout(function () { r.textContent = msg; }, 30); } }

  function bindHeaderScroll() {
    var header = $("#siteHeader");
    function onScroll() { header.setAttribute("data-elevated", window.scrollY > 12 ? "true" : "false"); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Collapses the Collections mega-menu back to its fully-closed state:
  // called whenever the mobile hamburger nav closes, so re-opening it never
  // shows a branch left expanded from a previous visit.
  function collapseMegaMenu() {
    var root = $("#collectionsItem");
    if (!root) return;
    root.querySelectorAll(".is-open").forEach(function (el) { el.classList.remove("is-open"); });
    root.querySelectorAll(".mega-toggle[aria-expanded='true']").forEach(function (t) {
      t.setAttribute("aria-expanded", "false");
    });
  }

  function bindMobileNav() {
    var toggle = $("#navToggle"), nav = $("#primaryNav"), header = $("#siteHeader");
    if (!toggle) return;

    function setNavTop() {
      if (header) {
        // Position mobile nav below the full header (announcement bar + nav row)
        nav.style.top = header.offsetHeight + "px";
      }
    }

    toggle.addEventListener("click", function () {
      setNavTop();
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (!open) collapseMegaMenu();
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        collapseMegaMenu();
      }
    });

    // Close mobile nav when the user clicks/taps outside it (Issue 2).
    // Runs in capture phase so it fires before the mega-menu handler's
    // stopPropagation, and ignores clicks on the toggle (which controls its
    // own open/close) and any click inside the nav panel itself.
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("open")) return;
      if (toggle.contains(e.target)) return;
      if (nav.contains(e.target)) return;
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      collapseMegaMenu();
    }, true);
  }

  // Profile dropdown only — Collections has its own mega-menu handler below.
  function bindDropdowns() {
    function setupDropdown(btnId, panelId) {
      var btn = $("#" + btnId), panel = $("#" + panelId);
      if (!btn || !panel) return;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = panel.classList.contains("open");
        panel.classList.toggle("open", !isOpen);
        btn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      });
    }
    setupDropdown("profileBtn", "profilePanel");

    document.addEventListener("click", function () {
      document.querySelectorAll(".nav-dropdown-panel.open").forEach(function (p) { p.classList.remove("open"); });
      var b = $("#profileBtn"); if (b) b.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".nav-dropdown-panel.open").forEach(function (p) { p.classList.remove("open"); });
        var b = $("#profileBtn"); if (b) b.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Collections mega-menu: Category -> SubCategory -> CollectionType.
  //
  // Desktop uses hover-intent (mouseenter opens immediately; mouseleave
  // schedules a close after CLOSE_DELAY, cancelled if the pointer re-enters
  // in time) instead of plain CSS :hover, which has zero tolerance for the
  // gap between a row and its fly-out and flickers shut on any brief
  // overshoot. Mobile/keyboard use the same .mega-toggle buttons as tap
  // targets, driving a vertical accordion (max-height is measured from the
  // real content on each open/close, so it animates smoothly regardless of
  // how many rows a branch has, rather than snapping to a guessed value).
  function bindMegaMenu() {
    var root = $("#collectionsItem");
    if (!root) return;

    var CLOSE_DELAY = 260;

    function getTrigger(item) {
      var t = item.firstElementChild;
      return (t && t.classList.contains("mega-trigger")) ? t : null;
    }
    function getFlyout(item) {
      var f = item.lastElementChild;
      return (f && (f.classList.contains("mega-panel") || f.classList.contains("mega-flyout"))) ? f : null;
    }
    function getToggle(item) {
      var trigger = getTrigger(item);
      return trigger ? trigger.querySelector(".mega-toggle") : null;
    }
    function isDesktop() {
      return window.matchMedia("(min-width: 769px)").matches;
    }

    // The mobile accordion's height comes entirely from CSS (a
    // grid-template-rows 0fr <-> 1fr transition on .mega-flyout /
    // .nav-dropdown-panel — see styles.css); toggling .is-open is all this
    // needs to do, at any nesting depth.
    function setOpen(item, open) {
      var flyout = getFlyout(item);
      if (!flyout) return;
      item.classList.toggle("is-open", open);
      var toggle = getToggle(item);
      if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");

      if (!open) {
        flyout.querySelectorAll(".mega-col-item.is-open").forEach(function (child) {
          setOpen(child, false);
        });
      }
    }

    function closeSiblings(item) {
      var parent = item.parentElement;
      if (!parent) return;
      Array.prototype.forEach.call(parent.children, function (sibling) {
        if (sibling !== item && sibling.classList && sibling.classList.contains("mega-col-item")) {
          setOpen(sibling, false);
        }
      });
    }

    // Tap/click: drives the mobile accordion, and doubles as a keyboard
    // fallback for desktop users focusing the toggle without a mouse.
    root.addEventListener("click", function (e) {
      var toggle = e.target.closest(".mega-toggle");
      if (!toggle || !root.contains(toggle)) return;
      e.preventDefault();
      e.stopPropagation();

      var item = toggle.closest(".mega-col-item") || root;
      var isOpen = item.classList.contains("is-open");
      if (!isOpen) closeSiblings(item);
      setOpen(item, !isOpen);
    });

    function bindHoverIntent(item) {
      var closeTimer = null;
      item.addEventListener("mouseenter", function () {
        if (!isDesktop()) return;
        clearTimeout(closeTimer);
        closeSiblings(item);
        setOpen(item, true);
      });
      item.addEventListener("mouseleave", function () {
        if (!isDesktop()) return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(function () { setOpen(item, false); }, CLOSE_DELAY);
      });
    }
    bindHoverIntent(root);
    root.querySelectorAll(".mega-col-item.has-children").forEach(bindHoverIntent);

    document.addEventListener("click", function (e) {
      if (!root.contains(e.target)) setOpen(root, false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(root, false);
    });
  }

  function bindSearch() {
    var btn = $("#searchBtn"), bar = $("#searchBar"), closeBtn = $("#searchCloseBtn"), input = $("#searchInput");
    if (!btn || !bar) return;

    function isOpen() { return bar.classList.contains("is-open"); }

    function open() {
      bar.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      // Focus after the reveal transition has started
      setTimeout(function () { if (input) { input.value = ""; input.focus(); } }, 80);
    }
    function close() {
      bar.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }

    btn.addEventListener("click", function () { isOpen() ? close() : open(); });
    if (closeBtn) closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) close();
    });

    // Submitting sends the keyword to the Products page, which already
    // implements search (same `search` query param / AJAX filtering used
    // there). This is just another entry point into that existing search.
    var submitting = false;
    function submitSearch() {
      if (!input) return;
      var value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      if (submitting) return;
      submitting = true;
      var productsUrl = bar.dataset.productsUrl || "/products/";
      window.location.href = productsUrl + "?search=" + encodeURIComponent(value);
    }

    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submitSearch();
        }
      });
    }
    var searchIcon = bar.querySelector(".search-icon");
    if (searchIcon) {
      searchIcon.style.cursor = "pointer";
      searchIcon.addEventListener("click", submitSearch);
    }
  }

  function bindAnnouncement() {
    var bar = $("#announcementBar");
    if (!bar) return;
    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      bar.classList.add("dismissed");
      // After the CSS transition finishes, pull it out of the stacking context entirely
      bar.addEventListener("transitionend", function () { bar.hidden = true; }, { once: true });
    }
    window.addEventListener("scroll", function () {
      if (window.scrollY > 72) dismiss();
    }, { passive: true });
  }

  function bindReveal() {
    if (prefersReduced || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (n) { io.observe(n); });
  }

  function bindNewsletter() {
    var form = $("#newsletterForm");
    if (!form) return;
    var input = $("#newsletterEmail"), msg = $("#newsletterMsg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = input.value.trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (!ok) {
        input.setAttribute("aria-invalid", "true");
        msg.setAttribute("data-state", "error");
        msg.textContent = "Please enter a valid email address.";
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      msg.setAttribute("data-state", "ok");
      msg.textContent = "Thank you. We will be in touch with our finest stones.";
      form.reset();
    });
  }

  /* ---------------------------- Global event delegation ---------------------------- */
  function bindGlobalClicks() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-add],[data-inc],[data-dec],[data-remove],[data-close-drawer]");
      if (!t) return;
      if (t.hasAttribute("data-add")) {
        if (t.disabled) return;
        var slug = t.getAttribute("data-add");
        var qty = Number(t.getAttribute("data-qty")) || 1;
        var original = t.textContent;
        t.disabled = true;
        addToCart(slug, qty, t).then(function (result) {
          t.disabled = false;
          if (result.ok) {
            t.classList.add("added"); t.textContent = "Added";
            setTimeout(function () { t.classList.remove("added"); t.textContent = original; }, 1200);
          }
        });
      } else if (t.hasAttribute("data-inc")) { setQty(t.getAttribute("data-inc"), 1); }
      else if (t.hasAttribute("data-dec")) { setQty(t.getAttribute("data-dec"), -1); }
      else if (t.hasAttribute("data-remove")) { removeFromCart(t.getAttribute("data-remove")); }
      else if (t.hasAttribute("data-close-drawer")) { closeDrawer(); }
    });

    $("#cartButton").addEventListener("click", openDrawer);
    $("#drawerClose").addEventListener("click", closeDrawer);
    $("#drawerOverlay").addEventListener("click", closeDrawer);
    $("#videoClose").addEventListener("click", closeVideo);
    $("#videoOverlay").addEventListener("click", function (e) { if (e.target === e.currentTarget) closeVideo(); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!$("#videoOverlay").hidden) closeVideo();
        else if ($("#cartDrawer").classList.contains("open")) closeDrawer();
      }
      if ($("#cartDrawer").classList.contains("open")) trapFocus(e, $("#cartDrawer"));
      else if (!$("#videoOverlay").hidden) trapFocus(e, $("#videoDialog"));
    });
  }

  /* ---------------------------- Init ---------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
    bindChips();
    renderGrid();
    renderRail();
    renderVideos();
    fetchCart();
    bindSort();
    bindHeaderScroll();
    bindMobileNav();
    bindDropdowns();
    bindMegaMenu();
    bindSearch();
    bindAnnouncement();
    bindReveal();
    bindNewsletter();
    bindGlobalClicks();
  });

  // Small public surface so other page scripts (e.g. product-detail.js's
  // quantity-aware Add to Cart) can reuse this cart logic instead of
  // duplicating it.
  window.SoulStonesCart = { addToCart: addToCart, showToast: showToast };
})();
