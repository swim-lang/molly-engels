/* ============================================================
   Molly Engels — interactions
   ============================================================ */

/* ---------- tiny synthesized sound effects (Web Audio) ---------- */
let audioCtx;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// picking up a stamp — a short "peel / tick"
function playPickup() {
  try {
    const ctx = ac();
    const t = ctx.currentTime;
    const dur = 0.09;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const p = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - p, 2.2); // decaying noise
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2000;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.3;
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
  } catch (e) {}
}

// placing a stamp — a soft "paper tap" (filtered noise, no tone)
function playPlace() {
  try {
    const ctx = ac();
    const t = ctx.currentTime;

    // helper: a short noise burst through a filter with an amplitude envelope
    function noiseHit(dur, filterType, freq, q, peak, delay) {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const p = i / data.length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - p, 2.6);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      const start = t + (delay || 0);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(start);
    }

    // low, soft body — the "pat" of paper landing
    noiseHit(0.11, "lowpass", 750, 0.6, 0.28, 0);
    // brief papery high crinkle on top
    noiseHit(0.05, "highpass", 3200, 0.5, 0.12, 0.005);
  } catch (e) {}
}

// clicking ENTER — a cute "send / whoosh" as the letter is mailed off
function playSend() {
  try {
    const ctx = ac();
    const t = ctx.currentTime;
    // whoosh: noise through a bandpass sweeping upward
    const dur = 0.5;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(450, t);
    bp.frequency.exponentialRampToValueAtTime(3600, t + 0.42);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.13);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
  } catch (e) {}
}

/* ---------- Loading screen: drag stamps into their slots ---------- */
function initLoadingGame() {
  const loading = document.getElementById("loading");
  if (!loading) return;
  const scene = loading.querySelector(".loading__scene");
  const stamps = Array.from(document.querySelectorAll(".stamp"));
  const slots = Array.from(document.querySelectorAll(".slot"));

  // scale the whole scene to fit the viewport, so stamps always sit outside the envelope
  const SCENE_W = 1240, SCENE_H = 760;
  function setSceneScale() {
    const s = Math.min(1, (window.innerWidth - 48) / SCENE_W, (window.innerHeight - 48) / SCENE_H);
    scene.style.setProperty("--scene-scale", s);
  }
  setSceneScale();
  window.addEventListener("resize", setSceneScale);
  const sceneScale = () => scene.getBoundingClientRect().width / SCENE_W;

  stamps.forEach((stamp) => {
    const home = { left: stamp.style.left, top: stamp.style.top, transform: stamp.style.transform };
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    stamp.addEventListener("pointerdown", (e) => {
      if (stamp.classList.contains("is-placed")) return;
      dragging = true;
      stamp.setPointerCapture(e.pointerId);
      stamp.classList.add("is-dragging");
      startX = e.clientX; startY = e.clientY;
      startLeft = stamp.offsetLeft; startTop = stamp.offsetTop;
      stamp.style.transform = "rotate(0deg)";
      playPickup();
    });

    stamp.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const s = sceneScale();
      stamp.style.left = startLeft + (e.clientX - startX) / s + "px";
      stamp.style.top = startTop + (e.clientY - startY) / s + "px";
      highlightSlot(e.clientX, e.clientY, stamp.dataset.shape);
    });

    stamp.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      stamp.classList.remove("is-dragging");
      clearHighlights();
      const target = matchingSlotUnder(e.clientX, e.clientY, stamp.dataset.shape);
      if (target) {
        placeInSlot(stamp, target);
      } else {
        stamp.style.left = home.left;
        stamp.style.top = home.top;
        stamp.style.transform = home.transform;
      }
    });
  });

  function slotRect(slot, pad = 26) {
    const r = slot.getBoundingClientRect();
    return {
      left: r.left - pad, right: r.right + pad,
      top: r.top - pad, bottom: r.bottom + pad,
    };
  }

  function matchingSlotUnder(x, y, shape) {
    return slots.find((s) => {
      if (s.classList.contains("is-filled")) return false;
      if (s.dataset.shape !== shape) return false;
      const r = slotRect(s);
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  }

  function highlightSlot(x, y, shape) {
    clearHighlights();
    const s = matchingSlotUnder(x, y, shape);
    if (s) s.classList.add("is-over");
  }
  function clearHighlights() {
    slots.forEach((s) => s.classList.remove("is-over"));
  }

  function placeInSlot(stamp, slot) {
    slot.classList.add("is-filled");
    const img = document.createElement("img");
    img.src = stamp.src;
    img.className = "placed";
    img.alt = "";
    slot.appendChild(img);
    stamp.classList.add("is-placed");
    playPlace();
    setTimeout(enterHome, 650); // the stamp is placed → mail the letter & enter
  }

  // mail the letter off to the right, then slide the home page up
  let entered = false;
  function enterHome() {
    if (entered) return;
    entered = true;
    playSend();
    const envelope = loading.querySelector(".envelope");
    const home = document.getElementById("home");
    envelope.classList.add("is-sent");                          // letter flies off to the right
    setTimeout(() => home.classList.add("is-revealed"), 320);   // home rises from the bottom
    setTimeout(() => {
      loading.classList.add("is-hidden");
      document.body.style.overflow = "";
    }, 1300);
  }

  const skipBtn = document.getElementById("skipBtn");
  if (skipBtn) skipBtn.addEventListener("click", enterHome);
}

/* ---------- Statement section: client click-through deck ---------- */
function initClientDeck() {
  const clients = [
    { name: "Wildflower Press", tag: "Independent Publisher", pill: "pill--bubblegum",
      blurb: "Forty years of backlist, no throughline. We found the one story running through all of it — and a voice that finally sounds like them." },
    { name: "Rosewater", tag: "Skincare Brand", pill: "pill--honey",
      blurb: "A launch with no story yet. We shaped a point of view customers could actually feel — before the first product shipped." },
    { name: "The Longmont Fund", tag: "Nonprofit", pill: "pill--yellow",
      blurb: "Complex work, quiet impact. We made the mission legible — and gave donors a reason to lean in." },
    { name: "Marigold Studio", tag: "Design Studio", pill: "pill--red",
      blurb: "A rebrand that kept stalling. We found the throughline they were too close to see, and the rest wrote itself." },
  ];

  const stack = document.getElementById("deckStack");
  if (!stack) return;
  const cards = Array.from(stack.querySelectorAll(".deck-card"));
  const prevBtn = document.getElementById("deckPrev");
  const nextBtn = document.getElementById("deckNext");
  const dotsEl = document.getElementById("deckDots");
  const n = clients.length;
  const pad = (x) => String(x).padStart(2, "0");
  const mod = (x) => ((x % n) + n) % n;
  const colorOf = (card) => card.dataset.color;

  let idx = 0;                  // client shown on the FRONT card
  let order = cards.slice();    // [front, mid, back]
  let busy = false;

  function fill(card, ci) {
    const c = clients[mod(ci)];
    card.querySelector(".deck-card__name").textContent = c.name;
    card.querySelector(".deck-card__tag").textContent = c.tag;
    card.querySelector(".deck-card__blurb").textContent = c.blurb;
    card.querySelector(".deck-card__count").textContent = pad(mod(ci) + 1) + " / " + pad(n);
  }
  function setPos(card, pos) { card.className = "deck-card " + colorOf(card) + " " + pos; }

  clients.forEach(() => { const d = document.createElement("div"); d.className = "deck-dot"; dotsEl.appendChild(d); });
  const dots = Array.from(dotsEl.children);
  const updateDots = () => dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));

  // initial fill + positions
  fill(order[0], 0); fill(order[1], 1); fill(order[2], 2);
  setPos(order[0], "at-front"); setPos(order[1], "at-mid"); setPos(order[2], "at-back");
  updateDots();

  function next() {
    if (busy) return; busy = true;
    const leaving = order[0];
    leaving.className = "deck-card " + colorOf(leaving) + " is-dealing"; // deals to back
    order = [order[1], order[2], leaving];
    idx = mod(idx + 1);
    setPos(order[0], "at-front");
    setPos(order[1], "at-mid");
    updateDots();
    setTimeout(() => fill(leaving, idx + 2), 250);         // swap content mid-flight
    setTimeout(() => { setPos(leaving, "at-back"); busy = false; }, 520);
  }

  function prev() {
    if (busy) return; busy = true;
    const incoming = order[2];
    idx = mod(idx - 1);
    fill(incoming, idx);
    incoming.className = "deck-card " + colorOf(incoming) + " is-dealing-back"; // comes to front
    order = [incoming, order[0], order[1]];
    setPos(order[1], "at-mid");
    setPos(order[2], "at-back");
    updateDots();
    setTimeout(() => { setPos(incoming, "at-front"); busy = false; }, 520);
  }

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);
}

document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
  document.body.style.overflow = "hidden"; // lock scroll under loading
  initLoadingGame();
  initClientDeck();
});
