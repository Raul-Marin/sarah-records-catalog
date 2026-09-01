# DESIGN — Sarah Records Visual Catalog (STUB)

This file is a placeholder. The real `DESIGN.md` was written locally during
development and was never committed to `main`. This stub exists so the
tokens already implemented in `styles.css` have a written home, and so no
one reinvents or "improves" the look from a blank slate. Replace this stub
with the original document if/when it resurfaces; otherwise expand it in
place — do not restyle, redesign, or introduce new tokens without explicit
instruction.

## Creative North Star

**"There And Back Again Lane."** Xerox/photocopy fanzine object, not a
generic modern web catalog. When in doubt, ask whether a change moves
toward or away from that lane.

## Tokens (already implemented in `styles.css`, mirrored in `.impeccable/design.json`)

| Token | Value | Notes |
|---|---|---|
| Accent (Sarah Cherry) | `#d70000` | `--accent` / `--kvatch` / `--spot` |
| Paper | `#ffffff` | copier-white, not cream/pink |
| Ink | `#111111` | body text |
| Radius | `0` | flat, cut-paper edges everywhere except explicit circular labels (e.g. centre-label roundels) |
| Display / body font | Special Elite | typewriter feel |
| Catalogue-number font | IBM Plex Mono | numeric/mono distinction for SARAH NN |

## Visual rules already in place

- Copier-white paper with toner-grain texture overlay.
- Sleeves render greyscale by default; colour is revealed on hover or while
  a track is playing — this is the primary "life" signal in the grid.
- Official supplied art (`wordmark.png`, `cherries.png`) is used as-is.
  Never redrawn, never swapped for SVG or set type.
- One sticky in-page player, `#deck`. Bandcamp is always a buy link, never
  a second playback surface.
- Fanzines and object-type items preserve native aspect ratio; the Fiche
  sleeve is a square 7″ sleeve, not a circle.
- Catalog grid reading order is left to right by SARAH number.

## Do not

- Do not restyle, reskin, or "modernize" the look.
- Do not add a second player.
- Do not redraw or vectorize the official marks.
- Do not extend scope past SARAH 1–100.
