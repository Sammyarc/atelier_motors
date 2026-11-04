# Verification

Validated in installed Google Chrome with Playwright and WebGL software rendering. Functional checks are in `scripts/verify.mjs`; generated results and screenshots are ignored in `test-results/`.

## Passed

- Four local GLB models render actual mesh geometry, and all four thumbnail images load.
- Paint choices change rendered materials and remain selected when changing cars.
- Day/night controls update lighting, stage material, interface state, and labels.
- Exterior camera presets, zoom, keyboard orbit, Home reset, and start/stop rotation work.
- All four cars support cabin views. Central and dashboard-directed raycasts check for usable interior geometry without a near seat/body obstruction; a clear view out through the windshield is allowed.
- Interior keyboard look, camera presets, field-of-view zoom, reset, and return to exterior work.
- Camera transitions complete under software rendering without accumulating artificial delay from GSAP lag smoothing.
- A PNG downloads with the expected filename. Dialogs open and close with Escape.
- Changing the operating-system reduced-motion preference during a session disables auto rotation and preserves working camera modes without interpolation.
- No horizontal overflow or clipped showroom controls at 320, 390, 540, 800, 1100, and 1440 pixels.
- No uncaught page errors or failed asset HTTP responses during the complete functional flow.
- A deliberately blocked renderer module produces a readable error panel with an enabled reload control.
- JavaScript syntax checks pass for the application modules.
- Final targeted checks confirm night-mode text resolves to a readable light colour, the mobile collection is visible when scrolled into view, and pointer dragging changes the exterior camera position.

## Collection and typography update

Added the Porsche 911 (930) Turbo and BMW M3 E36, with local meshopt decoding, model-specific paint/glazing, and credited source assets. Source display floors are removed before measuring vehicle bounds. Porsche paint normals and the added cars' cabin materials are adjusted for clearer rendering.

The updated type system uses bold headings, 14px vehicle body copy, larger control labels, and darker secondary text. Phone panels flow vertically so longer vehicle names cannot collide with the controls. The four-car collection uses four columns on wide screens, two on intermediate screens, and one on phones.

The additional-car run (`node scripts/verify.mjs --additions`) passed model switching, both new cabin views, paint, lighting, keyboard controls, downloads, reduced motion, and six responsive widths. It also asserts heading weight of at least 700, vehicle body text of at least 14px, and no overlapping phone panels. The Ferrari and concept cabin checks also passed during the expanded collection run.

## Visual review

Reviewed the real exterior and cabin renders, platform, material response, camera framing, and desktop/mobile control placement. Corrected cabin cameras intersecting headrests, default Ferrari material values, mobile framing, reduced-motion projection updates, and night-mode text inheritance. Models are not image substitutes or procedural placeholder cars.

## Limits

This is Chrome desktop automation with responsive viewport checks, not a physical-device or cross-browser certification. Fullscreen depends on browser support. Performance will vary with graphics hardware; the approximately 11.78 MB concept model takes longer to load than the Ferrari. Interior fidelity is limited by each supplied model's geometry and textures. No manufacturer performance figures or factory colour availability are asserted.
