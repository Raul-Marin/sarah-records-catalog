# sarah records · catálogo sarah 1–100

Sitio estático (HTML/CSS/JS) con las 100 referencias de la serie principal de Sarah Records (Bristol, 1987–1995). Solo 1–100: álbumes (401+) y compilaciones-bus se señalan en Acerca de, fuera de estas fichas. Discogs label 887.

Look: fanzine xerox de finales de los 80 (papel rosa Kvatch, tinta forest-green, tiras invertidas a máquina, círculos tipo centre labels). Special Elite + IBM Plex Mono. Reproductor fijo al pie con YouTube IFrame API.

## Cómo abrirlo

Necesitas un servidor HTTP local: el navegador no puede hacer `fetch` de `data.json` con `file://`.

```bash
cd /workspace/sarah-records/site
python3 -m http.server 8765
```

Luego abre: [http://localhost:8765](http://localhost:8765)

Alternativas:

```bash
npx --yes serve -l 8765
# o
php -S localhost:8765
```

## Estructura

```
site/
  index.html      # shell + deck xerox
  styles.css      # papel Kvatch / collage de fotocopia
  app.js          # catálogo, filtros, rutas hash, detalle, YouTube deck
  data.json       # copia de discography.json (releases[])
  covers/001.jpg … 100.jpg
  README.md
```

## Rutas

- `#/` — paste-up del catálogo (buscar, filtrar, ordenar; vista lista o rejilla)
- `#/sarah/1` … `#/sarah/100` — ficha de cada referencia
- `#/about` — texto sobre el sello
- `?n=42` también redirige a `#/sarah/42` al cargar

Atajos en la ficha: `←` / `→` anterior/siguiente, `Esc` vuelve al catálogo. Espacio pausa/reanuda si el deck está visible y el foco no está en un campo.

## Datos

`data.json` es una copia de `../discography.json`. No se regenera automáticamente; si actualizas la discografía, vuelve a copiar el JSON y las portadas a `site/`.

## Nota legal / escucha

La escucha es en la página: archivo de YouTube en el reproductor xerox (IFrame API), y embed de Bandcamp en la ficha cuando existe `/album/` o `/track/`. Bandcamp se ofrece siempre como enlace de compra. Si puedes, compra el disco.
