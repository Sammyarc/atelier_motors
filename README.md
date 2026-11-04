# Atelier Motor — Day 04

A real-time 3D car showroom with a raised circular platform, warm gallery lighting, and controls arranged around the scene. Select a Ferrari 458 Italia, Khronos Car Concept, Porsche 911 Turbo, or BMW M3 E36, then explore their actual exterior and interior geometry.

## Run locally

Open `index.html` through your editor's Live Server, or run:

```powershell
cd Day-04
npm start
```

Visit **http://127.0.0.1:4404**. Node 22 or later is recommended for the included server. The application itself is buildless HTML, CSS, and JavaScript: no install or build is needed to run it. Direct `file://` opening cannot load ES modules and GLB assets; use HTTP.

## Explore

- Select any of the four cars in the collection. Additional models load on demand and are cached for the session.
- Drag or swipe to orbit the exterior. Scroll, pinch, or use the zoom buttons to get closer.
- Switch to Interior to enter a fixed cabin viewpoint. Drag or use arrow keys to look around; zoom changes the field of view. Interior geometry is supplied by each model, so its detail varies.
- Select Signature / Front / Side / Rear outside, or Driver / Dashboard / Passenger / Seats inside.
- Choose among five illustrative paint finishes, switch day/night studio lighting, or enable exterior auto rotation.
- Save a PNG of the current 3D view, enter fullscreen where supported, or reset the camera.
- Focus the scene and use arrow keys, + / −, or Home. Help and credits are available from the interface.

## Implementation

`showroom.js` owns Three.js rendering, model loading, lighting, paint materials, OrbitControls, cabin input, and snapshots. GSAP animates camera positions, look direction, field of view, paint, and lighting. Velocity.js handles interface entrances, selection feedback, dialogs, and toasts. The engines operate on separate properties.

`script.js` synchronizes interface state with the scene. `styles.css` provides the base layout; `refinements.css` supplies larger typography, bold headings, clearer secondary text, the four-car grid, and stacked mobile controls. Reduced motion removes interpolated transitions and disables automatic rotation. Rendering pauses when the document is hidden and avoids drawing an unchanged scene. Pixel ratio is capped, shadows are cached, and models and dependencies are served locally.

Requires a modern browser with WebGL 2. A visible reload panel handles graphics initialization failures and lost contexts; model-switch failures preserve the previous car and offer a retry through the selector. There is no backend, booking, checkout, analytics, or account integration.

## Assets

Model sizes: Ferrari 1.68 MB, concept 11.78 MB, Porsche 13.98 MB, BMW 2.54 MB. All contain modeled cabins; the level of interior detail varies. Porsche and BMW use the local meshopt decoder. Model authors, source URLs, licenses, and modifications are documented in [assets/CREDITS.md](assets/CREDITS.md) and the in-app credits dialog. This independent concept is not affiliated with the manufacturers or asset publishers.

## Verification

```powershell
npm install
npm run check
# With npm start running in another terminal:
npm run verify
```

Browser checks use installed Google Chrome through Playwright. `scripts/inspect.mjs` creates actual-model thumbnails and desktop/mobile screenshots in ignored `test-results/`. See [VERIFICATION.md](VERIFICATION.md) for results and limits.

To host elsewhere, deploy `index.html`, `styles.css`, `refinements.css`, `script.js`, `showroom.js`, `favicon.svg`, and `assets/` together. No server-side application or build output is required.
