(function () {
  'use strict';

  /* Demo-only lookup: customer@example.com has orders; everything else returns empty.
   * Django note: remove this file and handle lookup via form POST to {% url 'track_order' %}.
   */
  var DEMO_EMAIL = 'customer@example.com';

  var form    = document.getElementById('toForm');
  var emailEl = document.getElementById('toEmail');
  var msgEl   = document.getElementById('toFormMsg');
  var results = document.getElementById('toResults');
  var empty   = document.getElementById('toEmpty');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var raw   = emailEl.value.trim();
    var email = raw.toLowerCase();

    if (!raw || !emailEl.checkValidity()) {
      msgEl.textContent = 'Please enter a valid email address.';
      emailEl.setAttribute('aria-invalid', 'true');
      emailEl.focus();
      return;
    }

    emailEl.removeAttribute('aria-invalid');
    msgEl.textContent = '';

    if (email === DEMO_EMAIL) {
      results.hidden = false;
      empty.hidden   = true;
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      results.hidden = true;
      empty.hidden   = false;
      empty.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  /* Clear validation state as soon as the user edits the field */
  emailEl.addEventListener('input', function () {
    if (emailEl.getAttribute('aria-invalid')) {
      emailEl.removeAttribute('aria-invalid');
      msgEl.textContent = '';
    }
  });

})();
