# Riflery Scoring Practice

A mobile-first web app for practicing the fast mental math behind scoring rifle
targets. Red & black, nature-themed, range-ready.

## Modes

### Mode 1 — Tally to 100
A running-addition drill:

- You start with a random number from **1–20**.
- Each turn a new random **1–20** "shot" appears to add to your running total.
- Type the sum on the on-screen **number pad** — no answer choices to recognize,
  so you actually do the math in your head. It **submits automatically** as soon
  as your entry can't be anything else; tap **✓** to confirm small answers.
  - **Correct** → flashes green and moves on quickly.
  - **Wrong** → flashes red, reveals the correct sum, then continues from the
    *correct* total.
- The round ends when you hit **exactly 100**, or when the next shot would push
  you **over 100** (you never go over).
- The results screen shows final total, accuracy, number of additions, and time
  for that round only — nothing is saved between rounds.

### Mode 2 — Score a Target
A scoring aid for the official NRA 50-ft rifle targets. You pick the target, tap
your shots, and add up the score yourself.

- Choose a target type:
  - **One-bull (TQ-1/1)** — a single bull with scoring rings **2–10**.
  - **Five-bull (TQ-1/5)** — five bulls, each scored **5–10**, two shots apiece.
- **Tap the target** to drop a shot; the app reads which ring it landed in. A shot
  **touching a ring scores the higher (inner) value**, and anything outside every
  ring is a **miss**. Tap a shot again to remove it.
- Each shot's value appears as a chip below the target.
- The **adder** helps you total them: tap **Add next** to fold one shot at a time
  into the running total, so you can add in your head and check each step. The
  scoring math stays yours — the adder just keeps the tally.

## Run it

It's plain HTML/CSS/JS — no build step. Open `index.html` in a browser, or
serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup for the home, game, results, and Mode 2 scoring screens |
| `styles.css` | Red/black/nature theme and layout |
| `app.js` | Mode 1 tally game + Mode 2 target scoring logic |
