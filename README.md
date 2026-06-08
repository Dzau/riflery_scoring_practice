# Riflery Scoring Practice

A mobile-first web app for practicing the fast mental math behind scoring rifle
targets. Red & black, nature-themed, range-ready.

## Modes

### Mode 1 — Tally to 100
A running-addition drill:

- You start with a random number from **1–20**.
- Each turn a new random **1–20** "shot" appears to add to your running total.
- Type the sum on the on-screen **number pad** and submit — no answer choices to
  recognize, so you actually do the math in your head.
  - **Correct** → flashes green and moves on quickly.
  - **Wrong** → flashes red, reveals the correct sum, then continues from the
    *correct* total.
- The round ends when you hit **exactly 100**, or when the next shot would push
  you **over 100** (you never go over).
- The results screen shows final total, accuracy, number of additions, and time
  for that round only — nothing is saved between rounds.

### Mode 2 — Coming soon
A target-reading challenge built around the official NRA 50-ft rifle targets.
*(Specification pending.)*

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
| `index.html` | Markup for the home, game, and results screens |
| `styles.css` | Red/black/nature theme and layout |
| `app.js` | Mode 1 game logic |
