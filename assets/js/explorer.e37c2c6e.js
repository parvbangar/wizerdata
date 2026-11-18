/* Sample dataset explorer. Reads window.WIZER_SAMPLE (data/sample.js). */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = window.WZ.esc, toast = window.WZ.toast, copyText = window.WZ.copyText;
  const D = window.WIZER_SAMPLE, rowsEl = $("#x-rows"), detail = $("#x-detail");
  if (!rowsEl) return;
  if (!D || !Array.isArray(D.results)) { detail.innerHTML = '<p class="empty">The sample did not load. Refresh the page, or download the JSON above.</p>'; return; }
  const R = D.results;
  const API = "https://api.wizerdata.io/v1";

  const fmt = iso => iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }) : "—";
  const time = iso => iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }) : "";
  const lang = l => ({ en: "English", hi: "Hindi" }[l] || l);
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

  /* ---------- filters ---------- */
  const st = { cat: "all", q: "", f: new Set(), sel: 0, tab: "record" };
  const counts = R.reduce((m, r) => (m[r.category] = (m[r.category] || 0) + 1, m), {});
  const cats = ["all", ...Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 7)];
  $("#x-cats").innerHTML = cats.map(c => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${c === "all"}">${c === "all" ? "All" : esc(c)}</button>`).join("");
  $("#x-cats").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; st.cat = b.dataset.cat; $$("#x-cats .chip").forEach(x => x.setAttribute("aria-pressed", x === b)); list(); });
  $$("[data-f]").forEach(b => b.addEventListener("click", () => { const k = b.dataset.f; st.f.has(k) ? st.f.delete(k) : st.f.add(k); b.setAttribute("aria-pressed", st.f.has(k)); list(); }));
  $("#x-q").addEventListener("input", e => { st.q = e.target.value.toLowerCase().trim(); list(); });

  const hay = r => [r.title, r.source.name, r.category, ...r.companies.flatMap(c => [c.name, c.nse_symbol, c.isin]), ...r.geo.states, ...r.geo.places, ...r.keywords].join(" ").toLowerCase();
  const HAY = R.map(hay);
  let view = [];

  /* the API call that reproduces the current view */
  const apiUrl = () => {
    const p = new URLSearchParams();
    if (st.q) p.set("q", st.q);
    if (st.cat !== "all") p.set("category", st.cat);
    if (st.f.has("hi")) p.set("language", "hi");
    if (st.f.has("neg")) p.set("sentiment", "negative");
    p.set("limit", "20");
    return `${API}/articles?${p}`;
  };

  function list() {
    view = R.map((r, i) => i).filter(i => {
      const r = R[i];
      return (st.cat === "all" || r.category === st.cat) && (!st.q || HAY[i].includes(st.q)) &&
        (!st.f.has("hi") || r.language === "hi") && (!st.f.has("co") || r.companies.length) &&
        (!st.f.has("state") || r.geo.states.length) && (!st.f.has("neg") || r.sentiment.label === "negative");
    });
    rowsEl.innerHTML = view.length ? view.map(i => {
      const r = R[i], co = r.companies.map(c => c.nse_symbol || c.bse_code).filter(Boolean).join(" · ");
      return `<div class="xrow" role="option" id="opt-${i}" data-i="${i}" aria-selected="${i === st.sel}">
        <div class="t">${esc(r.title)}</div>
        <div class="m"><span>${esc(r.source.name)}</span><span>${r.language.toUpperCase()}</span><span>${esc(r.category)}</span>${co ? `<span class="co">${esc(co)}</span>` : ""}</div></div>`;
    }).join("") : '<p class="empty">No records match these filters.</p>';
    $("#x-count").textContent = `${view.length} of ${R.length} records`;
    if (view.length && !view.includes(st.sel)) select(view[0], false);
    else if (view.length) rowsEl.setAttribute("aria-activedescendant", `opt-${st.sel}`);
  }

  function select(i, scroll = true) {
    st.sel = i;
    $$(".xrow", rowsEl).forEach(x => x.setAttribute("aria-selected", +x.dataset.i === i));
    rowsEl.setAttribute("aria-activedescendant", `opt-${i}`);
    if (scroll) $(`#opt-${i}`)?.scrollIntoView({ block: "nearest" });
    render();
  }
  rowsEl.addEventListener("click", e => { const b = e.target.closest(".xrow"); if (b) select(+b.dataset.i); });
  rowsEl.addEventListener("keydown", e => {
    const pos = view.indexOf(st.sel);
    const go = { ArrowDown: pos + 1, ArrowUp: pos - 1, Home: 0, End: view.length - 1 }[e.key];
    if (go === undefined) return;
    e.preventDefault();
    const n = view[Math.max(0, Math.min(view.length - 1, go))];
    if (n !== undefined) select(n);
  });

  /* ---------- detail ---------- */
  function render(focusTab) {
    const r = R[st.sel]; if (!r) { detail.innerHTML = ""; return; }
    const s = r.story, v = s.velocity, vol = s.volume;
    const tone = r.sentiment.label ? `<span class="tag ${r.sentiment.label === "positive" ? "pos" : r.sentiment.label === "negative" ? "neg" : ""}">${r.sentiment.label}${r.sentiment.score != null ? " · " + Math.abs(r.sentiment.score).toFixed(2) : ""}</span>` : "";
    const head = `<div class="d-head">
      <div class="d-src"><span class="av" aria-hidden="true">${esc((r.source.name || "?").slice(0, 1))}</span><b style="color:var(--ink)">${esc(r.source.name)}</b>
        <span>${esc(r.source.domain || "")}</span>${r.source.tier ? `<span class="tag">tier ${r.source.tier}</span>` : ""}
        <span>${fmt(r.pubDate)} IST</span>${r.detection_lag_min != null ? `<span class="tag v">seen ${r.detection_lag_min < 1 ? "under 1" : Math.round(r.detection_lag_min)} min after publishing</span>` : ""}</div>
      <a class="ttl" href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)} <span aria-hidden="true">↗</span><span class="sr-only"> (opens the publisher's page)</span></a>
      <div class="tags"><span class="tag v">${esc(r.category)}</span>${(r.category_also || []).map(c => `<span class="tag">${esc(c)}</span>`).join("")}
        <span class="tag">${esc(r.article_type)}</span><span class="tag">${esc(lang(r.language))}</span>${tone}
        ${r.duplicate ? '<span class="tag">duplicate</span>' : ""}${r.wire_reprint ? '<span class="tag">wire copy</span>' : ""}</div>
    </div>
    <div class="tab-bar" role="tablist" aria-label="Record view">
      <button class="tab" role="tab" type="button" id="tab-record" aria-controls="x-panel" data-tab="record" aria-selected="${st.tab === "record"}" tabindex="${st.tab === "record" ? 0 : -1}">Record</button>
      <button class="tab" role="tab" type="button" id="tab-json" aria-controls="x-panel" data-tab="json" aria-selected="${st.tab === "json"}" tabindex="${st.tab === "json" ? 0 : -1}">JSON</button>
      <button class="tab" role="tab" type="button" id="tab-api" aria-controls="x-panel" data-tab="api" aria-selected="${st.tab === "api"}" tabindex="${st.tab === "api" ? 0 : -1}">API call</button>
    </div>`;
    let body;
    if (st.tab === "json") {
      body = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span class="muted mono">GET /v1/articles/${esc(r.article_id)}</span><button class="copy" type="button" data-act="copy-json">Copy record</button></div><pre tabindex="0">${esc(JSON.stringify(r, null, 2))}</pre>`;
    } else if (st.tab === "api") {
      const one = `curl -s "${API}/articles/${r.article_id}" -H "X-API-Key: $WIZER_API_KEY"`;
      const story = `curl -s "${API}/stories/${s.story_id}" -H "X-API-Key: $WIZER_API_KEY"`;
      const viewCall = `curl -s "${apiUrl()}" -H "X-API-Key: $WIZER_API_KEY"`;
      body = [["This record", one], ["Its story", story], ["The list you are looking at", viewCall]].map(([t, c], k) =>
        `<div><div class="lbl">${t}</div><div class="card code"><div class="code-head"><span class="path mono">curl</span><button class="copy" type="button" data-act="copy-code" data-k="${k}">Copy</button></div><pre data-code="${k}">${esc(c)}</pre></div></div>`).join("") +
        `<p class="muted">Set <code class="mono">WIZER_API_KEY</code> first. <a class="link" href="docs.html#quickstart">Quickstart</a></p>`;
    } else {
      const media = r.image_url ? `<a class="link" href="${esc(r.image_url)}" target="_blank" rel="noopener">image_url ↗</a> <span class="muted">(${esc(host(r.image_url))}, linked, never re-hosted)</span>` : `<span class="muted">No lead image declared</span>`;
      body = `<div><div class="lbl">AI summary <span class="src">WIZER model</span></div><div class="txt">${esc(r.ai_summary || "—")}</div></div>
        <div><div class="lbl">Description <span class="src">publisher meta</span></div><div class="txt">${esc(r.description || "—")}</div></div>
        ${r.companies.length ? `<div><div class="lbl">Linked companies</div><div class="co-cards">${r.companies.map(c => `<div class="co-card"><b>${esc(c.nse_symbol || "—")}</b> <b style="color:var(--ink-3)">${esc(c.bse_code || "")}</b><span>${esc(c.name)} · ${esc(c.isin)}</span><span>${esc(c.sector || "")}${c.industry ? " · " + esc(c.industry) : ""}</span></div>`).join("")}</div></div>` : ""}
        <div class="d-grid">
          <div><div class="lbl">Places</div><div class="tags">${r.geo.countries.map(c => `<span class="tag v">${esc(c)}</span>`).join("")}${r.geo.states.map(c => `<span class="tag v">${esc(c)}</span>`).join("")}${r.geo.places.filter(p => !r.geo.states.includes(p) && !r.geo.countries.includes(p)).slice(0, 5).map(p => `<span class="tag">${esc(p)}</span>`).join("")}</div></div>
          <div><div class="lbl">People and organisations</div><div class="tags">${[...r.entities.people.slice(0, 4), ...r.entities.organizations.slice(0, 4)].map(p => `<span class="tag">${esc(p)}</span>`).join("") || '<span class="muted">—</span>'}</div></div>
          <div><div class="lbl">Keywords</div><div class="tags">${r.keywords.slice(0, 7).map(k => `<span class="tag">${esc(k)}</span>`).join("") || '<span class="muted">—</span>'}</div></div>
          <div><div class="lbl">Author</div><div class="txt">${esc(r.creator.join(", ") || "—")}</div></div>
          <div><div class="lbl">Sensationalism</div><div class="txt">${r.sensationalism != null ? r.sensationalism.toFixed(2) + " of 1" : "—"}</div><div class="meter"><i style="width:${Math.round((r.sensationalism || 0) * 100)}%"></i></div></div>
          <div><div class="lbl">Category confidence</div><div class="txt">${r.category_confidence != null ? Math.round(r.category_confidence * 100) + "%" : "—"}</div><div class="meter"><i style="width:${Math.round((r.category_confidence || 0) * 100)}%"></i></div></div>
        </div>
        <div><div class="lbl">Media</div><div class="d-media">${media}</div></div>
        <div class="d-story">
          <div class="lbl">Story ${s.story_id} ${v.breaking ? '<span class="src">breaking</span>' : ""}</div>
          <p class="h3-like" style="font-size:17px">${esc(s.headline)}</p>
          ${s.summary ? `<p class="txt">${esc(s.summary)}</p>` : ""}
          <div class="kpis"><div class="kpi"><b>${s.related_count}</b><small>related articles</small></div><div class="kpi"><b>${vol.publishers}</b><small>publishers</small></div><div class="kpi"><b>${v.peak_v60}</b><small>peak velocity / h</small></div><div class="kpi"><b>${(vol.languages || []).join(" · ").toUpperCase() || "—"}</b><small>languages</small></div></div>
          <div class="rel-h"><span>Top ${s.top_related.length} coverage links</span><span>IST</span></div>
          <div class="rel">${s.top_related.map(t => `<a href="${esc(t.link)}" target="_blank" rel="noopener"><span class="p">${esc(t.source_name)}</span><span class="t">${esc(t.title)}</span><span class="s">${time(t.first_seen)}</span></a>`).join("")}</div>
        </div>`;
    }
    const scrollTop = detail.scrollTop;
    detail.innerHTML = head + `<div class="d-body" id="x-panel" role="tabpanel" aria-labelledby="tab-${st.tab}">${body}</div>`;
    detail.scrollTop = focusTab ? scrollTop : 0;
    if (focusTab) $(`#tab-${st.tab}`)?.focus();
  }

  detail.addEventListener("click", e => {
    const t = e.target.closest("[data-tab]");
    if (t) { st.tab = t.dataset.tab; render(true); return; }
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "copy-json") copyText(JSON.stringify(R[st.sel], null, 2), "Record copied");
    if (a.dataset.act === "copy-code") copyText($(`[data-code="${a.dataset.k}"]`, detail).textContent, "Command copied");
  });
  detail.addEventListener("keydown", e => {
    const t = e.target.closest("[role=tab]"); if (!t || !["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const order = ["record", "json", "api"], k = order.indexOf(st.tab);
    st.tab = order[(k + (e.key === "ArrowRight" ? 1 : 2)) % 3]; render(true);
  });

  /* ---------- export the current view ---------- */
  const download = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`${view.length} records exported`);
  };
  $("#x-export-json").addEventListener("click", () => download("wizer_sample_view.json", JSON.stringify(view.map(i => R[i]), null, 1), "application/json"));
  $("#x-export-csv").addEventListener("click", () => {
    const cols = ["article_id", "title", "link", "source", "language", "category", "sentiment", "companies_nse", "states", "story_id", "related_count"];
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [cols.join(",")].concat(view.map(i => { const r = R[i]; return [r.article_id, r.title, r.link, r.source.name, r.language, r.category, r.sentiment.label, r.companies.map(c => c.nse_symbol).join("|"), r.geo.states.join("|"), r.story.story_id, r.story.related_count].map(q).join(","); }));
    download("wizer_sample_view.csv", "﻿" + lines.join("\n"), "text/csv");
  });

  list();
  if (view.length) select(view[0], false);
})();
