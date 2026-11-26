# sclineage research website

A static interactive companion to the sclineage manuscript, suitable for GitHub Pages.

## Preview

Run `python -m http.server 8765` in this directory and open `http://localhost:8765`.

## Data and visuals

`assets/research-data.json` contains reported numerical results with experiment descriptions and figure sources. Images in `assets/figures/` are cropped from the November 25, 2026 manuscript. The hero and codebook canvases are labelled conceptual illustrations. Depth 1, 3 and 6 maps use the displayed seed-44 held-out fit. Depth 4 summary statistics use five technical fits. The exact numerical summaries for levels 2 and 5 require a matching source-data export. They are shown graphically in the manuscript figure.

The website includes English and Chinese copy, keyboard-accessible controls, figure enlargement, reduced-motion support and zero build-time dependencies.

## Publish

Publish the repository's `main` branch root using GitHub Pages. All asset paths are relative and work on a project URL. Update the release links in `index.html` when the code and preprint are public.

## Results narrative

Figure 1 introduces the complete method at the top. Figure 2 tests continuous state organization and developmental order. Figure 3 tests discrete routes, graph connectivity and shared ancestry. Figure 4 validates fate predictions with real clonal barcodes, separating native and common readouts. Figure 5 covers held-out generation, route ablation, source-clone fidelity, population metrics and biological programs; matched OT-CFM, paired path switching and pancreas follow in manuscript Results order.

`results.js` adds reference-state/time coloring, graph comparison, local route recovery, native/common fate readouts and clone-shuffle controls. `story.css` styles the narrative sections. Clone-pairing vectors and canvas animation are labelled schematic; reported numerical endpoints are taken from the manuscript. All content remains static and deployable without a build step.
