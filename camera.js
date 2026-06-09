"use strict";

/* ===========================================================
   Mode 3 — Camera Score (beta, fully automatic)
   -----------------------------------------------------------
   Take a photo of a real 50-ft target. The app:
     1. finds the bull(s) in the photo (dark blobs) and fits the
        known ring geometry to them,
     2. looks for bullet holes (dark marks on the paper, light
        punches inside the black bull),
     3. scores each hole — touching a ring takes the higher value,
        outside every ring is a miss — and shows the total.
   Detection is best-effort; tap the photo to add or remove a
   hole and the score updates live.
   =========================================================== */

const cam = {
  key: "single",
  workW: 0,
  workH: 0,
  map: null,        // image-px -> normalized (0-100) similarity transform
  invScale: 1,      // px per normalized unit
  holes: [],        // [{ x, y }] in work-image pixels
  bullMarks: [],    // detected bull centres (work px) for the overlay
};

const cui = {
  stage: () => el("camStage"),
  status: () => el("camStatus"),
  score: () => el("camScore"),
  file: () => el("camFile"),
  retake: () => el("camRetake"),
};

function camStart() {
  cam.holes = [];
  cam.map = null;
  resetCamStage();
  setCamStatus("Pick the target type, then take or choose a photo.");
  cui.score().textContent = "—";
  cui.retake().hidden = true;
  showScreen("camera");
}

function camPick(key) {
  cam.key = key;
  document.querySelector('[data-action="cam-pick-single"]').classList.toggle("seg--on", key === "single");
  document.querySelector('[data-action="cam-pick-five"]').classList.toggle("seg--on", key === "five");
}

async function camCapture() {
  // In the native (Capacitor) app, use the Camera plugin for proper
  // camera/library access. On the web, fall back to the file input.
  const Cap = window.Capacitor;
  if (Cap && Cap.isNativePlatform && Cap.isNativePlatform() && Cap.Plugins && Cap.Plugins.Camera) {
    try {
      const photo = await Cap.Plugins.Camera.getPhoto({
        quality: 90,
        resultType: "dataUrl",
        source: "PROMPT",
      });
      if (photo && photo.dataUrl) {
        const img = new Image();
        img.onload = () => analyzePhoto(img);
        img.onerror = () => setCamStatus("Couldn't read that image — try another.");
        img.src = photo.dataUrl;
      }
    } catch (_) {
      /* user cancelled */
    }
    return;
  }
  cui.file().value = "";
  cui.file().click();
}

function camRetake() {
  camCapture();
}

function resetCamStage() {
  const stage = cui.stage();
  stage.innerHTML = '<span class="cam-stage__hint">No photo yet</span>';
  stage.className = "cam-stage cam-stage--empty";
  stage.style.removeProperty("aspect-ratio");
}

el("camFile").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) loadCamPhoto(file);
});

function loadCamPhoto(file) {
  setCamStatus("Reading photo…");
  const img = new Image();
  img.onload = () => analyzePhoto(img);   // keep the object URL alive for display
  img.onerror = () => setCamStatus("Couldn't read that image — try another.");
  img.src = URL.createObjectURL(file);
}

/* ---------- pixel helpers ---------- */
function toWorkCanvas(img, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

function grayscale(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const g = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    g[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return g;
}

function otsu(gray) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, max = 0, thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) { max = between; thr = t; }
  }
  return thr;
}

// Connected components over a binary mask. Returns blob stats.
function components(mask, w, h, minArea) {
  const labels = new Int32Array(w * h);
  const blobs = [];
  const stack = [];
  let next = 1;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    next++;
    stack.length = 0;
    stack.push(start);
    labels[start] = next;
    let area = 0, sx = 0, sy = 0;
    let minx = w, maxx = 0, miny = h, maxy = 0;
    while (stack.length) {
      const p = stack.pop();
      const px = p % w, py = (p / w) | 0;
      area++; sx += px; sy += py;
      if (px < minx) minx = px; if (px > maxx) maxx = px;
      if (py < miny) miny = py; if (py > maxy) maxy = py;
      if (px > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = next; stack.push(p - 1); }
      if (px < w - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = next; stack.push(p + 1); }
      if (py > 0 && mask[p - w] && !labels[p - w]) { labels[p - w] = next; stack.push(p - w); }
      if (py < h - 1 && mask[p + w] && !labels[p + w]) { labels[p + w] = next; stack.push(p + w); }
    }
    if (area < minArea) continue;
    const bw = maxx - minx + 1, bh = maxy - miny + 1;
    blobs.push({
      area, cx: sx / area, cy: sy / area, bw, bh,
      fill: area / (bw * bh),            // ~0.785 for a disc
      aspect: Math.min(bw, bh) / Math.max(bw, bh),
      r: Math.sqrt(area / Math.PI),
    });
  }
  return blobs;
}

/* ---------- similarity fit: image px -> normalized 0-100 ---------- */
function fitSimilarity(src, dst) {
  const n = src.length;
  let mx = 0, my = 0, MX = 0, MY = 0;
  for (let i = 0; i < n; i++) { mx += src[i].x; my += src[i].y; MX += dst[i].x; MY += dst[i].y; }
  mx /= n; my /= n; MX /= n; MY /= n;
  let sxx = 0, sxy = 0, denom = 0;
  for (let i = 0; i < n; i++) {
    const x = src[i].x - mx, y = src[i].y - my;
    const X = dst[i].x - MX, Y = dst[i].y - MY;
    sxx += x * X + y * Y;
    sxy += x * Y - y * X;
    denom += x * x + y * y;
  }
  const a = sxx / denom, b = sxy / denom;
  return { a, b, tx: MX - (a * mx - b * my), ty: MY - (b * mx + a * my) };
}

function mapPt(m, x, y) {
  return { nx: m.a * x - m.b * y + m.tx, ny: m.b * x + m.a * y + m.ty };
}

/* ---------- scoring (mirrors Mode 2) ---------- */
function scoreNorm(def, nx, ny) {
  let b = def.bulls[0], bd = Infinity;
  for (const bb of def.bulls) {
    const d = Math.hypot(nx - bb.cx, ny - bb.cy);
    if (d < bd) { bd = d; b = bb; }
  }
  const edge = Math.hypot(nx - b.cx, ny - b.cy) - def.holeR;
  for (const ring of def.rings) if (edge <= ring.r) return ring.v;
  return 0;
}

/* ---------- the pipeline ---------- */
function analyzePhoto(img) {
  setCamStatus("Finding the target…");

  // High-res pass for display + hole detection.
  const work = toWorkCanvas(img, 900);
  const w = work.width, h = work.height;
  const gray = grayscale(work.getContext("2d"), w, h);
  const thr = otsu(gray);

  cam.workW = w; cam.workH = h;
  cam.holes = [];
  cam.bullMarks = [];

  // Low-res pass for geometry: downscaling blurs away the thin white ring
  // lines so each bull reads as one solid dark disc.
  const small = toWorkCanvas(img, 380);
  const sw = small.width, sh = small.height;
  const sg = grayscale(small.getContext("2d"), sw, sh);
  const sthr = otsu(sg);
  const smask = new Uint8Array(sw * sh);
  for (let i = 0; i < sg.length; i++) smask[i] = sg[i] < sthr ? 1 : 0;
  const sblobs = components(smask, sw, sh, sw * sh * 0.004);

  const def = TARGETS[cam.key];
  const fitS = (cam.key === "five") ? fitFiveBull(sblobs) : fitOneBull(sblobs);

  if (!fitS) {
    showCamPhoto(img, w, h);
    setCamStatus("Couldn't find the target rings. Make sure the whole target is in frame, then retake.");
    cui.retake().hidden = false;
    cui.score().textContent = "—";
    return;
  }

  // Convert the small-space fit into work-space coordinates.
  const k = sw / w;  // small px per work px
  const fit = {
    map: { a: fitS.map.a * k, b: fitS.map.b * k, tx: fitS.map.tx, ty: fitS.map.ty },
    bullRpx: fitS.bullRpx / k,
  };
  cam.map = fit.map;
  cam.bullRpx = fit.bullRpx;
  cam.bullMarks = fitS.bullMarks.map((p) => ({ x: p.x / k, y: p.y / k }));

  // Auto-detect holes (best-effort).
  cam.holes = detectHoles(gray, w, h, thr, def, fit);

  showCamPhoto(img, w, h);
  renderCam();
  setCamStatus(
    `Found ${cam.holes.length} shot${cam.holes.length === 1 ? "" : "s"}. ` +
    `Tap the photo to add or remove one. (Beta — check the marks.)`
  );
  cui.retake().hidden = false;
}

function fitFiveBull(blobs) {
  // Pick the 5 most disc-like blobs as the bulls.
  const cand = blobs
    .filter((b) => b.aspect > 0.7 && b.fill > 0.45)
    .sort((p, q) => q.area - p.area)
    .slice(0, 5);
  if (cand.length < 5) return null;

  const mx = cand.reduce((s, b) => s + b.cx, 0) / 5;
  const my = cand.reduce((s, b) => s + b.cy, 0) / 5;
  // centre bull = nearest to the cluster centroid; corners by quadrant.
  let centre = cand[0], cd = Infinity;
  for (const b of cand) { const d = Math.hypot(b.cx - mx, b.cy - my); if (d < cd) { cd = d; centre = b; } }
  const corners = cand.filter((b) => b !== centre);
  const pick = (sx, sy) => corners.find((b) => Math.sign(b.cx - mx) === sx && Math.sign(b.cy - my) === sy);
  const tl = pick(-1, -1), tr = pick(1, -1), bl = pick(-1, 1), br = pick(1, 1);
  if (!tl || !tr || !bl || !br) return null;

  const def = TARGETS.five;
  const src = [tl, tr, centre, bl, br].map((b) => ({ x: b.cx, y: b.cy }));
  const dst = def.bulls.map((b) => ({ x: b.cx, y: b.cy }));
  const map = fitSimilarity(src, dst);
  const bullRpx = cand.reduce((s, b) => s + b.r, 0) / 5;
  return { map, bullMarks: src, bullRpx };
}

function fitOneBull(blobs) {
  // The black bull is the big disc nearest the photo centre.
  const cand = blobs.filter((b) => b.aspect > 0.7 && b.fill > 0.45).sort((p, q) => q.area - p.area);
  if (!cand.length) return null;
  const bull = cand[0];
  const def = TARGETS.single;
  const bullRpx = bull.r;                  // black bull edge = ring-5 radius (11.7)
  const s = def.rings[5].r / bullRpx;      // normalized units per pixel
  const map = { a: s, b: 0, tx: 50 - s * bull.cx, ty: 50 - s * bull.cy };
  return { map, bullMarks: [{ x: bull.cx, y: bull.cy }], bullRpx };
}

// Holes: dark specks on the paper + light punches inside the black bull.
function detectHoles(gray, w, h, thr, def, fit) {
  const holes = [];
  const rpx = fit.bullRpx;
  const holeR = rpx * 0.16;                 // expected hole radius in px
  const holeArea = Math.PI * holeR * holeR;
  const minA = holeArea * 0.25, maxA = holeArea * 4;

  // Bull footprints in work px (for include/exclude tests).
  const bullsPx = def.bulls.map((bn) => {
    // invert the map to place each normalized bull centre back in the photo
    const det = fit.map.a * fit.map.a + fit.map.b * fit.map.b;
    const ai = fit.map.a / det, bi = -fit.map.b / det;
    const dx = bn.cx - fit.map.tx, dy = bn.cy - fit.map.ty;
    return { x: ai * dx - bi * dy, y: bi * dx + ai * dy };
  });
  const inAnyBull = (x, y, k) => bullsPx.some((b) => Math.hypot(x - b.x, y - b.y) <= rpx * k);

  // (a) dark holes on the paper (outside the black bull)
  const darkMask = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) darkMask[i] = gray[i] < thr ? 1 : 0;
  for (const b of components(darkMask, w, h, minA)) {
    if (b.area > maxA) continue;
    if (b.aspect < 0.6 || b.fill < 0.5) continue;   // discs only — skip rings, text, slivers
    if (inAnyBull(b.cx, b.cy, 1.05)) continue;      // bull holes handled below
    const { nx, ny } = mapPt(fit.map, b.cx, b.cy);
    if (Math.hypot(nx - 50, ny - 50) > 55) continue; // off-target clutter
    holes.push({ x: b.cx, y: b.cy });
  }

  // (b) light punches inside the black bull
  const brightThr = Math.min(220, thr + 80);
  const brightMask = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    const px = i % w, py = (i / w) | 0;
    brightMask[i] = (gray[i] > brightThr && inAnyBull(px, py, 1.0)) ? 1 : 0;
  }
  for (const b of components(brightMask, w, h, minA * 0.6)) {
    if (b.area > maxA) continue;
    if (b.aspect < 0.6 || b.fill < 0.5) continue;   // filled discs only — skip white ring lines
    holes.push({ x: b.cx, y: b.cy });
  }
  return holes;
}

/* ---------- rendering ---------- */
function showCamPhoto(img, w, h) {
  const stage = cui.stage();
  stage.className = "cam-stage";
  stage.style.aspectRatio = `${w} / ${h}`;
  stage.innerHTML = "";
  const el2 = document.createElement("img");
  el2.className = "cam-photo";
  el2.src = img.src;
  stage.appendChild(el2);
  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: "none", class: "cam-overlay" });
  svg.addEventListener("click", onCamTap);
  stage.appendChild(svg);
}

function renderCam() {
  const svg = cui.stage().querySelector(".cam-overlay");
  if (!svg) return;
  svg.innerHTML = "";
  const def = TARGETS[cam.key];
  const m = cam.map;
  const det = m.a * m.a + m.b * m.b;
  const s = Math.sqrt(det);          // normalized units per px
  const ai = m.a / det, bi = -m.b / det;
  const invMap = (nx, ny) => {       // normalized -> work px
    const dx = nx - m.tx, dy = ny - m.ty;
    return { x: ai * dx - bi * dy, y: bi * dx + ai * dy };
  };

  // Fitted rings (thin, just the outer ring of each bull + the 10-ring).
  for (const bn of def.bulls) {
    const c = invMap(bn.cx, bn.cy);
    for (const ring of [def.rings[0], def.rings[def.rings.length - 1]]) {
      svg.appendChild(svgEl("circle", { cx: c.x, cy: c.y, r: ring.r / s, class: "cam-ring" }));
    }
  }

  // Holes + per-shot value labels (here values ARE shown — this mode is the scorer).
  let total = 0;
  const rpx = (cam.bullRpx || 20) * 0.18;
  for (const hole of cam.holes) {
    const { nx, ny } = mapPt(m, hole.x, hole.y);
    const v = scoreNorm(def, nx, ny);
    total += v;
    svg.appendChild(svgEl("circle", { cx: hole.x, cy: hole.y, r: rpx, class: "cam-hole" }));
    const t = svgEl("text", { x: hole.x, y: hole.y - rpx * 1.3, class: "cam-hole__val", "text-anchor": "middle" });
    t.textContent = v === 0 ? "M" : v;
    svg.appendChild(t);
  }
  cui.score().textContent = total;
}

function onCamTap(e) {
  const svg = e.currentTarget;
  const rect = svg.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * cam.workW;
  const y = ((e.clientY - rect.top) / rect.height) * cam.workH;
  const hitR = (cam.bullRpx || 20) * 0.3;
  const idx = cam.holes.findIndex((s) => Math.hypot(s.x - x, s.y - y) <= hitR);
  if (idx !== -1) cam.holes.splice(idx, 1);
  else cam.holes.push({ x, y });
  renderCam();
  setCamStatus(`${cam.holes.length} shot${cam.holes.length === 1 ? "" : "s"} · tap a mark to remove, empty space to add.`);
}

function setCamStatus(text) { cui.status().textContent = text; }
