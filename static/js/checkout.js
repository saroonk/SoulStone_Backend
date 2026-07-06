/* ============================================================
   SoulStones — Checkout page
   Plain JS, no dependencies. Drives the Razorpay Checkout flow:
   1. Validate the form, then POST it to create a Pending order +
      a matching Razorpay order (server re-validates cart/stock).
   2. Open the Razorpay Checkout widget.
   3. On payment success, POST the Razorpay response for server-side
      signature verification; only then does the backend confirm the
      order, reduce stock, and clear the cart.
   4. On failure/cancel, tell the backend so the order is marked
      Failed instead of being left silently Pending.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("checkoutForm");
    var msg = document.getElementById("checkoutMsg");
    var submitBtn = form ? form.querySelector(".checkout-submit") : null;
    if (!form) return;

    var createOrderUrl = form.dataset.createOrderUrl;
    var verifyUrl = form.dataset.verifyUrl;
    var failedUrl = form.dataset.failedUrl;
    var razorpayKey = form.dataset.razorpayKey;

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

    function setSubmitting(isSubmitting) {
      if (!submitBtn) return;
      submitBtn.disabled = isSubmitting;
      submitBtn.textContent = isSubmitting ? "Processing…" : "Proceed to Payment";
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

    function openRazorpay(order) {
      if (typeof Razorpay === "undefined") {
        setMessage("Payment could not start. Please refresh and try again.", "error");
        setSubmitting(false);
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
          postForm(verifyUrl, {
            order_number: order.order_number,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          }).then(function (result) {
            if (result.ok && result.data.success) {
              window.location.href = result.data.redirect_url;
            } else {
              setMessage(result.data.message || "Payment verification failed.", "error");
              setSubmitting(false);
            }
          });
        },
        modal: {
          ondismiss: function () {
            postForm(failedUrl, { order_number: order.order_number });
            setMessage("Payment was cancelled. You can try again when ready.", "info");
            setSubmitting(false);
          }
        }
      });

      rzp.on("payment.failed", function () {
        postForm(failedUrl, { order_number: order.order_number });
        setMessage("Payment failed. Please try again.", "error");
        setSubmitting(false);
      });

      rzp.open();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      setMessage("");
      setSubmitting(true);

      var formData = new FormData(form);
      postForm(createOrderUrl, formData).then(function (result) {
        if (result.ok && result.data.success) {
          openRazorpay(result.data);
        } else {
          setMessage(result.data.message || "Something went wrong. Please try again.", "error");
          setSubmitting(false);
        }
      });
    });
  });
})();
