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
Score a real NRA 50-ft target yourself, then check your work. Uses photos of the
actual targets we shoot.

- Choose a target type:
  - **One-bull (TQ-1/1)** — a single bull with scoring rings **2–10**.
  - **Five-bull (TQ-1/5)** — five bulls, each scored **5–10**.
- **Tap up to 10 shots** onto the target photo. A marker drops where you tap, but
  **the app never shows you what each shot scored** — you read the ring yourself.
  Tap a shot again to remove it. The five-bull target allows **two shots per bull**.
- **Tally your reads** like Mode 1: type each shot's value and press **+** to add
  it to the running score shown above; repeat for every shot. The app scores the
  round in the background — a shot **touching a ring takes the higher (inner)
  value** (calls favour the shooter), and anything outside every ring is a **miss**.
- Press **Done** to finish. The app reveals the **actual score**, tells you how
  far off you were, and shows the **shot-by-shot** breakdown so you can see where
  your reads differed.

Target geometry is calibrated to the cropped photos in `assets/`, so taps are
scored against the real ring positions.

### Mode 3 — Camera Score (beta)
Snap a photo of a real target and let the app score it.

- Pick the target type and **take or choose a photo**.
- The app finds the bull(s) in the photo, fits the known ring geometry to them,
  and looks for bullet holes automatically, then shows each shot's value and the
  total.
- Detection is best-effort — **tap the photo to add or remove a shot** and the
  score updates live. (Hole detection still needs real shot-up target photos to
  tune; geometry fitting and tap-to-score are solid.)

All detection runs on-device in plain JavaScript (no server, no upload).

## Installable (PWA)
The app ships with a web manifest, icons, and an offline service worker, so it
can be **installed to a phone home screen** and run full-screen offline. This is
also the foundation for packaging it for the App Store / Google Play (e.g. via
Capacitor).

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
| `index.html` | Markup for the home, game, results, scoring, and camera screens |
| `styles.css` | Red/black/nature theme and layout |
| `app.js` | Mode 1 tally game + Mode 2 target scoring logic |
| `camera.js` | Mode 3 camera capture, target/hole detection, and scoring |
| `manifest.webmanifest`, `sw.js` | PWA manifest and offline service worker |
| `assets/` | Cropped target photos and app icons |
