    const { useState, useMemo, useRef, useEffect, useLayoutEffect } = React;

    // ── Feature config ──────────────────────────────────────────────────────
    const FEATURES = [
      // Основни — the info_amount bar + the 5 features it's calculated from.
      // These should be the first thing a viewer scans.
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

    // ── Load + transform JSON data ─────────────────────────────────────────
    const RAW = JSON.parse(document.getElementById("company-data").textContent);

    function cleanUrl(u) {
      return u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
    }
    function pickSocial(c, label) {
      return (c.social || []).find((s) => s.label === label);
    }
    function urlValue(u) {
      if (!u) return null;
      return { value: u, display: cleanUrl(u) };
    }
    function isRealLegal(legal) {
      if (!legal) return false;
      const s = String(legal);
      if (s.startsWith("(")) return false;
      if (s === "—") return false;
      return true;
    }

    function transformCompany(c) {
      const facebook  = pickSocial(c, "Facebook");
      const instagram = pickSocial(c, "Instagram");
      const viber     = pickSocial(c, "Viber");
      const youtube   = pickSocial(c, "YouTube");
      const tiktok    = pickSocial(c, "TikTok");
      const mobile    = pickSocial(c, "Mobile.bg") || pickSocial(c, "Mobile.bg (Център)");
      const cars      = pickSocial(c, "Cars.bg");

      // `registered`: has EIK → yes, with full registry info. No EIK → confirmed no.
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

      const verified = c.verified ? { value: "Потвърдено от каталога" } : false;

      const SOURCE_NAME = { USA: "САЩ", CA: "Канада", EU: "ЕС", KR: "Корея", JP: "Япония" };
      const sourceCell = (code) => (c.sources || []).includes(code)
        ? { value: "Активен внос от " + SOURCE_NAME[code] }
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
          verified,
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

    const COMPANIES = RAW
      .filter((c) => !c.hideFromList)
      .map(transformCompany);

    // Per-company "amount of information" — share of the five key features
    // we expect every importer to publish: a registered company entity, a
    // website, an email, a phone, and a Viber group (the de-facto messaging
    // channel for this market).
    const INFO_KEY_IDS = ["registered", "website", "email", "phone", "viber"];
    function computeInfoPercent(company) {
      const filled = INFO_KEY_IDS.filter((id) => company.values[id]).length;
      return Math.round((filled / INFO_KEY_IDS.length) * 100);
    }

    const LAST_UPDATE = new Date().toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" });

    // ── Icons ──────────────────────────────────────────────────────────────
    function CheckIcon({ size = 16 }) {
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    function DashIcon({ size = 16 }) {
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    }
    function ExternalIcon({ size = 12 }) {
      return (
        <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M4.5 2.5H9.5V7.5M9.5 2.5L5 7M3 4.5V9H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    function CopyIcon({ size = 12 }) {
      return (
        <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <rect x="3.5" y="3.5" width="6" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 7.5V2.5C2 2.22 2.22 2 2.5 2H7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    }
    function ArrowRight({ size = 12 }) {
      return (
        <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6H9.5M9.5 6L6 2.5M9.5 6L6 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    function SearchIcon({ size = 14 }) {
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8.7 8.7L11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    }
    function CloseIcon({ size = 14 }) {
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    }

    // ── Tooltip ─────────────────────────────────────────────────────────────
    function Tooltip({ children, content, disabled }) {
      const [open, setOpen] = useState(false);
      const ref = useRef(null);
      const [pos, setPos] = useState({ top: 0, left: 0 });
      const showTO = useRef(null);

      const open_ = () => {
        if (disabled) return;
        clearTimeout(showTO.current);
        showTO.current = setTimeout(() => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          setPos({ top: r.top - 8, left: r.left + r.width / 2 });
          setOpen(true);
        }, 220);
      };
      const close_ = () => {
        clearTimeout(showTO.current);
        setOpen(false);
      };

      // Render the tooltip via portal to <body> so it escapes the sticky
      // stacking context of the column/group header cells (which otherwise
      // clip it). Position is computed in viewport coords, which matches
      // position: fixed.
      return (
        <span
          ref={ref}
          className="tt-anchor"
          onMouseEnter={open_}
          onMouseLeave={close_}
          onFocus={open_}
          onBlur={close_}
        >
          {children}
          {open && content && ReactDOM.createPortal(
            <span
              className="tooltip"
              style={{ top: pos.top, left: pos.left, position: "fixed" }}
              role="tooltip"
            >
              {content}
            </span>,
            document.body
          )}
        </span>
      );
    }

    // ── Popover positioning ────────────────────────────────────────────────
    function usePopover(anchorRef, open) {
      const [pos, setPos] = useState({ top: 0, left: 0, placement: "bottom" });
      const popRef = useRef(null);

      useLayoutEffect(() => {
        if (!open || !anchorRef.current) return;
        const place = () => {
          const a = anchorRef.current.getBoundingClientRect();
          const p = popRef.current?.getBoundingClientRect();
          const pw = p?.width || 320;
          const ph = p?.height || 180;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          let left = a.left + a.width / 2 - pw / 2;
          left = Math.max(12, Math.min(left, vw - pw - 12));
          let top = a.bottom + 8;
          let placement = "bottom";
          if (top + ph > vh - 12) {
            top = a.top - ph - 8;
            placement = "top";
          }
          setPos({ top, left, placement });
        };
        place();
        const f = () => place();
        window.addEventListener("scroll", f, true);
        window.addEventListener("resize", f);
        return () => {
          window.removeEventListener("scroll", f, true);
          window.removeEventListener("resize", f);
        };
      }, [open, anchorRef]);

      return { popRef, pos };
    }

    function Row({ k, v, mono, copyable, onCopy }) {
      const [copied, setCopied] = useState(false);
      return (
        <div className="po-row">
          <div className="po-row-k">{k}</div>
          <div className={`po-row-v ${mono ? "mono" : ""}`}>
            <span>{v}</span>
            {copyable && (
              <button
                className="po-copy"
                onClick={() => { onCopy?.(); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
                title="Копирай"
              >
                {copied ? "Копирано" : <CopyIcon />}
              </button>
            )}
          </div>
        </div>
      );
    }

    function CellPopover({ feature, value, anchorRef, onClose }) {
      const { popRef, pos } = usePopover(anchorRef, true);

      useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        const onDown = (e) => {
          if (popRef.current?.contains(e.target)) return;
          if (anchorRef.current?.contains(e.target)) return;
          onClose();
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onDown);
        return () => {
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("mousedown", onDown);
        };
      }, []);

      const copy = (text) => { navigator.clipboard?.writeText(text); };

      let body;
      if (feature.type === "company") {
        body = (
          <div className="po-body">
            <Row k="Юридическо име" v={value.name} mono />
            <Row k="ЕИК" v={value.eik} mono copyable onCopy={() => copy(value.eik)} />
            <Row k="Регистрирана" v={value.date} mono />
            <Row k="Седалище" v={value.address} />
            {value.owner && <Row k="Собственост" v={value.owner} />}
            {value.capital && <Row k="Капитал" v={value.capital} />}
            {value.eikUrl && (
              <a className="po-link" href={value.eikUrl} target="_blank" rel="noopener noreferrer">
                Виж в Търговския регистър <ExternalIcon />
              </a>
            )}
          </div>
        );
      } else if (feature.type === "url") {
        body = (
          <div className="po-body">
            <Row k="Адрес" v={value.display || value.value} mono />
            <a className="po-link" href={value.value} target="_blank" rel="noopener noreferrer">
              Отвори <ExternalIcon />
            </a>
          </div>
        );
      } else if (feature.type === "phone") {
        body = (
          <div className="po-body">
            <Row k="Номер" v={value.display} mono copyable onCopy={() => copy(value.value)} />
            <a className="po-link" href={`tel:${value.value.replace(/[^+\d]/g, "")}`}>Обади се <ArrowRight /></a>
          </div>
        );
      } else if (feature.type === "email") {
        body = (
          <div className="po-body">
            <Row k="Имейл" v={value.display} mono copyable onCopy={() => copy(value.value)} />
            <a className="po-link" href={`mailto:${value.value}`}>Напиши имейл <ArrowRight /></a>
          </div>
        );
      } else {
        body = (
          <div className="po-body">
            <div className="po-value">{value.value}</div>
          </div>
        );
      }

      return (
        <div
          ref={popRef}
          className={`popover popover--${pos.placement}`}
          style={{ top: pos.top, left: pos.left }}
          role="dialog"
        >
          <div className="po-head">
            <span className="po-eyebrow">{feature.group}</span>
            <span className="po-title">{feature.label}</span>
          </div>
          {body}
        </div>
      );
    }

    // ── Feature cell ────────────────────────────────────────────────────────
    function FeatureCell({ company, feature }) {
      const [open, setOpen] = useState(false);
      const anchorRef = useRef(null);

      // The info_amount column is a meta-column — renders a percentage bar
      // showing how filled-in this row is, no popover.
      if (feature.type === "info") {
        const pct = computeInfoPercent(company);
        return (
          <td className="cell cell--info">
            <div className="info-cell">
              <div className="info-bar" aria-hidden="true">
                <div className="info-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="info-pct mono">{pct}%</div>
            </div>
          </td>
        );
      }

      const v = company.values[feature.id];
      const state = v ? "yes" : "no";
      const present = state === "yes";

      let tipPreview = null;
      if (present) {
        if (feature.type === "company") tipPreview = `${v.name} · ЕИК ${v.eik}`;
        else if (feature.type === "url") tipPreview = "Отвори";
        else if (feature.type === "phone") tipPreview = v.display;
        else if (feature.type === "email") tipPreview = v.display;
        else if (v.value) tipPreview = v.value;
      } else {
        tipPreview = "Не е налично";
      }

      const icon = state === "yes" ? <CheckIcon /> : <DashIcon />;
      const label = state === "yes" ? "да" : "не";

      // For url / email / phone the action is unambiguous — just open it
      // directly. The popover (which only held an "Отвори" button anyway)
      // would be an unnecessary extra click.
      if (present && (feature.type === "url" || feature.type === "email" || feature.type === "phone")) {
        const firstPhone = feature.type === "phone" ? v.value.split(/\s*·\s*/)[0] : v.value;
        const href =
          feature.type === "email" ? `mailto:${v.value}`
          : feature.type === "phone" ? `tel:${firstPhone.replace(/[^+\d]/g, "")}`
          : v.value;
        return (
          <td className={`cell cell--${state}`}>
            <Tooltip content={tipPreview}>
              <a
                ref={anchorRef}
                className="cell-btn"
                href={href}
                target={feature.type === "url" ? "_blank" : undefined}
                rel={feature.type === "url" ? "noopener noreferrer" : undefined}
                aria-label={`${feature.label}: ${label}`}
              >
                <span className="cell-mark" aria-hidden="true">{icon}</span>
              </a>
            </Tooltip>
          </td>
        );
      }

      return (
        <td className={`cell cell--${state}`}>
          <Tooltip content={tipPreview}>
            <button
              ref={anchorRef}
              className="cell-btn"
              onClick={() => present && setOpen(true)}
              disabled={!present}
              aria-label={`${feature.label}: ${label}`}
            >
              <span className="cell-mark" aria-hidden="true">{icon}</span>
            </button>
          </Tooltip>
          {open && <CellPopover feature={feature} value={v} anchorRef={anchorRef} onClose={() => setOpen(false)} />}
        </td>
      );
    }

    // ── Drawer ──────────────────────────────────────────────────────────────
    function Stat({ k, v }) {
      return (
        <div className="stat">
          <div className="stat-k">{k}</div>
          <div className="stat-v">{v}</div>
        </div>
      );
    }
    const SOURCE_LABEL = { USA: "САЩ", CA: "Канада", EU: "ЕС", KR: "Корея", JP: "Япония" };

    function DetailsDrawer({ company, onClose }) {
      useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
          document.removeEventListener("keydown", onKey);
          document.body.style.overflow = "";
        };
      }, []);

      if (!company) return null;
      const reg = company.values.registered;
      const groups = [...new Set(FEATURES.map((f) => f.group))];
      const sourcesText = company.sources.length
        ? company.sources.map((s) => SOURCE_LABEL[s] || s).join(", ")
        : "—";
      const tagline = company.group
        ? (company.isGroupHead ? `Глава на групата ${company.group}` : `От групата ${company.group}`)
        : (company.legalRaw && /^\(/.test(company.legalRaw) ? company.legalRaw : "");

      return (
        <div className="drawer-scrim" onClick={onClose}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <header className="drawer-head">
              <div>
                <div className="drawer-eyebrow">Профил на вносител</div>
                <h2 className="drawer-title">{company.name}</h2>
                {tagline && <div className="drawer-tagline">{tagline}</div>}
              </div>
              <button className="drawer-close" onClick={onClose} aria-label="Затвори">
                <CloseIcon />
              </button>
            </header>

            <div className="drawer-stats">
              <Stat k="Седалище" v={company.location} />
              <Stat k="Основана" v={company.founded || "—"} />
              <Stat k="Внася от" v={sourcesText} />
              <Stat k="Капитал" v={company.capitalText || "—"} />
            </div>

            {reg && (
              <section className="drawer-section">
                <h3 className="drawer-h3">Юридическо лице</h3>
                <dl className="drawer-dl">
                  <div><dt>Име</dt><dd className="mono">{reg.name}</dd></div>
                  <div><dt>ЕИК</dt><dd className="mono">{reg.eikUrl ? <a href={reg.eikUrl} target="_blank" rel="noopener noreferrer">{reg.eik}</a> : reg.eik}</dd></div>
                  <div><dt>Регистрирана</dt><dd className="mono">{reg.date}</dd></div>
                  <div><dt>Седалище</dt><dd>{reg.address}</dd></div>
                  {reg.owner && <div><dt>Собственост</dt><dd>{reg.owner}</dd></div>}
                  {reg.capital && <div><dt>Капитал</dt><dd>{reg.capital}</dd></div>}
                </dl>
                {reg.eikUrl && (
                  <a className="po-link" href={reg.eikUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>
                    Виж в Търговския регистър <ExternalIcon />
                  </a>
                )}
              </section>
            )}

            {company.blurb && (
              <section className="drawer-section">
                <h3 className="drawer-h3">Бележки</h3>
                <p className="drawer-blurb">{company.blurb}</p>
              </section>
            )}

            {groups.map((g) => (
              <section className="drawer-section" key={g}>
                <h3 className="drawer-h3">{g}</h3>
                <ul className="drawer-list">
                  {FEATURES.filter((f) => f.group === g && f.type !== "info").map((f) => {
                    const val = company.values[f.id];
                    const state = val ? "yes" : "no";
                    const icon = state === "yes" ? <CheckIcon /> : <DashIcon />;
                    // Right-side value is shown only when it adds info:
                    //   - "no" rows: the dash icon + label already says everything
                    //   - "value"-type rows (sources): the label restates the same fact
                    //   - "yes" url/email/phone/company rows: render as a link
                    let valueContent = null;
                    if (state === "yes" && f.type !== "value") {
                      const display = val.display || val.value || val.name || "Да";
                      if (f.type === "url" && val.value) {
                        // Long URLs aren't useful in the list — render a short
                        // "Отвори ↗" link instead. Full URL is in the title.
                        valueContent = <a href={val.value} target="_blank" rel="noopener noreferrer" title={val.value}>Отвори ↗</a>;
                      } else if (f.type === "email" && val.value) {
                        valueContent = <a href={`mailto:${val.value}`}>{display}</a>;
                      } else if (f.type === "phone" && val.value) {
                        valueContent = <a href={`tel:${val.value.replace(/[^+\d]/g, "")}`}>{display}</a>;
                      } else if (f.type === "company" && val.eikUrl) {
                        valueContent = <a href={val.eikUrl} target="_blank" rel="noopener noreferrer">{display}</a>;
                      } else {
                        valueContent = display;
                      }
                    }
                    return (
                      <li key={f.id} className={`drawer-li ${state}`}>
                        <span className="drawer-li-mark">{icon}</span>
                        <span className="drawer-li-label">{f.label}</span>
                        {valueContent && <span className="drawer-li-value">{valueContent}</span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            <section className="drawer-section drawer-report">
              <h3 className="drawer-h3">Подай поправка</h3>
              <p className="drawer-report-lead">
                Видяхте грешка или липсваща информация? Изпратете я и ще обновим записа.
              </p>
              <a
                className="po-link"
                href={`mailto:update@kolaotamerika.com?subject=${encodeURIComponent("Поправка: " + company.name + " (" + company.id + ")")}&body=${encodeURIComponent("Здравейте,\n\nИскам да подам следната актуализация за " + company.name + (company.eik ? " (ЕИК " + company.eik + ")" : "") + ":\n\n[опишете промяната тук]\n\nИзточник на информацията:\n[линк или описание]\n\nБлагодаря!")}`}
              >
                Изпрати имейл до update@kolaotamerika.com <ExternalIcon />
              </a>
            </section>
          </aside>
        </div>
      );
    }

    // ── App ─────────────────────────────────────────────────────────────────
    function SortArrow({ dir }) {
      return (
        <svg className="sort-arrow" width="8" height="10" viewBox="0 0 8 10" aria-hidden="true">
          {dir === "asc"
            ? <path d="M4 1.5L7 6H1L4 1.5Z" fill="currentColor" />
            : <path d="M4 8.5L1 4H7L4 8.5Z" fill="currentColor" />}
        </svg>
      );
    }

    function App() {
      const [sortBy, setSortBy] = useState({ col: "info_amount", dir: "desc" });
      const [drawerId, setDrawerId] = useState(null);

      // Click a column header to sort by it. Same column toggles direction;
      // a new column resets to its natural default (asc for name, desc otherwise).
      const setSort = (col) => {
        setSortBy((prev) =>
          prev.col === col
            ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
            : { col, dir: col === "name" ? "asc" : "desc" }
        );
      };

      const filtered = useMemo(() => {
        const { col, dir } = sortBy;
        const keyOf = (c) => {
          if (col === "name") return c.name;
          if (col === "info_amount") return computeInfoPercent(c);
          return c.values[col] ? 1 : 0;
        };
        const list = [...COMPANIES].sort((a, b) => {
          const ak = keyOf(a);
          const bk = keyOf(b);
          let cmp = typeof ak === "string" ? ak.localeCompare(bk, "bg") : ak - bk;
          if (dir === "desc") cmp = -cmp;
          // When sorting by info_amount, ties prefer companies with a
          // registered legal entity — same data fill rate, but the one
          // you can verify in Търговския регистър wins the tiebreak.
          if (cmp === 0 && col === "info_amount") {
            cmp = (b.values.registered ? 1 : 0) - (a.values.registered ? 1 : 0);
          }
          // Final tiebreak: always alphabetical, regardless of primary direction.
          if (cmp === 0) cmp = a.name.localeCompare(b.name, "bg");
          return cmp;
        });
        return list;
      }, [sortBy]);

      const groups = useMemo(() => {
        const out = [];
        let cur = null;
        FEATURES.forEach((f) => {
          if (!cur || cur.name !== f.group) {
            cur = { name: f.group, count: 1 };
            out.push(cur);
          } else cur.count++;
        });
        return out;
      }, []);

      const drawerCompany = COMPANIES.find((c) => c.id === drawerId);

      return (
        <div className="page">
          <section className="hero">
            <div className="hero-inner">
              <div className="hero-kicker">колаотамерика</div>
              <h1 className="hero-title">
                Кой внася коли от Канада, Америка, Южна Корея, Япония, Европа?
              </h1>
              <p className="hero-lead">
                Каталог на фирмите, занимаващи се с внос на коли в България.
              </p>
            </div>
          </section>

          <section className="table-wrap">
            <div className="table-scroll with-shadow">
              <table className="ctable">
                <colgroup>
                  <col style={{ width: 280 }} />
                  {FEATURES.map((f) => <col key={f.id} style={{ width: 92 }} />)}
                  <col style={{ width: 130 }} />
                </colgroup>
                <thead>
                  <tr className="grouprow">
                    <th className="ghead sticky-col" scope="col">
                      <span className="ghead-label">Вносител</span>
                    </th>
                    {groups.map((g) => (
                      <th key={g.name} className="ghead ghead-group" colSpan={g.count} scope="colgroup">
                        <span className="ghead-group-label">{g.name}</span>
                      </th>
                    ))}
                    <th className="ghead ghead-end" scope="col" />
                  </tr>
                  <tr className="headrow">
                    <th
                      className={`head sticky-col head-sortable ${sortBy.col === "name" ? "head-sort-active" : ""}`}
                      scope="col"
                      onClick={() => setSort("name")}
                      aria-sort={sortBy.col === "name" ? (sortBy.dir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <span className="head-label">
                        Компания
                        {sortBy.col === "name" && <SortArrow dir={sortBy.dir} />}
                      </span>
                    </th>
                    {FEATURES.map((f) => {
                      const active = sortBy.col === f.id;
                      return (
                        <th
                          key={f.id}
                          className={`head head-feat head-sortable ${active ? "head-sort-active" : ""}`}
                          scope="col"
                          onClick={() => setSort(f.id)}
                          aria-sort={active ? (sortBy.dir === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <Tooltip content={f.label}>
                            <span className="head-feat-label">
                              {f.short}
                              {active && <SortArrow dir={sortBy.dir} />}
                            </span>
                          </Tooltip>
                        </th>
                      );
                    })}
                    <th className="head head-end" scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={c.id} className="bodyrow">
                      <th className="namecell sticky-col" scope="row">
                        <div className="rank">{String(idx + 1).padStart(2, "0")}</div>
                        <div className="namebox">
                          <div className="cname">{c.name}</div>
                          {c.founded && (
                            <div className="cmeta"><span>от {c.founded}</span></div>
                          )}
                        </div>
                      </th>
                      {FEATURES.map((f) => (
                        <FeatureCell key={f.id} company={c} feature={f} />
                      ))}
                      <td className="endcell">
                        <button className="details-btn" onClick={() => setDrawerId(c.id)}>
                          Детайли <ArrowRight />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="foot">
            <div className="foot-inner">
              <div>© 2026 колаотамерика</div>
              <a className="foot-cta" href="mailto:update@kolaotamerika.com?subject=Подай%20вносител%20или%20поправка">
                Подай вносител или поправка →
              </a>
              <span className="meta-pill"><span className="dot" /> Последна актуализация: {LAST_UPDATE}</span>
            </div>
          </footer>

          {drawerCompany && (
            <DetailsDrawer company={drawerCompany} onClose={() => setDrawerId(null)} />
          )}
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
