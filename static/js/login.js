/* ============================================================
   SoulStones — Sign In / Register page
   Plain JS, no dependencies. Handles the Login/Register form
   swap animation and password show/hide toggles only. Both
   forms are real Django form posts (see login.html / views.login);
   this file has no validation or authentication logic.
   ============================================================ */
(function () {
  "use strict";

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------- Login / Register switch ---------------------------- */
  function bindFormSwitch() {
    var loginForm = $("#loginForm"), registerForm = $("#registerForm");
    var switchText = $("#authSwitchText"), switchBtn = $("#authSwitchBtn");
    var loginSwitchLink = $("#loginSwitchLink");
    var registerSwitchLink = $("#registerSwitchLink");
    if (!loginForm || !registerForm) return;

    // The server may render either form as the active one (e.g. after a
    // failed registration it re-renders with the register form visible),
    // so read the actual starting state from the DOM instead of assuming.
    var current = loginForm.hidden ? "register" : "login";
    setBrandSwitch(current);

    function setBrandSwitch(target) {
      if (target === "login") {
        switchText.textContent = "Don't have an account?";
        switchBtn.textContent = "Register";
      } else {
        switchText.textContent = "Already have an account?";
        switchBtn.textContent = "Login";
      }
    }

    function reveal(target) {
      var outgoing = target === "login" ? registerForm : loginForm;
      var incoming = target === "login" ? loginForm : registerForm;

      outgoing.classList.remove("is-active");
      outgoing.hidden = true;
      incoming.hidden = false;

      if (prefersReduced) {
        incoming.classList.add("is-active");
      } else {
        requestAnimationFrame(function () { incoming.classList.add("is-active"); });
      }

      setBrandSwitch(target);
      current = target;

      var firstField = incoming.querySelector("input");
      if (firstField) firstField.focus();

      document.title = (target === "login" ? "SoulStones · Sign In" : "SoulStones · Create Your Account");
    }

    function switchTo(target) {
      if (target === current) return;
      var outgoing = target === "login" ? registerForm : loginForm;

      if (prefersReduced) {
        reveal(target);
        return;
      }
      outgoing.classList.add("is-leaving");
      setTimeout(function () {
        outgoing.classList.remove("is-leaving");
        reveal(target);
      }, 220);
    }

    if (switchBtn) switchBtn.addEventListener("click", function () { switchTo(current === "login" ? "register" : "login"); });
    if (loginSwitchLink) loginSwitchLink.addEventListener("click", function () { switchTo("register"); });
    if (registerSwitchLink) registerSwitchLink.addEventListener("click", function () { switchTo("login"); });
  }

  /* ---------------------------- Password show/hide ---------------------------- */
  function bindPasswordToggles() {
    $$(".auth-password-toggle").forEach(function (btn) {
      var input = document.getElementById(btn.getAttribute("data-toggle-for"));
      var eyeOn = btn.querySelector(".auth-eye-on"), eyeOff = btn.querySelector(".auth-eye-off");
      if (!input) return;
      btn.addEventListener("click", function () {
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-pressed", show ? "true" : "false");
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        btn.classList.toggle("is-visible", show);
        if (eyeOn) eyeOn.hidden = show;
        if (eyeOff) eyeOff.hidden = !show;
        input.focus();
      });
    });
  }

  /* ---------------------------- Init ---------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    bindFormSwitch();
    bindPasswordToggles();
  });
})();
