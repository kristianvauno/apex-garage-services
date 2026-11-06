(function () {
  var mobileBar = document.getElementById("mobile-bar");
  if (mobileBar) {
    function syncMobileBar() {
      var active = document.activeElement;
      var tag = active && active.tagName ? active.tagName.toLowerCase() : "";
      var hide = tag === "input" || tag === "textarea" || tag === "select";
      mobileBar.classList.toggle("is-hidden", hide);
    }
    document.addEventListener("focusin", syncMobileBar);
    document.addEventListener("focusout", function () {
      setTimeout(syncMobileBar, 0);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('a[href^="tel:"]'), function (link) {
    link.addEventListener("click", function () {
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "click_to_call" });
      } catch (err) {}
    });
  });

  var nav = document.getElementById("site-nav");
  var menu = document.querySelector(".menu-btn");
  if (nav && menu) {
    menu.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", open ? "false" : "true");
      menu.setAttribute("aria-expanded", open ? "false" : "true");
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        nav.setAttribute("data-open", "false");
        menu.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        nav.setAttribute("data-open", "false");
        menu.setAttribute("aria-expanded", "false");
        var openDrop = nav.querySelector(".nav-drop[data-open='true']");
        if (openDrop) setDrop(openDrop, false);
      }
    });
  }

  function setDrop(drop, open) {
    var trigger = drop.querySelector("a");
    drop.setAttribute("data-open", open ? "true" : "false");
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  Array.prototype.forEach.call(document.querySelectorAll(".nav-drop"), function (drop) {
    drop.addEventListener("mouseenter", function () { setDrop(drop, true); });
    drop.addEventListener("mouseleave", function () { setDrop(drop, false); });
    drop.addEventListener("focusin", function () { setDrop(drop, true); });
    drop.addEventListener("focusout", function (event) {
      if (!drop.contains(event.relatedTarget)) setDrop(drop, false);
    });
  });

  initReveal();

  var form = document.getElementById("estimate-form");
  if (!form) return;
  Array.prototype.forEach.call(form.querySelectorAll("a"), function (link) {
    link.addEventListener("click", function (clickEvent) { clickEvent.stopPropagation(); });
  });

  var params = new URLSearchParams(window.location.search);
  var service = params.get("service");
  var select = form.querySelector("[name=service]");
  if (service && select) {
    Array.prototype.forEach.call(select.options, function (option) {
      if (option.value === service) select.value = service;
    });
  }

  var areaField = form.querySelector("[name=area]");
  var areaParam = params.get("area");
  if (areaField) {
    var areaValue = areaParam || form.getAttribute("data-area") || areaField.value || "";
    areaField.value = String(areaValue).replace(/[^a-z0-9-]/gi, "").slice(0, 40);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var errors = form.querySelectorAll(".field-error");
    Array.prototype.forEach.call(errors, function (node) { node.remove(); });
    Array.prototype.forEach.call(form.querySelectorAll(".is-invalid"), function (node) {
      node.classList.remove("is-invalid");
    });

    var honeypot = form.querySelector("[name=company]");
    if (honeypot && honeypot.value) {
      window.location.href = form.getAttribute("data-thanks");
      return;
    }

    var required = [
      ["name", "Add your name."],
      ["phone", "Add a phone number."],
      ["vehicle", "Add the year, make, and model."],
      ["service", "Choose a service."]
    ];
    var firstInvalid = null;
    required.forEach(function (pair) {
      var field = form.querySelector("[name=" + pair[0] + "]");
      if (!field || String(field.value).trim()) return;
      field.classList.add("is-invalid");
      var message = document.createElement("p");
      message.className = "field-error";
      message.textContent = pair[1];
      field.parentNode.appendChild(message);
      if (!firstInvalid) firstInvalid = field;
    });
    var consent = form.querySelector("[name=consent]");
    if (consent && !consent.checked) {
      var note = document.createElement("p");
      note.className = "field-error";
      note.textContent = "Confirm we can contact you about this request.";
      consent.parentNode.appendChild(note);
      if (!firstInvalid) firstInvalid = consent;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var chosen = select ? select.value : "";
    var endpoint = form.getAttribute("data-endpoint");
    var thanks = form.getAttribute("data-thanks");
    var submit = form.querySelector("[type=submit]");
    var status = form.querySelector(".form-status");
    if (!status) {
      status = document.createElement("p");
      status.className = "form-status field-error";
      status.setAttribute("role", "alert");
      submit.parentNode.insertBefore(status, submit);
    }
    status.textContent = "";
    if (!endpoint) {
      status.textContent = "This form is not connected to an inbox yet.";
      return;
    }

    var payload = {
      name: form.querySelector("[name=name]").value.trim(),
      phone: form.querySelector("[name=phone]").value.trim(),
      email: form.querySelector("[name=email]") ? form.querySelector("[name=email]").value.trim() : "",
      vehicle: form.querySelector("[name=vehicle]").value.trim(),
      service: chosen,
      day: (form.querySelector("[name=day]") || {}).value || "",
      message: form.querySelector("[name=message]") ? form.querySelector("[name=message]").value.trim() : "",
      area: areaField ? areaField.value : "",
      consent: "yes"
    };

    submit.disabled = true;
    var label = submit.textContent;
    submit.textContent = "Sending…";
    fetch(endpoint, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) throw new Error("status " + response.status);
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "generate_lead", service: chosen });
      } catch (err) {}
      window.location.href = thanks + (chosen ? "?service=" + encodeURIComponent(chosen) : "");
    }).catch(function () {
      status.textContent = "The request did not send. Call (214) 555-0147 or try again.";
      submit.disabled = false;
      submit.textContent = label;
    });
  });

  function initReveal() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    var observer = null;
    function clearMotion() {
      document.documentElement.classList.remove("js-motion");
      Array.prototype.forEach.call(document.querySelectorAll(".is-pending, .is-shown"), function (node) {
        node.classList.remove("is-pending");
        node.classList.remove("is-shown");
        node.style.removeProperty("--reveal-delay");
      });
      if (observer) observer.disconnect();
    }
    function hashNode() {
      var id = window.location.hash;
      if (!id || id.length < 2) return null;
      try { return document.querySelector(id); } catch (err) { return null; }
    }
    function holdsHash(node) {
      var target = hashNode();
      return !!(target && (node === target || node.contains(target)));
    }
    function inView(node) {
      var rect = node.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      return rect.top < vh * 0.92 && rect.bottom > 0;
    }
    function release(node) {
      node.classList.remove("is-pending");
      node.classList.remove("is-shown");
      node.style.removeProperty("--reveal-delay");
      if (observer) observer.unobserve(node);
    }
    try {
      if (reduce.matches || !("IntersectionObserver" in window)) return;
      document.documentElement.classList.add("js-motion");
      function arm(node) {
        if (!node || node.hasAttribute("data-reveal") || node.closest("[data-reveal]") || node.closest(".mobile-bar")) return;
        node.setAttribute("data-reveal", "");
      }
      var foot = document.querySelector(".footer-grid");
      if (foot && !foot.hasAttribute("data-reveal-group")) {
        foot.setAttribute("data-reveal-group", "");
        Array.prototype.forEach.call(foot.children, arm);
      }
      Array.prototype.forEach.call(document.querySelectorAll(".faq"), function (faq) {
        if (faq.closest("[data-reveal]")) return;
        faq.setAttribute("data-reveal-group", "");
        Array.prototype.forEach.call(faq.querySelectorAll("details"), arm);
      });
      Array.prototype.forEach.call(document.querySelectorAll(".split > *, .gallery .frame, .cta-band .wrap, #google-reviews .prose"), arm);
      Array.prototype.forEach.call(document.querySelectorAll("[data-reveal-group]"), function (group) {
        var index = 0;
        Array.prototype.forEach.call(group.children, function (child) {
          if (!child.hasAttribute || !child.hasAttribute("data-reveal")) return;
          var delay = Math.min(index * 70, 210);
          if (delay) child.style.setProperty("--reveal-delay", delay + "ms");
          index += 1;
        });
      });
      var pending = [];
      Array.prototype.forEach.call(document.querySelectorAll("[data-reveal]"), function (node) {
        if (holdsHash(node) || inView(node)) return;
        node.classList.add("is-pending");
        pending.push(node);
      });
      if (!pending.length) return;
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var node = entry.target;
          if (!node.classList.contains("is-pending")) {
            observer.unobserve(node);
            return;
          }
          node.classList.remove("is-pending");
          node.classList.add("is-shown");
          observer.unobserve(node);
        });
      }, { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0 });
      pending.forEach(function (node) { observer.observe(node); });
      document.addEventListener("focusin", function (event) {
        var node = event.target && event.target.closest ? event.target.closest("[data-reveal].is-pending") : null;
        if (node) release(node);
      });
      window.addEventListener("hashchange", function () {
        Array.prototype.forEach.call(document.querySelectorAll("[data-reveal].is-pending"), function (node) {
          if (holdsHash(node)) release(node);
        });
      });
      if (reduce.addEventListener) {
        reduce.addEventListener("change", function () {
          if (reduce.matches) clearMotion();
        });
      }
    } catch (err) {
      clearMotion();
    }
  }
})();
