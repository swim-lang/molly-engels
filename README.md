# Molly Engels

Brand and website for **Molly Engels** — a creative freelancer who helps people & organizations *find their story*.

Bold, playful, editorial: big color splashes with black on top, two-tone stripes, a postal/stamp motif, chunky display type paired with monospace.

## The site

`docs/` is a self-contained static website (HTML / CSS / vanilla JS — no build step).

- **Loading screen** — a drag-to-enter game: drag the three stamps onto their matching slots on the envelope, then hit **ENTER** to "mail" the letter and slide the home page up. Includes pick-up / place / send sound effects (Web Audio).
- **Home page** — hero, animated marquee, a "What I Do" section with a shuffle-able client card deck, an About "open letter", a CTA, and a striped footer.

### Run locally

```bash
node server.js        # serves ./docs at http://localhost:5173
```

(Any static server works; a tiny Node one is included because it needs to be served over HTTP for ES modules + fonts.)

### Structure

```
docs/
  index.html
  styles.css        # design tokens + all styles
  main.js           # loading game, card deck, transitions, sounds
  assets/           # fonts, logos, stamps, cutouts, photo
server.js           # minimal static server for local preview
```

## Brand assets

- `Logo/`, `Stamps/`, `Stamp Cut Out/`, `Colors/`, `Type/`, `Photos/` — source brand assets
- `Mockups for Brand Reference/` — brand mockups

### Palette

Soft Black `#222222` · Yellow `#f2e64d` · Fire Red `#da3837` · Bubble Gum `#f0b9d5` · Light Blue `#d2e5ee` · Honey `#f5f1be`

### Type

*Exposure* (display / wordmark) · *Muoto Mono* (body, labels, UI)

> Note: the fonts in `Type/` and `docs/assets/fonts/` are **trial** versions — swap in licensed copies before any production use.
