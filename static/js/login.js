/* ============================================================
   SoulStones — Sign In / Register page
   Plain JS, no dependencies. Handles the Login/Register form
   swap animation and password show/hide toggles only. No
   validation or authentication logic — both forms submit as
   plain HTML forms, ready to be swapped for Django form posts.
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

    var current = "login";

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

  /* ---------------------------- Submit placeholder feedback ---------------------------- */
  // No backend yet — prevent the page from reloading/navigating away and
  // surface a neutral status message instead of faking a login/registration.
  function bindFormSubmissions() {
    var loginForm = $("#loginForm"), registerForm = $("#registerForm");
    var loginMsg = $("#loginMsg"), registerMsg = $("#registerMsg");

    if (loginForm) loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (loginMsg) {
        loginMsg.setAttribute("data-state", "info");
        loginMsg.textContent = "Sign-in isn't connected yet — this is a design preview.";
      }
    });
    if (registerForm) registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (registerMsg) {
        registerMsg.setAttribute("data-state", "info");
        registerMsg.textContent = "Account creation isn't connected yet — this is a design preview.";
      }
    });

    var googleBtn = $("#loginGoogleBtn");
    if (googleBtn) googleBtn.addEventListener("click", function () {
      if (loginMsg) {
        loginMsg.setAttribute("data-state", "info");
        loginMsg.textContent = "Google sign-in isn't connected yet — this is a design preview.";
      }
    });
  }

  /* ---------------------------- Init ---------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    bindFormSwitch();
    bindPasswordToggles();
    bindFormSubmissions();
  });
})();
