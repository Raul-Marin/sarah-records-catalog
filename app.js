(() => {
  "use strict";

  const TYPE_LABELS = {
    single: "Single",
    ep: "EP",
    flexi: "Flexi",
    compilation: "Compilación",
    other: "Otro",
  };

  const LAYOUT_KEY = "sarah-layout-mode";

  function loadLayoutMode() {
    try {
      const v = localStorage.getItem(LAYOUT_KEY);
      if (v === "list" || v === "grid") return v;
    } catch (_) {}
    return "grid";
  }

  function saveLayoutMode(mode) {
    try {
      localStorage.setItem(LAYOUT_KEY, mode);
    } catch (_) {}
  }

  const state = {
    releases: [],
    byNumber: new Map(),
    query: "",
    type: "all",
    sort: "number",
    layoutMode: loadLayoutMode(), // grid | list
    view: "catalog", // catalog | detail | about
    current: null,
  };

  const app = document.getElementById("app");
  const brand = document.getElementById("brand-home");

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Prefer specific labels for non-music items from format/notes. */
  function typeLabel(releaseOrType) {
    if (typeof releaseOrType === "string") {
      return TYPE_LABELS[releaseOrType] || releaseOrType || "—";
    }
    const r = releaseOrType || {};
    if (r.type === "other") {
      const fmt = String(r.format || "").toLowerCase();
      const notes = String(r.notes || "").toLowerCase();
      if (fmt.includes("board game") || notes.includes("board game")) return "board game";
      if (fmt.includes("fanzine") || notes.includes("fanzine")) {
        if (fmt.includes("two") || notes.includes("two fanzines")) return "fanzine";
        return "fanzine";
      }
      return "Otro";
    }
    return TYPE_LABELS[r.type] || r.type || "—";
  }

  function formatDate(release) {
    if (release.date) {
      const parts = String(release.date).split("-");
      if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return release.date;
    }
    return release.year ? String(release.year) : "—";
  }

  function coverSrc(release) {
    return release.cover_local || `covers/${String(release.number).padStart(3, "0")}.jpg`;
  }

  function displayArtist(release) {
    return release.artist === "N/A" ? "Sarah Records" : release.artist;
  }

  function parseRoute() {
    const hash = location.hash.replace(/^#\/?/, "");
    if (!hash || hash === "") return { view: "catalog" };
    if (hash === "about") return { view: "about" };
    const m = hash.match(/^sarah\/(\d+)$/i);
    if (m) return { view: "detail", number: Number(m[1]) };
    return { view: "catalog" };
  }

  function navigate(path) {
    location.hash = path.startsWith("#") ? path : `#${path}`;
  }

  function setActiveNav() {
    document.querySelectorAll(".nav-link").forEach((el) => {
      const nav = el.dataset.nav;
      const active =
        (nav === "catalog" && (state.view === "catalog" || state.view === "detail")) ||
        (nav === "about" && state.view === "about");
      el.classList.toggle("active", active);
    });
  }

  function filteredReleases() {
    const q = state.query.trim().toLowerCase();
    let list = state.releases.slice();

    if (state.type !== "all") {
      list = list.filter((r) => r.type === state.type);
    }

    if (q) {
      list = list.filter((r) => {
        const hay = [
          r.catalog,
          String(r.number),
          `sarah ${r.number}`,
          r.artist,
          r.title,
          String(r.year),
          r.format,
          typeLabel(r),
          TYPE_LABELS[r.type] || "",
          r.type,
          r.notes,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const sorters = {
      number: (a, b) => a.number - b.number,
      year: (a, b) => (a.year || 0) - (b.year || 0) || a.number - b.number,
      artist: (a, b) =>
        String(a.artist || "").localeCompare(String(b.artist || ""), "en", {
          sensitivity: "base",
        }) || a.number - b.number,
    };
    list.sort(sorters[state.sort] || sorters.number);
    return list;
  }

  function renderGridCards(list) {
    if (!list.length) {
      return `<div class="empty-grid"><p>No hay resultados para esa búsqueda.</p><p>Prueba con un artista, título, año o número de catálogo.</p></div>`;
    }
    return list
      .map((r) => {
        const artist = displayArtist(r);
        const label = typeLabel(r);
        return `
            <a class="card" href="#/sarah/${r.number}" data-number="${r.number}">
              <div class="card-cover">
                <img src="${escapeHtml(coverSrc(r))}" alt="Portada de ${escapeHtml(r.catalog)}" loading="lazy" width="300" height="300" />
              </div>
              <div class="card-body">
                <div class="card-cat">${escapeHtml(r.catalog)}</div>
                <div class="card-artist">${escapeHtml(artist)}</div>
                <div class="card-title">${escapeHtml(r.title)}</div>
                <div class="card-meta">
                  <span>${escapeHtml(String(r.year || "—"))}</span>
                  <span class="type-pill ${escapeHtml(r.type)}">${escapeHtml(label)}</span>
                </div>
              </div>
            </a>`;
      })
      .join("");
  }

  function renderListRows(list) {
    if (!list.length) {
      return `<div class="empty-grid"><p>No hay resultados para esa búsqueda.</p><p>Prueba con un artista, título, año o número de catálogo.</p></div>`;
    }
    return list
      .map((r) => {
        const artist = displayArtist(r);
        const label = typeLabel(r);
        const formatBit = r.format ? escapeHtml(r.format) : escapeHtml(label);
        return `
            <a class="list-row" href="#/sarah/${r.number}" data-number="${r.number}">
              <div class="list-thumb">
                <img src="${escapeHtml(coverSrc(r))}" alt="" loading="lazy" width="112" height="112" />
              </div>
              <div class="list-main">
                <div class="list-cat">${escapeHtml(r.catalog)}</div>
                <div class="list-artist">${escapeHtml(artist)}</div>
                <div class="list-title">${escapeHtml(r.title)}</div>
              </div>
              <div class="list-side">
                <span>${escapeHtml(String(r.year || "—"))}</span>
                <span class="type-pill ${escapeHtml(r.type)}">${formatBit}</span>
              </div>
            </a>`;
      })
      .join("");
  }

  function viewToggleHtml() {
    const gridActive = state.layoutMode === "grid" ? "active" : "";
    const listActive = state.layoutMode === "list" ? "active" : "";
    return `
      <div class="view-toggle" role="group" aria-label="Vista del catálogo">
        <button type="button" data-layout="grid" class="${gridActive}" aria-pressed="${state.layoutMode === "grid"}" title="Vista en cuadrícula">
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="6" height="6"/><rect x="9" y="1" width="6" height="6"/><rect x="1" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/></svg>
          Cuadrícula
        </button>
        <button type="button" data-layout="list" class="${listActive}" aria-pressed="${state.layoutMode === "list"}" title="Vista en lista">
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="2" width="14" height="2"/><rect x="1" y="7" width="14" height="2"/><rect x="1" y="12" width="14" height="2"/></svg>
          Lista
        </button>
      </div>`;
  }

  function renderCatalog() {
    const list = filteredReleases();
    const isList = state.layoutMode === "list";
    const body = isList
      ? `<div class="catalog-list">${renderListRows(list)}</div>`
      : `<div class="catalog-grid">${renderGridCards(list)}</div>`;

    app.innerHTML = `
      <section class="catalog-hero">
        <h1>Catálogo SARAH 1–100</h1>
        <p>
          El trayecto completo del sello indie de Bristol: singles, EPs, flexis,
          fanzines y el cierre con <em>There And Back Again Lane</em>.
        </p>
        <div class="hero-stats">
          <span class="chip"><strong>100</strong> referencias</span>
          <span class="chip"><strong>1987–1995</strong></span>
          <span class="chip">Clare Wadd &amp; Matt Haynes</span>
        </div>
      </section>

      <div class="controls">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
          <input
            class="search-input"
            id="search"
            type="search"
            placeholder="Buscar por artista, título, SARAH N, año…"
            value="${escapeHtml(state.query)}"
            autocomplete="off"
          />
        </div>
        <select class="select" id="filter-type" aria-label="Filtrar por tipo">
          <option value="all">Todos los tipos</option>
          <option value="single">Single</option>
          <option value="ep">EP</option>
          <option value="flexi">Flexi</option>
          <option value="compilation">Compilación</option>
          <option value="other">Otro</option>
        </select>
        <select class="select" id="sort-by" aria-label="Ordenar">
          <option value="number">Orden: nº catálogo</option>
          <option value="year">Orden: año</option>
          <option value="artist">Orden: artista</option>
        </select>
        ${viewToggleHtml()}
      </div>

      <div class="results-meta">
        <span>${list.length} de ${state.releases.length} lanzamientos</span>
        <span class="kbd-hint">Atajos: <span class="kbd">←</span> <span class="kbd">→</span> en ficha</span>
      </div>

      ${body}
    `;

    const search = document.getElementById("search");
    const filterType = document.getElementById("filter-type");
    const sortBy = document.getElementById("sort-by");
    filterType.value = state.type;
    sortBy.value = state.sort;

    search.addEventListener("input", (e) => {
      state.query = e.target.value;
      const caret = e.target.selectionStart;
      renderCatalog();
      const again = document.getElementById("search");
      if (again) {
        again.focus();
        try { again.setSelectionRange(caret, caret); } catch (_) {}
      }
    });
    filterType.addEventListener("change", (e) => {
      state.type = e.target.value;
      renderCatalog();
    });
    sortBy.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderCatalog();
    });

    document.querySelectorAll(".view-toggle [data-layout]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-layout");
        if (mode !== "grid" && mode !== "list") return;
        if (state.layoutMode === mode) return;
        state.layoutMode = mode;
        saveLayoutMode(mode);
        renderCatalog();
      });
    });
  }

  function listOrNull(value) {
    if (!value) return null;
    if (Array.isArray(value)) {
      const cleaned = value.filter(Boolean);
      return cleaned.length ? cleaned : null;
    }
    return String(value);
  }

  function renderDetail(number) {
    const release = state.byNumber.get(number);
    if (!release) {
      app.innerHTML = `
        <div class="error-state">
          <h2>Referencia no encontrada</h2>
          <p>No existe SARAH ${escapeHtml(String(number))} en este catálogo.</p>
          <p><a class="btn" href="#/">Volver al catálogo</a></p>
        </div>`;
      return;
    }

    state.current = number;
    const prev = state.byNumber.get(number - 1);
    const next = state.byNumber.get(number + 1);
    const artist = displayArtist(release);
    const listen = release.listen || {};
    const isOther = release.type === "other";
    const label = typeLabel(release);

    const producers = listOrNull(release.producers);
    const engineers = listOrNull(release.engineers);
    const studio = release.studio || null;

    const tracks = Array.isArray(release.tracks) ? release.tracks : [];
    const trackHtml = tracks.length
      ? `<ol class="tracklist">
          ${tracks
            .map(
              (t) => `
            <li>
              <span class="track-pos">${escapeHtml(t.position || "—")}</span>
              <span class="track-title">${escapeHtml(t.title || "")}</span>
              <span class="track-dur">${t.duration ? escapeHtml(t.duration) : ""}</span>
            </li>`
            )
            .join("")}
        </ol>`
      : "";

    let listenHtml = "";
    if (isOther) {
      listenHtml = `
        <div class="other-empty">
          <div class="emoji" aria-hidden="true">✦</div>
          <h3>Ítem no musical · ${escapeHtml(label)}</h3>
          <p>${escapeHtml(release.notes || "Fanzine, juego u otro objeto del catálogo Sarah — sin audio.")}</p>
        </div>`;
    } else {
      const actions = [];
      if (listen.bandcamp) {
        actions.push(
          `<a class="btn btn-bandcamp" href="${escapeHtml(listen.bandcamp)}" target="_blank" rel="noopener">Bandcamp</a>`
        );
      }
      if (listen.youtube_search) {
        const q = encodeURIComponent(listen.youtube_search);
        actions.push(
          `<a class="btn" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">Buscar en YouTube</a>`
        );
      }

      const embed = listen.youtube
        ? `<div class="video-wrap">
            <iframe
              src="https://www.youtube-nocookie.com/embed/${escapeHtml(listen.youtube)}"
              title="Escuchar ${escapeHtml(release.title)}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>
          </div>`
        : `<p style="margin:0;color:var(--ink-soft)">No hay embed de YouTube para esta referencia. Usa el enlace de búsqueda o Bandcamp.</p>`;

      listenHtml = `
        <div class="listen-box">
          <div class="listen-actions">${actions.join("") || ""}</div>
          ${embed}
        </div>`;
    }

    const creditsRows = [];
    if (studio) creditsRows.push(["Estudio", studio]);
    if (producers)
      creditsRows.push(["Productor", Array.isArray(producers) ? producers.join(", ") : producers]);
    if (engineers)
      creditsRows.push(["Ingeniero", Array.isArray(engineers) ? engineers.join(", ") : engineers]);

    app.innerHTML = `
      <article class="detail">
        <div class="detail-nav">
          <a class="btn" href="#/">← Volver al catálogo</a>
          <div class="nav-arrows">
            <a class="btn" href="${prev ? `#/sarah/${prev.number}` : "#"}" ${prev ? "" : "aria-disabled=\"true\" tabindex=\"-1\" style=\"pointer-events:none;opacity:.4\""}>Anterior</a>
            <a class="btn" href="${next ? `#/sarah/${next.number}` : "#"}" ${next ? "" : "aria-disabled=\"true\" tabindex=\"-1\" style=\"pointer-events:none;opacity:.4\""}>Siguiente</a>
          </div>
        </div>

        <div class="detail-layout">
          <aside class="cover-panel">
            <div class="cover-frame">
              <img src="${escapeHtml(coverSrc(release))}" alt="Portada de ${escapeHtml(release.catalog)} — ${escapeHtml(release.title)}" width="600" height="600" />
            </div>
          </aside>

          <div class="detail-main">
            <div class="card-cat" style="margin-bottom:.35rem">${escapeHtml(release.catalog)}</div>
            <h1>${escapeHtml(release.title)}</h1>
            <p class="detail-artist">${escapeHtml(artist)}</p>

            <dl class="meta-grid">
              <div class="meta-item"><dt>Tipo</dt><dd>${escapeHtml(label)}</dd></div>
              <div class="meta-item"><dt>Formato</dt><dd>${escapeHtml(release.format || "—")}</dd></div>
              <div class="meta-item"><dt>Año</dt><dd>${escapeHtml(String(release.year || "—"))}</dd></div>
              <div class="meta-item"><dt>Fecha</dt><dd>${escapeHtml(formatDate(release))}</dd></div>
            </dl>

            <section class="section">
              <h2>Escuchar</h2>
              ${listenHtml}
            </section>

            ${
              !isOther && tracks.length
                ? `<section class="section"><h2>Canciones</h2>${trackHtml}</section>`
                : ""
            }

            ${
              release.notes
                ? `<section class="section"><h2>Notas</h2><div class="notes-box">${escapeHtml(release.notes)}</div></section>`
                : ""
            }

            ${
              creditsRows.length
                ? `<section class="section">
                    <h2>Créditos</h2>
                    <div class="credits">
                      ${creditsRows
                        .map(
                          ([lab, val]) => `
                        <div class="credit-row">
                          <span class="credit-label">${escapeHtml(lab)}</span>
                          <span>${escapeHtml(val)}</span>
                        </div>`
                        )
                        .join("")}
                    </div>
                  </section>`
                : ""
            }
          </div>
        </div>
      </article>
    `;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderAbout() {
    app.innerHTML = `
      <section class="about">
        <div class="about-card">
          <h1>Acerca de Sarah Records</h1>
          <p>
            <span class="highlight">Sarah Records</span> fue un sello independiente de Bristol
            (1987–1995), fundado por <span class="highlight">Clare Wadd</span> y
            <span class="highlight">Matt Haynes</span>. Su catálogo numerado — de
            <strong>SARAH 1</strong> a <strong>SARAH 100</strong> — es una de las
            declaraciones más coherentes del pop indie británico: singles de siete pulgadas,
            EPs, flexidiscos y una estética gráfica inconfundible.
          </p>
          <p>
            El viaje termina con <em>There And Back Again Lane</em> (SARAH 100), la
            compilación de despedida. Entre medias, el catálogo también incluye objetos
            no musicales — fanzines y hasta un juego de mesa — que forman parte de la
            historia del sello:
          </p>
          <div class="nonmusic-list">
            <a href="#/sarah/4">SARAH 4 · fanzine</a>
            <a href="#/sarah/14">SARAH 14 · fanzine</a>
            <a href="#/sarah/32">SARAH 32 · fanzine</a>
            <a href="#/sarah/50">SARAH 50 · board game</a>
          </div>
          <p>
            Este sitio es un catálogo visual estático de esas cien referencias: portadas,
            fichas, listas de temas y enlaces de escucha (YouTube / Bandcamp) reunidos
            como ayuda de consulta. No es un sitio oficial del sello.
          </p>
          <p>
            <a class="btn btn-primary" href="#/">Ver el catálogo</a>
          </p>
        </div>
      </section>
    `;
  }

  function render() {
    const route = parseRoute();
    state.view = route.view;
    setActiveNav();

    if (route.view === "about") {
      state.current = null;
      renderAbout();
      return;
    }
    if (route.view === "detail") {
      renderDetail(route.number);
      return;
    }
    state.current = null;
    renderCatalog();
  }

  function onKeydown(e) {
    if (state.view !== "detail" || state.current == null) return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowLeft") {
      const prev = state.byNumber.get(state.current - 1);
      if (prev) navigate(`/sarah/${prev.number}`);
    } else if (e.key === "ArrowRight") {
      const next = state.byNumber.get(state.current + 1);
      if (next) navigate(`/sarah/${next.number}`);
    } else if (e.key === "Escape") {
      navigate("/");
    }
  }

  async function init() {
    brand.addEventListener("click", () => navigate("/"));
    brand.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate("/");
      }
    });
    window.addEventListener("hashchange", render);
    window.addEventListener("keydown", onKeydown);

    const params = new URLSearchParams(location.search);
    const n = params.get("n");
    if (n && !location.hash) {
      history.replaceState(null, "", `${location.pathname}#/sarah/${n}`);
    }

    try {
      const res = await fetch("data.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const releases = Array.isArray(data.releases) ? data.releases : [];
      releases.sort((a, b) => a.number - b.number);
      state.releases = releases;
      state.byNumber = new Map(releases.map((r) => [r.number, r]));
      render();
    } catch (err) {
      app.innerHTML = `
        <div class="error-state">
          <h2>No se pudo cargar el catálogo</h2>
          <p>Este sitio necesita un servidor HTTP local (no sirve abrir el HTML con <code>file://</code>).</p>
          <p style="margin-top:1rem"><code>cd site && python3 -m http.server 8765</code></p>
          <p style="color:var(--muted);font-size:.9rem">${escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  init();
})();
