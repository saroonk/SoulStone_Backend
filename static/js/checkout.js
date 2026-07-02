/* ============================================================
   SoulStones — Checkout page
   Plain JS, no dependencies. The only behaviour here is
   preventing the placeholder form from navigating away on
   submit — no validation logic and no payment integration.
   The payment gateway redirect would be wired up here once
   the backend exists.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("checkoutForm");
    var msg = document.getElementById("checkoutMsg");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (msg) {
        msg.setAttribute("data-state", "info");
        msg.textContent = "Payment isn't connected yet — this is a design preview.";
      }
    });
  });
})();
