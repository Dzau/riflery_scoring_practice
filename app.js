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
