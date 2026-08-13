(() => {
  "use strict";

  const TYPE_LABELS = {
    single: "Single",
    ep: "EP",
    flexi: "Flexi",
    compilation: "Compilación",
    other: "fanzine",
  };

  const RELATED = {
    24: 25,
    25: 24,
    81: 82,
    82: 81,
    99: 100,
    100: 99,
  };

  const MINI_FANZINES = {
    70: [
      "Just As Good As I Should Be",
      "Nice Boys Prefer Vanilla",
      "I Am Telling You Because You Are Far Away",
    ],
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

  function isBoardGame(release) {
    const fmt = String((release && release.format) || "").toLowerCase();
    const notes = String((release && release.notes) || "").toLowerCase();
    return fmt.includes("board game") || notes.includes("board game") || notes.includes("juego de mesa") || notes.includes("saropoly");
  }

  /** Prefer specific labels for non-music items from format/notes. Never "Otro". */
  function typeLabel(releaseOrType) {
    if (typeof releaseOrType === "string") {
      if (releaseOrType === "other") return "fanzine";
      return TYPE_LABELS[releaseOrType] || releaseOrType || "—";
    }
    const r = releaseOrType || {};
    if (r.type === "other") {
      if (isBoardGame(r)) return "board game";
      const fmt = String(r.format || "").toLowerCase();
      const notes = String(r.notes || "").toLowerCase();
      if (fmt.includes("fanzine") || notes.includes("fanzine")) return "fanzine";
      return "fanzine";
    }
    return TYPE_LABELS[r.type] || r.type || "—";
  }

  function typePillClass(release, label) {
    const bits = [release.type || ""];
    const lab = String(label || "").toLowerCase();
    if (lab === "fanzine") bits.push("fanzine");
    if (lab === "board game") bits.push("boardgame");
    return bits.join(" ");
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

  function matchesTypeFilter(release, type) {
    if (type === "all") return true;
    if (type === "fanzine") return release.type === "other" && !isBoardGame(release);
    if (type === "boardgame") return release.type === "other" && isBoardGame(release);
    if (type === "object") return release.type === "other";
    return release.type === type;
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
      list = list.filter((r) => matchesTypeFilter(r, state.type));
    }

    if (q) {
      list = list.filter((r) => {
        const hay = [
          r.catalog,
          String(r.number),
          `sarah ${r.number}`,
          r.artist,
          displayArtist(r),
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
        String(displayArtist(a) || "").localeCompare(String(displayArtist(b) || ""), "en", {
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
        const lofi = r.type === "other" ? " cover-lofi" : "";
        return `
            <a class="card" href="#/sarah/${r.number}" data-number="${r.number}">
              <div class="card-cover${lofi}">
                <img src="${escapeHtml(coverSrc(r))}" alt="Portada de ${escapeHtml(r.catalog)}" loading="lazy" width="300" height="300" />
              </div>
              <div class="card-body">
                <div class="card-cat">${escapeHtml(r.catalog)}</div>
                <div class="card-artist">${escapeHtml(artist)}</div>
                <div class="card-title">${escapeHtml(r.title)}</div>
                <div class="card-meta">
                  <span>${escapeHtml(String(r.year || "—"))}</span>
                  <span class="type-pill ${escapeHtml(typePillClass(r, label))}">${escapeHtml(label)}</span>
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
        const lofi = r.type === "other" ? " cover-lofi" : "";
        return `
            <a class="list-row" href="#/sarah/${r.number}" data-number="${r.number}">
              <div class="list-thumb${lofi}">
                <img src="${escapeHtml(coverSrc(r))}" alt="" loading="lazy" width="112" height="112" />
              </div>
              <div class="list-main">
                <div class="list-cat">${escapeHtml(r.catalog)}</div>
                <div class="list-artist">${escapeHtml(artist)}</div>
                <div class="list-title">${escapeHtml(r.title)}</div>
              </div>
              <div class="list-side">
                <span>${escapeHtml(String(r.year || "—"))}</span>
                <span class="type-pill ${escapeHtml(typePillClass(r, label))}">${formatBit}</span>
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
          Cien números. Singles, flexis, fanzines, un juego. Luego se acaba.
          <em>We don’t do encores.</em>
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
          <option value="fanzine">Fanzine</option>
          <option value="boardgame">Objeto / juego</option>
        </select>
        <select class="select" id="sort-by" aria-label="Ordenar">
          <option value="number">Orden: nº catálogo</option>
          <option value="year">Orden: año</option>
          <option value="artist">Orden: artista</option>
        </select>
        ${viewToggleHtml()}
      </div>

      <div class="results-meta">
        <span>${list.length} de ${state.releases.length} referencias</span>
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

  function relatedPairHtml(number) {
    const otherNum = RELATED[number];
    if (!otherNum) return "";
    const other = state.byNumber.get(otherNum);
    if (!other) return "";
    return `<p class="related-pair">Se lee con <a href="#/sarah/${other.number}">SARAH ${other.number} — ${escapeHtml(other.title)}</a></p>`;
  }

  function miniFanzineHtml(release) {
    if (!/mini-?fanzines?/i.test(String(release.notes || ""))) return "";
    const titles = MINI_FANZINES[release.number] || [];
    if (!titles.length) return "";
    return `
      <aside class="related-minis">
        <p class="related-kicker">Tres mini-fanzines en el paquete</p>
        <ul>
          ${titles.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
        </ul>
      </aside>`;
  }

  function youtubeRevealHtml(release, listen) {
    if (!listen.youtube) return "";
    return `
      <div class="yt-reveal">
        <button
          type="button"
          class="btn btn-yt-reveal"
          data-youtube-id="${escapeHtml(listen.youtube)}"
          data-youtube-title="${escapeHtml(release.title)}"
        >Archivo no oficial (YouTube)</button>
        <p class="yt-note">Subida de fans, best-effort. Si hay edición, Bandcamp.</p>
      </div>`;
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
    const lofi = isOther ? " cover-lofi" : "";

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
        <div class="object-panel">
          <p class="object-kicker">${escapeHtml(label)}</p>
          <p class="object-lede">Este número es un objeto del catálogo — papel, no vinilo. No hay pista que reproducir.</p>
          <div class="notes-box object-notes">${escapeHtml(release.notes || "Fanzine, juego u otro objeto del catálogo Sarah — sin audio.")}</div>
        </div>`;
    } else {
      const actions = [];
      if (listen.bandcamp) {
        actions.push(
          `<a class="btn btn-primary btn-bandcamp" href="${escapeHtml(listen.bandcamp)}" target="_blank" rel="noopener">Bandcamp</a>`
        );
      }
      if (listen.youtube_search) {
        const q = encodeURIComponent(listen.youtube_search);
        actions.push(
          `<a class="btn" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">Buscar en YouTube</a>`
        );
      }

      listenHtml = `
        <div class="listen-box">
          <div class="listen-actions">${actions.join("") || ""}</div>
          ${youtubeRevealHtml(release, listen)}
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
        ${relatedPairHtml(number)}

        <div class="detail-layout">
          <aside class="cover-panel">
            <div class="cover-frame${lofi}">
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
              <h2>${isOther ? "Objeto" : "Escuchar"}</h2>
              ${listenHtml}
            </section>

            ${miniFanzineHtml(release)}

            ${
              !isOther && tracks.length
                ? `<section class="section"><h2>Canciones</h2>${trackHtml}</section>`
                : ""
            }

            ${
              !isOther && release.notes
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
            <span class="highlight">Sarah Records</span> no nació como sello. Nació de un sótano en Upper Belgrave Road, Clifton, y de dos fanzines: <em>Are You Scared To Get Happy?</em> (Matt Haynes, también Sha-la-la) y <em>Kvatch</em> (Clare Wadd). Bristol, no Londres: el punto era político. No hacía falta mudarse a la capital para sacar pop. Cada 7″ llevaba una foto de la ciudad en la label.
          </p>
          <p>
            De 1987 a 1995 numeraron hasta cien. No cien discos: cien cosas. Flexis, fanzines, un juego de mesa. El 100 no es un greatest hits, es un cierre. <em>There And Back Again Lane</em>, fiesta en un barco en el puerto, anuncio a media página en el NME y Melody Maker, y la frase: <strong>we don’t do encores</strong>.
          </p>
          <p>
            Les llamaron twee, girly, C86 de segunda. Ellos publicaron anuncios pidiendo revolución socialista y feminista y denunciando a las bandas «políticas» de postureo. Indie era ideología, no un género. Cuando el indie se volvió sonido y los majors montaron sellos falsos, Sarah se apagó a propósito.
          </p>
          <div class="nonmusic-list">
            <a href="#/sarah/4">SARAH 4 · fanzine</a>
            <a href="#/sarah/14">SARAH 14 · fanzine</a>
            <a href="#/sarah/32">SARAH 32 · fanzine</a>
            <a href="#/sarah/50">SARAH 50 · board game</a>
          </div>
          <div class="series-note">
            <p>
              Este catálogo es solo la serie 1–100, el argumento numerado. Los álbumes iban por otra vía (SARAH 401–407, 601–623: <em>Snowball</em>, <em>Skywriting</em>, <em>Heavenly vs Satan</em>…) para no gastar números de single. Las compilaciones se llamaban como paradas de bus de Bristol (359, 376, 501…) porque la ciudad era el mapa. Eso queda fuera de estas cien fichas a propósito. No es que no existiera.
            </p>
          </div>
          <p>
            Este sitio es un catálogo visual estático, no un sitio oficial del sello.
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

  function onYoutubeReveal(e) {
    const btn = e.target.closest("[data-youtube-id]");
    if (!btn || !app.contains(btn)) return;
    e.preventDefault();
    const id = btn.getAttribute("data-youtube-id");
    if (!id) return;
    const title = btn.getAttribute("data-youtube-title") || "";
    const wrap = document.createElement("div");
    wrap.className = "video-wrap";
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    iframe.title = `Archivo: ${title}`;
    iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    wrap.appendChild(iframe);
    btn.replaceWith(wrap);
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
    app.addEventListener("click", onYoutubeReveal);

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
