"use strict";

/* ===========================================================
   Riflery Scoring Practice — Mode 1: Tally to 100
   -----------------------------------------------------------
   Start with a random 1-20. Each turn a new random 1-20 shot
   appears to add to the running total. Pick the correct sum
   from four close options. The round ends when you reach
   exactly 100, or when the next shot would push you over 100.
   =========================================================== */

const FINISH = 100;
const MIN_SHOT = 1;
const MAX_SHOT = 20;
const CORRECT_DELAY = 380;   // ms pause after a right answer
const WRONG_DELAY = 850;     // ms pause after a wrong answer

const el = (id) => document.getElementById(id);

const screens = {
  home: el("home"),
  game: el("game"),
  results: el("results"),
};

const ui = {
  progressFill: el("progressFill"),
  progressNow: el("progressNow"),
  runningTotal: el("runningTotal"),
  addValue: el("addValue"),
  options: el("options"),
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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* Build four answer choices clustered within +/-3 of the correct sum. */
function makeOptions(correct) {
  const opts = new Set([correct]);
  const deltas = shuffle([-3, -2, -1, 1, 2, 3]);
  for (const d of deltas) {
    if (opts.size >= 4) break;
    const v = correct + d;
    if (v >= 1) opts.add(v);
  }
  let pad = 4;
  while (opts.size < 4) opts.add(correct + pad++);
  return shuffle([...opts]);
}

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
  ui.addValue.textContent = "+" + shot;
  renderOptions(makeOptions(state.correctAnswer));
  setFeedback("");
}

function renderBoard() {
  ui.runningTotal.textContent = state.total;
  ui.progressNow.textContent = state.total;
  ui.progressFill.style.width = Math.min(100, (state.total / FINISH) * 100) + "%";
}

function renderOptions(values) {
  ui.options.innerHTML = "";
  for (const v of values) {
    const btn = document.createElement("button");
    btn.className = "opt";
    btn.type = "button";
    btn.textContent = v;
    btn.dataset.value = v;
    btn.addEventListener("click", () => onAnswer(v, btn));
    ui.options.appendChild(btn);
  }
}

function onAnswer(value, btn) {
  if (locked) return;
  locked = true;
  state.steps += 1;
  state.answered += 1;

  const correct = state.correctAnswer;
  const buttons = [...ui.options.querySelectorAll(".opt")];
  buttons.forEach((b) => {
    if (Number(b.dataset.value) !== value && Number(b.dataset.value) !== correct) {
      b.classList.add("is-dim");
    }
  });

  if (value === correct) {
    state.correct += 1;
    btn.classList.add("is-correct");
    setFeedback("Hit", "is-good");
    advance(correct, CORRECT_DELAY);
  } else {
    btn.classList.add("is-wrong");
    const right = buttons.find((b) => Number(b.dataset.value) === correct);
    if (right) right.classList.add("is-correct");
    setFeedback(`${correct} was the mark`, "is-bad");
    advance(correct, WRONG_DELAY);
  }
}

/* Always continue from the correct sum, then move on. */
function advance(correctTotal, delay) {
  setTimeout(() => {
    state.total = correctTotal;
    renderBoard();
    locked = false;
    nextTurn();
  }, delay);
}

function setFeedback(text, cls) {
  ui.feedback.textContent = text || " ";
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
});
