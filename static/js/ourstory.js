/* ============================================================
   SoulStones — Our Story page JavaScript
   Lightweight enhancements: scroll reveal, animated counters,
   hero parallax, Intersection Observer.
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. Hero entrance animation                                          */
  /* ------------------------------------------------------------------ */
  const heroInner = document.querySelector('.os-hero-inner');
  const heroMedia = document.querySelector('.os-hero-media');

  if (heroInner) {
    // Trigger immediately — hero is always in viewport on load
    requestAnimationFrame(() => {
      heroInner.classList.add('is-in');
    });
  }

  if (heroMedia) {
    // Subtle ken-burns: scale down once image is "loaded"
    heroMedia.classList.add('loaded');
  }

  /* ------------------------------------------------------------------ */
  /* 2. Scroll reveal (Intersection Observer)                             */
  /* ------------------------------------------------------------------ */
  const revealEls = document.querySelectorAll('.os-reveal');

  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => revealObs.observe(el));
  } else {
    // Fallback: show immediately for older browsers / reduced-motion
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ------------------------------------------------------------------ */
  /* 3. Animated counters                                                */
  /* ------------------------------------------------------------------ */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = eased * target;
      el.textContent = prefix + value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  const counters = document.querySelectorAll('[data-counter]');

  if (counters.length && 'IntersectionObserver' in window) {
    const counterObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => counterObs.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* 4. Footer year                                                      */
  /* ------------------------------------------------------------------ */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
