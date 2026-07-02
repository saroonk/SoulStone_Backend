/* ============================================================
   SoulStones — homepage interactivity
   Plain JS, no dependencies. Structured for later Django port:
   PRODUCTS would come from a context variable / API instead of
   this hardcoded array.
   ============================================================ */
(function () {
  "use strict";

  // Placeholder business contact. Replace before launch.
  var WHATSAPP_NUMBER = "91XXXXXXXXXX";
  var IMG = "static/images/";

  /* ---------------------------- Data ---------------------------- */
  // NOTE: GM*.webp shots are watermarked competitor placeholders.
  // Swap for clean product photography before launch.
  var PRODUCTS = [
    { id: "neelam",  name: "Ceylon Blue Sapphire", stone: "Neelam",   planet: "Saturn",  carat: 5.2, price: 48000, img: "GM09395_FRONT_fffa00cc-f157-44fd-88c8-00c709c903d0.webp", isNew: true },
    { id: "manik",   name: "Burmese Ruby",         stone: "Manik",    planet: "Sun",     carat: 4.1, price: 62000, img: "GM09610_FRONT_b9083458-a334-4585-b6d2-939d741e7225.webp", isNew: true },
    { id: "panna",   name: "Zambian Emerald",      stone: "Panna",    planet: "Mercury", carat: 4.8, price: 41000, img: "GM09656_FRONT_fa2dff4c-569a-4169-b02b-ef805440efc9.webp", isNew: true },
    { id: "pukhraj", name: "Ceylon Yellow Sapphire", stone: "Pukhraj", planet: "Jupiter", carat: 6.0, price: 37000, img: "GM09592_FRONT_b1965923-977d-4883-987a-076196fb558a.webp", isNew: true },
    { id: "gomed",   name: "Hessonite Garnet",     stone: "Gomed",    planet: "Rahu",    carat: 7.3, price: 15500, img: "GM02832_FRONT_98ad636b-fc2f-4674-90ca-84dffc2ebd78.webp", isNew: false },
    { id: "moonga",  name: "Italian Red Coral",    stone: "Moonga",   planet: "Mars",    carat: 8.1, price: 12800, img: "GM09798_BACK_10d467d5-6723-43aa-9e1c-6b73714b4a69.webp", isNew: true },
    { id: "moti",    name: "Basra Pearl",          stone: "Moti",     planet: "Moon",    carat: 5.5, price: 9800,  img: "GM09862_BACK_ef1c9a47-1c0e-429b-ba4b-064de53006f2.webp", isNew: false },
    { id: "lehsunia",name: "Cat's Eye Chrysoberyl",stone: "Lehsunia", planet: "Ketu",    carat: 6.4, price: 22000, img: "GM09864_BACK_199c02c1-d92f-4df2-98d8-105b6f93a3b5.webp", isNew: false },
    { id: "sphatik", name: "White Sapphire",       stone: "Safed Pukhraj", planet: "Venus", carat: 4.9, price: 18500, img: "GM09896_BACK_ce70a685-b98d-4fba-b863-df39b2d43e8c.webp", isNew: true },
    { id: "neelam2", name: "Kashmir Blue Sapphire",stone: "Neelam",   planet: "Saturn",  carat: 3.4, price: 91000, img: "GM09395_FRONT_fffa00cc-f157-44fd-88c8-00c709c903d0.webp", isNew: false },
    { id: "manik2",  name: "Old Mine Ruby",        stone: "Manik",    planet: "Sun",     carat: 2.9, price: 44000, img: "GM09610_FRONT_b9083458-a334-4585-b6d2-939d741e7225.webp", isNew: false }
  ];

  var PLANET_ORDER = ["All", "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

  var REVIEWS = [
    { stars: 5, quote: "The certificate matched the stone exactly. First time I have trusted an online gem seller.", author: "Ananya R.", stone: "Blue Sapphire" },
    { stars: 5, quote: "An advisor talked me through carat and quality on WhatsApp for twenty minutes. No pressure at all.", author: "Vikram S.", stone: "Yellow Sapphire" },
    { stars: 5, quote: "Photographs were honest. What arrived looked exactly like the listing, not better, not worse.", author: "Meera J.", stone: "Emerald" },
    { stars: 4, quote: "Packaging was beautiful and the lab report was in the box. Delivery took a day longer than expected.", author: "Rohan K.", stone: "Ruby" },
    { stars: 5, quote: "I sent my birth chart and they helped me pick. It felt like a jeweller, not a remedy shop.", author: "Priya N.", stone: "Hessonite" },
    { stars: 5, quote: "Premium without being flashy. Exactly the experience I wanted for something this meaningful.", author: "Aditya M.", stone: "Red Coral" }
  ];

  // Video posters reuse gem imagery until real customer videos exist.
  var STORIES = [
    { name: "Sunita's story", stone: "Found her Pukhraj", poster: "GM09592_FRONT_b1965923-977d-4883-987a-076196fb558a.webp" },
    { name: "Devan's story",  stone: "A ruby for his father", poster: "GM09610_FRONT_b9083458-a334-4585-b6d2-939d741e7225.webp" },
    { name: "Kavya's story",  stone: "Her first emerald", poster: "GM09656_FRONT_fa2dff4c-569a-4169-b02b-ef805440efc9.webp" }
  ];

  /* ---------------------------- Helpers ---------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function inr(n) { return "₹" + n.toLocaleString("en-IN"); }
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var WA_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.05L2 22l5.1-1.34A10 10 0 1 0 12 2Z"/></svg>';

  /* ---------------------------- Product card ---------------------------- */
  function productCard(p) {
    var li = el("li");
    var badge = p.isNew ? '<span class="badge-new">New</span>' : "";
    li.innerHTML =
      '<article class="product-card">' +
        '<a class="product-media" href="#consult" aria-label="View ' + p.name + '">' + badge +
          '<img src="' + IMG + p.img + '" alt="' + p.name + ', ' + p.carat + ' carat loose ' + p.stone + '" loading="lazy" />' +
        '</a>' +
        '<div class="product-body">' +
          '<span class="product-planet">' + p.planet + '</span>' +
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

  /* ---------------------------- New arrivals rail ---------------------------- */
  function renderRail() {
    var rail = $("#newArrivalsRail");
    if (!rail) return;
    PRODUCTS.filter(function (p) { return p.isNew; }).forEach(function (p) {
      rail.appendChild(productCard(p));
    });

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

  /* ---------------------------- Filters + grid ---------------------------- */
  var activePlanet = "All";
  var activeSort = "featured";

  function renderChips() {
    var wrap = $("#planetChips");
    if (!wrap) return;
    var present = PRODUCTS.reduce(function (acc, p) { acc[p.planet] = true; return acc; }, {});
    PLANET_ORDER.filter(function (pl) { return pl === "All" || present[pl]; }).forEach(function (pl) {
      var b = el("button", "chip", pl);
      b.type = "button";
      b.setAttribute("aria-pressed", pl === activePlanet ? "true" : "false");
      b.dataset.planet = pl;
      b.addEventListener("click", function () {
        activePlanet = pl;
        wrap.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.planet === pl ? "true" : "false"); });
        renderGrid();
      });
      wrap.appendChild(b);
    });
  }

  function sortList(list) {
    var l = list.slice();
    if (activeSort === "price-asc") l.sort(function (a, b) { return a.price - b.price; });
    else if (activeSort === "price-desc") l.sort(function (a, b) { return b.price - a.price; });
    else if (activeSort === "carat-desc") l.sort(function (a, b) { return b.carat - a.carat; });
    return l;
  }

  function renderGrid() {
    var grid = $("#productGrid"), empty = $("#emptyState");
    if (!grid) return;
    var list = PRODUCTS.filter(function (p) { return activePlanet === "All" || p.planet === activePlanet; });
    list = sortList(list);
    grid.innerHTML = "";
    if (!list.length) {
      grid.hidden = true; empty.hidden = false; return;
    }
    grid.hidden = false; empty.hidden = true;
    list.forEach(function (p) { grid.appendChild(productCard(p)); });
  }

  function bindSort() {
    var sel = $("#sortSelect");
    if (sel) sel.addEventListener("change", function () { activeSort = sel.value; renderGrid(); });
  }

  // Category tiles deep-link into a filter
  function bindCategoryFilters() {
    document.querySelectorAll("[data-filter]").forEach(function (a) {
      a.addEventListener("click", function () {
        var pl = a.dataset.filter;
        if (PLANET_ORDER.indexOf(pl) === -1) return;
        activePlanet = pl;
        var wrap = $("#planetChips");
        if (wrap) wrap.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.planet === pl ? "true" : "false"); });
        renderGrid();
      });
    });
  }

  /* ---------------------------- Reviews ---------------------------- */
  function renderReviews() {
    var wrap = $("#reviewColumns");
    if (!wrap) return;
    REVIEWS.forEach(function (r) {
      var stars = "★★★★★".slice(0, r.stars) + "☆☆☆☆☆".slice(0, 5 - r.stars);
      var card = el("figure", "review");
      card.innerHTML =
        '<div class="review-stars" aria-label="' + r.stars + ' out of 5 stars">' + stars + '</div>' +
        '<blockquote class="review-quote">' + r.quote + '</blockquote>' +
        '<figcaption><span class="review-author">' + r.author + '</span><br><span class="review-stone">' + r.stone + '</span></figcaption>';
      wrap.appendChild(card);
    });
  }

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

  /* ---------------------------- Cart ---------------------------- */
  var cart = loadCart();
  function loadCart() {
    try { return JSON.parse(localStorage.getItem("ss_cart") || "[]"); }
    catch (e) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem("ss_cart", JSON.stringify(cart)); } catch (e) {}
  }
  function findProduct(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
  function cartCount() { return cart.reduce(function (n, it) { return n + it.qty; }, 0); }
  function cartSubtotal() {
    return cart.reduce(function (sum, it) { var p = findProduct(it.id); return sum + (p ? p.price * it.qty : 0); }, 0);
  }

  function addToCart(id) {
    var row = null;
    for (var i = 0; i < cart.length; i++) if (cart[i].id === id) { row = cart[i]; break; }
    if (row) row.qty += 1; else cart.push({ id: id, qty: 1 });
    saveCart(); updateCartBadge(true); renderDrawer();
    var p = findProduct(id);
    announce((p ? p.name : "Item") + " added to your selection.");
  }
  function setQty(id, delta) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) { cart[i].qty += delta; if (cart[i].qty <= 0) cart.splice(i, 1); break; }
    }
    saveCart(); updateCartBadge(false); renderDrawer();
  }
  function removeFromCart(id) {
    cart = cart.filter(function (it) { return it.id !== id; });
    saveCart(); updateCartBadge(false); renderDrawer();
  }

  function updateCartBadge(bump) {
    var count = cartCount(), badge = $("#cartCount"), btn = $("#cartButton");
    badge.textContent = count;
    badge.setAttribute("data-empty", count === 0 ? "true" : "false");
    if (btn) btn.setAttribute("aria-label", "Open cart, " + count + (count === 1 ? " item" : " items"));
    if (bump && !prefersReduced) {
      badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump");
    }
  }

  function whatsappForCart() {
    var lines = cart.map(function (it) {
      var p = findProduct(it.id);
      return p ? ("• " + p.name + " (" + p.stone + ", " + p.carat.toFixed(1) + "ct) x" + it.qty + " · " + inr(p.price * it.qty)) : "";
    }).filter(Boolean);
    var msg = "Hi SoulStones, I would like to confirm this selection:\n" + lines.join("\n") +
      "\n\nSubtotal: " + inr(cartSubtotal());
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
  }

  function renderDrawer() {
    var items = $("#drawerItems"), emptyEl = $("#drawerEmpty"), foot = $("#drawerFoot");
    if (!items) return;
    items.innerHTML = "";
    if (!cart.length) {
      emptyEl.hidden = false; foot.hidden = true; items.hidden = true; return;
    }
    emptyEl.hidden = true; foot.hidden = false; items.hidden = false;
    cart.forEach(function (it) {
      var p = findProduct(it.id);
      if (!p) return;
      var li = el("li", "drawer-row");
      li.innerHTML =
        '<img class="drawer-thumb" src="' + IMG + p.img + '" alt="" />' +
        '<div class="drawer-info">' +
          '<div class="drawer-info-name">' + p.name + '</div>' +
          '<div class="drawer-info-meta">' + p.planet + ' · ' + p.carat.toFixed(1) + ' ct</div>' +
          '<div class="drawer-qty">' +
            '<button class="qty-btn" type="button" data-dec="' + p.id + '" aria-label="Decrease quantity">−</button>' +
            '<span class="qty-val">' + it.qty + '</span>' +
            '<button class="qty-btn" type="button" data-inc="' + p.id + '" aria-label="Increase quantity">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="drawer-line-end">' +
          '<span class="drawer-price">' + inr(p.price * it.qty) + '</span>' +
          '<button class="remove-btn" type="button" data-remove="' + p.id + '">Remove</button>' +
        '</div>';
      items.appendChild(li);
    });
    $("#drawerSubtotal").textContent = inr(cartSubtotal());
    var checkout = $("#drawerCheckout");
    if (checkout) checkout.href = whatsappForCart();
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
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    });
  }

  function bindDropdowns() {
    function setupDropdown(btnId, panelId) {
      var btn = $("#" + btnId), panel = $("#" + panelId);
      if (!btn || !panel) return;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = panel.classList.contains("open");
        // Close every other open panel first
        document.querySelectorAll(".nav-dropdown-panel.open").forEach(function (p) {
          if (p !== panel) {
            p.classList.remove("open");
            var otherBtn = p.previousElementSibling;
            if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
          }
        });
        panel.classList.toggle("open", !isOpen);
        btn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      });
    }
    setupDropdown("collectionsBtn", "collectionsPanel");
    setupDropdown("profileBtn", "profilePanel");

    // Close all dropdowns on outside click
    document.addEventListener("click", function () {
      document.querySelectorAll(".nav-dropdown-panel.open").forEach(function (p) {
        p.classList.remove("open");
      });
      ["collectionsBtn", "profileBtn"].forEach(function (id) {
        var b = $("#" + id); if (b) b.setAttribute("aria-expanded", "false");
      });
    });
    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".nav-dropdown-panel.open").forEach(function (p) { p.classList.remove("open"); });
        ["collectionsBtn", "profileBtn"].forEach(function (id) {
          var b = $("#" + id); if (b) b.setAttribute("aria-expanded", "false");
        });
      }
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
        addToCart(t.getAttribute("data-add"));
        t.classList.add("added"); t.textContent = "Added";
        setTimeout(function () { t.classList.remove("added"); t.textContent = "Add"; }, 1200);
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
    renderChips();
    renderGrid();
    renderRail();
    renderReviews();
    renderVideos();
    renderDrawer();
    updateCartBadge(false);
    bindSort();
    bindCategoryFilters();
    bindHeaderScroll();
    bindMobileNav();
    bindDropdowns();
    bindSearch();
    bindAnnouncement();
    bindReveal();
    bindNewsletter();
    bindGlobalClicks();
  });
})();
