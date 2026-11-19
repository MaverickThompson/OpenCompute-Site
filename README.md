# OpenCompute Lab website

The public landing page for OpenCompute Lab, a student project that lets a small AI club share its own GPU. It only describes the project: the platform itself is invite-only, runs on club hardware and is not reachable from here.

Live at https://maverickthompson.github.io/OpenCompute-Site/

## What's here

- `index.html`: the page
- `styles.css`: the look ("Blue Hour" colors, glass panels, blueprint background)
- `main.js`: the scroll animations and the 3D GPU card (off for anyone who reduces motion)
- `fonts/`: Inter, Inter Tight and JetBrains Mono, bundled so the page contacts no outside service (SIL Open Font License)
- `favicon.svg`: the chip logo
- `campus-map.js`: the "Every GPU on campus, on one map" section, a 3D model of the St. Paul campus with example GPUs. It loads only when the section scrolls into view on a wide screen; phones see `campus-map.webp` and load it with "Drag to explore". The scene is the lab's own GPUs page code (`frontend/src/map/campusScene.ts`) converted to plain JavaScript. The GPUs are examples, never real lab data.
- `campus-data.js`: the campus map data (building outlines and heights, roads, land use and water), from OpenStreetMap as published by Overture Maps (release 2026-11-18.0). Map data © OpenStreetMap contributors, Overture Maps Foundation (ODbL); the section shows this credit.
- `vendor/three-0.160.0.min.js`: three.js 0.160.0 (MIT license, kept at the top of the file) with OrbitControls and mergeGeometries, bundled once into one file with esbuild so nothing loads from a CDN. SHA-256 `e6ecb56a505f770aa2a717b1ef4551c10dd8670e9e0c8a1ffe1f7a91f75c80f4`.

No build step, no tracking, no cookies and no forms.

## Publish

GitHub Pages serves the `main` branch from the root folder (Settings > Pages > Deploy from a branch).

## Preview on your own computer

Open `index.html` in a browser. The campus map needs a local web server to start (browsers don't run its modules from a file), so opened as a file it shows the still picture. To see it move, run this in the folder, then open http://127.0.0.1:8000:

```
python -m http.server 8000 --bind 127.0.0.1
```
