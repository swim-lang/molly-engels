import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const FPS = 30;

// --- Brand ---------------------------------------------------------------
const YELLOW = "#f2e64d";

// --- Grid ----------------------------------------------------------------
const WIDTH = 1080;
const HEIGHT = 1440;
const COLS = 7;
const ROWS = 10;
const SPACING_X = 165;
const SPACING_Y = 157;
// Every stamp is laid out in an identical square box with objectFit: contain,
// so no stamp ever reads as bigger or smaller than another.
const STAMP_BOX = 265;
const JITTER = 9; // px of hand-placed slop
const TILT = 6; // deg of hand-placed slop

// --- Timing --------------------------------------------------------------
const LEAD_IN = 20; // beat of empty yellow before the first stamp
// Stamps cut in one at a time. The gap between them shrinks geometrically, so
// they start as countable individual hits and build to a rush by the end.
const FIRST_INTERVAL = 6.5; // frames between the first stamps
const LAST_INTERVAL = 0.35; // frames between the last stamps
const HOLD_FRAMES = 14; // beat where the screen is completely full
const GRAVITY = 2.6; // px per frame^2
const LIFT = 9; // little upward hop before the drop

// --- Wordmark outro ------------------------------------------------------
const LOGO_HOLD = 18; // clean wordmark before it starts to move
const LOGO_GROW = 20; // frames spent easing up to LOGO_GROW_TO
const LOGO_GROW_TO = 1.12;
const LOGO_TILT = -4; // deg it cocks over as it swells
const LOGO_EXIT_TILT = -10; // keeps turning a little as it collapses
const LOGO_OUT = 16; // frames spent shrinking away to nothing
const TAIL = 20; // empty yellow at the end, to match LEAD_IN

const STAMPS = [
  "stamps/basil.png",
  "stamps/beetle.png",
  "stamps/books.png",
  "stamps/clover.png",
  "stamps/dog.png",
  "stamps/face.png",
  "stamps/lemon.png",
  "stamps/orange.png",
  "stamps/star.png",
  "stamps/vermont.png",
];

type Cell = {
  key: string;
  src: string;
  x: number;
  y: number;
  rot: number;
  popAt: number;
  order: number;
  fallDelay: number;
  spin: number;
  drift: number;
};

const buildCells = (): Cell[] => {
  const startX = (WIDTH - COLS * SPACING_X) / 2 + SPACING_X / 2;
  const startY = (HEIGHT - ROWS * SPACING_Y) / 2 + SPACING_Y / 2;
  const cells: Cell[] = [];

  // Tracks what was laid down to the left / above so the same stamp never
  // lands next to itself.
  const chosen: string[][] = [];

  for (let row = 0; row < ROWS; row++) {
    chosen[row] = [];
    // Brick-lay alternate rows so the fill doesn't read as a hard grid.
    const rowOffset = (row % 2) * (SPACING_X / 2) - SPACING_X / 4;

    for (let col = 0; col < COLS; col++) {
      const seed = `stamp-${row}-${col}`;
      const cx = startX + col * SPACING_X + rowOffset;
      const cy = startY + row * SPACING_Y;

      let pick = Math.floor(random(`${seed}-img`) * STAMPS.length);
      const left = chosen[row][col - 1];
      const up = row > 0 ? chosen[row - 1][col] : undefined;
      const upLeft = row > 0 ? chosen[row - 1][col - 1] : undefined;
      const upRight = row > 0 ? chosen[row - 1][col + 1] : undefined;
      let guard = 0;
      while (
        guard < STAMPS.length &&
        [left, up, upLeft, upRight].includes(STAMPS[pick])
      ) {
        pick = (pick + 1) % STAMPS.length;
        guard++;
      }
      chosen[row][col] = STAMPS[pick];

      // Distance from the centre of the frame, 0 at the middle, 1 at a corner.
      const dx = (cx - WIDTH / 2) / (WIDTH / 2);
      const dy = (cy - HEIGHT / 2) / (HEIGHT / 2);
      const distFromCentre = Math.min(1, Math.sqrt(dx * dx + dy * dy) / Math.SQRT2);

      cells.push({
        key: seed,
        src: STAMPS[pick],
        x: cx + (random(`${seed}-jx`) - 0.5) * 2 * JITTER,
        y: cy + (random(`${seed}-jy`) - 0.5) * 2 * JITTER,
        rot: (random(`${seed}-rot`) - 0.5) * 2 * TILT,
        popAt: 0, // filled in below, once the stamping order is shuffled
        order: 0,
        // The middle drops first so the wordmark is uncovered early, then the
        // edges follow it down.
        fallDelay: Math.round(distFromCentre * 12 + random(`${seed}-fall`) * 10),
        spin: (random(`${seed}-spin`) - 0.5) * 2 * 1.2,
        drift: (random(`${seed}-drift`) - 0.5) * 2 * 2.2,
      });
    }
  }

  // Scatter the stamping order so the screen fills in randomly rather than
  // sweeping row by row.
  const shuffled = cells
    .map((c, i) => ({ i, r: random(`order-${c.key}`) }))
    .sort((a, b) => a.r - b.r);

  let at = LEAD_IN;
  const ratio = LAST_INTERVAL / FIRST_INTERVAL;
  shuffled.forEach((o, position) => {
    const progress = position / (shuffled.length - 1);
    cells[o.i].popAt = Math.round(at);
    cells[o.i].order = position;
    at += FIRST_INTERVAL * Math.pow(ratio, progress);
  });

  return cells;
};

const CELLS = buildCells();
const LAST_POP = Math.max(...CELLS.map((c) => c.popAt));
const FALL_START = LAST_POP + HOLD_FRAMES;

// How long a stamp takes to clear the frame once it lets go.
const FALL_TRAVEL = (() => {
  let t = 0;
  while (-LIFT * t + 0.5 * GRAVITY * t * t <= HEIGHT / 2 + STAMP_BOX) {
    t++;
  }
  return t;
})();
const MAX_FALL_DELAY = Math.max(...CELLS.map((c) => c.fallDelay));

// The frame the last stamp leaves — everything after this is the wordmark's.
const LOGO_CLEAR = FALL_START + MAX_FALL_DELAY + FALL_TRAVEL;
const LOGO_GROW_START = LOGO_CLEAR + LOGO_HOLD;
const LOGO_GROW_END = LOGO_GROW_START + LOGO_GROW;
const LOGO_OUT_END = LOGO_GROW_END + LOGO_OUT;

// Opens and closes on the same empty yellow, so it loops clean.
export const DURATION_IN_FRAMES = LOGO_OUT_END + TAIL;

const Stamp: React.FC<{ cell: Cell; frame: number }> = ({ cell, frame }) => {
  // A stamp is simply not there, and then it is — a hard cut in, no scale-up,
  // no settle, no bounce.
  if (frame < cell.popAt) {
    return null;
  }

  const t = frame - (FALL_START + cell.fallDelay);
  const falling = t > 0;
  const dy = falling ? -LIFT * t + 0.5 * GRAVITY * t * t : 0;
  const dx = falling ? cell.drift * t : 0;
  const spin = falling ? cell.spin * t * t * 0.06 : 0;

  if (dy > HEIGHT / 2 + STAMP_BOX) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: cell.x - STAMP_BOX / 2,
        top: cell.y - STAMP_BOX / 2,
        width: STAMP_BOX,
        height: STAMP_BOX,
        // Stamped later means stacked on top.
        zIndex: cell.order + 1,
        transform: `translate(${dx}px, ${dy}px) rotate(${cell.rot + spin}deg)`,
      }}
    >
      <Img
        src={staticFile(cell.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};

const Wordmark: React.FC<{ frame: number }> = ({ frame }) => {
  // Sits still while the stamps drain off it, swells a touch, then collapses
  // away to nothing so the piece ends where it began: empty yellow.
  const scale =
    frame < LOGO_GROW_END
      ? interpolate(frame, [LOGO_GROW_START, LOGO_GROW_END], [1, LOGO_GROW_TO], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })
      : interpolate(frame, [LOGO_GROW_END, LOGO_OUT_END], [LOGO_GROW_TO, 0], {
          extrapolateRight: "clamp",
          easing: Easing.in(Easing.cubic),
        });

  // It cocks over as it swells, then keeps turning a touch on the way out.
  const tilt =
    frame < LOGO_GROW_END
      ? interpolate(frame, [LOGO_GROW_START, LOGO_GROW_END], [0, LOGO_TILT], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })
      : interpolate(
          frame,
          [LOGO_GROW_END, LOGO_OUT_END],
          [LOGO_TILT, LOGO_EXIT_TILT],
          { extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) }
        );

  // No opacity fade — half-transparent ink over the yellow goes olive, which is
  // off-palette. Collapsing the scale to 0 keeps the wordmark solid black right
  // up to the frame it vanishes.
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        zIndex: 0,
        transform: `rotate(${tilt}deg) scale(${scale})`,
      }}
    >
      <Img
        src={staticFile("wordmark-stacked.svg")}
        style={{ width: 800, height: "auto" }}
      />
    </AbsoluteFill>
  );
};

export const StampFlood: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: YELLOW }}>
      {/* The wordmark is laid in underneath the pile just before the drop, so
          the stamps falling away is a genuine reveal — never a fade-in, and
          never spoiled through the gaps while the screen is still filling. */}
      {frame >= FALL_START && frame < LOGO_OUT_END ? <Wordmark frame={frame} /> : null}

      {CELLS.map((cell) => (
        <Stamp key={cell.key} cell={cell} frame={frame} />
      ))}
    </AbsoluteFill>
  );
};
