/* ============================================================
   SoulStones — Track Order page
   The email lookup itself is a normal server-rendered POST (see
   views.track_order), so the page fully reloads with the result already
   rendered: Django shows exactly one of #toResults / #toEmpty via the
   `hidden` attribute based on whether matching orders were found. This
   file's only job is to notice which one is visible after that reload
   and smooth-scroll to it, offset for the sticky site header, so the
   customer doesn't have to scroll down manually to see their results.
   ============================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var results = document.getElementById('toResults');
    var empty   = document.getElementById('toEmpty');

    var target = null;
    if (results && !results.hidden) {
      target = results;
    } else if (empty && !empty.hidden) {
      target = empty;
    }

    if (!target) return; // fresh page load, no search performed yet

    var header       = document.querySelector('.site-header');
    var headerOffset = header ? header.getBoundingClientRect().height : 0;
    var breathingGap  = 16;
    var targetTop     = target.getBoundingClientRect().top + window.pageYOffset - headerOffset - breathingGap;

    window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
  });

  /* Clear validation state as soon as the user edits the field */
  var emailEl = document.getElementById('toEmail');
  var msgEl   = document.getElementById('toFormMsg');
  if (emailEl) {
    emailEl.addEventListener('input', function () {
      if (emailEl.getAttribute('aria-invalid')) {
        emailEl.removeAttribute('aria-invalid');
        if (msgEl) msgEl.textContent = '';
      }
    });
  }

})();
