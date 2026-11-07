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
  initLanes();
  initBay();

  var form = document.getElementById("estimate-form");
  if (!form) return;
  Array.prototype.forEach.call(form.querySelectorAll("a"), function (link) {
    link.addEventListener("click", function (clickEvent) { clickEvent.stopPropagation(); });
  });

  var params = new URLSearchParams(window.location.search);
  var service = params.get("service");
  var aliases = { repair: "engine", maintenance: "routine", tuning: "engine" };
  if (service && aliases[service]) service = aliases[service];
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

  function initBay() {
    var root = document.querySelector("[data-bay]");
    if (!root) return;
    var spin = root.querySelector(".spin");
    var frames = root.querySelectorAll(".spin-frame");
    var pin = root.querySelector(".pin");
    var where = root.querySelector(".bay-where");
    var name = root.querySelector(".bay-name");
    var buttons = root.querySelectorAll(".svc");
    if (!spin || !frames.length || !pin) return;
    var count = frames.length;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var frame = 0;
    var timer = null;
    var jobFade = null;
    var token = 0;
    var active = null;

    function showFrame(index) {
      frame = (index + count) % count;
      Array.prototype.forEach.call(frames, function (img) {
        var on = Number(img.getAttribute("data-i")) === frame;
        img.classList.toggle("is-on", on);
      });
    }

    function placePin(btn) {
      pin.style.left = (btn.getAttribute("data-px") || "50") + "%";
      pin.style.top = (btn.getAttribute("data-py") || "50") + "%";
      spin.classList.remove("is-turning");
      spin.classList.remove("is-free");
    }

    function label(btn) {
      var title = btn.querySelector("strong");
      if (where) where.textContent = btn.getAttribute("data-where") || "";
      if (name) name.textContent = title ? title.textContent : "";
    }

    function markService(btn) {
      var id = btn ? btn.getAttribute("data-service") || "" : "";
      Array.prototype.forEach.call(root.querySelectorAll(".lane[data-service]"), function (lane) {
        lane.classList.toggle("is-on", lane.getAttribute("data-service") === id);
      });
      Array.prototype.forEach.call(root.querySelectorAll(".callout, .cdot, .cline"), function (node) {
        var on = !!id && node.getAttribute("data-service") === id;
        node.classList.toggle("is-on", on);
        if (node.classList.contains("callout")) node.setAttribute("aria-pressed", on ? "true" : "false");
      });
      var sets = root.querySelectorAll(".job-set");
      Array.prototype.forEach.call(sets, function (set) {
        var on = !!id && set.getAttribute("data-service") === id;
        if (on) {
          set.inert = false;
          if (set.hidden) {
            set.hidden = false;
            set.classList.add("is-out");
            set.classList.remove("is-shown");
          } else {
            set.classList.add("is-shown");
            set.classList.remove("is-out");
          }
        } else {
          set.classList.remove("is-shown");
          set.classList.add("is-out");
          set.inert = true;
        }
      });
      if (jobFade) clearTimeout(jobFade);
      requestAnimationFrame(function () {
        Array.prototype.forEach.call(sets, function (set) {
          if (!set.hidden && set.getAttribute("data-service") === id) {
            set.classList.remove("is-out");
            set.classList.add("is-shown");
          }
        });
        placeDock(id);
      });
      jobFade = setTimeout(function () {
        jobFade = null;
        Array.prototype.forEach.call(sets, function (set) {
          if (!set.classList.contains("is-shown")) {
            set.hidden = true;
            set.classList.remove("is-out");
          }
        });
      }, reduce ? 0 : 400);
    }

    function select(btn, announce) {
      active = btn;
      Array.prototype.forEach.call(buttons, function (item) {
        item.setAttribute("aria-pressed", item === btn ? "true" : "false");
      });
      markService(btn);
      if (announce) label(btn);
      var target = Number(btn.getAttribute("data-frame"));
      if (isNaN(target)) target = 0;
      var mine = ++token;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (reduce || frame === target) {
        showFrame(target);
        placePin(btn);
        return;
      }
      spin.classList.add("is-turning");
      var forward = (target - frame + count) % count;
      var back = (frame - target + count) % count;
      var dir = forward <= back ? 1 : -1;
      var steps = Math.min(forward, back);
      var step = 0;
      function tick() {
        if (mine !== token) return;
        step += 1;
        showFrame(frame + dir);
        if (step >= steps) {
          timer = null;
          placePin(btn);
          return;
        }
        timer = setTimeout(tick, 340);
      }
      timer = setTimeout(tick, 340);
    }

    function showStage() {
      var stage = root.querySelector(".spin-stage");
      if (!stage) return;
      var rect = stage.getBoundingClientRect();
      var header = 84;
      var hidden = rect.bottom < header + 40 || rect.top > window.innerHeight - 40;
      if (!hidden) return;
      window.scrollTo({
        top: Math.max(0, rect.top + window.scrollY - header),
        behavior: reduce ? "auto" : "smooth"
      });
    }

    Array.prototype.forEach.call(root.querySelectorAll(".svc, .callout"), function (btn) {
      var lead = btn.classList.contains("svc-lead");
      var marker = btn.classList.contains("callout");
      btn.addEventListener("pointerenter", function (event) {
        if (lead || marker) return;
        if (event.pointerType && event.pointerType !== "mouse") return;
        select(btn, true);
      });
      btn.addEventListener("focus", function () {
        if (lead || marker) return;
        select(btn, true);
      });
      btn.addEventListener("click", function () {
        var target = btn;
        if (marker) {
          var picked = root.querySelector('.pick-list .svc-lead[data-service="' + (btn.getAttribute("data-service") || "") + '"]');
          if (picked) target = picked;
        }
        select(target, true);
        if (!lead && !marker) return;
        var id = target.getAttribute("data-service") || "";
        if (id && window.history && window.history.replaceState) {
          var next = "#" + id;
          if (window.location.hash !== next) window.history.replaceState(null, "", next);
        }
        showStage();
      });
    });

    var drag = null;
    spin.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.target.closest && event.target.closest(".job-dock, .callout")) return;
      drag = { id: event.pointerId, x: event.clientX, acc: 0, turned: false };
      spin.setPointerCapture(event.pointerId);
      spin.classList.add("is-dragging");
      token += 1;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    });
    spin.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      var moved = event.clientX - drag.x - drag.acc;
      var stepPx = 28;
      while (moved >= stepPx) {
        showFrame(frame - 1);
        drag.acc += stepPx;
        drag.turned = true;
        moved -= stepPx;
      }
      while (moved <= -stepPx) {
        showFrame(frame + 1);
        drag.acc -= stepPx;
        drag.turned = true;
        moved += stepPx;
      }
    });
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      var turned = drag.turned;
      drag = null;
      spin.classList.remove("is-dragging");
      if (!turned && active) {
        placePin(active);
        return;
      }
      active = null;
      spin.classList.add("is-free");
      Array.prototype.forEach.call(buttons, function (item) {
        item.setAttribute("aria-pressed", "false");
      });
      markService(null);
    }
    spin.addEventListener("pointerup", endDrag);
    spin.addEventListener("pointercancel", endDrag);
    spin.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      token += 1;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      showFrame(frame + (event.key === "ArrowRight" ? -1 : 1));
      spin.classList.add("is-free");
      active = null;
      Array.prototype.forEach.call(buttons, function (item) {
        item.setAttribute("aria-pressed", "false");
      });
      markService(null);
      setTimeout(function () { spin.classList.remove("is-dragging"); }, 80);
    });

    function placeDock(id) {
      var dock = root.querySelector(".job-dock");
      var mark = id ? root.querySelector('.callout[data-service="' + id + '"]') : null;
      if (!dock || !mark) return;
      var sb = spin.getBoundingClientRect();
      var mb = mark.getBoundingClientRect();
      if (!sb.width || !sb.height) return;
      if (sb.width < 700) {
        var phoneW = Math.min(300, Math.max(168, sb.width * 0.42));
        dock.style.width = phoneW + "px";
        var phoneLeft = mb.left - sb.left;
        if (mb.left + mb.width / 2 > sb.left + sb.width * 0.5) phoneLeft = mb.right - sb.left - phoneW;
        phoneLeft = Math.max(8, Math.min(phoneLeft, sb.width - phoneW - 8));
        var phoneTop = mb.bottom - sb.top + 8;
        var phoneRoom = sb.height - phoneTop - 6;
        Array.prototype.forEach.call(root.querySelectorAll(".callout"), function (node) {
          if (node === mark) return;
          var cb = node.getBoundingClientRect();
          var panelLeft = sb.left + phoneLeft;
          var panelRight = panelLeft + phoneW;
          if (cb.right < panelLeft + 4 || cb.left > panelRight - 4) return;
          if (cb.top <= mb.bottom) return;
          var limit = cb.top - sb.top - phoneTop - 8;
          if (limit > 56 && limit < phoneRoom) phoneRoom = limit;
        });
        if (phoneRoom < 48) phoneRoom = 48;
        dock.style.left = Math.round(phoneLeft) + "px";
        dock.style.top = Math.round(phoneTop) + "px";
        dock.style.maxHeight = Math.round(phoneRoom) + "px";
        return;
      }
      var gap = 10;
      var edge = 10;
      var maxW = Math.round(Math.min(380, Math.max(220, sb.width * 0.4)));
      dock.style.width = maxW + "px";
      var onRight = mb.left + mb.width / 2 > sb.left + sb.width * 0.5;
      var left = onRight ? mb.right - sb.left - maxW : mb.left - sb.left;
      var top = mb.bottom - sb.top + gap;
      var ceiling = Math.round(Math.min(230, sb.height * 0.58));
      var readable = Math.min(150, ceiling);
      function clampLeft(value) {
        return Math.max(edge, Math.min(value, sb.width - maxW - edge));
      }
      function roomAt(panelLeft, panelTop) {
        var panelRight = panelLeft + maxW;
        var limit = sb.height - panelTop - edge;
        Array.prototype.forEach.call(root.querySelectorAll(".callout"), function (node) {
          if (node === mark) return;
          var cb = node.getBoundingClientRect();
          var cLeft = cb.left - sb.left;
          var cRight = cb.right - sb.left;
          if (cRight < panelLeft + 8 || cLeft > panelRight - 8) return;
          if (cb.bottom <= sb.top + panelTop + 2) return;
          var next = cb.top - sb.top - panelTop - 10;
          if (next < limit) limit = next;
        });
        return limit;
      }
      left = clampLeft(left);
      var fit = roomAt(left, top);
      if (fit < readable) {
        var limiter = null;
        var limiterRoom = fit;
        Array.prototype.forEach.call(root.querySelectorAll(".callout"), function (node) {
          if (node === mark) return;
          var cb = node.getBoundingClientRect();
          var cLeft = cb.left - sb.left;
          var cRight = cb.right - sb.left;
          if (cRight < left + 8 || cLeft > left + maxW - 8) return;
          if (cb.top <= mb.bottom + 2) return;
          var next = cb.top - sb.top - top - 10;
          if (next <= limiterRoom + 1) {
            limiter = cb;
            limiterRoom = next;
          }
        });
        if (limiter) {
          var candidate = onRight ? limiter.left - sb.left - maxW - 12 : limiter.right - sb.left + 12;
          candidate = clampLeft(candidate);
          var nextFit = roomAt(candidate, top);
          if (nextFit > fit + 24) {
            left = candidate;
            fit = nextFit;
          }
        }
      }
      var shown = Math.min(fit, ceiling);
      if (shown < readable) {
        var aboveH = Math.min(ceiling, mb.top - sb.top - gap - edge);
        var aboveTop = Math.max(edge, mb.top - sb.top - gap - aboveH);
        if (aboveH > shown) {
          var aboveFit = roomAt(left, aboveTop);
          if (aboveFit > shown + 24) {
            var height = Math.min(aboveFit, aboveH, ceiling);
            top = mb.top - sb.top - gap - height;
            if (top < edge) {
              height -= edge - top;
              top = edge;
            }
            fit = height;
          }
        }
      }
      if (top < edge) top = edge;
      fit = Math.max(0, Math.min(fit, ceiling, sb.height - top - edge));
      dock.style.left = Math.round(left) + "px";
      dock.style.top = Math.round(top) + "px";
      dock.style.maxHeight = Math.round(fit) + "px";
    }

    function leadFor(id) {
      if (!/^[a-z]+$/.test(id || "")) return null;
      return root.querySelector('.svc-lead[data-service="' + id + '"]');
    }

    var hashLead = leadFor((window.location.hash || "").replace("#", ""));
    var current = hashLead || root.querySelector('.svc[aria-pressed="true"]') || buttons[0];
    if (current) {
      frame = Number(current.getAttribute("data-frame")) || 0;
      showFrame(frame);
      select(current, false);
      label(current);
    }
    window.addEventListener("hashchange", function () {
      var lead = leadFor((window.location.hash || "").replace("#", ""));
      if (lead) select(lead, true);
    });
    window.addEventListener("resize", function () {
      if (!active) return;
      placeDock(active.getAttribute("data-service") || "");
    });
  }

  function initLanes() {
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;
    Array.prototype.forEach.call(document.querySelectorAll(".lane"), function (lane) {
      lane.addEventListener("pointermove", function (event) {
        if (event.pointerType && event.pointerType !== "mouse") return;
        var rect = lane.getBoundingClientRect();
        lane.style.setProperty("--spot-x", (event.clientX - rect.left) + "px");
        lane.style.setProperty("--spot-y", (event.clientY - rect.top) + "px");
      });
    });
  }

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
          var delay = child.classList.contains("lane") ? Math.min(index * 90, 540) : Math.min(index * 70, 210);
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
