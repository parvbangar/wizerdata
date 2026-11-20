/* WIZER Data site script. No dependencies. Loaded with defer on every page. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.WZ = { esc };

  /* ---------------- toast ---------------- */
  let toastT;
  const toast = msg => {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 1800);
  };
  window.WZ.toast = toast;

  /* ---------------- nav ---------------- */
  const nav = $("#nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    const btn = $(".menu-btn", nav);
    const set = open => { nav.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); btn.setAttribute("aria-label", open ? "Close menu" : "Open menu"); };
    btn?.addEventListener("click", () => set(!nav.classList.contains("open")));
    $$(".mobile-menu a", nav).forEach(a => a.addEventListener("click", () => set(false)));
    addEventListener("keydown", e => { if (e.key === "Escape" && nav.classList.contains("open")) { set(false); btn.focus(); } });
  }

  /* ---------------- dropdown menus (Products, Docs) ---------------- */
  const dds = $$("[data-dd]");
  const closeAll = except => dds.forEach(d => { if (d !== except) setDd(d, false); });
  function setDd(d, open) {
    const btn = $(".dd-btn", d), panel = $(".dd-panel", d);
    btn.setAttribute("aria-expanded", open); panel.hidden = !open; d.classList.toggle("open", open);
  }
  const hoverable = matchMedia("(hover: hover) and (pointer: fine)").matches;
  dds.forEach(d => {
    const btn = $(".dd-btn", d);
    let t;
    let hoverAt = 0;
    btn.addEventListener("click", () => {
      // a click that follows a hover-open (mouse moved onto the button, then clicked) keeps the menu open
      const justHovered = hoverable && Date.now() - hoverAt < 600;
      const open = justHovered || btn.getAttribute("aria-expanded") !== "true";
      closeAll(d); setDd(d, open);
    });
    if (hoverable) {
      d.addEventListener("pointerenter", () => { clearTimeout(t); if (btn.getAttribute("aria-expanded") !== "true") hoverAt = Date.now(); closeAll(d); setDd(d, true); });
      d.addEventListener("pointerleave", () => { t = setTimeout(() => setDd(d, false), 180); });
    }
    d.addEventListener("keydown", e => {
      if (e.key === "Escape") { setDd(d, false); btn.focus(); }
      if (e.key === "ArrowDown" && document.activeElement === btn) { e.preventDefault(); setDd(d, true); $(".dd-item", d)?.focus(); }
    });
    d.addEventListener("focusout", e => { if (!d.contains(e.relatedTarget)) setDd(d, false); });
  });
  document.addEventListener("click", e => { if (!e.target.closest("[data-dd]")) closeAll(); });

  /* ---------------- copy ---------------- */
  const copyText = async (text, msg = "Copied") => {
    try { await navigator.clipboard.writeText(text); toast(msg); return true; }
    catch { toast("Select the text and press Ctrl+C"); return false; }
  };
  window.WZ.copyText = copyText;
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-copy]"); if (!b) return;
    const target = $(b.dataset.copy);
    if (!target) return;
    const panel = target.matches("[data-panel]") ? target : ($("[data-panel]:not([hidden])", target) || target);
    copyText(panel.innerText.trim(), b.dataset.copyMsg || "Copied");
  });

  /* ---------------- tabs (code samples) ---------------- */
  $$("[data-tabs]").forEach(group => {
    const btns = $$("[role=tab]", group), root = group.closest("[data-tabroot]") || group.parentElement;
    const show = name => {
      btns.forEach(b => { const on = b.dataset.tab === name; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
      $$("[data-panel]", root).forEach(p => { p.hidden = p.dataset.panel !== name; });
      try { localStorage.setItem("wz-lang", name); } catch { /* storage unavailable */ }
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => show(b.dataset.tab));
      b.addEventListener("keydown", e => {
        if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
        const n = btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length]; n.focus(); show(n.dataset.tab);
      });
    });
    let pref = null; try { pref = localStorage.getItem("wz-lang"); } catch { /* ignore */ }
    show(btns.some(b => b.dataset.tab === pref) ? pref : btns[0].dataset.tab);
  });

  /* ---------------- docs scrollspy ---------------- */
  const docNav = $(".docs-nav");
  if (docNav && "IntersectionObserver" in window) {
    const links = new Map($$("a[href^='#']", docNav).map(a => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.classList.remove("active"));
      links.get(en.target.id)?.classList.add("active");
    }), { rootMargin: "-20% 0px -70% 0px" });
    links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------------- docs search ---------------- */
  const ds = $("[data-doc-search]");
  if (ds) {
    const secs = $$(".doc section"), out = $("[data-doc-count]");
    const text = new Map(secs.map(s => [s, s.innerText.toLowerCase()]));
    ds.addEventListener("input", () => {
      const q = ds.value.trim().toLowerCase(), words = q.split(" ").filter(Boolean);
      let n = 0;
      secs.forEach(s => { const hit = !q || words.every(w => text.get(s).includes(w)); s.hidden = !hit; if (hit) n++; });
      out.hidden = !q;
      out.textContent = q ? `${n} section${n === 1 ? "" : "s"} match “${ds.value.trim()}”` : "";
    });
  }

  /* ---------------- theme colours for canvas ---------------- */
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const hexRgb = h => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map(c => c + c).join(""); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const palette = () => ({ a: hexRgb(cssVar("--accent") || "#8b5cf6"), b: hexRgb(cssVar("--lav-400") || "#b79cff"), c: hexRgb(cssVar("--lav-300") || "#cdb8ff"), bg: hexRgb(cssVar("--bg") || "#ffffff"), ink: hexRgb(cssVar("--ink-2") || "#4f4a63") });

  /* run a canvas animation only while visible */
  function animate(canvas, setup) {
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, state = null, pal = palette(), paused = false;
    try { paused = localStorage.getItem("wz-motion") === "off"; } catch { /* ignore */ }
    canvas.wzToggle = on => { paused = !on; if (on && !reduce) start(); };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2); w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = setup.init(w, h, state, canvas);
    };
    const frame = t => { setup.draw(ctx, w, h, state, t, pal); if (!reduce && !paused && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    resize();
    if (reduce) { for (let i = 0; i < 240; i++) setup.draw(ctx, w, h, state, i * 16, pal, true); setup.draw(ctx, w, h, state, 4000, pal); }
    else start();
    new ResizeObserver(() => { resize(); if (reduce) setup.draw(ctx, w, h, state, 4000, pal); }).observe(canvas);
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !reduce) start(); }).observe(canvas);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !reduce) start(); });
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { pal = palette(); state = setup.init(w, h, state, canvas); });
  }

  /* pointer, eased per canvas, for gentle cursor reactions */
  const pointer = { x: -9999, y: -9999 };
  addEventListener("pointermove", e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* Hero: silk ribbons spun from fine threads, with beams of light that flow
     along the wave lines. No particles, no orbs: just the waves and the light. */
  const isDark = () => matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light" || document.documentElement.dataset.theme === "dark";
  const ribbons = {
    init(w, h) {
      const mobile = w < 700;
      const R = [
        { base: 0.72, amp: 0.12, f1: 0.0028, f2: 0.0066, s1: 0.9, s2: 0.55, th: 0.30, n: mobile ? 22 : 44, ph: 0.0, col: "b", a: 0.85 },
        { base: 0.86, amp: 0.09, f1: 0.0036, f2: 0.0054, s1: -0.7, s2: 0.85, th: 0.20, n: mobile ? 18 : 34, ph: 2.1, col: "a", a: 0.7 },
        { base: 0.58, amp: 0.15, f1: 0.0022, f2: 0.0085, s1: 0.55, s2: -0.65, th: 0.16, n: mobile ? 14 : 26, ph: 4.2, col: "c", a: 0.75 },
      ];
      // light beams: each travels left to right along one ribbon, lighting a band of its threads
      R.forEach((r, i) => { r.beams = [{ off: i * 0.31, speed: 0.055 + i * 0.012, lo: 0.15, hi: 0.75 }, { off: 0.55 + i * 0.17, speed: 0.04 + i * 0.01, lo: 0.4, hi: 1 }]; });
      return { R, px: w * 0.6, py: h * 0.7, mobile, dark: isDark() };
    },
    y(st, r, x, w, h, time) {
      const base = h * r.base + h * r.amp * (Math.sin(x * r.f1 + time * r.s1 + r.ph) + 0.55 * Math.sin(x * r.f2 + time * r.s2 + r.ph * 1.7));
      const dx = x - st.px, bend = Math.exp(-(dx * dx) / (2 * 170 * 170)) * clamp(st.py - base, -90, 90) * 0.22;
      return base + bend;
    },
    twist(r, x, time) { return 0.28 + 0.72 * Math.abs(Math.sin(x * 0.0021 + time * 0.55 + r.ph)); },
    draw(ctx, w, h, st, t, pal, silent) {
      const time = t * 0.00022, canvas = ctx.canvas, rect = canvas.getBoundingClientRect();
      const inside = pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
      const tx = inside ? pointer.x - rect.left : w * (0.6 + 0.15 * Math.sin(time * 0.7));
      const ty = inside ? pointer.y - rect.top : h * 0.72;
      st.px += (tx - st.px) * 0.05; st.py += (ty - st.py) * 0.05;
      if (silent) return;

      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      const beamT = t * 0.001;
      for (const r of st.R) {
        const col = pal[r.col];
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.18, rgba(col, 0.35)); g.addColorStop(0.55, rgba(col, 1)); g.addColorStop(1, rgba(col, 0.75));
        ctx.strokeStyle = g;
        const step = st.mobile ? 16 : 12;
        // soft body under the threads
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += step * 2) { const y = this.y(st, r, x, w, h, time) - r.th * h * 0.5 * this.twist(r, x, time); x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        for (let x = w + 20; x >= -20; x -= step * 2) ctx.lineTo(x, this.y(st, r, x, w, h, time) + r.th * h * 0.5 * this.twist(r, x, time));
        ctx.closePath(); ctx.globalAlpha = 0.16 * r.a; ctx.fillStyle = g; ctx.fill();
        // threads (kept as paths so the light can run along the same lines)
        ctx.lineWidth = 1;
        const paths = [];
        for (let i = 0; i < r.n; i++) {
          const f = i / (r.n - 1) - 0.5, edge = 1 - Math.abs(f) * 2;
          ctx.globalAlpha = (0.16 + 0.5 * edge) * r.a;
          const p = new Path2D();
          for (let x = -20; x <= w + 20; x += step) {
            const y = this.y(st, r, x, w, h, time) + f * r.th * h * this.twist(r, x, time) + Math.sin(x * 0.012 + i * 0.6 + time * 2) * 1.6;
            x === -20 ? p.moveTo(x, y) : p.lineTo(x, y);
          }
          ctx.stroke(p); paths.push([p, f + 0.5]);
        }
        // light flowing through the wave lines: a bright comet with a soft tail, sheared across the threads
        for (const b of r.beams) {
          const u = ((beamT * b.speed + b.off) % 1.3) - 0.15;          // -0.15 .. 1.15 of the width
          const fade = clamp(Math.min(u + 0.15, 1.15 - u) * 6, 0, 1);
          for (const [p, k] of paths) {
            if (k < b.lo || k > b.hi) continue;
            const mid = (k - b.lo) / (b.hi - b.lo), side = 1 - Math.abs(mid - 0.5) * 2;
            const c = (u + (k - 0.5) * 0.05) * w, tail = w * 0.16, head = w * 0.02;
            const g = ctx.createLinearGradient(c - tail, 0, c + head, 0);
            const core = st.dark ? [255, 255, 255] : pal.a;
            g.addColorStop(0, rgba(pal[r.col], 0)); g.addColorStop(0.7, rgba(pal.a, 0.35 * side));
            g.addColorStop(0.93, rgba(core, 0.95 * side)); g.addColorStop(1, rgba(core, 0));
            ctx.globalAlpha = fade * r.a;
            ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.stroke(p);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  };

  /* Silk: slow lavender waves for page heroes, bands and the CTA. */
  const silk = {
    init() { return { lines: 7 }; },
    draw(ctx, w, h, st, t, pal, silent) {
      if (silent) return;
      ctx.clearRect(0, 0, w, h);
      const [ar, ag, ab] = pal.a, [cr, cg, cb] = pal.c, time = t * 0.00018;
      for (let l = 0; l < st.lines; l++) {
        const off = l / st.lines, amp = h * (0.12 + off * 0.1);
        ctx.beginPath();
        for (let x = -10; x <= w + 10; x += 12) {
          const y = h * (0.35 + off * 0.45) + Math.sin(x * 0.006 + time * (1 + off) + l) * amp + Math.cos(x * 0.011 - time * 1.4 + l * 2) * amp * 0.35;
          x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(w + 10, h + 10); ctx.lineTo(-10, h + 10); ctx.closePath();
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${0.10 + off * 0.05})`); g.addColorStop(1, `rgba(${ar},${ag},${ab},${0.05 + off * 0.04})`);
        ctx.fillStyle = g; ctx.fill();
        // a fine highlight thread along each wave crest
        const crest = new Path2D();
        for (let x = -10; x <= w + 10; x += 12) {
          const y = h * (0.35 + off * 0.45) + Math.sin(x * 0.006 + time * (1 + off) + l) * amp + Math.cos(x * 0.011 - time * 1.4 + l * 2) * amp * 0.35;
          x === -10 ? crest.moveTo(x, y) : crest.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.10 + off * 0.08})`; ctx.lineWidth = 1; ctx.stroke(crest);
        // light running along the crest
        const u = ((t * 0.00005 * (0.8 + off) + l * 0.37) % 1.4) - 0.2, c = u * w;
        const g2 = ctx.createLinearGradient(c - w * 0.22, 0, c + w * 0.02, 0);
        g2.addColorStop(0, `rgba(${ar},${ag},${ab},0)`); g2.addColorStop(0.85, `rgba(${ar},${ag},${ab},${0.35 + off * 0.3})`);
        g2.addColorStop(0.97, `rgba(${cr},${cg},${cb},0.9)`); g2.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.strokeStyle = g2; ctx.lineWidth = 1.5; ctx.stroke(crest);
      }
    }
  };

  /* Story flow: real coverage of one story, replayed. Each publisher's article
     travels along a curve into the story node at its real relative time. */
  const flow = {
    init(w, h, prev, canvas) {
      const d = JSON.parse(canvas.dataset.flow || "{}");
      const src = (d.sources || []).slice(0, 5);
      const left = Math.min(190, w * 0.34), nodeX = w - Math.max(96, w * 0.2), nodeY = h * 0.46;
      const rows = src.map((s, i) => ({ ...s, x: left, y: h * (0.12 + 0.76 * (src.length > 1 ? i / (src.length - 1) : 0.5)) }));
      const maxM = Math.max(1, ...rows.map(r => r.m));
      return { rows, nodeX, nodeY, left, maxM, d, count: 0, pulse: 0, dots: [], last: 0, loop: 7000 };
    },
    draw(ctx, w, h, st, t, pal, silent) {
      const { rows, nodeX, nodeY, left } = st;
      if (!rows.length) return;
      const lt = t % st.loop, ink = pal.ink;
      if (lt < st.last) { st.count = 0; st.dots = []; st.fired = new Set(); }
      st.fired = st.fired || new Set();
      st.last = lt;
      rows.forEach((r, i) => {
        const at = 400 + (r.m / st.maxM) * (st.loop - 2600);
        if (lt >= at && !st.fired.has(i)) { st.fired.add(i); st.dots.push({ i, t0: lt }); }
      });
      const curve = (r, u) => {
        const x0 = left + 8, y0 = r.y, x1 = nodeX, y1 = nodeY, cx = (x0 + x1) / 2;
        const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
        return [a * x0 + b * cx + c * cx + d * x1, a * y0 + b * y0 + c * y1 + d * y1];
      };
      for (let k = st.dots.length - 1; k >= 0; k--) {
        const dt = (lt - st.dots[k].t0) / 1100;
        if (dt >= 1) { st.dots.splice(k, 1); st.count = Math.min(rows.length, st.count + 1); st.pulse = 1; }
      }
      st.pulse *= 0.93;
      if (silent) return;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `500 ${w < 420 ? 11 : 12}px Poppins, system-ui, sans-serif`; ctx.textBaseline = "middle";
      rows.forEach((r, i) => {
        ctx.beginPath();
        for (let u = 0; u <= 1.001; u += 0.05) { const [x, y] = curve(r, u); u === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.strokeStyle = rgba(pal.a, st.fired.has(i) ? 0.45 : 0.16); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = rgba(ink, 0.95); ctx.textAlign = "right";
        let label = r.n; const maxW = left - 16;
        while (label.length > 3 && ctx.measureText(label).width > maxW) label = label.slice(0, -2).trimEnd() + "…";
        ctx.fillText(label, left - 10, r.y - 7);
        ctx.fillStyle = rgba(ink, 0.6); ctx.font = "400 11px Poppins, system-ui, sans-serif";
        ctx.fillText(r.m === 0 ? "first report" : `+${r.m} min`, left - 10, r.y + 9);
        ctx.font = "500 12px Poppins, system-ui, sans-serif";
        ctx.fillStyle = st.fired.has(i) ? rgba(pal.a, 1) : rgba(pal.c, 1);
        ctx.beginPath(); ctx.arc(left + 4, r.y, 4.5, 0, 6.283); ctx.fill();
      });
      for (const d of st.dots) {
        const u = clamp((lt - d.t0) / 1100, 0, 1), e = u * u * (3 - 2 * u), [x, y] = curve(rows[d.i], e);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 12); g.addColorStop(0, rgba(pal.a, 0.5)); g.addColorStop(1, rgba(pal.a, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.283); ctx.fill();
        ctx.fillStyle = rgba(pal.a, 1); ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.283); ctx.fill();
      }
      const R = 30 + st.pulse * 10;
      const g = ctx.createRadialGradient(nodeX, nodeY, 0, nodeX, nodeY, R * 2);
      g.addColorStop(0, rgba(pal.b, 0.45)); g.addColorStop(1, rgba(pal.b, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(nodeX, nodeY, R * 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = rgba(pal.bg, 1); ctx.beginPath(); ctx.arc(nodeX, nodeY, 30, 0, 6.283); ctx.fill();
      ctx.strokeStyle = rgba(pal.a, 0.9); ctx.lineWidth = 2; ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = rgba(ink, 1); ctx.font = "600 17px 'Bricolage Grotesque', Poppins, sans-serif";
      ctx.fillText(String(st.count), nodeX, nodeY - 3);
      ctx.font = "500 9.5px Poppins, sans-serif"; ctx.fillStyle = rgba(ink, 0.65);
      ctx.fillText(`of ${st.d.articles || "?"}`, nodeX, nodeY + 11);
      ctx.fillStyle = rgba(ink, 0.75); ctx.font = "500 11px Poppins, sans-serif";
      ctx.fillText(`story ${st.d.story_id || ""}`, nodeX, nodeY + 50);
      ctx.fillStyle = rgba(ink, 0.55); ctx.font = "400 10.5px Poppins, sans-serif";
      ctx.fillText(`top ${rows.length} reports shown`, nodeX, nodeY + 65);
    }
  };

  $$("canvas[data-art='ribbons']").forEach(c => animate(c, ribbons));
  $$("canvas[data-art='silk']").forEach(c => animate(c, silk));
  $$("canvas[data-art='flow']").forEach(c => animate(c, flow));

  /* one motion switch for canvases and CSS motion (WCAG 2.2.2), on every page */
  const setMotionClass = off => document.documentElement.classList.toggle("motion-off", off);
  let motionOff = false; try { motionOff = localStorage.getItem("wz-motion") === "off"; } catch { /* ignore */ }
  setMotionClass(motionOff);
  $$("[data-motion-toggle]").forEach(b => {
    const sync = () => $$("[data-motion-toggle]").forEach(x => { x.setAttribute("aria-pressed", motionOff); x.textContent = motionOff ? "Play motion" : "Pause motion"; });
    if (reduce) { b.hidden = true; return; }
    sync();
    b.addEventListener("click", () => {
      motionOff = !motionOff; try { localStorage.setItem("wz-motion", motionOff ? "off" : "on"); } catch { /* ignore */ }
      $$("canvas[data-art]").forEach(c => c.wzToggle?.(!motionOff)); setMotionClass(motionOff); sync();
    });
  });

  /* cursor-following glow on cards, and the specular light on glass buttons */
  const SPOT = ".ncard,.plan,.metric,.trust,.cmp,.card-flat,.co-card,.fields > div,.use,.btn,.pill";
  if (!reduce && matchMedia("(hover: hover)").matches) {
    document.addEventListener("pointermove", e => {
      const el = e.target.closest?.(SPOT); if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`); el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ---------------- home: hero story card rotates through the free sample ---------------- */
  $$("[data-rotator]").forEach(card => {
    const slides = $$(".story-slide", card), dots = $$(".sdot", card);
    if (slides.length < 2) return;
    let i = 0, timer = 0, hold = false;
    const show = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        const on = k === i;
        s.classList.toggle("on", on);
        s.toggleAttribute("aria-hidden", !on);
        $$("a", s).forEach(a => { on ? a.removeAttribute("tabindex") : a.setAttribute("tabindex", "-1"); });
      });
      dots.forEach((d, k) => d.setAttribute("aria-pressed", k === i));
    };
    const off = () => document.documentElement.classList.contains("motion-off");
    const tick = () => { clearTimeout(timer); timer = setTimeout(() => { if (!hold && !off() && !document.hidden) show(i + 1); tick(); }, 6000); };
    dots.forEach(d => d.addEventListener("click", () => { show(+d.dataset.go); tick(); }));
    card.addEventListener("pointerenter", () => { hold = true; });
    card.addEventListener("pointerleave", () => { hold = false; });
    card.addEventListener("focusin", () => { hold = true; });
    card.addEventListener("focusout", e => { if (!card.contains(e.relatedTarget)) hold = false; });
    if (!reduce) tick();
  });

  /* ---------------- home: live story table ---------------- */
  const demo = $("#demo");
  if (demo) {
    const rows = JSON.parse($("#stories-data").textContent);
    const st = { cat: "all", q: "", view: "table" };
    const body = $("#demo-body", demo), count = $("#demo-count", demo), maxA = Math.max(...rows.map(r => r.a));
    const counts = rows.reduce((m, r) => (m[r.cat] = (m[r.cat] || 0) + 1, m), {});
    const cats = ["all", ...Object.keys(counts).sort((a, b) => counts[b] - counts[a])];
    $("#demo-cats", demo).innerHTML = cats.map(c => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${c === "all"}">${c === "all" ? "All" : esc(c[0].toUpperCase() + c.slice(1))}<span class="chip-n">${c === "all" ? rows.length : counts[c]}</span></button>`).join("");
    const render = () => {
      const q = st.q.trim().toLowerCase();
      const view = rows.filter(r => (st.cat === "all" || r.cat === st.cat) && (!q || (r.h + " " + r.co.join(" ")).toLowerCase().includes(q)));
      count.textContent = `${view.length} of ${rows.length} stories · ${view.reduce((t, r) => t + r.a, 0).toLocaleString("en-IN")} articles`;
      if (st.view === "json") {
        const out = view.slice(0, 3).map(r => ({ story_id: r.id, headline: r.h, category: r.cat, languages: r.langs, companies: r.co, related_count: r.a - 1, volume: { articles: r.a, publishers: r.p }, summary: r.sum }));
        body.innerHTML = `<pre>${esc(JSON.stringify({ count: view.length, results: out }, null, 2))}${view.length > 3 ? "\n// " + (view.length - 3) + " more" : ""}</pre>`;
        return;
      }
      body.innerHTML = view.length ? `<table><thead><tr><th scope="col">Story</th><th scope="col" class="hide">Category</th><th scope="col" class="hide">Companies</th><th scope="col" class="r">Articles</th><th scope="col" class="r hide">Publishers</th></tr></thead><tbody>${view.map(r => `<tr><td class="h">${esc(r.h)}${r.langs.includes("hi") ? ' <span class="tag lang">EN + HI</span>' : ""}</td><td class="hide"><span class="tag v">${esc(r.cat)}</span></td><td class="hide mono small">${esc(r.co.join(" · ")) || "—"}</td><td class="r"><span class="bar" style="width:${Math.round(r.a / maxA * 64)}px" aria-hidden="true"></span>${r.a}</td><td class="r hide">${r.p}</td></tr>`).join("")}</tbody></table>`
        : `<p style="padding:28px 18px;color:var(--ink-3)">No stories match. Try another word.</p>`;
    };
    $("#demo-q", demo).addEventListener("input", e => { st.q = e.target.value; render(); });
    demo.addEventListener("click", e => {
      const c = e.target.closest("[data-cat]"); if (c) { st.cat = c.dataset.cat; $$("[data-cat]", demo).forEach(x => x.setAttribute("aria-pressed", x === c)); render(); }
      const v = e.target.closest("[data-view]"); if (v) { st.view = v.dataset.view; $$("[data-view]", demo).forEach(x => x.setAttribute("aria-pressed", x === v)); render(); }
    });
    render();
  }

  /* ---------------- finance: company-tagged feed ---------------- */
  const feed = $("#fin-feed");
  if (feed) {
    const recs = JSON.parse($("#fin-data").textContent);
    // BSE-only companies have no NSE symbol: fall back to the BSE code, then the name
    const key = c => c.s || (c.b ? `BSE ${c.b}` : c.n);
    recs.forEach(r => r.co.forEach(c => { c.s = key(c); }));
    const sym = new Map();
    recs.forEach(r => r.co.forEach(c => sym.set(c.s, c)));
    const bar = $("#fin-syms");
    let active = "all", showAll = false;
    const LIMIT = 8;
    bar.innerHTML = [["all", { s: "All", n: "" }], ...sym].map(([k, c]) => `<button class="chip" type="button" data-sym="${esc(k)}" aria-pressed="${k === "all"}">${esc(c.s)}</button>`).join("");
    const render = () => {
      const all = recs.filter(r => active === "all" || r.co.some(c => c.s === active));
      const v = showAll ? all : all.slice(0, LIMIT);
      feed.innerHTML = v.map(r => `<div class="fin-item">
        <div class="sym">${r.co.map(c => esc(c.s)).join(" · ")}<small>${esc(r.co[0].sec || "")}</small></div>
        <div><a class="t" href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.t)}</a>
          <div class="m">${esc(r.src)} · ${esc(r.seen)} IST · ${r.lang === "hi" ? "Hindi" : "English"} · story of ${r.story} articles from ${r.pubs} publishers</div></div>
        <div class="tags"><span class="tag ${r.tone === "positive" ? "pos" : r.tone === "negative" ? "neg" : ""}">${esc(r.tone || "")}</span><span class="tag mono">${esc(r.co[0].i)}</span></div>
      </div>`).join("") + (all.length > LIMIT ? `<div class="fin-more"><button class="btn btn-soft btn-sm" type="button" data-more>${showAll ? "Show fewer" : `Show all ${all.length} articles`}</button></div>` : "");
      $("#fin-count").textContent = `${all.length} articles · ${sym.size} companies`;
    };
    feed.addEventListener("click", e => { if (e.target.closest("[data-more]")) { showAll = !showAll; render(); } });
    bar.addEventListener("click", e => { const b = e.target.closest("[data-sym]"); if (!b) return; active = b.dataset.sym; showAll = false; $$("[data-sym]", bar).forEach(x => x.setAttribute("aria-pressed", x === b)); render(); });
    render();
  }


  /* ---------------- currency toggle (pricing) ---------------- */
  const curGroup = $("[data-currency-toggle]");
  if (curGroup) {
    const setCur = cur => {
      $$("[data-inr]").forEach(el => { el.textContent = el.dataset[cur]; });
      $$("button[data-cur]", curGroup).forEach(b => b.setAttribute("aria-pressed", b.dataset.cur === cur));
      try { localStorage.setItem("wz-cur", cur); } catch { /* ignore */ }
    };
    curGroup.addEventListener("click", e => { const b = e.target.closest("[data-cur]"); if (b) setCur(b.dataset.cur); });
    let saved = null; try { saved = localStorage.getItem("wz-cur"); } catch { /* ignore */ }
    if (saved === "usd") setCur("usd");
  }

  /* ---------------- contact form ---------------- */
  const form = $("#contact-form");
  if (form) {
    const intent = new URLSearchParams(location.search).get("intent");
    const sel = $("#f-intent");
    if (intent && sel && [...sel.options].some(o => o.value === intent)) sel.value = intent;
    if (intent === "call") $("#contact-title") && ($("#contact-title").textContent = "Book a 20-minute call.");
    const status = $("#form-status");
    const rules = {
      name: v => v.trim().length >= 2 || "Enter your name.",
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Enter a work email like you@company.com.",
      intent: v => !!v || "Choose what you need.",
    };
    const check = el => {
      const rule = rules[el.name]; if (!rule) return true;
      const r = rule(el.value), f = el.closest(".field"), err = $(".err", f);
      if (r === true) { f.removeAttribute("data-invalid"); el.removeAttribute("aria-invalid"); err.textContent = ""; return true; }
      f.setAttribute("data-invalid", ""); el.setAttribute("aria-invalid", "true"); err.textContent = r; return false;
    };
    $$("input,select,textarea", form).forEach(el => el.addEventListener("blur", () => check(el)));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const els = $$("[name]", form).filter(el => rules[el.name]);
      const bad = els.filter(el => !check(el));
      if (bad.length) { bad[0].focus(); return; }
      const btn = $("button[type=submit]", form), data = Object.fromEntries(new FormData(form));
      if (form.dataset.static) {   // static host: hand the request to the visitor's email app
        const lines = [`Name: ${data.name}`, `Email: ${data.email}`, `Need: ${$("#f-intent").selectedOptions[0].text}`,
          data.company && `Company: ${data.company}`, data.use_case && `Use case: ${data.use_case}`, data.volume && `Volume: ${data.volume}`,
          data.message && `\n${data.message}`].filter(Boolean).join("\n");
        const href = `mailto:${form.dataset.email}?subject=${encodeURIComponent("WIZER Data request: " + $("#f-intent").selectedOptions[0].text)}&body=${encodeURIComponent(lines)}`;
        status.className = "form-status ok"; status.hidden = false;
        status.innerHTML = `Your email app should open with this request filled in. If it does not, send it to <a class="link" href="${esc(href)}">${esc(form.dataset.email)}</a>.`;
        location.href = href;
        return;
      }
      btn.disabled = true; btn.textContent = "Sending…"; status.hidden = true;
      try {
        const res = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
        form.hidden = true;
        status.className = "form-status ok"; status.hidden = false;
        status.innerHTML = `<b>Thanks, ${esc(data.name.split(" ")[0])}.</b> We have your request (reference <span class="mono">${esc(out.id || "")}</span>) and will reply to ${esc(data.email)} within one working day.`;
        status.focus();
      } catch (err) {
        status.className = "form-status bad"; status.hidden = false;
        status.innerHTML = `We could not send this just now (${esc(err.message)}). Your details are still in the form. Try again, or email <a class="link" href="mailto:${esc(form.dataset.email)}">${esc(form.dataset.email)}</a>.`;
        btn.disabled = false; btn.textContent = "Send request";
      }
    });
  }

  /* ---------------- finance: ticker tape of tagged companies ---------------- */
  const tape = $("#fin-tape");
  if (tape && $("#fin-data")) {
    const recs = JSON.parse($("#fin-data").textContent), seen = new Map();
    recs.forEach(r => r.co.forEach(c => {
      const k = c.s; if (!k) return;
      const cur = seen.get(k) || { s: k, n: 0, tone: { positive: 0, negative: 0, neutral: 0 }, sec: c.sec };
      cur.n += 1; if (r.tone) cur.tone[r.tone] = (cur.tone[r.tone] || 0) + 1; seen.set(k, cur);
    }));
    const items = [...seen.values()].map(c => {
      const t = c.tone.positive > c.tone.negative ? "pos" : c.tone.negative > c.tone.positive ? "neg" : "neu";
      const arrow = t === "pos" ? "▲" : t === "neg" ? "▼" : "●";
      return `<span class="tk-item"><b>${esc(c.s)}</b><i class="${t}">${arrow}</i><span>${c.n} article${c.n === 1 ? "" : "s"}</span><em>${esc(c.sec || "")}</em></span>`;
    }).join("");
    tape.innerHTML = items + items;   // doubled for a seamless loop
  }

  /* ---------------- scroll reveals (from a visible resting state, below the fold only) ---------------- */
  if (!reduce && "IntersectionObserver" in window) {
    const SEL = ".sec-head,.metric,.cmp,.ncard,.plan,.trust,.card-flat,.fin-item,.tl,.qa,.f,.fields > div,.cta-band,.demo,.code,.ref,.flow-card,.explorer,.use,.custom,.about-grid";
    const els = $$(SEL).filter(el => !el.closest(".hero,.page-hero"));
    const vh = innerHeight;
    const pending = els.filter(el => el.getBoundingClientRect().top > vh * 0.95);
    pending.forEach(el => el.classList.add("rv-pre"));
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, sibs = [...el.parentElement.children].filter(c => c.classList.contains("rv-pre"));
      el.style.transitionDelay = `${Math.min(Math.max(0, sibs.indexOf(el)), 5) * 80}ms`;
      el.classList.add("rv-in"); el.classList.remove("rv-pre"); io.unobserve(el);
      setTimeout(() => { el.classList.remove("rv-in"); el.style.transitionDelay = ""; }, 1400);
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    pending.forEach(el => io.observe(el));
  }
})();
