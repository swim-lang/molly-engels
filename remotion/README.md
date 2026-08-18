# Molly Engels — Instagram animation

Remotion project for the brand case study post.

**`StampFlood`** — 1080×1440 (3:4), 30fps, 7.5s:

1. The ten New Stamps pop in one at a time, stop-motion style, until the yellow
   is completely covered.
2. A beat on the full screen.
3. Everything falls out of frame — middle first — revealing the wordmark.

## Run

```bash
npm run dev
```

Opens Remotion Studio so you can scrub and tweak live.

## Render

```bash
npm run render
```

Writes `out/stamp-flood.mp4`. `npm run render-gif` writes a GIF instead.

## Knobs

All at the top of [`src/StampFlood.tsx`](src/StampFlood.tsx):

- `FIRST_INTERVAL` / `LAST_INTERVAL` — frames between stamps at the start and
  end of the fill. It ramps between the two, so the stamping accelerates as the
  screen closes up. Lower = faster.
- `STAMP_BOX` — how big every stamp is. Shrinking it means more of them are
  needed to cover the frame, so drop `SPACING_X` / `SPACING_Y` by the same
  proportion and raise `COLS` / `ROWS` to match.
- `COLS` / `ROWS` / `SPACING_X` / `SPACING_Y` — the fill grid. Every stamp is
  drawn into an identical `STAMP_BOX` square with `objectFit: contain`, so none
  reads bigger or smaller than another. `SPACING` must stay comfortably under
  the narrowest stamp's fitted width (Clover, the tallest, is the constraint)
  or yellow shows through the packed frame.
- `JITTER` / `TILT` — hand-placed slop. Raising these too far opens yellow gaps
  in the packed frame.
- `GRAVITY` / `LIFT` — the drop.

The wordmark is `public/wordmark-stacked.svg`. Swap to `wordmark.svg` for the
single-line lockup (it'll want a wider `width` than the current `800`).

## Chrome

Remotion normally downloads its own Chrome Headless Shell; that download is
blocked here, so `remotion.config.ts` points at the installed Google Chrome and
drops concurrency to 1. If `npx remotion browser ensure` ever succeeds, both of
those can go and renders get much faster.
