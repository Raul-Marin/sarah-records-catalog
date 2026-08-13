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
    layoutMode: loadLayoutMode(),
    view: "catalog",
    current: null,
    playingNumber: null,
    isPlaying: false,
  };

  const app = document.getElementById("app");
  const brand = document.getElementById("brand-home");
  const deck = document.getElementById("deck");
  const deckPlayBtn = document.getElementById("deck-play");
  const deckPrevBtn = document.getElementById("deck-prev");
  const deckNextBtn = document.getElementById("deck-next");
  const deckCat = document.getElementById("deck-cat");
  const deckTitle = document.getElementById("deck-title");
  const deckArtist = document.getElementById("deck-artist");
  const deckOpen = document.getElementById("deck-open");

  let ytPlayer = null;
  let ytReady = false;
  let pendingVideoId = null;
  let playerBooted = false;

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

  function youtubeId(release) {
    return (release && release.listen && release.listen.youtube) || "";
  }

  function hasPlayableYoutube(release) {
    return !!(release && release.type !== "other" && youtubeId(release));
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

  function playButtonHtml(release, className) {
    if (!hasPlayableYoutube(release)) return "";
    return `<button type="button" class="${className}" data-play="${release.number}" aria-label="Reproducir ${escapeHtml(release.catalog)}">▶</button>`;
  }

  function renderGridCards(list) {
    if (!list.length) {
      return `<div class="empty-grid"><p>No hay resultados para esa búsqueda.</p><p>Prueba con un artista, título, año o número de catálogo.</p></div>`;
    }
    return list
      .map((r) => {
        const artist = displayArtist(r);
        const label = typeLabel(r);
        const isObject = r.type === "other";
        const lofi = isObject ? " cover-lofi" : "";
        const imgSize = isObject
          ? 'width="300"'
          : 'width="300" height="300"';
        return `
            <article class="card${isObject ? " card-object" : ""}" data-number="${r.number}">
              <a class="card-link" href="#/sarah/${r.number}">
                <div class="card-cover${lofi}">
                  <img src="${escapeHtml(coverSrc(r))}" alt="Portada de ${escapeHtml(r.catalog)}" loading="lazy" ${imgSize} />
                </div>
                <div class="card-strips">
                  <div class="card-cat">${escapeHtml(r.catalog)}</div>
                  <div class="card-title">${escapeHtml(r.title)}</div>
                  <div class="card-artist">${escapeHtml(artist)}</div>
                  <div class="card-type">${escapeHtml(String(label || "").toLowerCase())}${r.year ? " · " + escapeHtml(String(r.year)) : ""}</div>
                </div>
              </a>
              ${playButtonHtml(r, "card-play")}
            </article>`;
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
        const isObject = r.type === "other";
        const lofi = isObject ? " cover-lofi" : "";
        return `
            <div class="list-row${isObject ? " card-object" : ""}" data-number="${r.number}">
              <a class="list-hit" href="#/sarah/${r.number}">
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
                  <span class="type-pill">${escapeHtml(String(label || "").toLowerCase())}</span>
                </div>
              </a>
              ${playButtonHtml(r, "list-play")}
            </div>`;
      })
      .join("");
  }

  function viewToggleHtml() {
    const gridActive = state.layoutMode === "grid" ? "active" : "";
    const listActive = state.layoutMode === "list" ? "active" : "";
    return `
      <div class="view-toggle" role="group" aria-label="Vista del catálogo">
        <button type="button" data-layout="grid" class="${gridActive}" aria-pressed="${state.layoutMode === "grid"}" title="Vista en rejilla">[rejilla]</button>
        <span class="view-sep" aria-hidden="true">|</span>
        <button type="button" data-layout="list" class="${listActive}" aria-pressed="${state.layoutMode === "list"}" title="Vista en lista">[lista]</button>
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
        ${redactStack(3)}
        <p class="hero-strip">we don’t do encores</p>
        <p class="hero-typed">100 referencias · bristol 1987–1995 · clare wadd &amp; matt haynes</p>
      </section>

      <div class="controls">
        <div class="search-wrap">
          <label class="ctrl-label" for="search">buscar:</label>
          <input
            class="search-input"
            id="search"
            type="search"
            placeholder="artista, título, sarah n, año…"
            value="${escapeHtml(state.query)}"
            autocomplete="off"
          />
        </div>
        <div class="ctrl-field">
          <label class="ctrl-label" for="filter-type">tipo:</label>
          <select class="select" id="filter-type" aria-label="Filtrar por tipo">
            <option value="all">todos</option>
            <option value="single">single</option>
            <option value="ep">ep</option>
            <option value="flexi">flexi</option>
            <option value="compilation">compilación</option>
            <option value="fanzine">fanzine</option>
            <option value="boardgame">objeto / juego</option>
          </select>
        </div>
        <div class="ctrl-field">
          <label class="ctrl-label" for="sort-by">orden:</label>
          <select class="select" id="sort-by" aria-label="Ordenar">
            <option value="number">nº catálogo</option>
            <option value="year">año</option>
            <option value="artist">artista</option>
          </select>
        </div>
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

    syncPlayingUi();
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

  function listenPanelHtml(release) {
    const listen = release.listen || {};
    const play = hasPlayableYoutube(release)
      ? `<button type="button" class="btn btn-play-web" data-play="${release.number}">▶ escuchar</button>`
      : `<p class="yt-note">sin archivo de audio en esta ficha</p>`;
    const buy = listen.bandcamp
      ? `<a class="btn btn-bandcamp" href="${escapeHtml(listen.bandcamp)}" target="_blank" rel="noopener">comprar en Bandcamp</a>`
      : "";
    return `
      <div class="listen-box">
        <div class="listen-actions">${play}${buy}</div>
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
      listenHtml = listenPanelHtml(release);
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
          <a class="btn" href="#/">← volver al catálogo</a>
          <div class="nav-arrows">
            <a class="btn" href="${prev ? `#/sarah/${prev.number}` : "#"}" ${prev ? "" : "aria-disabled=\"true\" tabindex=\"-1\" style=\"pointer-events:none;opacity:.4\""}>anterior</a>
            <a class="btn" href="${next ? `#/sarah/${next.number}` : "#"}" ${next ? "" : "aria-disabled=\"true\" tabindex=\"-1\" style=\"pointer-events:none;opacity:.4\""}>siguiente</a>
          </div>
        </div>
        ${relatedPairHtml(number)}
        ${redactStack(4)}

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

    window.scrollTo(0, 0);
    syncPlayingUi();
  }


  function redactStack(n) {
    const bars = Array.from({ length: n }, () => '<span class="redact"></span>').join("");
    return `<div class="redact-stack" aria-hidden="true">${bars}</div>`;
  }

  function renderAbout() {
    app.innerHTML = `
      <section class="about">
        <figure class="founders">
          ${redactStack(5)}
          <img src="founders.jpg" alt="Clare Wadd y Matt Haynes" width="1000" height="820" />
          <figcaption>clare wadd &amp; matt haynes · bristol</figcaption>
          ${redactStack(3)}
        </figure>
        <div class="about-card">
          <h1>acerca de</h1>
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
            <a class="btn btn-primary" href="#/">ver el catálogo</a>
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

  function isTypingTarget(el) {
    const tag = (el && el.tagName) || "";
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function deckIsVisible() {
    return !!(deck && !deck.hidden);
  }

  function onKeydown(e) {
    if (isTypingTarget(e.target)) return;

    if (e.key === " " && deckIsVisible()) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "BUTTON" || tag === "A") return;
      e.preventDefault();
      togglePlayPause();
      return;
    }

    if (state.view !== "detail" || state.current == null) return;
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

  function nextPlayable(fromNumber, dir) {
    const list = state.releases;
    const idx = list.findIndex((r) => r.number === fromNumber);
    if (idx < 0) return null;
    for (let i = idx + dir; i >= 0 && i < list.length; i += dir) {
      if (hasPlayableYoutube(list[i])) return list[i];
    }
    return null;
  }

  function showDeck() {
    if (!deck) return;
    deck.hidden = false;
  }

  function setPlayIcon(playing) {
    if (deckPlayBtn) deckPlayBtn.textContent = playing ? "❚❚" : "▶";
    state.isPlaying = playing;
  }

  function syncPlayingUi() {
    const n = state.playingNumber;
    document.querySelectorAll(".card[data-number], .list-row[data-number]").forEach((el) => {
      el.classList.toggle("is-playing", Number(el.getAttribute("data-number")) === n);
    });
    document.querySelectorAll(".btn-play-web").forEach((el) => {
      const on = Number(el.getAttribute("data-play")) === n && state.isPlaying;
      el.classList.toggle("is-playing", on);
    });
  }

  function updateDeckLabels(release, videoId) {
    if (!release) return;
    if (deckCat) deckCat.textContent = release.catalog || `SARAH ${release.number}`;
    if (deckTitle) deckTitle.textContent = videoId ? release.title : "sin archivo";
    if (deckArtist) {
      const name = displayArtist(release);
      deckArtist.textContent = videoId ? name : `${name} · sin archivo`;
    }
    if (deckOpen) deckOpen.href = `#/sarah/${release.number}`;
  }

  function loadAndPlay(videoId) {
    if (!videoId || !ytPlayer || !ytReady) return;
    try {
      ytPlayer.loadVideoById(videoId);
      ytPlayer.playVideo();
    } catch (_) {}
  }

  function ensurePlayer() {
    if (playerBooted) return;
    if (!(window.YT && YT.Player)) return;
    const box = document.getElementById("yt-box");
    if (!box) return;
    playerBooted = true;
    ytPlayer = new YT.Player("yt-box", {
      width: "120",
      height: "68",
      playerVars: {
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        origin: location.origin,
        enablejsapi: 1,
        controls: 0,
        disablekb: 1,
      },
      events: {
        onReady() {
          ytReady = true;
          if (pendingVideoId) {
            const id = pendingVideoId;
            pendingVideoId = null;
            loadAndPlay(id);
          }
        },
        onStateChange(ev) {
          const YTS = window.YT && YT.PlayerState;
          if (!YTS) return;
          if (ev.data === YTS.PLAYING) {
            setPlayIcon(true);
            syncPlayingUi();
          } else if (ev.data === YTS.PAUSED) {
            setPlayIcon(false);
            syncPlayingUi();
          } else if (ev.data === YTS.ENDED) {
            setPlayIcon(false);
            const nxt = nextPlayable(state.playingNumber, 1);
            if (nxt) playRelease(nxt.number, { fromEnded: true });
            else syncPlayingUi();
          }
        },
      },
    });
  }

  function playRelease(number, opts) {
    const release = state.byNumber.get(Number(number));
    if (!release) return;
    const id = youtubeId(release);
    state.playingNumber = release.number;
    showDeck();
    updateDeckLabels(release, id);
    syncPlayingUi();

    if (!id) {
      setPlayIcon(false);
      try {
        if (ytPlayer && ytReady && ytPlayer.stopVideo) ytPlayer.stopVideo();
      } catch (_) {}
      return;
    }

    ensurePlayer();
    pendingVideoId = id;
    if (ytPlayer && ytReady) {
      loadAndPlay(id);
      pendingVideoId = null;
    } else if (ytPlayer && typeof ytPlayer.playVideo === "function") {
      try {
        if (typeof ytPlayer.loadVideoById === "function") ytPlayer.loadVideoById(id);
        ytPlayer.playVideo();
      } catch (_) {}
    }
  }

  function togglePlayPause() {
    if (!deckIsVisible()) return;
    const release = state.byNumber.get(state.playingNumber);
    if (!release || !youtubeId(release)) return;
    ensurePlayer();
    if (!ytPlayer || !ytReady) return;
    try {
      const st = ytPlayer.getPlayerState();
      const YTS = window.YT && YT.PlayerState;
      if (YTS && st === YTS.PLAYING) ytPlayer.pauseVideo();
      else ytPlayer.playVideo();
    } catch (_) {}
  }

  function skipDeck(dir) {
    const from = state.playingNumber != null ? state.playingNumber : 0;
    const nxt = nextPlayable(from, dir);
    if (nxt) playRelease(nxt.number);
  }

  function onAppClick(e) {
    const btn = e.target.closest("[data-play]");
    if (!btn || !app.contains(btn)) return;
    e.preventDefault();
    e.stopPropagation();
    playRelease(Number(btn.getAttribute("data-play")));
  }

  window.onYouTubeIframeAPIReady = function () {
    ensurePlayer();
  };

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
    app.addEventListener("click", onAppClick);

    if (deckPlayBtn) {
      deckPlayBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePlayPause();
      });
    }
    if (deckPrevBtn) {
      deckPrevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        skipDeck(-1);
      });
    }
    if (deckNextBtn) {
      deckNextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        skipDeck(1);
      });
    }
    if (deck) {
      deck.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Escape") {
          /* let document handler manage detail nav; don't also skip tracks */
        }
      });
    }

    if (window.YT && YT.Player) ensurePlayer();

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
