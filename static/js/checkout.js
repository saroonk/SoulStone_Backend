/* ============================================================
   SoulStones — Checkout page
   Plain JS, no dependencies. Drives the Razorpay Checkout flow:
   1. Validate the form, then POST it to create a Pending order +
      a matching Razorpay order (server re-validates cart/stock).
      Only the submit button is disabled here — the fields must
      stay enabled, since FormData(form) silently drops disabled
      fields and would otherwise submit an empty payload.
   2. Open the Razorpay Checkout widget immediately.
   3. Only once Razorpay reports a successful payment: disable the
      whole form, show the full-page processing overlay, and POST
      the Razorpay response for server-side signature verification.
      Only then does the backend confirm the order, reduce stock,
      clear the cart, and send emails.
   4. On failure/cancel, tell the backend so the order is marked
      Failed instead of being left silently Pending.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("checkoutForm");
    var msg = document.getElementById("checkoutMsg");
    var submitBtn = form ? form.querySelector(".checkout-submit") : null;
    var overlay = document.getElementById("checkoutProcessingOverlay");
    if (!form) return;

    var createOrderUrl = form.dataset.createOrderUrl;
    var verifyUrl = form.dataset.verifyUrl;
    var failedUrl = form.dataset.failedUrl;
    var razorpayKey = form.dataset.razorpayKey;
    var isProcessing = false;

    function csrfToken() {
      var input = form.querySelector('[name="csrfmiddlewaretoken"]');
      return input ? input.value : "";
    }

    function setMessage(text, state) {
      if (!msg) return;
      msg.textContent = text || "";
      if (state) msg.setAttribute("data-state", state);
      else msg.removeAttribute("data-state");
    }

    // Only the button — never the fields — so FormData(form) still picks
    // up every value while a create-order/Razorpay-open request is in flight.
    function setButtonBusy(isBusy) {
      if (!submitBtn) return;
      submitBtn.disabled = isBusy;
      submitBtn.textContent = isBusy ? "Processing…" : "Proceed to Payment";
    }

    function setFormDisabled(disabled) {
      Array.prototype.forEach.call(form.elements, function (el) { el.disabled = disabled; });
    }

    // Shown only once Razorpay has confirmed payment, covering the checkout
    // form entirely so the customer feels the payment completed instantly
    // instead of wondering whether the site is stuck.
    function showProcessingOverlay() {
      if (!overlay) return;
      overlay.hidden = false;
      // The [hidden] attribute only works while no inline "display" is set,
      // so set/clear it alongside `hidden` rather than baking it into the
      // static style attribute (which would defeat `hidden` permanently).
      overlay.style.display = "flex";
      requestAnimationFrame(function () { overlay.classList.add("show"); });
    }

    function hideProcessingOverlay() {
      if (!overlay) return;
      overlay.classList.remove("show");
      setTimeout(function () {
        overlay.hidden = true;
        overlay.style.display = "";
      }, 250);
    }

    function postForm(url, body) {
      return fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": csrfToken(),
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: new URLSearchParams(body).toString()
      }).then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      });
    }

    function resetToIdle() {
      isProcessing = false;
      setButtonBusy(false);
    }

    function openRazorpay(order) {
      if (typeof Razorpay === "undefined") {
        setMessage("Payment could not start. Please refresh and try again.", "error");
        resetToIdle();
        return;
      }

      var rzp = new Razorpay({
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.razorpay_order_id,
        prefill: order.prefill,
        theme: { color: "#C9A24B" },
        handler: function (response) {
          // Payment is done as far as the customer is concerned — switch
          // away from the checkout UI right now, before making them wait
          // on the verification/order-creation request.
          setFormDisabled(true);
          showProcessingOverlay();

          postForm(verifyUrl, {
            order_number: order.order_number,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          }).then(function (result) {
            if (result.ok && result.data.success) {
              window.location.href = result.data.redirect_url;
            } else {
              // Vanishingly rare (Razorpay said success but our own
              // verification failed) — let the customer see why and retry
              // rather than leaving them stuck behind the overlay forever.
              hideProcessingOverlay();
              setFormDisabled(false);
              resetToIdle();
              setMessage(result.data.message || "Payment verification failed.", "error");
            }
          });
        },
        modal: {
          ondismiss: function () {
            postForm(failedUrl, { order_number: order.order_number });
            resetToIdle();
            setMessage("Payment was cancelled. You can try again when ready.", "info");
          }
        }
      });

      rzp.on("payment.failed", function () {
        postForm(failedUrl, { order_number: order.order_number });
        resetToIdle();
        setMessage("Payment failed. Please try again.", "error");
      });

      rzp.open();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (isProcessing) return; // belt-and-suspenders against double submission

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Read the fields before touching any disabled state.
      var formData = new FormData(form);

      isProcessing = true;
      setMessage("");
      setButtonBusy(true);

      postForm(createOrderUrl, formData).then(function (result) {
        if (result.ok && result.data.success) {
          openRazorpay(result.data);
        } else {
          resetToIdle();
          setMessage(result.data.message || "Something went wrong. Please try again.", "error");
        }
      });
    });
  });
})();
