(() => {
  "use strict";

  // The page is already rendered by build.rb. This script:
  //   1. Reads the embedded JSON (display-shape, default-sorted) so it can
  //      re-sort the rows and open the drawer / popover with the right
  //      company data without re-parsing the table DOM.
  //   2. Attaches event handlers for sort / drawer / popover / tooltip.
  //
  // No HTML is built for the table on load — sort just reorders the
  // existing <tr> nodes in place.

  const RAW = JSON.parse(document.getElementById("company-data").textContent);
  const COMPANIES = RAW; // already filtered + default-sorted by build.rb
  const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map((c) => [c.id, c]));

  // Same FEATURES order as build.rb. Used by sort & drawer; the rendered
  // table doesn't need it because Ruby already emitted the cells.
  const FEATURES = [
    { id: "info_amount", label: "Количество информация", short: "Инф.",  group: "Основни", type: "info" },
    { id: "registered",  label: "Регистрирана фирма",   short: "Фирма", group: "Основни", type: "company" },
    { id: "website",     label: "Уебсайт",              short: "Сайт",  group: "Основни", type: "url" },
    { id: "email",       label: "Имейл",                short: "Имейл", group: "Основни", type: "email" },
    { id: "phone",       label: "Телефон за връзка",    short: "Тел.",  group: "Основни", type: "phone" },
    { id: "viber",       label: "Viber група",          short: "Viber", group: "Основни", type: "url" },
    { id: "source_usa",  label: "Внос от САЩ",          short: "САЩ",   group: "Внася от", type: "value" },
    { id: "source_ca",   label: "Внос от Канада",       short: "CA",    group: "Внася от", type: "value" },
    { id: "source_eu",   label: "Внос от ЕС",           short: "EU",    group: "Внася от", type: "value" },
    { id: "source_kr",   label: "Внос от Корея",        short: "KR",    group: "Внася от", type: "value" },
    { id: "source_jp",   label: "Внос от Япония",       short: "JP",    group: "Внася от", type: "value" },
    { id: "facebook",    label: "Facebook страница",    short: "FB",    group: "Други канали", type: "url" },
    { id: "instagram",   label: "Instagram",            short: "IG",    group: "Други канали", type: "url" },
    { id: "youtube",     label: "YouTube канал",        short: "YT",    group: "Други канали", type: "url" },
    { id: "tiktok",      label: "TikTok",               short: "TT",    group: "Други канали", type: "url" },
    { id: "mobile_bg",   label: "Витрина в Mobile.bg",  short: "Mobile",group: "Други канали", type: "url" },
    { id: "cars_bg",     label: "Профил в Cars.bg",     short: "Cars",  group: "Други канали", type: "url" },
  ];
  const SOURCE_LABEL = { USA: "САЩ", CA: "Канада", EU: "ЕС", KR: "Корея", JP: "Япония" };
  const SOURCE_FLAG  = { USA: "🇺🇸",  CA: "🇨🇦",     EU: "🇪🇺", KR: "🇰🇷",    JP: "🇯🇵" };
  const INFO_KEY_IDS = ["registered", "website", "email", "phone", "viber"];

  const ICONS = {
    check: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dash:  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 8H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    ext:   '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.5 2.5H9.5V7.5M9.5 2.5L5 7M3 4.5V9H7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    copy:  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="6" height="6.5" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M2 7.5V2.5C2 2.22 2.22 2 2.5 2H7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    sortAsc:  '<svg class="sort-arrow" width="8" height="10" viewBox="0 0 8 10" aria-hidden="true"><path d="M4 1.5L7 6H1L4 1.5Z" fill="currentColor"/></svg>',
    sortDesc: '<svg class="sort-arrow" width="8" height="10" viewBox="0 0 8 10" aria-hidden="true"><path d="M4 8.5L1 4H7L4 8.5Z" fill="currentColor"/></svg>',
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  // ── Last-updated date in the footer ────────────────────────────────────
  const lastUpdate = document.getElementById("last-update");
  if (lastUpdate) {
    lastUpdate.textContent = new Date().toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" });
  }

  // ── Sort ───────────────────────────────────────────────────────────────
  let sortBy = { col: "info_amount", dir: "desc" };

  function computeInfoPercent(c) {
    const filled = INFO_KEY_IDS.filter((id) => c.values[id]).length;
    return Math.round((filled / INFO_KEY_IDS.length) * 100);
  }

  function sortedIds() {
    const { col, dir } = sortBy;
    const keyOf = (c) => {
      if (col === "name") return c.name;
      if (col === "info_amount") return computeInfoPercent(c);
      return c.values[col] ? 1 : 0;
    };
    return [...COMPANIES].sort((a, b) => {
      const ak = keyOf(a), bk = keyOf(b);
      let cmp = typeof ak === "string" ? ak.localeCompare(bk, "bg") : ak - bk;
      if (dir === "desc") cmp = -cmp;
      if (cmp === 0 && col === "info_amount") {
        cmp = (b.values.registered ? 1 : 0) - (a.values.registered ? 1 : 0);
      }
      if (cmp === 0) cmp = a.name.localeCompare(b.name, "bg");
      return cmp;
    }).map((c) => c.id);
  }

  function applySort() {
    const tbody = document.getElementById("tbody");
    if (!tbody) return;
    const rowById = Object.fromEntries(
      Array.from(tbody.querySelectorAll(".bodyrow")).map((r) => [r.dataset.id, r])
    );
    sortedIds().forEach((id, i) => {
      const row = rowById[id];
      if (!row) return;
      tbody.appendChild(row); // reattach in new order
      const rank = row.querySelector(".rank");
      if (rank) rank.textContent = String(i + 1).padStart(2, "0");
    });
    updateSortArrows();
  }

  function updateSortArrows() {
    document.querySelectorAll(".head-sortable").forEach((th) => {
      const active = th.dataset.sort === sortBy.col;
      th.classList.toggle("head-sort-active", active);
      th.setAttribute("aria-sort", active ? (sortBy.dir === "asc" ? "ascending" : "descending") : "none");
      const slot = th.querySelector(".sort-arrow-slot");
      if (slot) slot.innerHTML = active ? (sortBy.dir === "asc" ? ICONS.sortAsc : ICONS.sortDesc) : "";
    });
  }

  function setSort(col) {
    if (sortBy.col === col) {
      sortBy = { col, dir: sortBy.dir === "asc" ? "desc" : "asc" };
    } else {
      sortBy = { col, dir: col === "name" ? "asc" : "desc" };
    }
    applySort();
  }

  // ── Drawer ─────────────────────────────────────────────────────────────
  let openDrawerCleanup = null;

  function openDrawer(id) {
    closeDrawer();
    const c = COMPANY_BY_ID[id];
    if (!c) return;
    const reg = c.values.registered;
    const groups = [...new Set(FEATURES.map((f) => f.group))];
    const sourcesText = c.sources.length ? c.sources.map((s) => SOURCE_LABEL[s] || s).join(", ") : "—";
    const tagline = c.group ? (c.isGroupHead ? `Глава на групата ${c.group}` : `От групата ${c.group}`)
                            : (c.legalRaw && /^\(/.test(c.legalRaw) ? c.legalRaw : "");

    const regSection = reg ? `<section class="drawer-section">
      <h3 class="drawer-h3">Юридическо лице</h3>
      <dl class="drawer-dl">
        <div><dt>Име</dt><dd class="mono">${esc(reg.name)}</dd></div>
        <div><dt>ЕИК</dt><dd class="mono">${reg.eikUrl ? `<a href="${esc(reg.eikUrl)}" target="_blank" rel="noopener noreferrer">${esc(reg.eik)}</a>` : esc(reg.eik)}</dd></div>
        <div><dt>Регистрирана</dt><dd class="mono">${esc(reg.date)}</dd></div>
        <div><dt>Седалище</dt><dd>${esc(reg.address)}</dd></div>
        ${reg.owner ? `<div><dt>Собственост</dt><dd>${esc(reg.owner)}</dd></div>` : ""}
        ${reg.capital ? `<div><dt>Капитал</dt><dd>${esc(reg.capital)}</dd></div>` : ""}
      </dl>
      ${reg.eikUrl ? `<a class="po-link" href="${esc(reg.eikUrl)}" target="_blank" rel="noopener noreferrer" style="margin-top:12px">Виж в Търговския регистър ${ICONS.ext}</a>` : ""}
    </section>` : "";

    const blurbSection = c.blurb ? `<section class="drawer-section">
      <h3 class="drawer-h3">Бележки</h3>
      <p class="drawer-blurb">${esc(c.blurb)}</p>
    </section>` : "";

    function renderFeatureItem(f) {
      const v = c.values[f.id];
      const state = v ? "yes" : "no";
      const icon = state === "yes" ? ICONS.check : ICONS.dash;
      let valueHtml = "";
      if (state === "yes" && f.type !== "value") {
        const display = v.display || v.value || v.name || "Да";
        if (f.type === "url" && v.value) {
          valueHtml = `<span class="drawer-li-value"><a href="${esc(v.value)}" target="_blank" rel="noopener noreferrer" title="${esc(v.value)}">Отвори ↗</a></span>`;
        } else if (f.type === "email" && v.value) {
          valueHtml = `<span class="drawer-li-value"><a href="mailto:${esc(v.value)}">${esc(display)}</a></span>`;
        } else if (f.type === "phone" && v.value) {
          valueHtml = `<span class="drawer-li-value"><a href="tel:${v.value.replace(/[^+\d]/g, "")}">${esc(display)}</a></span>`;
        } else if (f.type === "company" && v.eikUrl) {
          valueHtml = `<span class="drawer-li-value"><a href="${esc(v.eikUrl)}" target="_blank" rel="noopener noreferrer">${esc(display)}</a></span>`;
        } else {
          valueHtml = `<span class="drawer-li-value">${esc(display)}</span>`;
        }
      }
      return `<li class="drawer-li ${state}">
        <span class="drawer-li-mark">${icon}</span>
        <span class="drawer-li-label">${esc(f.label)}</span>
        ${valueHtml}
      </li>`;
    }

    const featureSections = groups.map((g) => `<section class="drawer-section">
      <h3 class="drawer-h3">${esc(g)}</h3>
      <ul class="drawer-list">${FEATURES.filter((f) => f.group === g && f.type !== "info").map(renderFeatureItem).join("")}</ul>
    </section>`).join("");

    const reportSubject = encodeURIComponent("Поправка: " + c.name + " (" + c.id + ")");
    const reportBody = encodeURIComponent("Здравейте,\n\nИскам да подам следната актуализация за " + c.name + (c.eik ? " (ЕИК " + c.eik + ")" : "") + ":\n\n[опишете промяната тук]\n\nИзточник на информацията:\n[линк или описание]\n\nБлагодаря!");
    const reportSection = `<section class="drawer-section drawer-report">
      <h3 class="drawer-h3">Подай поправка</h3>
      <p class="drawer-report-lead">Видяхте грешка или липсваща информация? Изпратете я и ще обновим записа.</p>
      <a class="po-link" href="mailto:update@kolaotamerika.com?subject=${reportSubject}&body=${reportBody}">Изпрати имейл до update@kolaotamerika.com ${ICONS.ext}</a>
    </section>`;

    const scrim = document.createElement("div");
    scrim.className = "drawer-scrim";
    scrim.innerHTML = `<aside class="drawer">
      <header class="drawer-head">
        <div>
          <div class="drawer-eyebrow">Профил на вносител</div>
          <h2 class="drawer-title">${esc(c.name)}</h2>
          ${tagline ? `<div class="drawer-tagline">${esc(tagline)}</div>` : ""}
        </div>
        <button class="drawer-close" aria-label="Затвори">${ICONS.close}</button>
      </header>
      <div class="drawer-stats">
        <div class="stat"><div class="stat-k">Седалище</div><div class="stat-v">${esc(c.location)}</div></div>
        <div class="stat"><div class="stat-k">Основана</div><div class="stat-v">${esc(c.founded || "—")}</div></div>
        <div class="stat"><div class="stat-k">Внася от</div><div class="stat-v">${esc(sourcesText)}</div></div>
        <div class="stat"><div class="stat-k">Капитал</div><div class="stat-v">${esc(c.capitalText || "—")}</div></div>
      </div>
      ${regSection}
      ${blurbSection}
      ${featureSections}
      ${reportSection}
    </aside>`;
    document.body.appendChild(scrim);
    document.body.style.overflow = "hidden";

    const aside = scrim.querySelector(".drawer");
    aside.addEventListener("click", (e) => e.stopPropagation());
    scrim.addEventListener("click", closeDrawer);
    scrim.querySelector(".drawer-close").addEventListener("click", closeDrawer);
    const onKey = (e) => { if (e.key === "Escape") closeDrawer(); };
    document.addEventListener("keydown", onKey);

    openDrawerCleanup = () => {
      document.removeEventListener("keydown", onKey);
      scrim.remove();
      document.body.style.overflow = "";
      openDrawerCleanup = null;
    };
  }

  function closeDrawer() {
    if (openDrawerCleanup) openDrawerCleanup();
  }

  // ── Company-cell popover ───────────────────────────────────────────────
  let openPopoverCleanup = null;

  function openCompanyPopover(anchor, company) {
    closePopover();
    const reg = company.values.registered;
    if (!reg) return;
    const rows = [
      ["Юридическо име", reg.name, true, false],
      ["ЕИК", reg.eik, true, true],
      ["Регистрирана", reg.date, true, false],
      ["Седалище", reg.address, false, false],
      reg.owner && ["Собственост", reg.owner, false, false],
      reg.capital && ["Капитал", reg.capital, false, false],
    ].filter(Boolean);

    const pop = document.createElement("div");
    pop.className = "popover";
    pop.setAttribute("role", "dialog");
    pop.innerHTML = `<div class="po-head">
      <span class="po-eyebrow">Основни</span>
      <span class="po-title">Регистрирана фирма</span>
    </div>
    <div class="po-body">
      ${rows.map(([k, v, mono, copy]) => `<div class="po-row">
        <div class="po-row-k">${esc(k)}</div>
        <div class="po-row-v ${mono ? "mono" : ""}">
          <span>${esc(v)}</span>
          ${copy ? `<button class="po-copy" data-copy="${esc(v)}" title="Копирай">${ICONS.copy}</button>` : ""}
        </div>
      </div>`).join("")}
      ${reg.eikUrl ? `<a class="po-link" href="${esc(reg.eikUrl)}" target="_blank" rel="noopener noreferrer">Виж в Търговския регистър ${ICONS.ext}</a>` : ""}
    </div>`;
    document.body.appendChild(pop);

    const a = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = a.left + a.width / 2 - pw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - pw - 12));
    let top = a.bottom + 8;
    if (top + ph > window.innerHeight - 12) top = a.top - ph - 8;
    pop.style.top = top + "px";
    pop.style.left = left + "px";

    pop.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy]");
      if (btn) {
        navigator.clipboard?.writeText(btn.dataset.copy);
        const original = btn.innerHTML;
        btn.textContent = "Копирано";
        setTimeout(() => { btn.innerHTML = original; }, 1400);
      }
    });

    const onDown = (e) => {
      if (!pop.contains(e.target) && !anchor.contains(e.target)) closePopover();
    };
    const onKey = (e) => { if (e.key === "Escape") closePopover(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    openPopoverCleanup = () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      pop.remove();
      openPopoverCleanup = null;
    };
  }

  function closePopover() {
    if (openPopoverCleanup) openPopoverCleanup();
  }

  // ── Source-cell popover (click on country column) ──────────────────────
  function openSourcePopover(anchor, company, code) {
    closePopover();
    const country = SOURCE_LABEL[code] || code;
    const flag = SOURCE_FLAG[code] || "";
    const importers = COMPANIES.filter((c) => c.sources.includes(code));
    const hasIt = importers.some((c) => c.id === company.id);
    const others = importers.filter((c) => c.id !== company.id);

    const lead = hasIt
      ? `<strong>${esc(company.name)}</strong> внася от ${esc(country)}.` +
        (others.length ? ` Други вносители (${others.length}):` : "")
      : `<strong>${esc(company.name)}</strong> не декларира внос от ${esc(country)}.` +
        (importers.length ? ` Други вносители от ${esc(country)} (${importers.length}):` : "");

    const showList = hasIt ? others : importers;
    const listHtml = showList.length
      ? `<ul class="po-co-list">${showList.map((o) => `<li><button class="po-co-btn" data-drawer="${esc(o.id)}">${esc(o.name)}</button></li>`).join("")}</ul>`
      : "";

    const pop = document.createElement("div");
    pop.className = "popover popover-source";
    pop.setAttribute("role", "dialog");
    pop.innerHTML = `<div class="po-head">
      <span class="po-eyebrow">Внася от</span>
      <span class="po-title">${flag} ${esc(country)}</span>
    </div>
    <div class="po-body">
      <p class="po-lead">${lead}</p>
      ${listHtml}
    </div>`;
    document.body.appendChild(pop);

    const a = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = a.left + a.width / 2 - pw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - pw - 12));
    let top = a.bottom + 8;
    if (top + ph > window.innerHeight - 12) top = a.top - ph - 8;
    pop.style.top = top + "px";
    pop.style.left = left + "px";

    pop.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-drawer]");
      if (btn) {
        closePopover();
        openDrawer(btn.dataset.drawer);
      }
    });

    const onDown = (e) => {
      if (!pop.contains(e.target) && !anchor.contains(e.target)) closePopover();
    };
    const onKey = (e) => { if (e.key === "Escape") closePopover(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    openPopoverCleanup = () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      pop.remove();
      openPopoverCleanup = null;
    };
  }

  // ── Tooltip ────────────────────────────────────────────────────────────
  let tooltipEl = null;
  let tooltipTimer = null;
  let tooltipAnchor = null;

  function showTooltip(target) {
    const content = target.dataset.tip;
    if (!content) return;
    clearTimeout(tooltipTimer);
    tooltipAnchor = target;
    tooltipTimer = setTimeout(() => {
      if (tooltipAnchor !== target) return;
      const r = target.getBoundingClientRect();
      if (!tooltipEl) {
        tooltipEl = document.createElement("span");
        tooltipEl.className = "tooltip";
        tooltipEl.setAttribute("role", "tooltip");
        document.body.appendChild(tooltipEl);
      }
      tooltipEl.textContent = content;
      tooltipEl.style.top = (r.top - 8) + "px";
      tooltipEl.style.left = (r.left + r.width / 2) + "px";
      tooltipEl.style.display = "";
    }, 220);
  }

  function hideTooltip() {
    clearTimeout(tooltipTimer);
    tooltipAnchor = null;
    if (tooltipEl) tooltipEl.style.display = "none";
  }

  // ── Sticky-column edge-shadow toggling on horizontal scroll ────────────
  function attachScrollShadow() {
    const el = document.querySelector(".table-scroll");
    if (!el) return;
    const update = () => {
      el.classList.toggle("is-scrolled", el.scrollLeft > 2);
      el.classList.toggle("is-end", el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    el.addEventListener("scroll", update, { passive: true });
    update();
  }

  // ── Event delegation ───────────────────────────────────────────────────
  function init() {
    const root = document.getElementById("root");
    attachScrollShadow();

    root.addEventListener("click", (e) => {
      const sortEl = e.target.closest("[data-sort]");
      if (sortEl) { setSort(sortEl.dataset.sort); return; }
      const drawerEl = e.target.closest("[data-drawer]");
      if (drawerEl) { openDrawer(drawerEl.dataset.drawer); return; }
      const popEl = e.target.closest("[data-pop]");
      if (popEl) { openCompanyPopover(popEl, COMPANY_BY_ID[popEl.dataset.pop]); return; }
      const sourceEl = e.target.closest("[data-source]");
      if (sourceEl) {
        const row = sourceEl.closest(".bodyrow[data-id]");
        if (row) openSourcePopover(sourceEl, COMPANY_BY_ID[row.dataset.id], sourceEl.dataset.source);
        return;
      }
    });

    root.addEventListener("mouseover", (e) => {
      const target = e.target.closest("[data-tip]");
      if (target) showTooltip(target);
    });
    root.addEventListener("mouseout", (e) => {
      if (e.target.closest("[data-tip]")) hideTooltip();
    });
    root.addEventListener("focusin", (e) => {
      const target = e.target.closest("[data-tip]");
      if (target) showTooltip(target);
    });
    root.addEventListener("focusout", hideTooltip);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
