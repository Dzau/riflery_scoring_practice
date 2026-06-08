"use strict";

/* ===========================================================
   Riflery Scoring Practice — Mode 1: Tally to 100
   -----------------------------------------------------------
   Start with a random 1-20. Each turn a new random 1-20 shot
   appears to add to the running total. Type the sum on the
   number pad and submit — no choices to recognize, you do the
   math. The round ends when you reach exactly 100, or when the
   next shot would push you over 100.
   =========================================================== */

const FINISH = 100;
const MIN_SHOT = 1;
const MAX_SHOT = 20;
const MAX_DIGITS = 3;        // answers never exceed 100
const CORRECT_DELAY = 380;   // ms pause after a right answer
const WRONG_DELAY = 850;     // ms pause after a wrong answer

const el = (id) => document.getElementById(id);

const screens = {
  home: el("home"),
  game: el("game"),
  results: el("results"),
  choose: el("choose"),
  score: el("score"),
};

const ui = {
  progressFill: el("progressFill"),
  progressNow: el("progressNow"),
  runningTotal: el("runningTotal"),
  addValue: el("addValue"),
  entryValue: el("entryValue"),
  feedback: el("feedback"),
  resultTitle: el("resultTitle"),
  resultSub: el("resultSub"),
  statTotal: el("statTotal"),
  statAcc: el("statAcc"),
  statSteps: el("statSteps"),
  statTime: el("statTime"),
};

let state = null;
let locked = false;

/* ---------- helpers ---------- */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function showScreen(name) {
  for (const key in screens) {
    screens[key].classList.toggle("is-active", key === name);
  }
}

/* ---------- game flow ---------- */
function startRound() {
  state = {
    total: randInt(MIN_SHOT, MAX_SHOT),
    shot: 0,
    correctAnswer: 0,
    entry: "",
    correct: 0,
    steps: 0,
    answered: 0,
    startedAt: Date.now(),
  };
  locked = false;
  showScreen("game");
  renderBoard();
  nextTurn();
}

function nextTurn() {
  // Win: landed exactly on the finish line.
  if (state.total >= FINISH) {
    endRound(true);
    return;
  }
  // Draw the next shot; if it would bust the finish line, the round ends.
  const shot = randInt(MIN_SHOT, MAX_SHOT);
  if (state.total + shot > FINISH) {
    endRound(false);
    return;
  }

  state.shot = shot;
  state.correctAnswer = state.total + shot;
  state.entry = "";
  ui.addValue.textContent = "+" + shot;
  ui.entryValue.classList.remove("is-correct", "is-wrong");
  renderEntry();
  setFeedback("");
  locked = false;
}

function renderBoard() {
  ui.runningTotal.textContent = state.total;
  ui.progressNow.textContent = state.total;
  ui.progressFill.style.width = Math.min(100, (state.total / FINISH) * 100) + "%";
}

function renderEntry() {
  const v = state.entry;
  ui.entryValue.textContent = v === "" ? "0" : v;
  ui.entryValue.dataset.empty = v === "" ? "true" : "false";
}

/* ---------- input ---------- */
function pressKey(key) {
  if (locked) return;

  if (key === "enter") {
    submit();
    return;
  }
  if (key === "back") {
    state.entry = state.entry.slice(0, -1);
    renderEntry();
    return;
  }
  if (!/^[0-9]$/.test(key)) return;
  if (state.entry.length >= MAX_DIGITS) return;
  if (state.entry === "" && key === "0") return; // no leading zero
  state.entry += key;
  renderEntry();

  // Auto-submit the moment the entry is unambiguous — i.e. no further
  // digit could keep it within the 0-100 answer range. Small answers
  // (1-9 and 10) stay open since they could still grow, so the submit
  // key is there to confirm those.
  if (state.entry.length >= MAX_DIGITS || Number(state.entry) * 10 > FINISH) {
    submit();
  }
}

function submit() {
  if (state.entry === "") return; // nothing entered yet
  locked = true;
  state.steps += 1;
  state.answered += 1;

  const value = Number(state.entry);
  const correct = state.correctAnswer;

  if (value === correct) {
    state.correct += 1;
    ui.entryValue.classList.add("is-correct");
    setFeedback("Hit", "is-good");
    advance(correct, CORRECT_DELAY);
  } else {
    ui.entryValue.classList.add("is-wrong");
    setFeedback(`${correct} was the mark`, "is-bad");
    advance(correct, WRONG_DELAY);
  }
}

/* Always continue from the correct sum, then move on. */
function advance(correctTotal, delay) {
  setTimeout(() => {
    state.total = correctTotal;
    renderBoard();
    nextTurn();
  }, delay);
}

function setFeedback(text, cls) {
  ui.feedback.textContent = text || " ";
  ui.feedback.className = "feedback" + (cls ? " " + cls : "");
}

function endRound(win) {
  const elapsed = Math.round((Date.now() - state.startedAt) / 1000);
  const acc = state.answered ? Math.round((state.correct / state.answered) * 100) : 100;

  ui.resultTitle.textContent = win ? "Bullseye — 100!" : "Topped out";
  ui.resultSub.textContent = win
    ? "You landed dead on the line."
    : `The next shot would have gone over. You finished at ${state.total}.`;

  ui.statTotal.textContent = state.total;
  ui.statAcc.textContent = acc + "%";
  ui.statSteps.textContent = state.steps;
  ui.statTime.textContent = elapsed + "s";

  showScreen("results");
}

/* ---------- wiring ---------- */
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;
  if (action === "start-mode1") startRound();
  else if (action === "home") showScreen("home");
  else if (action === "choose-target") showScreen("choose");
  else if (action === "score-single") startScoring("single");
  else if (action === "score-five") startScoring("five");
  else if (action === "clear-shots") clearShots();
  else if (action === "add-next") addNext();
  else if (action === "add-reset") resetAdder();
});

el("keypad").addEventListener("click", (e) => {
  const key = e.target.closest("[data-key]");
  if (key) pressKey(key.dataset.key);
});

// Physical keyboard support (handy on desktop).
document.addEventListener("keydown", (e) => {
  if (!screens.game.classList.contains("is-active")) return;
  if (e.key >= "0" && e.key <= "9") pressKey(e.key);
  else if (e.key === "Backspace") { e.preventDefault(); pressKey("back"); }
  else if (e.key === "Enter") pressKey("enter");
});

/* ===========================================================
   Mode 2 — Score a Target
   -----------------------------------------------------------
   Pick a target type, tap shots onto it, and the app reads the
   ring each shot lands in. A shot touching a ring scores the
   higher (inner) value; shots outside every ring are misses.
   The adder below walks the shot values into a running total so
   you can add them up yourself and check each step.
   =========================================================== */

const VIEW = 100; // square SVG coordinate space for every target

// Rings are listed innermost-first; `r` is each ring's outer radius.
const TARGETS = {
  single: {
    name: "One-bull target",
    code: "TQ-1/1",
    bulls: [{ cx: 50, cy: 50 }],
    rings: [
      { v: 10, r: 3.5 }, { v: 9, r: 6 }, { v: 8, r: 9 }, { v: 7, r: 12 },
      { v: 6, r: 15 }, { v: 5, r: 18 }, { v: 4, r: 27 }, { v: 3, r: 36 },
      { v: 2, r: 45 },
    ],
    bullEdge: 18, // black fill radius (ring 5 boundary)
    holeR: 1.0,
    showRingNums: true,
  },
  five: {
    name: "Five-bull target",
    code: "TQ-1/5",
    bulls: [
      { cx: 25, cy: 25 }, { cx: 75, cy: 25 },
      { cx: 50, cy: 50 },
      { cx: 25, cy: 75 }, { cx: 75, cy: 75 },
    ],
    rings: [
      { v: 10, r: 2 }, { v: 9, r: 3.8 }, { v: 8, r: 5.6 },
      { v: 7, r: 7.4 }, { v: 6, r: 9.2 }, { v: 5, r: 11 },
    ],
    bullEdge: 11,
    holeR: 0.7,
    showRingNums: false,
  },
};

const SVGNS = "http://www.w3.org/2000/svg";

let target = null;     // active target definition
let shots = [];        // [{ x, y, value }]
let adderIndex = 0;    // how many shots have been folded into the running total

const ui2 = {
  wrap: el("targetWrap"),
  title: el("scoreTitle"),
  shotList: el("shotList"),
  tallySub: el("tallySub"),
  tallyTotal: el("tallyTotal"),
};

function startScoring(kind) {
  target = TARGETS[kind];
  shots = [];
  ui2.title.textContent = target.name;
  buildTarget();
  renderShots();
  resetAdder();
  showScreen("score");
}

/* ---------- draw the target ---------- */
function svgEl(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

function buildTarget() {
  ui2.wrap.innerHTML = "";
  const svg = svgEl("svg", {
    viewBox: `0 0 ${VIEW} ${VIEW}`,
    class: "target-svg",
  });
  svg.appendChild(svgEl("rect", { x: 0, y: 0, width: VIEW, height: VIEW, class: "tg-paper" }));

  for (const b of target.bulls) {
    // Outer rings sit on the paper (drawn largest-first so lines stay visible).
    const outer = target.rings.filter((r) => r.r > target.bullEdge).sort((a, z) => z.r - a.r);
    for (const r of outer) {
      svg.appendChild(svgEl("circle", { cx: b.cx, cy: b.cy, r: r.r, class: "tg-ring" }));
    }
    // Solid black bull.
    svg.appendChild(svgEl("circle", { cx: b.cx, cy: b.cy, r: target.bullEdge, class: "tg-bull" }));
    // White ring lines inside the bull.
    const inner = target.rings.filter((r) => r.r < target.bullEdge);
    for (const r of inner) {
      svg.appendChild(svgEl("circle", { cx: b.cx, cy: b.cy, r: r.r, class: "tg-ring-in" }));
    }
  }

  // Ring-value labels along the centre bull's horizontal axis (single-bull only).
  if (target.showRingNums) {
    const b = target.bulls[0];
    for (const r of target.rings) {
      svg.appendChild(svgEl("text", {
        x: b.cx - r.r + (r.r - (prevR(r) )) / 2,
        y: b.cy + 1.2,
        class: r.r <= target.bullEdge ? "tg-num tg-num--bull" : "tg-num",
        "text-anchor": "middle",
      })).textContent = r.v;
    }
  }

  const holes = svgEl("g", { id: "holesLayer" });
  svg.appendChild(holes);
  svg.addEventListener("click", onTargetClick);
  ui2.wrap.appendChild(svg);
}

// Outer radius of the ring just inside ring `r` (0 at the centre).
function prevR(r) {
  let inner = 0;
  for (const x of target.rings) if (x.r < r.r && x.r > inner) inner = x.r;
  return inner;
}

/* ---------- scoring ---------- */
function scoreAt(x, y) {
  let nearest = null;
  for (const b of target.bulls) {
    const d = Math.hypot(x - b.cx, y - b.cy);
    if (!nearest || d < nearest.d) nearest = { b, d };
  }
  // A shot touching a ring takes the higher value, so test the hole's inner edge.
  const edge = nearest.d - target.holeR;
  for (const ring of target.rings) {
    if (edge <= ring.r) return ring.v;
  }
  return 0; // outside every ring — a miss
}

/* ---------- placing & removing shots ---------- */
function onTargetClick(e) {
  const svg = e.currentTarget;
  const rect = svg.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * VIEW;
  const y = ((e.clientY - rect.top) / rect.height) * VIEW;

  // Tapping on top of an existing shot removes it.
  const hitR = Math.max(target.holeR * 2.2, 2.5);
  const idx = shots.findIndex((s) => Math.hypot(s.x - x, s.y - y) <= hitR);
  if (idx !== -1) {
    shots.splice(idx, 1);
  } else {
    shots.push({ x, y, value: scoreAt(x, y) });
  }
  renderShots();
  resetAdder();
}

function clearShots() {
  shots = [];
  renderShots();
  resetAdder();
}

function renderShots() {
  // Holes on the target.
  const layer = document.getElementById("holesLayer");
  if (layer) {
    layer.innerHTML = "";
    for (const s of shots) {
      const cls = s.value === 0 ? "tg-hole tg-hole--miss" : "tg-hole";
      layer.appendChild(svgEl("circle", { cx: s.x, cy: s.y, r: target.holeR, class: cls }));
    }
  }

  // Shot chips below.
  ui2.shotList.innerHTML = "";
  if (shots.length === 0) {
    const empty = document.createElement("span");
    empty.className = "shot-list__empty";
    empty.textContent = "No shots yet";
    ui2.shotList.appendChild(empty);
    return;
  }
  shots.forEach((s, i) => {
    const chip = document.createElement("span");
    chip.className = "chip" + (s.value === 0 ? " chip--miss" : "") + (i < adderIndex ? " chip--counted" : "");
    chip.textContent = s.value === 0 ? "M" : s.value;
    ui2.shotList.appendChild(chip);
  });
}

/* ---------- the adding helper ----------
   Folds one shot value into the running total per tap, so the user
   can add in their head and verify the subtotal at each step. */
function resetAdder() {
  adderIndex = 0;
  ui2.tallySub.textContent = "+0";
  ui2.tallyTotal.textContent = "0";
  markCountedChips();
}

function addNext() {
  if (adderIndex >= shots.length) return;
  const v = shots[adderIndex].value;
  const running = Number(ui2.tallyTotal.textContent) + v;
  adderIndex += 1;
  ui2.tallySub.textContent = "+" + v;
  ui2.tallyTotal.textContent = running;
  markCountedChips();
}

function markCountedChips() {
  const chips = ui2.shotList.querySelectorAll(".chip");
  chips.forEach((c, i) => c.classList.toggle("chip--counted", i < adderIndex));
}
