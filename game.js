// MVP EN 36 HORAS — Platanus Hack 26
// Apila features como pisos mientras la hackathon tiembla.

const W = 800;
const H = 600;
const GY = 560; // línea de suelo en pantalla
const FH = 26; // alto de un piso
const HOUR_MS = 4200; // 1 hora de hackathon = 4.2 s
const END_H = 36;
const LIM = 110; // desplazamiento máximo de la punta antes de colapsar

// DO NOT replace existing keys — they match the physical arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u'],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

const KEYBOARD_TO_ARCADE = {};
for (const [arcadeCode, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) {
    KEYBOARD_TO_ARCADE[normalizeIncomingKey(key)] = arcadeCode;
  }
}

function normalizeIncomingKey(key) {
  if (typeof key !== 'string' || key.length === 0) return '';
  if (key === ' ') return 'space';
  return key.toLowerCase();
}

const C = {
  bg: 0x07090a,
  lime: 0xe1ff00,
  lime2: 0xa8c700,
  lime3: 0x5d6e12,
  dark: 0x12160a,
  ink: 0x0b0f03,
  white: 0xf7ffd8,
};
const FLOOR_COLS = [0xe1ff00, 0xc8e600, 0xd4ff4d, 0xb5d900];

// [nombre, ancho, peso]
const FEATS = [
  ['LOGIN', 110, 1], ['LANDING', 140, 1], ['BASE DE DATOS', 130, 1.4], ['API', 90, 1],
  ['IA', 70, 1.2], ['DARK MODE', 120, 0.8], ['PAGOS', 100, 1.2], ['CHATBOT', 100, 1],
  ['ONBOARDING', 130, 1], ['NOTIFICACIONES', 140, 0.9], ['MAPA', 90, 1], ['ANALYTICS', 120, 1.1],
];
// Scope creep: aparecen a medida que avanza la noche
const CREEP = [
  ['BLOCKCHAIN', 150, 1.8], ['NFT DEL USUARIO', 150, 1.3], ['IA QUE HACE IA', 140, 1.6],
  ['METAVERSO B2B', 160, 2], ['APP PARA PERROS', 130, 1.2], ['WEB3 SOCIAL', 140, 1.5],
  ['UBER DE EMPANADAS', 160, 1.4], ['SUPERAPP', 70, 2.2], ['TINDER DE COFOUNDERS', 160, 1.3],
  ['IA EN EL LOGIN', 80, 1.6],
];
const EVENTS = [
  'MERGE CONFLICT', 'SE CAYÓ LA API', 'WIFI CAÍDA', 'MENTOR: ¡PIVOTEEN!',
  'SE ACABÓ EL CAFÉ', 'DEPLOY A LAS 4AM', 'NPM INSTALL INFINITO',
];

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#07090a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: { create, update },
};

new Phaser.Game(config);

let sc; // escena
let S; // estado de partida
const CTL = { held: Object.create(null), pressed: Object.create(null) };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const hour = () => S.el / HOUR_MS;

function prs(code) {
  if (CTL.pressed[code]) {
    CTL.pressed[code] = false;
    return true;
  }
  return false;
}

function txt(x, y, s, size, col) {
  return sc.add.text(x, y, s, {
    fontFamily: 'monospace', fontSize: size + 'px', color: col || '#e1ff00', fontStyle: 'bold', align: 'center',
  });
}

function create() {
  sc = this;
  window.addEventListener('keydown', (e) => {
    const c = KEYBOARD_TO_ARCADE[normalizeIncomingKey(e.key)];
    if (!c) return;
    if (!CTL.held[c]) CTL.pressed[c] = true;
    CTL.held[c] = true;
  });
  window.addEventListener('keyup', (e) => {
    const c = KEYBOARD_TO_ARCADE[normalizeIncomingKey(e.key)];
    if (c) CTL.held[c] = false;
  });

  sc.gfx = sc.add.graphics();
  sc.grp = sc.add.container(0, 0);
  sc.hg = sc.add.graphics();
  sc.clock = txt(W / 2, 10, '', 18).setOrigin(0.5, 0);
  sc.big = txt(W / 2, H / 2, '', 22).setOrigin(0.5).setLineSpacing(8);
  toMenu();
}

// ---------- flujo ----------

function toMenu() {
  sc.grp.removeAll(true);
  sc.gfx.clear();
  sc.hg.clear();
  S = { ph: 'menu', P: [], el: 0, lock: 0 };
  sc.clock.setText('');
  sc.big.setText(
    'MVP EN 36 HORAS\n\n' +
      'ENTER / START1 : 1 JUGADOR\n2 / START2 : 2 JUGADORES\n\n' +
      'BOTÓN 1 : SOLTAR FEATURE\nBOTÓN 2 : REFACTOR (estabiliza)\nJOYSTICK ←→ : AJUSTAR GRÚA',
  );
}

function start(n) {
  sc.grp.removeAll(true);
  sc.big.setText('');
  S = { ph: 'play', P: [], n, el: 0, ne: 3 * HOUR_MS + 2000, lock: 0 };
  for (let i = 0; i < n; i++) S.P.push(mkPlayer(i, n));
  tone(440, 0.1, 'square', 0.08, 880);
}

function endGame(survived) {
  S.ph = 'over';
  S.lock = sc.time.now + 1200;
  for (const p of S.P) {
    if (survived && !p.dead) {
      p.score += 1000;
      msg(p, '¡LLEGASTE AL DEMO DAY!\n+1000');
    }
  }
  const lines = S.P.map(
    (p) => `${p.id}  ${String(p.score).padStart(6, '0')}  PISOS ${p.floors.length - 1}  PERFECTOS ${p.perf}`,
  );
  let head = 'FIN DE LA HACKATHON';
  if (S.n > 1) {
    const [a, b] = S.P;
    head = a.score === b.score ? 'EMPATE' : (a.score > b.score ? 'GANA P1' : 'GANA P2');
  }
  sc.big.setText(head + '\n\n' + lines.join('\n') + '\n\nSTART PARA VOLVER');
  tone(330, 0.5, 'triangle', 0.12, 660);
}

// ---------- jugador ----------

function mkPlayer(i, n) {
  const k = n > 1 ? 0.8 : 1;
  const p = {
    i, id: 'P' + (i + 1), k,
    cx: n > 1 ? 200 + 400 * i : 400,
    vw: n > 1 ? 400 : 800,
    floors: [], fall: [], cur: null, next: 0,
    s: 0, v: 0, com: 0, cam: 0, ph: Math.random() * 6, nudge: 0,
    lives: 3, score: 0, combo: 0, perf: 0, dead: false, rf: 0,
    qm: 0, qu: 0, qp: 0, shake: 0,
  };
  const x0 = p.cx - p.vw / 2;
  p.hud = txt(x0 + 12, 36, '', 15).setOrigin(0, 0).setAlign('left');
  p.msgT = txt(p.cx, 250, '', 22).setOrigin(0.5).setAlpha(0);
  p.evT = txt(p.cx, 110, '', 20, '#f7ffd8').setOrigin(0.5).setAlpha(0);
  sc.grp.add([p.hud, p.msgT, p.evT]);
  const base = { name: 'IDEA', w: 170 * k, h: FH * k, wt: 3, col: C.lime3, ox: 0, y: 0 };
  base.t = floorText(base, '#e1ff00');
  p.floors.push(base);
  return p;
}

function floorText(f, col) {
  const t = txt(0, 0, f.name, Math.round(13 * (f.h / FH)), col || '#0b0f03').setOrigin(0.5);
  t.setScale(Math.min(1, (f.w - 8) / t.width));
  sc.grp.addAt(t, 0);
  return t;
}

const topH = (p) => {
  const f = p.floors[p.floors.length - 1];
  return f.y + f.h;
};
// desplazamiento lateral por balanceo a altura y (curva cuadrática)
const bend = (p, y) => {
  const t = Math.max(topH(p), 60);
  return p.s * (y / t) * (y / t);
};

function spawnCur(p) {
  const h = hour();
  const creep = clamp((h - 8) / 20, 0, 0.7);
  const d = Math.random() < creep ? pick(CREEP) : pick(FEATS);
  const c = {
    name: d[0], w: d[1] * p.k, h: FH * p.k, wt: d[2],
    col: Math.random() < creep ? C.white : pick(FLOOR_COLS),
    x: 0, y: topH(p) + 170, vy: 0, st: 'hang',
  };
  c.t = floorText(c);
  p.cur = c;
}

function quake(p, m, dur, label) {
  if (p.dead) return;
  p.qm = Math.max(S.el < p.qu ? p.qm : 0, m);
  p.qu = S.el + dur;
  p.qp = Math.random() * 6;
  p.evT.setText('!! ' + label + ' !!').setAlpha(1).setScale(1.3);
  sc.tweens.killTweensOf(p.evT);
  sc.tweens.add({ targets: p.evT, scale: 1, duration: 200 });
  sc.tweens.add({ targets: p.evT, alpha: 0, delay: dur - 300, duration: 300 });
  tone(220, 0.35, 'sawtooth', 0.08, 110);
}

function msg(p, s, col) {
  const t = p.msgT;
  sc.tweens.killTweensOf(t);
  t.setText(s).setColor(col || '#e1ff00').setAlpha(1).setScale(1.4);
  sc.tweens.add({ targets: t, scale: 1, duration: 150 });
  sc.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 400 });
}

function upd(p, dt) {
  // piezas cayendo (fallos y colapso)
  for (let i = p.fall.length; i--; ) {
    const f = p.fall[i];
    f.vy -= 1800 * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.a += f.va * dt;
    if (f.y < p.cam - 250) {
      f.t.destroy();
      p.fall.splice(i, 1);
    }
  }
  p.shake *= Math.pow(0.02, dt);
  if (p.dead || S.ph !== 'play') return;

  const h = hour();
  const n = p.floors.length;
  const top = topH(p);
  const tf = p.floors[n - 1];

  // joystick: ajusta el centro de la grúa
  const dir = (CTL.held[p.id + '_R'] ? 1 : 0) - (CTL.held[p.id + '_L'] ? 1 : 0);
  p.nudge = clamp(p.nudge + dir * 150 * dt, -70 * p.k, 70 * p.k);

  // REFACTOR: estabiliza la torre
  if (prs(p.id + '_2')) {
    if (S.el >= p.rf) {
      p.rf = S.el + 7000;
      p.v *= 0.2;
      p.s *= 0.4;
      for (const f of p.floors) f.ox *= 0.7;
      msg(p, 'REFACTOR!', '#f7ffd8');
      tone(300, 0.25, 'triangle', 0.1, 900);
    } else tone(120, 0.08, 'square', 0.05);
  }

  // balanceo: resorte-amortiguador + desbalance + temblor
  let sw = 0;
  let sx = 0;
  for (const f of p.floors) {
    sw += f.wt;
    sx += f.wt * f.ox;
  }
  p.com = sx / sw;
  const ks = 9 / (1 + n * 0.05);
  const w0 = Math.sqrt(ks);
  let F = 0;
  if (S.el < p.qu) {
    F = p.qm * Math.sin((S.el / 1000) * w0 + p.qp);
    p.shake = Math.max(p.shake, p.qm / 25);
  }
  const a = -ks * (p.s - 2.4 * p.com) - 1.1 * p.v + F;
  p.v += a * dt;
  p.s += p.v * dt;
  if (Math.abs(p.s) > LIM * p.k) return die(p, '¡COLAPSÓ EL MVP!');

  // cámara
  p.cam += (Math.max(0, top - 230) - p.cam) * Math.min(1, dt * 4);

  // grúa y caída
  if (!p.cur && S.el >= p.next) spawnCur(p);
  const c = p.cur;
  if (!c) return;
  if (c.st === 'hang') {
    p.ph += dt * (1.4 + h * 0.05);
    c.x = tf.ox + p.nudge + Math.sin(p.ph) * (60 + h * 2.2) * p.k;
    c.y = top + 170;
    if (prs(p.id + '_1')) {
      c.st = 'drop';
      tone(520, 0.08, 'square', 0.06, 300);
    }
  } else {
    c.vy += 2400 * dt;
    c.y -= c.vy * dt;
    if (c.y <= top) land(p, c, top, tf);
  }
}

function land(p, c, top, tf) {
  const tx = tf.ox + bend(p, top);
  const dx = c.x - tx;
  if (Math.abs(dx) > ((tf.w + c.w) / 2) * 0.8) {
    // no aterriza: se cae al vacío
    p.fall.push({ ...c, a: 0, va: dx > 0 ? 3 : -3, vx: dx > 0 ? 80 : -80, vy: -c.vy * 0.3 });
    p.cur = null;
    p.combo = 0;
    p.lives--;
    p.shake = 8;
    msg(p, '¡NO COMPILA!\n-1 CAFÉ', '#f7ffd8');
    tone(200, 0.3, 'sawtooth', 0.1, 60);
    if (p.lives <= 0) return die(p, '¡SIN CAFÉ!');
    p.next = S.el + 450;
    return;
  }
  const perf = Math.abs(dx) <= 5 * p.k;
  const f = { name: c.name, w: c.w, h: c.h, wt: c.wt, col: c.col, t: c.t, y: top };
  f.ox = perf ? tf.ox : c.x - bend(p, top);
  p.floors.push(f);
  p.v += dx * 0.8;
  p.combo = perf ? p.combo + 1 : 0;
  const pts = 100 * (1 + Math.min(p.combo, 4)) + (perf ? 50 : 0);
  p.score += pts;
  p.shake = Math.max(p.shake, 3);
  if (perf) {
    p.perf++;
    msg(p, `¡PERFECTO! x${1 + Math.min(p.combo, 4)}\n+${pts}`);
    tone(660 + p.combo * 110, 0.15, 'square', 0.08, 1320 + p.combo * 220);
    if (S.n > 1) quake(S.P[1 - p.i], 70, 1800, 'TU RIVAL SHIPPEÓ');
  } else {
    msg(p, '+' + pts, '#f7ffd8');
    tone(180, 0.1, 'triangle', 0.15, 90);
  }
  p.cur = null;
  p.next = S.el + 250;
}

function die(p, reason) {
  p.dead = true;
  p.shake = 22;
  msg(p, reason, '#f7ffd8');
  tone(150, 0.8, 'sawtooth', 0.15, 40);
  if (p.cur) p.floors.push({ ...p.cur, ox: p.cur.x, y: topH(p) });
  p.cur = null;
  const dir = Math.sign(p.s) || 1;
  for (let i = p.floors.length - 1; i > 0; i--) {
    const f = p.floors[i];
    p.fall.push({
      ...f, x: f.ox + bend(p, f.y), a: 0,
      va: dir * rnd(1, 4), vx: dir * rnd(40, 200) * (f.y / 200), vy: rnd(0, 200),
    });
  }
  p.floors.length = 1;
}

// ---------- loop ----------

function update(time, delta) {
  const dt = Math.min(delta, 50) / 1000;
  if (S.ph === 'menu') {
    if (prs('START1')) start(1);
    else if (prs('START2')) start(2);
  } else {
    if (S.ph === 'play') {
      S.el += dt * 1000;
      const h = hour();
      if (h >= 3 && S.el >= S.ne) {
        const ev = pick(EVENTS);
        for (const p of S.P) quake(p, 45 + h * 4, 2600, ev);
        S.ne = S.el + rnd(7000, 12000) - h * 80;
      }
    }
    for (const p of S.P) upd(p, dt);
    if (S.ph === 'play') {
      if (S.P.every((p) => p.dead)) endGame(false);
      else if (hour() >= END_H) endGame(true);
    } else if (time > S.lock && (prs('START1') || prs('START2'))) toMenu();
    hud();
    draw();
  }
  for (const k in CTL.pressed) CTL.pressed[k] = false;
}

function hud() {
  const h = Math.min(hour(), END_H);
  const hh = String(Math.floor(h)).padStart(2, '0');
  const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
  sc.clock.setText(`HORA ${hh}:${mm} / 36:00`);
  for (const p of S.P) {
    p.hud.setText(
      `${p.id} ${String(p.score).padStart(6, '0')}\n` +
        `CAFÉ ${'■'.repeat(Math.max(0, p.lives))}${'□'.repeat(3 - Math.max(0, p.lives))}\n` +
        `PISOS ${p.floors.length - 1}` + (p.combo > 1 ? `  COMBO x${1 + Math.min(p.combo, 4)}` : ''),
    );
  }
}

function slab(g, x, y, w, h, a, col) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => ({
    x: x + u * c - v * s,
    y: y + u * s + v * c,
  }));
  g.fillStyle(col, 1);
  g.fillPoints(pts, true);
  g.lineStyle(2, C.ink, 1);
  g.strokePoints(pts, true);
}

function draw() {
  const g = sc.gfx;
  g.clear();
  sc.hg.clear();
  for (const p of S.P) drawP(p, g);
  if (S.n > 1) {
    g.fillStyle(C.lime, 0.7);
    g.fillRect(W / 2 - 2, 0, 4, H);
  }
}

function drawP(p, g) {
  const sh = p.shake;
  const ox = p.cx + (Math.random() - 0.5) * sh;
  const oy = (Math.random() - 0.5) * sh;
  const x0 = p.cx - p.vw / 2;
  const SY = (y) => GY - (y - p.cam) + oy;
  const top = topH(p);

  // rejilla de fondo (sube con la cámara)
  g.lineStyle(1, C.lime, 0.07);
  for (let y = Math.floor(p.cam / 40) * 40; SY(y) > -40; y += 40) g.lineBetween(x0, SY(y), x0 + p.vw, SY(y));
  // suelo
  g.fillStyle(C.dark, 1);
  g.fillRect(x0, SY(0), p.vw, H);
  g.fillStyle(C.lime, 0.5);
  g.fillRect(x0, SY(0), p.vw, 2);

  for (const f of p.floors) {
    const ym = f.y + f.h / 2;
    const x = ox + f.ox + bend(p, ym);
    const y = SY(ym);
    const a = Math.atan((2 * p.s * ym) / (top * top));
    slab(g, x, y, f.w, f.h, a, f.col);
    f.t.setPosition(x, y).setRotation(a);
  }

  const c = p.cur;
  if (c) {
    const x = ox + c.x;
    const y = SY(c.y + c.h / 2);
    if (c.st === 'hang') {
      g.lineStyle(2, C.lime2, 0.8);
      g.lineBetween(x, 0, x, y - c.h / 2);
    }
    slab(g, x, y, c.w, c.h, 0, c.col);
    c.t.setPosition(x, y).setRotation(0);
  }

  for (const f of p.fall) {
    const x = ox + f.x;
    const y = SY(f.y + f.h / 2);
    slab(g, x, y, f.w, f.h, f.a, f.col);
    f.t.setPosition(x, y).setRotation(f.a);
  }

  // barra de REFACTOR
  const r = clamp(1 - (p.rf - S.el) / 7000, 0, 1);
  sc.hg.fillStyle(C.lime3, 1);
  sc.hg.fillRect(x0 + 12, 100, 90, 6);
  sc.hg.fillStyle(r >= 1 ? C.lime : C.lime2, 1);
  sc.hg.fillRect(x0 + 12, 100, 90 * r, 6);
}

// ---------- sonido ----------

function tone(f, d, type, v, f2) {
  try {
    const x = sc.sound.context;
    const o = x.createOscillator();
    const g = x.createGain();
    const t = x.currentTime;
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(x.destination);
    o.start(t);
    o.stop(t + d);
  } catch (e) {}
}
