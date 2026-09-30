# RPD project website

Project page for **Reliable Parallel Decoding in Masked Diffusion Language Models** (arXiv:2609.36452).

- Website: https://dlm-rpd.github.io/
- Paper: https://arxiv.org/abs/2609.36452
- GitHub Pages source: **master**, **/ (root)**. No branch rename or build step is needed.
- Code: https://github.com/Zhenghao-He/RPD (linked from the page's Code button).

## Preview locally

From this directory:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/. If working over SSH, forward port 8765 to your computer. Opening `index.html` directly with a `file:` URL prevents browsers from fetching the trace JSON.

## Content

- `index.html`: authors, links, abstract, method, static result fallback, citation, and metadata.
- `static/css/rpd.css`: responsive layout, including mobile and reduced-motion preferences.
- `static/js/rpd.js`: trajectory player and all eight Table 1 result cells.
- `static/traces/examples.json`: exact recorded token IDs, token text, commitment steps, prompt token IDs/hashes, model revisions, and source record checksums.
- `static/images/method.svg`: Figure 3 from the public arXiv v1 HTML assets.
- `static/images/social_preview.png`: social sharing image.

Author order and homepage URLs follow the authors' supplied links. The paper link targets the public arXiv PDF, not the local anonymous submission. Website code is separate from research implementation code.

## Trace semantics

Examples use the first test item (doc_id=0) for LLaDA GSM8K, LLaDA HumanEval, and Dream GSM8K. They were not selected by searching for maximum speedups. Default traces come from H204, Fast-dLLM from H205 (LLaDA) / H206 (Dream), and RPD from H426. Prompt hashes match within each comparison. Exports validate all 256 positions, recorded commitment steps, final token text, and the RPD configuration. They contain no filesystem paths, model weights, or research implementation source.

The shared playback clock counts backbone forward passes. It is **not a measured wall-time animation**. A method holds its final state once completed. All 256 canvas positions remain represented, including positions after EOS; the text view hides terminal tokens and subsequent content. The website does not infer latency or TPS from the archived per-step records. Accurate wall-time animation requires additional per-step timestamps with the final optimized implementation.

Full RPD uses `candidate_region=full_canvas`, `candidate_window_limit=None`, `fallback_window=32`, and entropy budget 4 nats. Only fallback is restricted to the 32 physical positions starting at the leftmost remaining mask. The candidate-region check confirms an eligible candidate at position 40 is admitted. RPD-block remains separately labeled in the result table. Baseline block settings are preserved.

Throughput and quality values are transcribed from Table 1 in RPD.pdf / arXiv v1, keeping full-test results separate from individual illustrative trajectories. The 6.1× headline is the rounded MBPP LLaDA throughput ratio 35.92 / 5.93 for full RPD versus Default. Code snippets in trajectories are displayed as text, never executed by the page.

## Publishing

This checkout tracks `DLM-RPD/dlm-rpd.github.io`, branch `master`. Pushing website changes to the configured branch publishes the site through GitHub Pages. `.nojekyll` preserves direct static hosting. No authentication tokens are stored in the website.

## Credits

Adapted from [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template), which builds on [Nerfies](https://nerfies.github.io/). Retain the template attribution and its [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) notice. The template's license does not assign a new license to the paper or third-party benchmark data. Bulma CSS is retained from the original template.

## GIF exports

Three downloadable GIFs are in `static/videos/`. They preserve the same forward-index clock, hold completed methods, and include every decoding step. The short question shown in each GIF is a summary; the website trace JSON contains the exact prompts.

To regenerate with Pillow and DejaVu fonts installed:

```sh
python tools/render_gifs.py
```

Pass a case ID such as `llada-gsm8k-0` to regenerate just that example.
