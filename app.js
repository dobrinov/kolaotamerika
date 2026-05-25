(() => {
  "use strict";

  // ── Feature config ──────────────────────────────────────────────────────
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
  const INFO_KEY_IDS = ["registered", "website", "email", "phone", "viber"];

  // ── Helpers ────────────────────────────────────────────────────────────
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
  const cleanUrl = (u) => String(u).replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  const pickSocial = (c, label) => (c.social || []).find((s) => s.label === label);
  const urlValue = (u) => u ? { value: u, display: cleanUrl(u) } : null;
  const isRealLegal = (legal) => {
    if (!legal) return false;
    const s = String(legal);
    return !(s.startsWith("(") || s === "—");
  };

  // ── Icons (SVG markup, currentColor) ───────────────────────────────────
  const ICONS = {
    check: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dash:  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 8H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    ext:   '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.5 2.5H9.5V7.5M9.5 2.5L5 7M3 4.5V9H7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    copy:  '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="6" height="6.5" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M2 7.5V2.5C2 2.22 2.22 2 2.5 2H7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    arrow: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6H9.5M9.5 6L6 2.5M9.5 6L6 9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    sortAsc:  '<svg class="sort-arrow" width="8" height="10" viewBox="0 0 8 10" aria-hidden="true"><path d="M4 1.5L7 6H1L4 1.5Z" fill="currentColor"/></svg>',
    sortDesc: '<svg class="sort-arrow" width="8" height="10" viewBox="0 0 8 10" aria-hidden="true"><path d="M4 8.5L1 4H7L4 8.5Z" fill="currentColor"/></svg>',
  };

  // ── Data transform ─────────────────────────────────────────────────────
  function transformCompany(c) {
    const facebook  = pickSocial(c, "Facebook");
    const instagram = pickSocial(c, "Instagram");
    const viber     = pickSocial(c, "Viber");
    const youtube   = pickSocial(c, "YouTube");
    const tiktok    = pickSocial(c, "TikTok");
    const mobile    = pickSocial(c, "Mobile.bg") || pickSocial(c, "Mobile.bg (Център)");
    const cars      = pickSocial(c, "Cars.bg");

    let registered = false;
    if (c.eik) {
      registered = {
        eik: c.eik,
        name: isRealLegal(c.legal) ? c.legal : "(непълно име)",
        date: c.founded || "—",
        address: c.city || "—",
        owner: c.owner || null,
        capital: c.capitalText || null,
        eikUrl: c.eikUrl || null,
      };
    }

    const sourceCell = (code) => (c.sources || []).includes(code)
      ? { value: "Активен внос от " + SOURCE_LABEL[code] }
      : false;

    const igDisplay = instagram ? "@" + cleanUrl(instagram.url).replace(/^instagram\.com\//, "").replace(/\?.*$/, "") : null;
    const fbDisplay = facebook ? cleanUrl(facebook.url).replace(/^facebook\.com/, "") : null;
    const ytDisplay = youtube ? cleanUrl(youtube.url).replace(/^youtube\.com\//, "") : null;
    const ttDisplay = tiktok ? cleanUrl(tiktok.url).replace(/^tiktok\.com\//, "") : null;

    return {
      id: c.id,
      name: c.brand,
      legalRaw: c.legal,
      blurb: c.blurb,
      location: c.city || "—",
      founded: c.founded ? parseInt(c.founded.slice(0, 4), 10) : null,
      foundedFull: c.founded,
      capitalText: c.capitalText,
      owner: c.owner,
      eik: c.eik,
      eikUrl: c.eikUrl,
      sources: c.sources || [],
      group: c.group,
      isGroupHead: c.isGroupHead === true,
      isNew: c.isNew === true,
      values: {
        registered,
        verified: c.verified ? { value: "Потвърдено от каталога" } : false,
        source_usa: sourceCell("USA"),
        source_ca:  sourceCell("CA"),
        source_eu:  sourceCell("EU"),
        source_kr:  sourceCell("KR"),
        source_jp:  sourceCell("JP"),
        website:    c.web ? urlValue(c.web) : null,
        facebook:   facebook ? { value: facebook.url, display: fbDisplay } : null,
        instagram:  instagram ? { value: instagram.url, display: igDisplay } : null,
        viber:      viber ? { value: viber.url, display: "Viber група" } : null,
        youtube:    youtube ? { value: youtube.url, display: ytDisplay } : null,
        tiktok:     tiktok ? { value: tiktok.url, display: ttDisplay } : null,
        mobile_bg:  mobile ? { value: mobile.url, display: cleanUrl(mobile.url) } : null,
        cars_bg:    cars ? { value: cars.url, display: cleanUrl(cars.url) } : null,
        phone:      c.phone ? { value: c.phone, display: c.phone } : null,
        email:      c.email ? { value: c.email, display: c.email } : null,
      },
    };
  }

  const RAW = JSON.parse(document.getElementById("company-data").textContent);
  const COMPANIES = RAW.filter((c) => !c.hideFromList).map(transformCompany);
  const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map((c) => [c.id, c]));
  const LAST_UPDATE = new Date().toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" });

  function computeInfoPercent(c) {
    const filled = INFO_KEY_IDS.filter((id) => c.values[id]).length;
    return Math.round((filled / INFO_KEY_IDS.length) * 100);
  }

  // ── Sort state ─────────────────────────────────────────────────────────
  let sortBy = { col: "info_amount", dir: "desc" };

  function setSort(col) {
    if (sortBy.col === col) {
      sortBy = { col, dir: sortBy.dir === "asc" ? "desc" : "asc" };
    } else {
      sortBy = { col, dir: col === "name" ? "asc" : "desc" };
    }
    renderTable();
  }

  function sortedCompanies() {
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
    });
  }

  // ── Rendering ──────────────────────────────────────────────────────────
  function renderInfoCell(c) {
    const pct = computeInfoPercent(c);
    return `<td class="cell cell--info"><div class="info-cell"><div class="info-bar" aria-hidden="true"><div class="info-fill" style="width:${pct}%"></div></div><div class="info-pct mono">${pct}%</div></div></td>`;
  }

  function renderCell(c, f) {
    if (f.type === "info") return renderInfoCell(c);
    const v = c.values[f.id];
    const state = v ? "yes" : "no";
    const present = state === "yes";
    const icon = present ? ICONS.check : ICONS.dash;
    const label = present ? "да" : "не";
    const aria = `${esc(f.label)}: ${label}`;

    let tip = "Не е налично";
    if (present) {
      if (f.type === "company") tip = `${v.name} · ЕИК ${v.eik}`;
      else if (f.type === "url") tip = "Отвори";
      else if (f.type === "phone" || f.type === "email") tip = v.display;
      else if (v.value) tip = v.value;
    }
    const tipAttr = `data-tip="${esc(tip)}"`;

    // Direct-link cells: url/email/phone
    if (present && (f.type === "url" || f.type === "email" || f.type === "phone")) {
      const firstPhone = f.type === "phone" ? v.value.split(/\s*·\s*/)[0] : v.value;
      const href = f.type === "email" ? `mailto:${v.value}`
                : f.type === "phone" ? `tel:${firstPhone.replace(/[^+\d]/g, "")}`
                : v.value;
      const target = f.type === "url" ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<td class="cell cell--yes"><a class="cell-btn" href="${esc(href)}"${target} aria-label="${aria}" ${tipAttr}><span class="cell-mark" aria-hidden="true">${icon}</span></a></td>`;
    }

    // Company-type with popover, value-type (sources) non-interactive, no-state cells disabled
    const isCompany = present && f.type === "company";
    const dataAttrs = isCompany ? `data-pop="${esc(c.id)}"` : "";
    const disabled = present ? "" : "disabled";
    return `<td class="cell cell--${state}"><button class="cell-btn" ${disabled} aria-label="${aria}" ${tipAttr} ${dataAttrs}><span class="cell-mark" aria-hidden="true">${icon}</span></button></td>`;
  }

  function renderRow(c, idx) {
    const meta = c.founded ? `<div class="cmeta"><span>от ${esc(c.founded)}</span></div>` : "";
    const cells = FEATURES.map((f) => renderCell(c, f)).join("");
    return `<tr class="bodyrow">
      <th class="namecell sticky-col" scope="row">
        <div class="rank">${String(idx + 1).padStart(2, "0")}</div>
        <div class="namebox">
          <div class="cname">${esc(c.name)}</div>
          ${meta}
        </div>
      </th>
      ${cells}
      <td class="endcell"><button class="details-btn" data-drawer="${esc(c.id)}">Детайли ${ICONS.arrow}</button></td>
    </tr>`;
  }

  function renderHeader() {
    const groups = [];
    let cur = null;
    FEATURES.forEach((f) => {
      if (!cur || cur.name !== f.group) { cur = { name: f.group, count: 1 }; groups.push(cur); }
      else cur.count++;
    });

    const groupRow = `<tr class="grouprow">
      <th class="ghead sticky-col" scope="col"><span class="ghead-label">Вносител</span></th>
      ${groups.map((g) => `<th class="ghead ghead-group" colspan="${g.count}" scope="colgroup"><span class="ghead-group-label">${esc(g.name)}</span></th>`).join("")}
      <th class="ghead ghead-end" scope="col"></th>
    </tr>`;

    const nameActive = sortBy.col === "name";
    const nameArrow = nameActive ? (sortBy.dir === "asc" ? ICONS.sortAsc : ICONS.sortDesc) : "";
    const headRow = `<tr class="headrow">
      <th class="head sticky-col head-sortable ${nameActive ? "head-sort-active" : ""}" scope="col" data-sort="name" aria-sort="${nameActive ? (sortBy.dir === "asc" ? "ascending" : "descending") : "none"}">
        <span class="head-label">Компания${nameArrow}</span>
      </th>
      ${FEATURES.map((f) => {
        const active = sortBy.col === f.id;
        const arrow = active ? (sortBy.dir === "asc" ? ICONS.sortAsc : ICONS.sortDesc) : "";
        return `<th class="head head-feat head-sortable ${active ? "head-sort-active" : ""}" scope="col" data-sort="${esc(f.id)}" data-tip="${esc(f.label)}" aria-sort="${active ? (sortBy.dir === "asc" ? "ascending" : "descending") : "none"}">
          <span class="head-feat-label">${esc(f.short)}${arrow}</span>
        </th>`;
      }).join("")}
      <th class="head head-end" scope="col"></th>
    </tr>`;

    return groupRow + headRow;
  }

  function renderTable() {
    document.getElementById("thead").innerHTML = renderHeader();
    document.getElementById("tbody").innerHTML = sortedCompanies().map(renderRow).join("");
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

  // ── Company-cell popover (registry details) ────────────────────────────
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

    // Position relative to anchor
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

  // ── Tooltip (lightweight hover) ────────────────────────────────────────
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

  // ── Build initial DOM ──────────────────────────────────────────────────
  function init() {
    const root = document.getElementById("root");
    root.innerHTML = `<div class="page">
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-kicker">колаотамерика</div>
          <h1 class="hero-title">Кой внася коли от Канада, Америка, Южна Корея, Япония, Европа?</h1>
          <p class="hero-lead">Каталог на фирмите, занимаващи се с внос на коли в България.</p>
        </div>
      </section>
      <section class="table-wrap">
        <div class="table-scroll with-shadow">
          <table class="ctable">
            <colgroup>
              <col style="width:280px">
              ${FEATURES.map(() => '<col style="width:92px">').join("")}
              <col style="width:130px">
            </colgroup>
            <thead id="thead"></thead>
            <tbody id="tbody"></tbody>
          </table>
        </div>
      </section>
      <footer class="foot">
        <div class="foot-inner">
          <div>© 2026 колаотамерика</div>
          <a class="foot-cta" href="mailto:update@kolaotamerika.com?subject=Подай%20вносител%20или%20поправка">Подай вносител или поправка →</a>
          <span class="meta-pill"><span class="dot"></span> Последна актуализация: ${esc(LAST_UPDATE)}</span>
        </div>
      </footer>
    </div>`;

    renderTable();
    attachScrollShadow();

    // Event delegation
    root.addEventListener("click", (e) => {
      const sortEl = e.target.closest("[data-sort]");
      if (sortEl) { setSort(sortEl.dataset.sort); return; }
      const drawerEl = e.target.closest("[data-drawer]");
      if (drawerEl) { openDrawer(drawerEl.dataset.drawer); return; }
      const popEl = e.target.closest("[data-pop]");
      if (popEl) { openCompanyPopover(popEl, COMPANY_BY_ID[popEl.dataset.pop]); return; }
    });

    // Hover tooltips for any element with data-tip
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
