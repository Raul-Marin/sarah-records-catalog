# PRODUCT — Sarah Records Visual Catalog (STUB)

This file is a placeholder. The real `PRODUCT.md` was written locally during
development and was never committed to `main`. Rather than invent a new
product spec from scratch, this stub records the facts already established
and implemented in `index.html`, `styles.css`, `app.js`, and `data.json`, so
future changes have a written anchor. Replace this stub with the original
document if/when it resurfaces; otherwise expand it in place — do not
contradict the facts below without explicit instruction.

## What this is

A static visual catalog of the Sarah Records main series, SARAH 1–100 only.
No 401+ albums, no bus compilations — those are mentioned only in passing on
the About page, never as catalog entries here.

- Label: Discogs label 887.
- Stack: static HTML/CSS/JS, no build step, no framework.
- Routing: hash routes — `#/`, `#/sarah/N`, `#/about`.
- Data: `data.json` (releases[]) drives the catalog and detail views.
- UI language: Spanish. Slogans/flourishes: English ("we don't do encores").

## Creative North Star

**"There And Back Again Lane."** Every design decision should be checked
against this — a home-taped, xeroxed, copier-white indie-pop object, not a
generic modern catalog.

## Non-negotiable facts (do not relitigate)

- `wordmark.png` and `cherries.png` are official supplied assets. Never
  redraw them, never replace with SVG or type.
- Copier-white paper, toner grain texture, greyscale sleeves that gain
  colour on hover/playing state.
- Exactly one sticky in-page player (`#deck`). Bandcamp embeds are buy
  links, not a second player.
- Fanzines and non-record objects keep their native proportion (no forced
  square crop). The Fiche sleeve is a square 7″, not a circle.
- The catalog grid reads left to right by catalog number, not down columns.
- Scope is strictly SARAH 1–100.

## Where the design tokens live

See `DESIGN.md` and `.impeccable/design.json` for the token-level detail
(colors, type, radius, motion). This file is product/scope; that file is
visual system.
