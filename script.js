document.addEventListener("DOMContentLoaded", function () {
  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      mobileNav.classList.toggle("open", !isOpen);
      navToggle.setAttribute("aria-label", isOpen ? "Open menu" : "Close menu");
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
        mobileNav.classList.remove("open");
      });
    });
  }

  /* ---------- Waitlist form ---------- */
  var form = document.getElementById("waitlist-form");
  var message = document.getElementById("form-message");

  if (form && message) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var emailField = document.getElementById("email");
      var email = emailField.value.trim();
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        message.textContent =
          "Enter a valid email address to join the waitlist.";
        message.className = "form-message error";
        emailField.focus();
        return;
      }
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then(function (response) {
          if (response.ok) {
            message.textContent =
              "You're on the list — we'll email " +
              email +
              " the moment Wilde opens its doors.";
            message.className = "form-message success";
            form.reset();
          } else {
            message.textContent =
              "Something went wrong — please try again in a moment.";
            message.className = "form-message error";
          }
        })
        .catch(function () {
          message.textContent =
            "Something went wrong — please try again in a moment.";
          message.className = "form-message error";
        });
    });
  }

  /* ---------- 3D quill: progress, load, and error handling ---------- */
  var modelViewer = document.getElementById("quill-model");
  var stage = document.getElementById("model-stage");
  var progressBar = modelViewer
    ? modelViewer.querySelector(".model-progress-bar")
    : null;
  var fallback = document.getElementById("model-fallback");

  if (modelViewer) {
    // Live progress while the .glb downloads
    modelViewer.addEventListener("progress", function (event) {
      var fraction = event.detail.totalProgress || 0;
      if (progressBar) {
        progressBar.style.width = Math.round(fraction * 100) + "%";
      }
    });

    // Model finished loading and rendering
    // modelViewer.addEventListener('load', function () {
    //   if (stage) stage.setAttribute('data-state', 'loaded');
    // });

    // Model finished loading and rendering
    modelViewer.addEventListener("load", function () {
      if (stage) stage.setAttribute("data-state", "loaded");
      if (progressBar && progressBar.parentElement) {
        progressBar.parentElement.style.display = "none";
      }
    });

    // Model failed to load — show a visible fallback instead of empty space
    modelViewer.addEventListener("error", function (event) {
      console.error("Wilde: 3D quill failed to load.", event.detail);
      if (stage) stage.setAttribute("data-state", "error");
      if (fallback) fallback.hidden = false;
      if (modelViewer) modelViewer.style.display = "none";
    });

    // If it's still not loaded after 12 seconds, assume a slow/stalled
    // connection and surface the same fallback rather than leaving a
    // silent blank box.
    window.setTimeout(function () {
      if (stage && stage.getAttribute("data-state") === "loading") {
        console.warn("Wilde: 3D quill is taking a long time to load.");
        if (fallback) fallback.hidden = false;
      }
    }, 12000);
  }
});
