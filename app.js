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
  scoreResult: el("scoreResult"),
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
  else if (action === "score-again") scoreAgain();
});

el("keypad").addEventListener("click", (e) => {
  const key = e.target.closest("[data-key]");
  if (key) pressKey(key.dataset.key);
});

// Physical keyboard support (handy on desktop).
document.addEventListener("keydown", (e) => {
  if (screens.game.classList.contains("is-active")) {
    if (e.key >= "0" && e.key <= "9") pressKey(e.key);
    else if (e.key === "Backspace") { e.preventDefault(); pressKey("back"); }
    else if (e.key === "Enter") pressKey("enter");
  } else if (screens.score.classList.contains("is-active")) {
    if (e.key >= "0" && e.key <= "9") scorePressKey(e.key);
    else if (e.key === "Backspace") { e.preventDefault(); scorePressKey("back"); }
    else if (e.key === "Enter") scorePressKey("enter");
  }
});

/* ===========================================================
   Mode 2 — Score a Target
   -----------------------------------------------------------
   Pick a real 50-ft target, tap up to 10 shots onto the photo,
   and read each ring yourself — the app never shows a shot's
   value while you score. Type your total in the score box (like
   Mode 1). The app scores the round behind the scenes; when you
   submit your total it reveals the true score and compares.
   =========================================================== */

const MAX_SHOTS = 10;
const COORD = 100; // SVG overlay coordinate space (0-100, square)

// Geometry is calibrated to the cropped target photos in /assets.
// `bulls` are bull centres; `rings` list each ring's outer radius
// (innermost first). All values are percentages of the square image.
const TARGETS = {
  single: {
    name: "One-bull target",
    img: "assets/target-1bull.jpg",
    bulls: [{ cx: 50, cy: 50 }],
    rings: [
      { v: 10, r: 1.95 }, { v: 9, r: 3.9 }, { v: 8, r: 5.85 }, { v: 7, r: 7.8 },
      { v: 6, r: 9.75 }, { v: 5, r: 11.7 }, { v: 4, r: 14.4 }, { v: 3, r: 27.8 },
      { v: 2, r: 45.2 },
    ],
    holeR: 0.6,
  },
  five: {
    name: "Five-bull target",
    img: "assets/target-5bull.jpg",
    bulls: [
      { cx: 18.9, cy: 17.1 }, { cx: 81.2, cy: 17.7 },
      { cx: 49.8, cy: 49.5 },
      { cx: 17.8, cy: 82.4 }, { cx: 82.1, cy: 82.9 },
    ],
    rings: [
      { v: 10, r: 2.04 }, { v: 9, r: 4.08 }, { v: 8, r: 6.11 },
      { v: 7, r: 8.15 }, { v: 6, r: 10.19 }, { v: 5, r: 12.23 },
    ],
    holeR: 0.5,
  },
};

const SVGNS = "http://www.w3.org/2000/svg";

let target = null;     // active target definition
let shots = [];        // [{ x, y, value }] — value kept hidden until scored
let scoreEntry = "";   // what the user has typed for their total

const ui2 = {
  wrap: el("targetWrap"),
  title: el("scoreTitle"),
  count: el("shotCount"),
  entry: el("scoreEntry"),
  hint: el("scoreHint"),
  srTitle: el("srTitle"),
  srSub: el("srSub"),
  srYours: el("srYours"),
  srActual: el("srActual"),
  srBreakdown: el("srBreakdown"),
};

function startScoring(kind) {
  target = TARGETS[kind];
  shots = [];
  scoreEntry = "";
  ui2.title.textContent = target.name;
  buildTarget();
  renderShots();
  renderScoreEntry();
  setHint("Tap your 10 shots, read each ring, then add up your score");
  showScreen("score");
}

function scoreAgain() {
  if (target) startScoring(target === TARGETS.single ? "single" : "five");
}

/* ---------- draw the target ---------- */
function svgEl(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

function buildTarget() {
  ui2.wrap.innerHTML = "";
  const img = document.createElement("img");
  img.className = "target-img";
  img.src = target.img;
  img.alt = target.name;
  ui2.wrap.appendChild(img);

  const svg = svgEl("svg", { viewBox: `0 0 ${COORD} ${COORD}`, class: "target-overlay" });
  svg.appendChild(svgEl("g", { id: "holesLayer" }));
  svg.addEventListener("click", onTargetClick);
  ui2.wrap.appendChild(svg);
}

/* ---------- scoring ---------- */
function scoreAt(x, y) {
  let nearest = null;
  for (const b of target.bulls) {
    const d = Math.hypot(x - b.cx, y - b.cy);
    if (!nearest || d < nearest) nearest = d;
  }
  // A shot touching a ring takes the higher value, so test the hole's inner edge.
  const edge = nearest - target.holeR;
  for (const ring of target.rings) {
    if (edge <= ring.r) return ring.v;
  }
  return 0; // outside every ring — a miss
}

/* ---------- placing & removing shots ---------- */
function onTargetClick(e) {
  const svg = e.currentTarget;
  const rect = svg.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * COORD;
  const y = ((e.clientY - rect.top) / rect.height) * COORD;

  // Tapping on top of an existing shot removes it.
  const hitR = 2.6;
  const idx = shots.findIndex((s) => Math.hypot(s.x - x, s.y - y) <= hitR);
  if (idx !== -1) {
    shots.splice(idx, 1);
  } else if (shots.length < MAX_SHOTS) {
    shots.push({ x, y, value: scoreAt(x, y) });
  } else {
    setHint("That's all 10 shots — add up your score");
    return;
  }
  renderShots();
}

function renderShots() {
  const layer = document.getElementById("holesLayer");
  if (layer) {
    layer.innerHTML = "";
    // Markers only — the scored value is deliberately not shown.
    for (const s of shots) {
      layer.appendChild(svgEl("circle", { cx: s.x, cy: s.y, r: 1.5, class: "tg-shot" }));
      layer.appendChild(svgEl("circle", { cx: s.x, cy: s.y, r: 0.5, class: "tg-shot__dot" }));
    }
  }
  ui2.count.textContent = `${shots.length} / ${MAX_SHOTS}`;
}

function setHint(text) {
  ui2.hint.textContent = text;
}

/* ---------- the score entry (Mode 1-style pad) ---------- */
function renderScoreEntry() {
  ui2.entry.textContent = scoreEntry === "" ? "0" : scoreEntry;
  ui2.entry.dataset.empty = scoreEntry === "" ? "true" : "false";
}

function scorePressKey(key) {
  if (key === "enter") { submitScore(); return; }
  if (key === "back") {
    scoreEntry = scoreEntry.slice(0, -1);
    renderScoreEntry();
    return;
  }
  if (!/^[0-9]$/.test(key)) return;
  if (scoreEntry.length >= 3) return;            // 100 max
  if (scoreEntry === "" && key === "0") return;  // no leading zero
  scoreEntry += key;
  renderScoreEntry();
}

function submitScore() {
  if (shots.length === 0) {
    setHint("Tap your shots onto the target first");
    return;
  }
  if (scoreEntry === "") {
    setHint("Type your total score, then press ✓");
    return;
  }

  const yours = Number(scoreEntry);
  const actual = shots.reduce((sum, s) => sum + s.value, 0);
  const diff = yours - actual;

  ui2.srYours.textContent = yours;
  ui2.srActual.textContent = actual;

  if (diff === 0) {
    ui2.srTitle.textContent = "Spot on! 🎯";
    ui2.srSub.textContent = "Your score matches the target exactly.";
  } else {
    ui2.srTitle.textContent = "Close, not exact";
    const off = Math.abs(diff);
    ui2.srSub.textContent =
      `You were ${off} point${off === 1 ? "" : "s"} ${diff > 0 ? "over" : "under"} the real score.`;
  }

  // Reveal the per-shot values now that scoring is done.
  ui2.srBreakdown.innerHTML = "";
  shots.forEach((s) => {
    const chip = document.createElement("span");
    chip.className = "chip" + (s.value === 0 ? " chip--miss" : "");
    chip.textContent = s.value === 0 ? "M" : s.value;
    ui2.srBreakdown.appendChild(chip);
  });

  showScreen("scoreResult");
}

el("scorePad").addEventListener("click", (e) => {
  const key = e.target.closest("[data-key]");
  if (key) scorePressKey(key.dataset.key);
});
