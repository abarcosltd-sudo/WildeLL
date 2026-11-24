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
 
const form = document.getElementById('waitlist-form');
const msg = document.getElementById('form-message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msg.textContent = 'Please enter a valid email address.';
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  msg.textContent = 'Joining…';
  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: form.role.value, website: form.website.value })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      form.reset();
      msg.textContent = "You're on the Wilde waitlist 🎉";
    } else {
      msg.textContent = data.error || 'Something went wrong. Please try again.';
    }
  } catch {
    msg.textContent = 'Network error. Please try again.';
  } finally {
    btn.disabled = false;
  }
});


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
