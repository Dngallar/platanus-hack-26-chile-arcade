// MVP EN 36 HORAS — Platanus Hack 26
// Apila features como pisos mientras la hackathon tiembla.

const W = 800;
const H = 600;
const GY = 560; // línea de suelo en pantalla
const FH = 26; // alto de un piso
const HOUR_MS = 4200; // 1 hora de hackathon = 4.2 s
const END_H = 36;
const LIM = 110; // desplazamiento máximo de la punta antes de colapsar
const SUPPORT = 0.35; // fracción mínima del ancho que debe apoyarse al aterrizar
const BEND_R = 300; // radio de curvatura: ángulo a altura y = s·y/R² (torres bajas casi no se curvan)
const EASY_H = 4; // primeras horas: sin temblores y grúa lenta
const ROPE_Y = 196; // riel de la grúa (bajo el HUD y los mensajes)
const HANG = 150; // altura del piso colgando sobre el tope
const RISK_M = 0.4; // margen Jenga bajo el cual se avisa (tinte rojo + vibración + crujido)
const RISK_COL = 0xff4a1c;
const MIN_FONT = 11; // tamaño mínimo del nombre de un piso
const TX = 545; // columna de texto del título (la torre demo va a la izquierda)

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

// ===== TODOS LOS TEXTOS DEL JUEGO (editar aquí) =====
const TXT = {
  // Piso perfecto: un grupo por nivel de combo (x1 .. x5)
  perf: [
    ['¡MERGEADO SIN CONFLICTOS!', '¡PASA TODOS LOS TESTS!', '¡CLEAN CODE!'],
    ['¡DEPLOY EN VERDE!', '¡LGTM, SHIP IT!', '¡LA RAJA!'],
    ['¡PRODUCT-MARKET FIT!', '¡PULENTO!', '¡CERO WARNINGS!'],
    ['¡10X ENGINEER!', '¡LOS JUECES TOMAN NOTA!', '¡BACÁN, COMPADRE!'],
    ['¡ESTO ES UNICORNIO!', '¡IPO EN 36 HORAS!', '¡TE LLAMA SILICON VALLEY!'],
  ],
  // Casi perfecto (a pocos píxeles)
  casi: ['¡CASI PERFECTO!', 'LE FALTÓ UN PIXEL', 'LGTM (CASI)', '¡ESO, ESO, ESO!'],
  // Aterrizó apenas apoyado
  pelo: ['¡POR UN PELO!', 'COLGANDO DE UN HILO', 'FUNCIONA EN MI MÁQUINA', '¡AGÁRRATE, CATALINA!'],
  // Piso normal
  normal: [
    'SHIPPEADO', 'OTRA FEATURE MÁS', 'MERGEADO A LA RÁPIDA', 'SIN CODE REVIEW',
    'EN LOCALHOST SE VE BIEN', 'COMMIT: "fix"', 'DALE NOMÁS', 'YA, SIRVE',
  ],
  // El piso no se apoya y se cae
  cae: [
    '¡NO COMPILA!', 'ESO ERA DEUDA TÉCNICA', '404: FEATURE NOT FOUND', '¡CHUTA!',
    'SE FUE A PRODUCCIÓN... Y AL SUELO', 'ROLLBACK', '¡QUÉ FOME!',
  ],
  // Derrumbe parcial (regla Jenga)
  derr: [
    '¡SE DERRUMBÓ EL BACKEND!', 'GIT RESET --HARD', 'LA DEUDA TÉCNICA COBRA INTERESES',
    '¡QUEDÓ LA ESCOBA!', 'ESTO NO ESCALA', 'REFACTORIZAR ERA OPCIONAL, DIJERON',
  ],
  // Fin de partida
  over: ['¡COLAPSÓ EL MVP!', 'EL MVP SE FUE A NEGRO', 'PIVOTEANDO A CONSULTORA...'],
  nocafe: ['¡SIN CAFÉ!', 'SE ACABÓ EL CAFÉ... Y LAS GANAS'],
  demo: '¡LLEGÓ AL DEMO DAY!',
  warn: '¡CRUJE LA TORRE!\nUSA REFACTOR',
  // Pantalla de título
  sub: 'PLATANUS HACK 26 · SANTIAGO',
  tag: 'apila features · sobrevive a la hackathon · llega al demo day',
  go: '¡A HACKEAR!',
  // Paneles que rotan en el attract mode
  panels: [
    'CÓMO JUGAR\n\nBOTÓN 1 o ↓ : SOLTAR FEATURE\n← → : AJUSTAR LA GRÚA\nBOTÓN 2 : REFACTOR (estabiliza)\n\nPISO PERFECTO = COMBO\nNO TE QUEDES SIN CAFÉ',
    'LA HACKATHON\n\n36 HORAS PARA APILAR TU MVP\nMERGE CONFLICTS, MENTORES Y WIFI CAÍDA\nLO SACUDEN TODO\nSI LA TORRE SE PONE ROJA... ¡REFACTOR!',
    'SCOPE CREEP\n\nBLOCKCHAIN · IA QUE HACE IA\nUBER DE EMPANADAS · METAVERSO B2B\nTINDER DE COFOUNDERS\n\nNADIE PIDIÓ ESTO. APÍLALO IGUAL.',
    '2 JUGADORES\n\nPANTALLA DIVIDIDA\nCADA PISO PERFECTO LE MANDA\nUN TEMBLOR A TU RIVAL\n\nPRESIONA START2',
  ],
  // Eventos (temblores): [titular, subtítulo estilo Slack]
  ev: [
    ['MERGE CONFLICT', '#dev — "¿quién pusheó directo a main?"'],
    ['SE CAYÓ LA API', '#general — "¿alguien tiene otra API key?"'],
    ['WIFI CAÍDA', '#random — "¿alguien comparte datos?"'],
    ['PASÓ EL MENTOR', '#general — el mentor: "¿y si lo hacen B2B?"'],
    ['¡PIVOTEEN!', '#anuncios — "ahora es una app de citas para mascotas"'],
    ['SE ACABARON LAS SOPAIPILLAS', '#random — "quedan puros sobres de té"'],
    ['NPM INSTALL', '#dev — "lleva 40 minutos... y sigue"'],
    ['DEPLOY A LAS 4AM', '#dev — "un deploy chiquitito nomás"'],
    ['CORTE DE LUZ', '#general — "¿alguien guardó?"'],
    ['TEMBLOR DE VERDAD', '#random — "tranqui, fue un 5,8 nomás"'],
  ],
  // Temblor enviado por el rival (2P)
  rival: [
    ['TU RIVAL SHIPPEÓ', '#general — "¿vieron el demo del equipo de al lado?"'],
    ['EL OTRO EQUIPO TIENE TRACCIÓN', '#random — "dicen que ya tienen 3 usuarios"'],
    ['TU RIVAL LEVANTÓ RONDA', '#general — "pre-seed de 2 empanadas"'],
  ],
  // Ambiente según la hora: [hora, comentario]
  amb: [
    [1, 'alguien ya está pidiendo pizza'],
    [3, '3 AM: alguien pidió otra pizza'],
    [6, 'amanece. nadie ha dormido'],
    [9, 'llegó el desayuno: puras sopaipillas'],
    [12, 'mediodía: "¿y si le agregamos IA?"'],
    [16, 'alguien se durmió en un puff'],
    [20, 'el café ya sabe a tierra'],
    [24, '24 horas y el repo tiene 3 commits'],
    [27, '3 AM otra vez. queda pura fe'],
    [30, 'los jueces ya llegaron'],
    [33, 'alguien ensaya el pitch en el baño'],
    [35, '"¿quién hizo las slides?" ... silencio'],
  ],
};

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
const LAST = {}; // último texto mostrado por categoría (para no repetir)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// mezcla lineal de dos colores 0xRRGGBB
const mix = (a, b, t) => {
  let r = 0;
  for (const s of [16, 8, 0]) r |= Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t) << s;
  return r;
};
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const hour = () => S.el / HOUR_MS;

// elige un texto al azar sin repetir el anterior de la misma categoría
function say(arr, key) {
  let s;
  do s = pick(arr);
  while (arr.length > 1 && s === LAST[key]);
  LAST[key] = s;
  return s;
}

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

  // capas: escombros (atrás) < torre < textos de pisos < HUD < game over
  sc.bgfx = sc.add.graphics();
  sc.bgrp = sc.add.container(0, 0);
  sc.gfx = sc.add.graphics();
  sc.grp = sc.add.container(0, 0);
  sc.hg = sc.add.graphics();
  sc.clock = txt(W / 2, 8, '', 18).setOrigin(0.5, 0);
  // comentario de ambiente: banda con fondo semitransparente, encima de la torre
  sc.tickBg = sc.add.rectangle(W / 2, H - 22, 10, 26, C.bg, 0.85).setStrokeStyle(1, C.lime3).setAlpha(0);
  sc.tick = txt(W / 2, H - 22, '', 14, '#e1ff00').setOrigin(0.5);
  sc.big = txt(W / 2, 300, '', 80).setOrigin(0.5); // cuenta regresiva
  // pantalla de fin: filas fijas
  sc.go = sc.add.container(0, 0).setVisible(false);
  sc.goTitle = txt(W / 2, 130, '', 40).setOrigin(0.5);
  sc.goWhy = txt(W / 2, 190, '', 18, '#f7ffd8').setOrigin(0.5).setWordWrapWidth(720);
  sc.goTab = txt(W / 2, 250, '', 18, '#f7ffd8').setOrigin(0.5, 0).setAlign('left').setLineSpacing(10);
  sc.goStart = txt(W / 2, 470, 'START1: JUGAR 1P   ·   START2: JUGAR 2P', 18).setOrigin(0.5);
  sc.goIdle = txt(W / 2, 505, '', 13, '#a8c700').setOrigin(0.5);
  sc.go.add([sc.add.rectangle(W / 2, H / 2, W, H, C.bg, 0.88), sc.goTitle, sc.goWhy, sc.goTab, sc.goStart, sc.goIdle]);

  // pantalla de título (sobre la torre demo del attract mode)
  // la torre demo se arma a la izquierda; todo el texto va en una columna
  // derecha con fondo oscuro propio, así siempre se lee
  sc.ti = sc.add.container(0, 0);
  sc.tiTitle = txt(TX, 68, 'MVP EN 36 HORAS', 46).setOrigin(0.5);
  sc.tiPanelBg = sc.add.rectangle(TX, 290, 440, 200, C.ink, 0.95).setStrokeStyle(2, C.lime3);
  sc.tiPanel = txt(TX, 290, '', 17, '#f7ffd8').setOrigin(0.5).setLineSpacing(4);
  sc.tiPress = txt(TX, 450, 'PRESIONA START', 32).setOrigin(0.5);
  sc.ti.add([
    sc.add.rectangle(W / 2, H / 2, W, H, C.bg, 0.25),
    sc.add.rectangle(TX, H / 2, 490, H - 20, C.bg, 0.86).setStrokeStyle(2, C.lime3),
    sc.tiTitle,
    txt(TX, 110, TXT.sub, 16, '#a8c700').setOrigin(0.5),
    sc.tiPanelBg,
    sc.tiPanel,
    sc.tiPress,
    txt(TX, 492, 'START1: 1 JUGADOR   ·   START2: 2 JUGADORES', 15, '#f7ffd8').setOrigin(0.5),
    txt(TX, 552, TXT.tag, 13, '#a8c700').setOrigin(0.5).setWordWrapWidth(450),
  ]);
  sc.tweens.add({ targets: sc.tiPress, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });
  sc.tweens.add({ targets: sc.tiTitle, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  toTitle();
}

// ---------- flujo: título (attract) → cuenta → juego → fin → ... ----------

function toTitle() {
  clearAll();
  S = { ph: 'title', P: [], n: 1, el: 0, ne: 0, pi: 0, pt: 0 };
  newDemo();
  sc.ti.setVisible(true);
  showPanel(0);
}

// Torre demo manejada por una IA simple (attract mode)
function newDemo() {
  sc.grp.removeAll(true);
  sc.bgrp.removeAll(true);
  S.el = 5 * HOUR_MS; // arranca con temblores y algo de scope creep
  S.ne = S.el + 3000;
  const d = mkPlayer(0, 1);
  d.ai = true;
  d.id = 'AI';
  d.cx = 150; // a la izquierda, fuera de la columna de texto
  d.vw = 300;
  for (const t of [d.hud, d.msgT, d.evT, d.subT]) t.setVisible(false);
  S.P = [d];
}

// la IA suelta cuando la grúa está a menos de una tolerancia al azar del tope
function aiDrop(p, c) {
  if (c.tol == null) c.tol = (Math.random() < 0.35 ? rnd(0, 4) : rnd(6, 30)) * p.k;
  return Math.abs(c.x - p.tx) < c.tol;
}

function showPanel(i) {
  S.pi = i % TXT.panels.length;
  S.pt = sc.time.now + 5500;
  sc.tiPanel.setText(TXT.panels[S.pi]).setAlpha(0);
  sc.tiPanelBg.setSize(Math.max(420, sc.tiPanel.width + 40), sc.tiPanel.height + 36).setOrigin(0.5);
  sc.tweens.add({ targets: sc.tiPanel, alpha: 1, duration: 300 });
}

function titleFrame(time, dt) {
  S.el += dt * 1000;
  events();
  const d = S.P[0];
  upd(d, dt);
  // el título tiembla con la torre demo
  sc.tiTitle.setPosition(TX + (Math.random() - 0.5) * d.shake, 68 + (Math.random() - 0.5) * d.shake * 0.5);
  if ((d.dead && !d.fall.length) || d.floors.length > 16 || hour() > 20) newDemo();
  if (time >= S.pt) showPanel(S.pi + 1);
}

function begin(n) {
  sc.ti.setVisible(false);
  start(n);
  S.ph = 'count';
  S.cdT = sc.time.now;
  S.cdi = -1;
}

function countdown(time) {
  const i = Math.floor((time - S.cdT) / 650);
  if (i === S.cdi) return;
  S.cdi = i;
  const t = sc.big;
  sc.tweens.killTweensOf(t);
  t.setText(i < 3 ? String(3 - i) : TXT.go).setAlpha(1).setScale(1.8);
  sc.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.easeOut' });
  if (i < 3) tone(440, 0.12, 'square', 0.1);
  else {
    tone(880, 0.3, 'square', 0.1, 1320);
    sc.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 300 });
    S.ph = 'play';
  }
}

// temblores de hackathon (juego y attract)
function events() {
  const h = hour();
  if (h >= EASY_H && S.el >= S.ne) {
    const ev = say(TXT.ev, 'ev');
    for (const p of S.P) quake(p, 45 + h * 4, 2600, ev);
    S.ne = S.el + rnd(7000, 12000) - h * 80;
  }
}

function clearAll() {
  sc.grp.removeAll(true);
  sc.bgrp.removeAll(true);
  sc.gfx.clear();
  sc.bgfx.clear();
  sc.hg.clear();
  sc.go.setVisible(false);
  sc.clock.setText('');
  sc.tick.setText('');
  sc.tickBg.setAlpha(0);
  sc.big.setText('');
}

function start(n) {
  clearAll();
  S = { ph: 'play', P: [], n, el: 0, ne: EASY_H * HOUR_MS + 1500, lock: 0, ai: 0 };
  for (let i = 0; i < n; i++) S.P.push(mkPlayer(i, n));
  tone(440, 0.1, 'square', 0.08, 880);
}

function endGame(survived) {
  S.ph = 'over';
  S.lock = sc.time.now + 1200;
  S.idle = sc.time.now + 20000;
  for (const p of S.P) {
    if (survived && !p.dead) {
      p.score += 1000;
      p.why = TXT.demo + ' +1000';
    }
    // ocultar mensajes en juego para que no se superpongan
    for (const t of [p.msgT, p.evT, p.subT]) {
      sc.tweens.killTweensOf(t);
      t.setAlpha(0);
    }
  }
  let head = survived ? 'DEMO DAY' : 'FIN DE LA HACKATHON';
  if (S.n > 1) {
    const [a, b] = S.P;
    head = a.score === b.score ? 'EMPATE' : a.score > b.score ? 'GANA P1' : 'GANA P2';
  }
  sc.goTitle.setText(head);
  sc.goWhy.setText(S.P.map((p) => (S.n > 1 ? p.id + ': ' : '') + (p.why || '')).join('   ·   '));
  sc.goTab.setText(
    // tabla de columnas fijas (alineada a la izquierda)
    ['JUG.', 'PUNTAJE', 'ALTURA MÁX', 'PERFECTOS']
      .concat(...S.P.map((p) => [p.id, String(p.score).padStart(6, '0'), p.maxH + ' pisos', String(p.perf)]))
      .map((v, i) => (i % 4 < 3 ? v.padEnd([6, 10, 13][i % 4]) : v + '\n'))
      .join('')
      .trim(),
  );
  sc.go.setVisible(true);
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
    lives: 3, score: 0, combo: 0, perf: 0, maxH: 0, why: '', dead: false, rf: 0,
    qm: 0, qu: 0, qp: 0, shake: 0, risk: 0, ck: 0,
    bag: [], cbag: [], creeps: 0,
  };
  const x0 = p.cx - p.vw / 2;
  // zonas fijas por viewport: HUD (y 34-56) · eventos (66-130) · mensajes (140-190) · riel grúa (196)
  p.hud = txt(x0 + 12, 34, '', n > 1 ? 13 : 15).setOrigin(0, 0).setAlign('left');
  p.evT = txt(p.cx, 66, '', 20, '#f7ffd8').setOrigin(0.5, 0).setAlpha(0).setWordWrapWidth(p.vw - 30);
  p.subT = txt(p.cx, 92, '', 16, '#a8c700').setOrigin(0.5, 0).setAlpha(0).setWordWrapWidth(p.vw - 30);
  p.msgT = txt(p.cx, 166, '', 18).setOrigin(0.5).setAlpha(0).setWordWrapWidth(p.vw - 30).setLineSpacing(2);
  sc.grp.add([p.hud, p.msgT, p.evT, p.subT]);
  const base = { name: 'IDEA', w: 170 * k, h: FH * k, wt: 3, col: C.lime3, ox: 0, y: 0 };
  base.t = floorText(base, '#e1ff00');
  p.floors.push(base);
  chain(p);
  return p;
}

// Texto del piso con tamaño mínimo legible (MIN_FONT). Si el nombre no cabe,
// el piso se ensancha para el texto; ese ancho es el que usa la física.
function floorText(f, col) {
  const t = txt(0, 0, f.name, Math.max(MIN_FONT, Math.round(13 * (f.h / FH))), col || '#0b0f03').setOrigin(0.5);
  f.w = Math.max(f.w, t.width + 10);
  sc.grp.addAt(t, 0);
  return t;
}

// altura (sin balanceo) del tope de la torre
const topH = (p) => {
  const f = p.floors[p.floors.length - 1];
  return f.y + f.h;
};

// Calcula la torre como cadena: cada piso se apoya en el borde superior del
// anterior, desplazado por su offset (f.ox) y rotado por el ángulo acumulado.
// Coordenadas de mundo: x relativo al centro, y hacia arriba.
// La única rotación es la curvatura global: ángulo(y) = s·y/R². Entre pisos
// consecutivos la diferencia es ~1°, así cada piso queda plano sobre el de abajo.
function chain(p) {
  const th = p.s / (BEND_R * BEND_R);
  let X = 0;
  let px = 0;
  let py = 0;
  let pa = 0;
  p.floors.forEach((f, i) => {
    X += f.ox;
    f.X = X; // centro sin balanceo
    const a = i ? th * (f.y + f.h / 2) : 0;
    const bx = px + f.ox * Math.cos(pa);
    const by = py - f.ox * Math.sin(pa);
    f.a = a;
    f.cx = bx + (f.h / 2) * Math.sin(a);
    f.cy = by + (f.h / 2) * Math.cos(a);
    px = bx + f.h * Math.sin(a);
    py = by + f.h * Math.cos(a);
    pa = a;
  });
  p.tx = px; // centro del borde superior del último piso
  p.ty = py;
  p.ta = pa;
}

// Regla Jenga: el centro de masa de los pisos i..tope debe caer sobre el piso i-1.
// También calcula el riesgo (f.rk 0..1) para avisar antes del derrumbe:
// cuando el margen de una unión baja de RISK_M, ese piso y los de arriba se tiñen y vibran.
function jenga(p) {
  const F = p.floors;
  let sw = 0;
  let sx = 0;
  let fail = 0;
  let dir = 0;
  for (let i = F.length - 1; i > 0; i--) {
    sw += F[i].wt;
    sx += F[i].wt * F[i].cx;
    const b = F[i - 1];
    const sup = b.cx + (b.h / 2) * Math.sin(b.a);
    const d = sx / sw - sup;
    const lim = (b.w / 2) * Math.cos(b.a) + 4 * p.k;
    F[i].jr = clamp((RISK_M - (1 - Math.abs(d) / lim)) / RISK_M, 0, 1);
    if (Math.abs(d) > lim) {
      fail = i; // nos quedamos con la falla más baja
      dir = Math.sign(d);
    }
  }
  // el riesgo de una unión se propaga a todos los pisos que están encima
  let rk = 0;
  for (const f of F) f.rk = rk = Math.max(rk, f.jr || 0);
  p.risk = rk;
  if (fail) topple(p, fail, dir);
}

// Todo lo que está sobre el piso i-1 se vuelca y cae.
function topple(p, i, dir) {
  const n = p.floors.length - i;
  for (const f of p.floors.splice(i)) floorFall(p, f, dir);
  p.s *= 0.3;
  p.v *= 0.3;
  p.combo = 0;
  p.lives--;
  p.shake = 10 + n * 2;
  msg(p, say(n > 1 ? TXT.derr : TXT.cae, n > 1 ? 'derr' : 'cae') + '\n-1 CAFÉ', '#f7ffd8');
  tone(160, 0.5, 'sawtooth', 0.12, 50);
  chain(p);
  if (p.lives <= 0) die(p, say(TXT.nocafe, 'nocafe'));
}

// Convierte un piso en escombro: sale disparado hacia el lado de la caída,
// se dibuja detrás de la torre y se desvanece.
function toFall(p, f, dir, x, y, a) {
  sc.grp.remove(f.t);
  sc.bgrp.add(f.t);
  p.fall.push({
    ...f, x, y, a, al: 1,
    va: dir * rnd(1.5, 4), vx: dir * rnd(180, 340), vy: rnd(120, 320),
  });
}
const floorFall = (p, f, dir) => toFall(p, f, dir, f.cx, f.cy - f.h / 2, f.a);

// Bolsa barajada: no repite una feature hasta agotar la lista.
function fromBag(p, key, src) {
  if (!p[key].length) {
    const b = src.slice();
    for (let i = b.length; i > 1; i--) {
      const j = (Math.random() * i) | 0;
      [b[i - 1], b[j]] = [b[j], b[i - 1]];
    }
    // evita repetir en el borde entre una bolsa y la siguiente
    if (b[b.length - 1] === p[key + 'L']) b.unshift(b.pop());
    p[key] = b;
  }
  return (p[key + 'L'] = p[key].pop());
}

// Probabilidad de scope creep: 0 antes de EASY_H, sube a ~40% a la hora 10 y ~50% al final.
const creepP = (h) => (h < EASY_H ? 0 : h < 10 ? 0.15 + ((h - EASY_H) / 6) * 0.25 : Math.min(0.5, 0.4 + (h - 10) * 0.005));

function spawnCur(p) {
  const h = hour();
  // la primera feature absurda llega apenas termina el inicio amable
  const isCreep = h >= EASY_H && (!p.creeps || Math.random() < creepP(h));
  if (isCreep) p.creeps++;
  const d = isCreep ? fromBag(p, 'cbag', CREEP) : fromBag(p, 'bag', FEATS);
  const c = {
    name: d[0], w: d[1] * p.k, h: FH * p.k, wt: d[2],
    col: isCreep ? C.white : pick(FLOOR_COLS),
    x: 0, y: topH(p) + HANG, vy: 0, st: 'hang',
  };
  c.t = floorText(c);
  p.cur = c;
}

function quake(p, m, dur, ev) {
  if (p.dead) return;
  p.qm = Math.max(S.el < p.qu ? p.qm : 0, m);
  p.qu = S.el + dur;
  p.qp = Math.random() * 6;
  for (const [t, s] of [[p.evT, '!! ' + ev[0] + ' !!'], [p.subT, ev[1]]]) {
    sc.tweens.killTweensOf(t);
    t.setText(s).setAlpha(1).setScale(1.2);
    sc.tweens.add({ targets: t, scale: 1, duration: 200 });
    sc.tweens.add({ targets: t, alpha: 0, delay: dur, duration: 400 });
  }
  tone(220, 0.35, 'sawtooth', 0.08, 110);
}

function msg(p, s, col) {
  const t = p.msgT;
  sc.tweens.killTweensOf(t);
  t.setText(s).setColor(col || '#e1ff00').setAlpha(1).setScale(1.4);
  sc.tweens.add({ targets: t, scale: 1, duration: 150 });
  sc.tweens.add({ targets: t, alpha: 0, delay: 800, duration: 400 });
}

function upd(p, dt) {
  // piezas cayendo (fallos y derrumbes)
  for (let i = p.fall.length; i--; ) {
    const f = p.fall[i];
    f.vy -= 1800 * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.a += f.va * dt;
    f.al -= dt * 0.9;
    if (f.al <= 0 || f.y < p.cam - 250) {
      f.t.destroy();
      p.fall.splice(i, 1);
    }
  }
  p.shake *= Math.pow(0.02, dt);
  if (p.dead || (S.ph !== 'play' && S.ph !== 'title')) return;

  const h = hour();
  const n = p.floors.length;

  // joystick: ajusta el centro de la grúa
  const dir = (CTL.held[p.id + '_R'] ? 1 : 0) - (CTL.held[p.id + '_L'] ? 1 : 0);
  p.nudge = clamp(p.nudge + dir * 150 * dt, -70 * p.k, 70 * p.k);

  // REFACTOR: estabiliza la torre
  if (prs(p.id + '_2') || (p.ai && p.risk > 0.45 && S.el >= p.rf)) {
    if (S.el >= p.rf) {
      p.rf = S.el + 7000;
      p.v *= 0.2;
      p.s *= 0.4;
      for (const f of p.floors) f.ox *= 0.7;
      msg(p, 'REFACTOR!', '#f7ffd8');
      tone(300, 0.25, 'triangle', 0.1, 900);
    } else tone(120, 0.08, 'square', 0.05);
  }

  // balanceo global: resorte-amortiguador + desbalance + temblor
  let sw = 0;
  let sx = 0;
  for (const f of p.floors) {
    sw += f.wt;
    sx += f.wt * f.X;
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

  chain(p);
  // inclinación global: desplazamiento real de la punta vs. su posición sin balanceo
  if (Math.abs(p.tx - p.floors[p.floors.length - 1].X) > LIM * p.k) return die(p, say(TXT.over, 'over'));
  jenga(p);
  if (p.dead) return;

  // crujido: más frecuente cuanto mayor el riesgo
  if (p.risk > 0.15 && S.el >= p.ck) {
    p.ck = S.el + 900 - p.risk * 650;
    tone(rnd(70, 110), 0.12, 'sawtooth', 0.04 + p.risk * 0.08, rnd(40, 60));
  }
  if (p.risk > 0.6 && !p.warned) {
    p.warned = true;
    msg(p, TXT.warn, '#ff8a5c');
  } else if (p.risk < 0.2) p.warned = false;

  const top = topH(p);
  const tf = p.floors[p.floors.length - 1];

  // cámara
  p.cam += (Math.max(0, top - 170) - p.cam) * Math.min(1, dt * 4);

  // grúa y caída
  if (!p.cur && S.el >= p.next) spawnCur(p);
  const c = p.cur;
  if (!c) return;
  if (c.st === 'hang') {
    // inicio amable: grúa lenta las primeras EASY_H horas, luego acelera
    const ez = Math.min(h / EASY_H, 1);
    const he = Math.max(0, h - EASY_H);
    p.ph += dt * (0.9 + ez * 0.4 + he * 0.05);
    c.x = tf.X + p.nudge + Math.sin(p.ph) * (45 + ez * 15 + he * 2.2) * p.k;
    c.y = top + HANG;
    // soltar: botón 1, o palanca ABAJO (solo flanco y sin izquierda/derecha)
    const down = prs(p.id + '_D') && !CTL.held[p.id + '_L'] && !CTL.held[p.id + '_R'];
    if (prs(p.id + '_1') || down || (p.ai && aiDrop(p, c))) {
      c.st = 'drop';
      tone(520, 0.08, 'square', 0.06, 300);
    }
  } else {
    c.vy += 2400 * dt;
    c.y -= c.vy * dt;
    if (c.y <= p.ty) land(p, c, tf);
  }
}

function land(p, c, tf) {
  const tw = tf.w * Math.cos(p.ta);
  const dx = c.x - p.tx;
  const ov = Math.min(c.x + c.w / 2, p.tx + tw / 2) - Math.max(c.x - c.w / 2, p.tx - tw / 2);
  p.cur = null;
  if (ov < SUPPORT * c.w) {
    // no se apoya lo suficiente: resbala y cae
    toFall(p, c, Math.sign(dx) || 1, c.x, c.y, 0);
    p.combo = 0;
    p.lives--;
    p.shake = 8;
    msg(p, say(TXT.cae, 'cae') + '\n-1 CAFÉ', '#f7ffd8');
    tone(200, 0.3, 'sawtooth', 0.1, 60);
    if (p.lives <= 0) return die(p, say(TXT.nocafe, 'nocafe'));
    p.next = S.el + 450;
    return;
  }
  const perf = Math.abs(dx) <= 5 * p.k;
  p.floors.push({
    name: c.name, w: c.w, h: c.h, wt: c.wt, col: c.col, t: c.t,
    y: topH(p), ox: perf ? 0 : dx / Math.cos(p.ta),
  });
  p.v += dx * 0.8;
  p.combo = perf ? p.combo + 1 : 0;
  const mult = 1 + Math.min(p.combo, 4);
  const pts = 100 * mult + (perf ? 50 : 0);
  p.score += pts;
  p.shake = Math.max(p.shake, 3);
  if (perf) {
    p.perf++;
    msg(p, `${say(TXT.perf[mult - 1], 'perf')}\nx${mult}  +${pts}`);
    tone(660 + p.combo * 110, 0.15, 'square', 0.08, 1320 + p.combo * 220);
    if (S.n > 1) quake(S.P[1 - p.i], 70, 1800, say(TXT.rival, 'rival'));
  } else {
    const k = Math.abs(dx) <= 12 * p.k ? 'casi' : ov < 0.6 * c.w ? 'pelo' : 'normal';
    msg(p, `${say(TXT[k], k)}\n+${pts}`, '#f7ffd8');
    tone(180, 0.1, 'triangle', 0.15, 90);
  }
  p.maxH = Math.max(p.maxH, p.floors.length - 1);
  p.next = S.el + 250;
  chain(p);
}

function die(p, reason) {
  p.dead = true;
  p.why = reason;
  p.shake = 22;
  msg(p, reason, '#f7ffd8');
  tone(150, 0.8, 'sawtooth', 0.15, 40);
  const dir = Math.sign(p.s) || 1;
  if (p.cur) toFall(p, p.cur, dir, p.cur.x, p.cur.y, 0);
  p.cur = null;
  for (const f of p.floors.splice(1)) floorFall(p, f, dir);
}

// ---------- loop ----------

function update(time, delta) {
  const dt = Math.min(delta, 50) / 1000;
  if (S.ph === 'title') {
    if (prs('START1')) begin(1);
    else if (prs('START2')) begin(2);
    else titleFrame(time, dt);
  } else if (S.ph === 'count') {
    countdown(time);
  } else {
    if (S.ph === 'play') {
      S.el += dt * 1000;
      const h = hour();
      events();
      const am = TXT.amb[S.ai];
      if (am && h >= am[0]) {
        S.ai++;
        sc.tweens.killTweensOf([sc.tick, sc.tickBg]);
        sc.tick.setText('> ' + am[1]).setAlpha(1);
        sc.tickBg.setSize(sc.tick.width + 24, 26).setOrigin(0.5).setAlpha(1);
        sc.tweens.add({ targets: [sc.tick, sc.tickBg], alpha: 0, delay: 4000, duration: 600 });
      }
    }
    for (const p of S.P) upd(p, dt);
    if (S.ph === 'play') {
      if (S.P.every((p) => p.dead)) endGame(false);
      else if (hour() >= END_H) endGame(true);
    } else {
      // fin: reinicio rápido sin pasar por el título, o vuelta al attract si nadie juega
      sc.goIdle.setText(`volviendo al título en ${Math.max(0, Math.ceil((S.idle - time) / 1000))}`);
      if (time > S.lock && prs('START1')) begin(1);
      else if (time > S.lock && prs('START2')) begin(2);
      else if (time > S.idle) toTitle();
    }
  }
  if (S.ph !== 'title') hud();
  draw();
  for (const k in CTL.pressed) CTL.pressed[k] = false;
}

function hud() {
  const h = Math.min(hour(), END_H);
  const hh = String(Math.floor(h)).padStart(2, '0');
  const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
  sc.clock.setText(`HORA ${hh}:${mm} / 36:00`);
  for (const p of S.P) {
    const l = Math.max(0, p.lives);
    const sp = S.n > 1 ? ' ' : '   ';
    p.hud.setText(
      `${p.id} ${String(p.score).padStart(6, '0')}${sp}CAFÉ ${'■'.repeat(l)}${'□'.repeat(3 - l)}` +
        `${sp}PISOS ${p.floors.length - 1}` + (p.combo > 1 ? `${sp}x${1 + Math.min(p.combo, 4)}` : ''),
    );
  }
}

function slab(g, x, y, w, h, a, col, al = 1) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => ({
    x: x + u * c - v * s,
    y: y + u * s + v * c,
  }));
  g.fillStyle(col, al);
  g.fillPoints(pts, true);
  g.lineStyle(2, C.ink, al);
  g.strokePoints(pts, true);
}

function draw() {
  const g = sc.gfx;
  g.clear();
  sc.bgfx.clear();
  sc.hg.clear();
  for (const p of S.P) drawP(p, g, sc.bgfx);
  if (S.n > 1) {
    g.fillStyle(C.lime, 0.7);
    g.fillRect(W / 2 - 2, 0, 4, H);
  }
}

function drawP(p, g, bg) {
  const sh = p.shake;
  const ox = p.cx + (Math.random() - 0.5) * sh;
  const oy = (Math.random() - 0.5) * sh;
  const x0 = p.cx - p.vw / 2;
  const SY = (y) => GY - (y - p.cam) + oy;

  // rejilla de fondo (sube con la cámara)
  bg.lineStyle(1, C.lime, 0.07);
  for (let y = Math.floor(p.cam / 40) * 40; SY(y) > -40; y += 40) bg.lineBetween(x0, SY(y), x0 + p.vw, SY(y));
  // suelo
  bg.fillStyle(C.dark, 1);
  bg.fillRect(x0, SY(0), p.vw, H);
  bg.fillStyle(C.lime, 0.5);
  bg.fillRect(x0, SY(0), p.vw, 2);

  // escombros: detrás de la torre (capa trasera), desvaneciéndose
  for (const f of p.fall) {
    const x = ox + f.x;
    const y = SY(f.y + f.h / 2);
    slab(bg, x, y, f.w, f.h, f.a, f.col, f.al);
    f.t.setPosition(x, y).setRotation(f.a).setAlpha(f.al);
  }

  // torre (posiciones calculadas en chain)
  for (const f of p.floors) {
    // riesgo Jenga: tinte hacia rojo + vibración proporcional
    const rk = f.rk || 0;
    const x = ox + f.cx + (Math.random() - 0.5) * rk * 6;
    const y = SY(f.cy);
    slab(g, x, y, f.w, f.h, f.a, rk > 0.02 ? mix(f.col, RISK_COL, 0.2 + rk * 0.8) : f.col);
    f.t.setPosition(x, y).setRotation(f.a);
  }

  const c = p.cur;
  if (c) {
    const x = ox + c.x;
    const y = SY(c.y + c.h / 2);
    if (c.st === 'hang') {
      // cable desde el riel (bajo el HUD) hasta el piso colgando
      g.lineStyle(2, C.lime2, 0.8);
      g.lineBetween(x, ROPE_Y, x, y - c.h / 2);
      g.fillStyle(C.lime2, 1);
      g.fillRect(x - 8, ROPE_Y - 4, 16, 6);
    }
    slab(g, x, y, c.w, c.h, 0, c.col);
    c.t.setPosition(x, y).setRotation(0);
  }

  // riel de la grúa
  sc.hg.fillStyle(C.lime3, 0.6);
  sc.hg.fillRect(x0 + 8, ROPE_Y - 2, p.vw - 16, 2);

  // barra de REFACTOR
  const r = clamp(1 - (p.rf - S.el) / 7000, 0, 1);
  sc.hg.fillStyle(C.lime3, 1);
  sc.hg.fillRect(x0 + 12, 55, 90, 5);
  sc.hg.fillStyle(r >= 1 ? C.lime : C.lime2, 1);
  sc.hg.fillRect(x0 + 12, 55, 90 * r, 5);
}

// ---------- sonido ----------

function tone(f, d, type, v, f2) {
  if (S && S.ph === 'title') return; // attract mode en silencio
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
