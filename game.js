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
const RISK_M = 0.3; // margen Jenga bajo el cual se avisa (tinte rojo + vibración + crujido)
const RISK_SHOW = 0.15; // riesgo mínimo para teñir/crujir (evita torre siempre naranja)

// ===== BALANCE (F5) =====
const PERF_PX = 9; // ventana de perfecto (px desde el centro)
const CASI_PX = 18; // ventana de "casi perfecto"
const SWAY_J = 0.55; // cuánto del balanceo cuenta para la regla Jenga (0 = solo geometría)
const GRACE_MS = 2500; // tras un derrumbe, sin derrumbes nuevos por este tiempo
const BEND_GROW = 0.8; // el radio de curvatura crece con la altura: R = max(BEND_R, alto·BEND_GROW)
const DAMP = 1.5; // amortiguación del balanceo (más = menos resonancia)
const QUAKE_H = 0.04; // el temblor pega más fuerte cuanto más alta la torre (por piso)...
const QUAKE_HCAP = 30; // ...hasta este número de pisos (sin techo, las torres de 50+ eran imposibles)
const QUAKE = (h) => 40 + h * 3 + Math.max(0, h - 24) * 5; // fuerza de los temblores (sube más en la recta final)
const GLOBAL_WARN = 0.6; // fracción de la inclinación máxima desde la que se avisa (tinte + crujido)
const GLOBAL_CUT = 0.6; // colapso global: se cae todo lo que está sobre este % de la altura
const RIVAL_Q = 55; // temblor que manda un perfecto al rival (2P)
const EFX_MS = 6000; // duración de los efectos de evento sobre la grúa
const PW_CAFE = 0.08; // prob. de power-up CAFÉ (si te falta café)
const PW_PAIR = 0.05; // prob. de power-up PAIR PROGRAMMING
const DD_MS = 12000; // duración del Demo Day
const DD_Q = 80; // temblor base de los jueces
const DD_JOLT = 80; // sacudón extra cada ~1.5 s
const DD_FLOOR = 25; // bonus por piso en pie al sobrevivir
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
// Colores de piso por categoría (neón saturado, texto oscuro legible).
// El lima queda reservado para la marca: título, HUD, combos y la base IDEA.
const CAT = {
  back: [0x3fd0ff, 0x62a8ff], // backend: cian / azul
  front: [0xff5fd2, 0xff8ac8], // frontend: magenta / rosa
  ia: [0xb48cff, 0x9f7dff], // IA: violeta
  pay: [0x3dffb4, 0x6dffc8], // pagos: verde menta
  misc: [0xffe14d, 0xffae42], // resto: amarillo / naranja
};
const CREEP_COLS = [0xffffff, 0xfff66b, 0x7dfff2]; // scope creep: chillones...
const CREEP_BORDER = 0xff2e88; // ...con borde rosa grueso
const PW_COL = 0xffc61a; // power-ups: dorado con borde blanco
const RISK_BORDER = 0xff2020; // riesgo: borde rojo parpadeante (además del tinte)
// Color de la tarjeta de evento según el tipo
const EV_COL = { slack: 0xff9a3c, rival: 0xff4fd8, quake: 0xff3b3b, demo: 0xe1ff00 };

// [nombre, ancho, peso, categoría]
const FEATS = [
  ['LOGIN', 110, 1, 'misc'], ['LANDING', 140, 1, 'front'], ['BASE DE DATOS', 130, 1.4, 'back'], ['API', 90, 1, 'back'],
  ['IA', 70, 1.2, 'ia'], ['DARK MODE', 120, 0.8, 'front'], ['PAGOS', 100, 1.2, 'pay'], ['CHATBOT', 100, 1, 'ia'],
  ['ONBOARDING', 130, 1, 'front'], ['NOTIFICACIONES', 140, 0.9, 'misc'], ['MAPA', 90, 1, 'misc'], ['ANALYTICS', 120, 1.1, 'misc'],
];

// Cielo según la hora (tenue): [hora, color arriba, color horizonte, estrellas 0..1]
const SKY = [
  [0, 0x060a1c, 0x0b1430, 0.6], // noche azul
  [3, 0x0d0820, 0x1f0f33, 0.45], // madrugada violeta
  [6, 0x1a0f26, 0x4a2630, 0.1], // amanecer naranja/rosa
  [9, 0x0e1a2e, 0x1e3348, 0], // día
  [16, 0x0f1c30, 0x22364a, 0],
  [19, 0x1a1028, 0x42222c, 0.15], // atardecer
  [22, 0x060a1c, 0x0b1430, 0.6], // noche otra vez
  [27, 0x0d0820, 0x1f0f33, 0.45],
  [30, 0x1a0f26, 0x4a2630, 0.1],
  [33, 0x0e1a2e, 0x1e3348, 0],
  [36, 0x08080c, 0x121018, 0.2], // Demo Day: escenario oscuro con focos
];
// Scope creep: aparecen a medida que avanza la noche
const CREEP = [
  ['BLOCKCHAIN', 150, 1.8], ['NFT DEL USUARIO', 150, 1.3], ['IA QUE HACE IA', 140, 1.6],
  ['METAVERSO B2B', 160, 2], ['APP PARA PERROS', 130, 1.2], ['WEB3 SOCIAL', 140, 1.5],
  ['UBER DE EMPANADAS', 160, 1.4], ['SUPERAPP', 70, 2.2], ['TINDER DE COFOUNDERS', 160, 1.3],
  ['IA EN EL LOGIN', 80, 1.6],
];

// ===== TODOS LOS TEXTOS DEL JUEGO (editar aquí) =====
// Tono: seco, de dev real (Slack, commits, logs). Pocos signos de exclamación;
// el chiste está en la subestimación y no se explica.
const TXT = {
  // Piso perfecto: un grupo por nivel de combo (x1 .. x5)
  perf: [
    ['tests en verde', 'merge sin conflictos', 'compila a la primera'],
    ['LGTM', 'deploy en verde', 'cero warnings'],
    ['nadie entiende cómo funciona,\npero funciona', 'no tocar: funciona', 'el linter no dijo nada'],
    ['aprobado sin comentarios', 'el PM no tiene preguntas', 'cobertura 100%.\nde un archivo'],
    ['el CTO quiere saber tu nombre', 'esto entra en el pitch', 'alguien está grabando esto'],
  ],
  // Casi perfecto (a pocos píxeles)
  casi: ['off by one', 'falta un pixel', 'casi. ticket para después', 'lo arreglo en la v2'],
  // Aterrizó apenas apoyado
  pelo: ['funciona en mi máquina', 'sostenido por un try/catch', 'no lo mires mucho', 'apenas'],
  // Piso normal
  normal: [
    'commit: "fix"', 'en localhost se ve bien', 'sin code review', 'commit: "cambios"',
    'merge a main un viernes', 'TODO: refactorizar', 'commit: "ahora sí"', 'otra feature',
  ],
  // El piso no se apoya y se cae
  cae: ['no compila', 'eso era deuda técnica', '404', 'rollback', 'undefined is not a function', 'segfault'],
  // Derrumbe parcial (regla Jenga o colapso de la parte alta)
  derr: [
    'git reset --hard', 'esto no escala', 'la deuda técnica cobró intereses',
    'git push --force', 'se cayó el backend', 'nadie hizo refactor',
  ],
  minus: '-1 café',
  rf: 'commit: "refactor"',
  // Motivos de fin (un texto fijo por causa)
  over: 'COLAPSÓ EL MVP',
  nocafe: 'SE ACABÓ EL CAFÉ',
  elim: 'ELIMINADO',
  away: 'SE QUEDÓ DORMIDO',
  wait: 'esperando al rival...',
  demo: 'SOBREVIVIÓ AL DEMO DAY',
  warn: 'la torre está crujiendo\nBOTÓN 2: REFACTOR',
  // Pantalla de título
  sub: 'PLATANUS HACK 26 · SANTIAGO',
  tag: 'apila features. aguanta los temblores. llega al demo day.',
  go: 'npm start',
  // Hitos de altura (cada 10 pisos)
  mile: {
    10: '10 pisos.\nsin tests',
    20: '20 pisos.\ncero documentación',
    30: '30 pisos.\nnadie sabe qué hace el piso 4',
    40: '40 pisos.\nesto ya no es un MVP',
    50: '50 pisos.\nfelicitaciones, es un monolito',
  },
  // Color del mensaje de perfecto según el combo (x1..x5): lima de marca
  perfCol: ['#e1ff00', '#e1ff00', '#ecff66', '#f4ffa8', '#ffffff'],
  // Leaderboard
  rec: 'NUEVO RÉCORD',
  hint: '↑↓ LETRA   ←→ MOVER\nBOTÓN 1: OK   BOTÓN 2: ATRÁS',
  ready: 'LISTO',
  topEmpty: 'NADIE HA LLEGADO AL\nDEMO DAY TODAVÍA',
  saving: '(guardando...)',
  saved: '(guardado)',
  local: '(sin conexión: solo local)',
  again: 'START1: JUGAR 1P   ·   START2: JUGAR 2P',
  // Paneles que rotan en el attract mode
  // null = panel TOP 10 (se arma con los récords guardados)
  panels: [
    'CÓMO JUGAR\n\nBOTÓN 1 o ↓ : SOLTAR FEATURE\n← → : AJUSTAR LA GRÚA\nBOTÓN 2 : REFACTOR (estabiliza)\n\nPISO PERFECTO = COMBO\nSIN CAFÉ = GAME OVER',
    null,
    'LA HACKATHON\n\n36 HORAS PARA APILAR TU MVP\nMERGE CONFLICTS, MENTORES, WIFI CAÍDA\nVAN A SACUDIRLO TODO\n\nTORRE EN ROJO = REFACTOR',
    'SCOPE CREEP\n\nBLOCKCHAIN · IA QUE HACE IA\nUBER DE EMPANADAS · METAVERSO B2B\nTINDER DE COFOUNDERS\n\nNADIE LO PIDIÓ. VA IGUAL.',
    null,
    '2 JUGADORES\n\nPANTALLA DIVIDIDA\nCADA PISO PERFECTO LE MANDA\nUN TEMBLOR AL OTRO\n\nSTART2',
  ],
  // Eventos (temblores): [titular, subtítulo estilo Slack, efecto]
  // Efectos: narrow = el próximo piso llega a medias · fast/slow = grúa rápida/lenta
  // blind = la grúa parpadea · pivot = la grúa salta al otro lado · creep = próximo piso absurdo
  // big = temblor más fuerte · '' = solo temblor
  ev: [
    ['MERGE CONFLICT', '#dev — "¿quién pusheó directo a main?"', 'narrow'],
    ['SE CAYÓ LA API', '#general — "¿alguien tiene otra API key?"', 'fast'],
    ['WIFI CAÍDA', '#random — "¿alguien comparte datos?"', 'blind'],
    ['PASÓ EL MENTOR', '#general — mentor: "¿y si lo hacen B2B?"', 'creep'],
    ['PIVOTEEN', '#anuncios — "ahora es para mascotas"', 'pivot'],
    ['SE ACABARON LAS SOPAIPILLAS', '#random — "quedan sobres de té"', ''],
    ['NPM INSTALL', '#dev — "lleva 40 minutos... y sigue"', 'slow'],
    ['DEPLOY A LAS 4AM', '#dev — "es un cambio chico"', 'fast'],
    ['CORTE DE LUZ', '#general — "¿alguien hizo commit?"', 'blind'],
    ['TEMBLOR DE VERDAD', '#random — "fue un 5,8. sigan"', 'big'],
  ],
  half: ' (A MEDIAS)',
  // Power-ups: [nombre, ancho, peso, mensaje al aterrizar]
  cafe: ['CAFÉ DE GRANO', 110, 1, 'café de grano\n+1 café'],
  pair: ['PAIR PROGRAMMING', 200, 1.1, 'pair programming\nrefactor listo'],
  // Final
  dd: ['DEMO DAY', 'los jueces van a probar tu MVP. 12 segundos.'],
  ddClock: 'DEMO DAY',
  // Temblor enviado por el rival (2P)
  rival: [
    ['EL OTRO EQUIPO HIZO DEPLOY', '#general — "¿vieron la demo de al lado?"'],
    ['EL OTRO EQUIPO TIENE USUARIOS', '#random — "tres. uno es la mamá"'],
    ['EL OTRO EQUIPO TIENE LOGO', '#general — "lo hicieron en Canva"'],
  ],
  // Ambiente según la hora: [hora, comentario]
  amb: [
    [1, 'alguien ya pidió pizza'],
    [3, '3 AM. otra pizza'],
    [6, 'amanece. nadie durmió'],
    [9, 'desayuno: sopaipillas'],
    [12, 'mediodía. "¿y si le metemos IA?"'],
    [16, 'alguien duerme en un puff'],
    [20, 'el café sabe a tierra'],
    [24, '24 horas y el repo tiene 3 commits'],
    [27, '3 AM otra vez'],
    [30, 'llegaron los jueces'],
    [33, 'alguien ensaya el pitch en el baño'],
    [35, '"¿quién hizo las slides?"'],
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
const LI = { any: 0 }; // último input (Date.now) por jugador ('P1', 'P2') y global
const AUTO_DROP_MS = 8000; // sin input del jugador: el piso se suelta solo
const ABANDON_MS = 20000; // sin ningún input: la partida termina y vuelve al título

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// cielo a la hora h: interpola entre las claves de SKY
function sky(h) {
  let i = 0;
  while (i < SKY.length - 2 && h > SKY[i + 1][0]) i++;
  const [h0, t0, b0, s0] = SKY[i];
  const [h1, t1, b1, s1] = SKY[i + 1];
  const t = clamp((h - h0) / (h1 - h0), 0, 1);
  return [mix(t0, t1, t), mix(b0, b1, t), s0 + (s1 - s0) * t];
}

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
    LI[c.slice(0, 2)] = LI.any = Date.now();
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
  sc.tick = txt(W / 2, H - 22, '', 15, '#e1ff00').setOrigin(0.5);
  sc.big = txt(W / 2, 300, '', 80).setOrigin(0.5); // cuenta regresiva
  // pantalla de fin: filas fijas
  sc.go = sc.add.container(0, 0).setVisible(false);
  // filas: título 64 · motivo 108 · resultados 136 · récord/TOP 10 250 · START 522 · idle 554
  sc.goTitle = txt(W / 2, 64, '', 40).setOrigin(0.5);
  sc.goWhy = txt(W / 2, 108, '', 18, '#f7ffd8').setOrigin(0.5).setWordWrapWidth(720);
  sc.goTab = txt(W / 2, 136, '', 18, '#f7ffd8').setOrigin(0.5, 0).setAlign('left').setLineSpacing(8);
  sc.goTop = txt(W / 2, 250, '', 15, '#e1ff00').setOrigin(0.5, 0).setAlign('left').setLineSpacing(3);
  sc.goStart = txt(W / 2, 522, '', 18).setOrigin(0.5);
  sc.goIdle = txt(W / 2, 554, '', 13, '#a8c700').setOrigin(0.5);
  sc.go.add([
    sc.add.rectangle(W / 2, H / 2, W, H, C.bg, 0.9),
    sc.goTitle, sc.goWhy, sc.goTab, sc.goTop, sc.goStart, sc.goIdle,
  ]);

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
  loadTop().then((t) => {
    TOP = t;
    if (S.ph === 'title' && !TXT.panels[S.pi]) showPanel(S.pi);
  });
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
  const pn = TXT.panels[S.pi];
  sc.tiPanel.setFontSize(pn ? 17 : 15).setText(pn || 'TOP 10\n\n' + topLines()).setAlpha(0);
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
  S.t0 = Date.now();
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
  if (i < 3) SFX.beep();
  else {
    SFX.beep(1);
    S.ms = 0;
    S.mt = 0;
    sc.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 300 });
    S.ph = 'play';
  }
}

// DEMO DAY: a las 36 h no hay más pisos; los jueces sacuden la torre DD_MS.
// Quien siga en pie al final gana el bonus.
function demoDay() {
  if (!S.dd) {
    S.dd = S.el;
    S.dj = 0;
    for (const p of S.P) {
      if (p.dead) continue;
      p.qm = DD_Q;
      p.qu = S.el + DD_MS;
      card(p, TXT.dd, DD_MS - 400, EV_COL.demo);
    }
  }
  // sacudones de los jueces
  if (S.el >= S.dj) {
    S.dj = S.el + rnd(1200, 1800);
    for (const p of S.P) if (!p.dead) p.v += rnd(-1, 1) * DD_JOLT;
  }
  if (S.el - S.dd >= DD_MS) endGame(true);
}

// temblores de hackathon (juego y attract)
function events() {
  const h = hour();
  if (h >= EASY_H && S.el >= S.ne && !S.dd) {
    const ev = say(TXT.ev, 'ev');
    const big = ev[2] === 'big';
    for (const p of S.P) quake(p, QUAKE(h) * (big ? 1.6 : 1), 2600, ev, big ? EV_COL.quake : EV_COL.slack);
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
}

function endGame(survived) {
  S.ph = 'over';
  S.lock = sc.time.now + 1200;
  S.idle = sc.time.now + 20000;
  for (const p of S.P) {
    if (survived && !p.dead) {
      const b = 1000 + (p.floors.length - 1) * DD_FLOOR;
      p.score += b;
      p.why = TXT.demo + ' +' + b;
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
  sc.clock.setText('');
  sc.tick.setAlpha(0);
  sc.tickBg.setAlpha(0);
  for (const p of S.P) {
    p.hud.setVisible(false);
    for (const o of p.elim || []) o.setVisible(false);
  }
  SFX.over();
  S.mark = [];
  const qs = S.P.filter((p) => qualifies(p.score));
  if (qs.length) startNames(qs, sc.time.now);
  else {
    showTop();
    sc.goStart.setText(TXT.again);
  }
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
    parts: [], rings: [], fl: 0, flc: 0xffffff, kick: 0, mk: {},
  };
  const x0 = p.cx - p.vw / 2;
  // zonas fijas por viewport: HUD (y 34-56) · eventos (66-130) · mensajes (140-190) · riel grúa (196)
  p.hud = txt(x0 + 12, 34, '', n > 1 ? 13 : 15).setOrigin(0, 0).setAlign('left');
  p.evT = txt(p.cx, 66, '', 20, '#f7ffd8').setOrigin(0.5, 0).setAlpha(0).setWordWrapWidth(p.vw - 30);
  p.subT = txt(p.cx, 92, '', 17, '#a8c700').setOrigin(0.5, 0).setAlpha(0).setWordWrapWidth(p.vw - 30);
  p.msgT = txt(p.cx, 166, '', 20).setOrigin(0.5).setAlpha(0).setWordWrapWidth(p.vw - 30).setLineSpacing(2);
  sc.grp.add([p.hud, p.msgT, p.evT, p.subT]);
  const base = { name: 'IDEA', w: 170 * k, h: FH * k, wt: 3, col: C.lime, ox: 0, y: 0 };
  base.t = floorText(base);
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
  const R = Math.max(BEND_R, topH(p) * BEND_GROW);
  const th = p.s / (R * R);
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
    sx += F[i].wt * jx(F[i]);
    const b = F[i - 1];
    const sup = jx(b);
    const d = sx / sw - sup;
    const lim = b.w / 2 + 4 * p.k;
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
  if (fail && S.el >= (p.grace || 0)) topple(p, fail, dir);
}

// x de un piso para la regla Jenga: geometría + una fracción (SWAY_J) del balanceo
const jx = (f) => f.X + SWAY_J * (f.cx - f.X);

// Todo lo que está sobre el piso i-1 se vuelca y cae.
function topple(p, i, dir) {
  p.grace = S.el + GRACE_MS;
  const n = p.floors.length - i;
  for (const f of p.floors.splice(i)) {
    burst(p, f.cx, f.cy, 5, [f.col, C.lime3], 220);
    floorFall(p, f, dir);
  }
  flash(p, RISK_COL, 0.7);
  p.kick = 8;
  p.s *= 0.3;
  p.v *= 0.3;
  p.combo = 0;
  p.lives--;
  p.shake = 10 + n * 2;
  msg(p, say(n > 1 ? TXT.derr : TXT.cae, n > 1 ? 'derr' : 'cae') + '\n' + TXT.minus, '#f7ffd8');
  SFX.crash();
  chain(p);
  if (p.lives <= 0) die(p, TXT.nocafe);
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

// efecto de evento activo (o '' si ya venció)
const efx = (p) => (S.el < (p.efu || 0) ? p.efx : '');

function spawnCur(p) {
  const h = hour();
  const e = efx(p);
  if (e === 'narrow' || e === 'creep') p.efx = ''; // efectos de un solo piso
  // power-ups (después del inicio amable)
  const pw = h < EASY_H ? 0 : p.lives < 3 && Math.random() < PW_CAFE ? TXT.cafe : Math.random() < PW_PAIR ? TXT.pair : 0;
  // la primera feature absurda llega apenas termina el inicio amable; el mentor fuerza una
  const isCreep = !pw && h >= EASY_H && (!p.creeps || e === 'creep' || Math.random() < creepP(h));
  if (isCreep) p.creeps++;
  const d = pw || (isCreep ? fromBag(p, 'cbag', CREEP) : fromBag(p, 'bag', FEATS));
  const c = {
    name: d[0], w: d[1] * p.k, h: FH * p.k, wt: d[2], pw: pw && d[3],
    col: pw ? PW_COL : isCreep ? pick(CREEP_COLS) : pick(CAT[d[3]]),
    bc: pw ? 0xffffff : isCreep ? CREEP_BORDER : C.ink, // borde
    bw: pw || isCreep ? 3 : 2,
    x: 0, y: topH(p) + HANG, vy: 0, st: 'hang', t0: Date.now(),
  };
  if (e === 'narrow' && !pw) {
    c.w *= 0.6; // merge conflict: llega a medias
    c.name += TXT.half;
  }
  c.t = floorText(c);
  p.cur = c;
}

function quake(p, m, dur, ev, col) {
  if (p.dead) return;
  p.qm = Math.max(S.el < p.qu ? p.qm : 0, m);
  p.qu = S.el + dur;
  p.qp = Math.random() * 6;
  // efecto del evento sobre la grúa / el próximo piso
  if (ev[2]) {
    p.efx = ev[2];
    p.efu = S.el + EFX_MS;
    if (ev[2] === 'pivot') {
      p.ph = Math.PI - p.ph + Math.PI; // la grúa salta al lado opuesto
      p.nudge = -p.nudge;
    }
  }
  card(p, ev, dur, col);
}

// tarjeta tipo notificación (titular + subtítulo) con alarma y flash
function card(p, ev, dur, col = EV_COL.slack) {
  p.evc = col;
  for (const [t, s] of [[p.evT, '!! ' + ev[0] + ' !!'], [p.subT, ev[1]]]) {
    sc.tweens.killTweensOf(t);
    t.setText(s).setAlpha(1).setScale(1.2);
    sc.tweens.add({ targets: t, scale: 1, duration: 200 });
    sc.tweens.add({ targets: t, alpha: 0, delay: dur, duration: 400 });
  }
  SFX.alarm();
  flash(p, col, 0.35);
}

function msg(p, s, col, big) {
  const t = p.msgT;
  sc.tweens.killTweensOf(t);
  t.setText(s).setColor(col || '#e1ff00').setAlpha(1).setScale(big ? 1.9 : 1.4).setAngle(0);
  sc.tweens.add({ targets: t, scale: 1, duration: big ? 260 : 150, ease: 'Back.easeOut' });
  if (big) sc.tweens.add({ targets: t, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 3 });
  sc.tweens.add({ targets: t, alpha: 0, delay: big ? 1100 : 800, duration: 400 });
}

// ---------- juice: partículas, anillos, flashes, puntaje flotante ----------

// partículas en coordenadas de mundo del jugador (up: hacia arriba)
function burst(p, x, y, n, col, sp, up) {
  for (let i = 0; i < n; i++) {
    const a = up ? rnd(0.3, 2.84) : rnd(0, 6.28);
    const v = rnd(0.3, 1) * sp;
    p.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: rnd(0.4, 0.9), c: col.length ? pick(col) : col, s: rnd(2, 5) });
  }
}
const ring = (p, x, y) => p.rings.push({ x, y, r: 6, l: 1 });
function flash(p, col, a) {
  p.flc = col;
  p.fl = Math.max(p.fl, a);
}
// texto "+250" que sube y se desvanece desde donde aterrizó el piso
function pop(p, x, y, s, col) {
  const t = txt(p.cx + x, GY - (y - p.cam), s, 18, col).setOrigin(0.5);
  sc.grp.add(t);
  sc.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

function updFx(p, dt) {
  for (let i = p.parts.length; i--; ) {
    const q = p.parts[i];
    q.vy -= 600 * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if ((q.l -= dt) <= 0) p.parts.splice(i, 1);
  }
  for (let i = p.rings.length; i--; ) {
    const q = p.rings[i];
    q.r += 260 * dt;
    if ((q.l -= dt * 2.2) <= 0) p.rings.splice(i, 1);
  }
  p.fl *= Math.pow(0.004, dt);
  p.kick *= Math.pow(0.001, dt);
  for (const f of p.floors) if (f.sq) f.sq = Math.max(0, f.sq - dt * 4);
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
  updFx(p, dt);
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
      msg(p, TXT.rf, '#f7ffd8');
      SFX.refactor();
      flash(p, C.lime, 0.3);
      ring(p, p.tx, p.ty);
      for (const f of p.floors) burst(p, f.cx, f.cy, 1, [C.lime, C.white], 120, true);
    } else SFX.denied();
  }

  // balanceo global: resorte-amortiguador + desbalance + temblor
  let sw = 0;
  let sx = 0;
  for (const f of p.floors) {
    sw += f.wt;
    sx += f.wt * f.X;
  }
  p.com = sx / sw;
  const ks = 9 / (1 + n * 0.03);
  const w0 = Math.sqrt(ks);
  let F = 0;
  if (S.el < p.qu) {
    F = p.qm * (1 + Math.min(n, QUAKE_HCAP) * QUAKE_H) * Math.sin((S.el / 1000) * w0 + p.qp); // torres altas se mecen más
    p.shake = Math.max(p.shake, p.qm / 25);
  }
  const a = -ks * (p.s - 2.4 * p.com) - DAMP * p.v + F;
  p.v += a * dt;
  p.s += p.v * dt;

  chain(p);
  jenga(p);
  if (p.dead) return;
  // inclinación global: desplazamiento real de la punta vs. su posición sin balanceo.
  // Cerca del límite tiñe la parte alta y avisa; al pasarlo se quiebra la parte alta
  // (-1 café, como un derrumbe). Solo con el último café es game over.
  const F2 = p.floors;
  const gi = Math.abs(p.tx - F2[F2.length - 1].X) / (LIM * p.k);
  const cut = Math.max(1, Math.floor(F2.length * GLOBAL_CUT));
  const gr = clamp((gi - GLOBAL_WARN) / (1 - GLOBAL_WARN), 0, 1);
  if (gr > 0) {
    for (let i = cut; i < F2.length; i++) F2[i].rk = Math.max(F2[i].rk || 0, gr);
    p.risk = Math.max(p.risk, gr);
  }
  if (gi > 1 && S.el >= (p.grace || 0)) {
    if (p.lives <= 1) return die(p, TXT.over);
    topple(p, cut, Math.sign(p.s) || 1);
    msg(p, TXT.over + '\n' + TXT.minus, '#f7ffd8', 1);
    if (p.dead) return;
  }

  // crujido: más frecuente cuanto mayor el riesgo
  if (p.risk > RISK_SHOW + 0.15 && S.el >= p.ck) {
    p.ck = S.el + 900 - p.risk * 650;
    SFX.creak(p.risk);
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
  if (!p.cur && S.el >= p.next && !S.dd) spawnCur(p);
  const c = p.cur;
  if (!c) return;
  if (c.st === 'hang') {
    // inicio amable: grúa lenta las primeras EASY_H horas, luego acelera
    const ez = Math.min(h / EASY_H, 1);
    const he = Math.max(0, h - EASY_H);
    const e = efx(p);
    p.ph += dt * (0.9 + ez * 0.4 + he * 0.05) * (e === 'fast' ? 1.7 : e === 'slow' ? 0.5 : 1);
    c.x = tf.X + p.nudge + Math.sin(p.ph) * (45 + ez * 15 + he * 2.2) * p.k;
    c.y = top + HANG;
    // soltar: botón 1, o palanca ABAJO (solo flanco y sin izquierda/derecha)
    const down = prs(p.id + '_D') && !CTL.held[p.id + '_L'] && !CTL.held[p.id + '_R'];
    // jugador ausente: suelta solo tras AUTO_DROP_MS sin input
    const away = !p.ai && Date.now() - Math.max(LI[p.id] || 0, c.t0) > AUTO_DROP_MS;
    if (prs(p.id + '_1') || down || away || (p.ai && aiDrop(p, c))) {
      c.st = 'drop';
      SFX.drop();
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
    flash(p, RISK_COL, 0.4);
    msg(p, say(TXT.cae, 'cae') + '\n' + TXT.minus, '#f7ffd8');
    SFX.slip();
    if (p.lives <= 0) return die(p, TXT.nocafe);
    p.next = S.el + 450;
    return;
  }
  const perf = Math.abs(dx) <= PERF_PX * p.k;
  const y0 = topH(p);
  p.floors.push({
    name: c.name, w: c.w, h: c.h, wt: c.wt, col: c.col, bc: c.bc, bw: c.bw, t: c.t,
    y: y0, ox: perf ? 0 : dx / Math.cos(p.ta), sq: 1,
  });
  // polvo en las esquinas + "golpe" de cámara
  const lx = perf ? p.tx : c.x;
  if (c.pw) {
    if (c.name === TXT.cafe[0]) p.lives = Math.min(3, p.lives + 1);
    else p.rf = 0; // pair programming: refactor listo
    SFX.mile();
    burst(p, lx, y0 + c.h, 24, [PW_COL, C.white], 260, true);
  }
  for (const sx of [-1, 1]) burst(p, lx + (sx * c.w) / 2, y0, 5, [c.col, 0x8a8f9e], 110, true);
  p.kick = Math.max(p.kick, 3);
  p.v += dx * 0.8;
  p.combo = perf ? p.combo + 1 : 0;
  const mult = 1 + Math.min(p.combo, 4);
  const pts = 100 * mult + (perf ? 50 : 0);
  p.score += pts;
  p.shake = Math.max(p.shake, 3);
  pop(p, lx, y0 + c.h + 10, '+' + pts, perf ? TXT.perfCol[mult - 1] : '#f7ffd8');
  if (perf) {
    p.perf++;
    msg(p, c.pw || `${say(TXT.perf[mult - 1], 'perf')}\nx${mult}`, c.pw ? '#ffc61a' : TXT.perfCol[mult - 1], 1);
    SFX.perf(p.combo);
    burst(p, lx, y0 + c.h, 10 + mult * 4, [C.lime, C.white, c.col], 200 + mult * 30, true);
    ring(p, lx, y0 + c.h / 2);
    flash(p, C.white, 0.2 + mult * 0.05);
    p.kick = 5;
    // sabotaje 2P: no se acumula si el rival ya está temblando
    const o = S.P[1 - p.i];
    if (S.n > 1 && S.el >= o.qu) quake(o, RIVAL_Q, 1800, say(TXT.rival, 'rival'), EV_COL.rival);
  } else {
    const k = Math.abs(dx) <= CASI_PX * p.k ? 'casi' : ov < 0.6 * c.w ? 'pelo' : 'normal';
    msg(p, c.pw || say(TXT[k], k), c.pw ? '#ffc61a' : '#f7ffd8', !!c.pw);
    SFX.land();
  }
  // hito cada 10 pisos (la primera vez que se alcanza)
  const nf = p.floors.length - 1;
  if (nf % 10 === 0 && nf > p.maxH) {
    msg(p, TXT.mile[nf] || `${nf} pisos.`, '#e1ff00', 1);
    SFX.mile();
    flash(p, C.lime, 0.5);
    for (const sx of [-1, 1]) burst(p, lx + sx * 60, y0, 25, [C.lime, ...CAT.front, ...CAT.back], 340, true);
  }
  p.maxH = Math.max(p.maxH, nf);
  p.next = S.el + 250;
  chain(p);
}

function die(p, reason) {
  p.dead = true;
  p.why = reason;
  p.shake = 22;
  msg(p, reason, '#f7ffd8', 1);
  SFX.die();
  flash(p, RISK_COL, 1);
  p.kick = 12;
  const dir = Math.sign(p.s) || 1;
  if (p.cur) toFall(p, p.cur, dir, p.cur.x, p.cur.y, 0);
  p.cur = null;
  // colapso total: cae todo; sin café: los restos quedan en pie (apagados)
  if (reason === TXT.over) for (const f of p.floors.splice(1)) floorFall(p, f, dir);
  if (S.n > 1) {
    const y = 330;
    p.elim = [
      sc.add.rectangle(p.cx, y, p.vw - 60, 130, C.bg, 0.88).setStrokeStyle(2, C.lime3),
      txt(p.cx, y - 36, TXT.elim, 30, '#f7ffd8').setOrigin(0.5),
      txt(p.cx, y + 6, '', 16).setOrigin(0.5),
      txt(p.cx, y + 38, TXT.wait, 14, '#a8c700').setOrigin(0.5),
    ];
    sc.grp.add(p.elim);
    sc.tweens.add({ targets: p.elim[3], alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
  }
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
      music();
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
      // partida abandonada: vuelve al título sin pedir iniciales
      // partida abandonada: si casi no se jugó (≤2 pisos) vuelve al título;
      // si hubo progreso, termina normal (y si califica, guarda como '???')
      if (Date.now() - Math.max(LI.any, S.t0) > ABANDON_MS) {
        if (S.P.every((p) => p.maxH <= 2)) return toTitle();
        for (const p of S.P) if (!p.dead) Object.assign(p, { dead: true, why: TXT.away });
        return endGame(false);
      }
      if (S.P.every((p) => p.dead)) endGame(false);
      else if (hour() >= END_H) demoDay();
    } else if (S.ph === 'name') {
      nameFrame(time);
    } else {
      // fin: reinicio rápido sin pasar por el título, o vuelta al attract si nadie juega
      sc.goIdle.setText(`volviendo al título en ${Math.max(0, Math.ceil((S.idle - time) / 1000))}`);
      if (time > S.lock && prs('START1')) begin(1);
      else if (time > S.lock && prs('START2')) begin(2);
      else if (time > S.idle) toTitle();
    }
  }
  if (S.ph === 'play' || S.ph === 'count') hud();
  draw();
  for (const k in CTL.pressed) CTL.pressed[k] = false;
}

function hud() {
  const h = Math.min(hour(), END_H);
  const hh = String(Math.floor(h)).padStart(2, '0');
  const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
  sc.clock.setText(
    S.dd ? `${TXT.ddClock} · ${Math.max(0, Math.ceil((DD_MS - S.el + S.dd) / 1000))}s` : `HORA ${hh}:${mm} / 36:00`,
  );
  for (const p of S.P) {
    const l = Math.max(0, p.lives);
    const sp = S.n > 1 ? ' ' : '   ';
    p.hud.setText(
      `${p.id} ${String(p.score).padStart(6, '0')}${sp}CAFÉ ${'■'.repeat(l)}${'□'.repeat(3 - l)}` +
        `${sp}PISOS ${p.floors.length - 1}` + (p.combo > 1 ? `${sp}x${1 + Math.min(p.combo, 4)}` : ''),
    );
    if (p.elim) p.elim[2].setText(`${String(p.score).padStart(6, '0')} PTS · ALTURA MÁX ${p.maxH}`);
  }
}

function slab(g, x, y, w, h, a, col, al = 1, bc = C.ink, bw = 2) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => ({
    x: x + u * c - v * s,
    y: y + u * s + v * c,
  }));
  g.fillStyle(col, al);
  g.fillPoints(pts, true);
  g.lineStyle(bw, bc, al);
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
  const oy = (Math.random() - 0.5) * sh + p.kick;
  const x0 = p.cx - p.vw / 2;
  const SY = (y) => GY - (y - p.cam) + oy;

  // cielo según la hora: degradé en bandas + estrellas de noche
  const [top, hor, st] = sky(S.dd ? END_H : hour());
  for (let i = 0; i < 10; i++) {
    bg.fillStyle(mix(top, hor, i / 9), 1);
    bg.fillRect(x0, i * 60, p.vw, 60);
  }
  if (st > 0.02) {
    for (let i = 0; i < 28; i++) {
      bg.fillStyle(0xffffff, st * (0.4 + 0.6 * ((i * 7) % 5) / 4));
      bg.fillRect(x0 + ((i * 137) % p.vw), (i * 89 + p.cam * 0.15) % (H - 60), 2, 2);
    }
  }
  // Demo Day: focos sobre la torre
  if (S.dd) {
    const sw = Math.sin(S.el / 700) * 50;
    for (const [fx, d] of [[x0 + 30, 1], [x0 + p.vw - 30, -1]]) {
      bg.fillStyle(0xffffff, 0.07);
      bg.fillTriangle(fx, 0, p.cx + d * sw - 70, GY, p.cx + d * sw + 70, GY);
    }
  }
  // rejilla de fondo (sube con la cámara)
  bg.lineStyle(1, 0xffffff, 0.04);
  for (let y = Math.floor(p.cam / 40) * 40; SY(y) > -40; y += 40) bg.lineBetween(x0, SY(y), x0 + p.vw, SY(y));
  // suelo
  bg.fillStyle(0x0d0f14, 1);
  bg.fillRect(x0, SY(0), p.vw, H);
  bg.fillStyle(C.lime, 0.5);
  bg.fillRect(x0, SY(0), p.vw, 2);
  // marcas de altura cada 5 pisos
  for (let n = 5; n <= p.maxH + 5; n += 5) {
    const y = SY(n * FH * p.k);
    if (!p.mk[n]) sc.bgrp.add((p.mk[n] = txt(0, 0, n + '', 11, '#6b7390').setOrigin(0, 1)));
    const m = p.mk[n];
    m.setPosition(x0 + 6, y - 2).setVisible(y > ROPE_Y && y < H);
    bg.fillStyle(0xffffff, 0.07);
    bg.fillRect(x0, y, p.vw, 1);
  }

  // escombros: detrás de la torre (capa trasera), desvaneciéndose
  for (const f of p.fall) {
    const x = ox + f.x;
    const y = SY(f.y + f.h / 2);
    slab(bg, x, y, f.w, f.h, f.a, f.col, f.al, f.bc, f.bw);
    f.t.setPosition(x, y).setRotation(f.a).setAlpha(f.al);
  }

  // torre (posiciones calculadas en chain)
  for (const f of p.floors) {
    // riesgo Jenga: tinte hacia rojo + vibración proporcional
    const rk = f.rk || 0;
    const x = ox + f.cx + (rk > RISK_SHOW ? (Math.random() - 0.5) * rk * 6 : 0);
    const y = SY(f.cy);
    const q = f.sq || 0; // squash al aterrizar
    const rr = rk > RISK_SHOW ? (rk - RISK_SHOW) / (1 - RISK_SHOW) : 0;
    // en riesgo: tinte rojo + borde rojo que parpadea más rápido cuanto mayor el riesgo
    const blink = rr && Math.sin(S.el / (120 - rr * 70)) > -0.2;
    slab(
      g, x, y + q * 3, f.w * (1 + 0.1 * q), f.h * (1 - 0.25 * q), f.a,
      rr ? mix(f.col, RISK_COL, 0.15 + rr * 0.55) : f.col, p.dead ? 0.35 : 1,
      blink ? RISK_BORDER : f.bc, blink ? 3 : f.bw,
    );
    f.t.setPosition(x, y + q * 3).setRotation(f.a).setAlpha(p.dead ? 0.35 : 1).setScale(1 + 0.1 * q, 1 - 0.25 * q);
  }

  const c = p.cur;
  // WiFi caída / corte de luz: la grúa y el piso colgando parpadean
  const ca = efx(p) === 'blind' && c && c.st === 'hang' ? (Math.sin(S.el / 110) > 0.55 ? 1 : 0.06) : 1;
  if (c && ca > 0.5) {
    const x = ox + c.x;
    const y = SY(c.y + c.h / 2);
    if (c.st === 'hang') {
      // cable desde el riel (bajo el HUD) hasta el piso colgando
      g.lineStyle(2, C.lime2, 0.8);
      g.lineBetween(x, ROPE_Y, x, y - c.h / 2);
      g.fillStyle(C.lime2, 1);
      g.fillRect(x - 8, ROPE_Y - 4, 16, 6);
    }
    if (p.combo > 1 || c.pw) {
      // racha de perfectos o power-up: el piso colgando brilla
      g.lineStyle(3, c.pw ? PW_COL : C.lime, 0.5 + 0.4 * Math.sin(S.el / 70));
      g.strokeRect(x - c.w / 2 - 5, y - c.h / 2 - 5, c.w + 10, c.h + 10);
    }
    slab(g, x, y, c.w, c.h, 0, c.col, 1, c.bc, c.bw);
    c.t.setPosition(x, y).setRotation(0).setAlpha(1);
  } else if (c) c.t.setAlpha(0);

  for (const q of p.parts) {
    g.fillStyle(q.c, Math.min(1, q.l * 1.5));
    g.fillRect(ox + q.x - q.s / 2, SY(q.y) - q.s / 2, q.s, q.s);
  }
  for (const q of p.rings) {
    g.lineStyle(3, C.lime, q.l);
    g.strokeCircle(ox + q.x, SY(q.y), q.r);
  }

  // tarjeta tipo notificación de Slack detrás del evento
  const ea = p.evT.alpha;
  if (ea > 0.02 && p.evT.visible) {
    const eh = p.subT.y + p.subT.height - 58 + 8;
    g.fillStyle(C.ink, 0.88 * ea);
    g.fillRect(x0 + 14, 58, p.vw - 28, eh);
    g.fillStyle(p.evc || EV_COL.slack, ea);
    g.fillRect(x0 + 14, 58, 5, eh);
  }

  if (p.fl > 0.01) {
    sc.hg.fillStyle(p.flc, p.fl * 0.35);
    sc.hg.fillRect(x0, 0, p.vw, H);
  }

  // riel de la grúa
  sc.hg.fillStyle(C.lime3, 0.6);
  sc.hg.fillRect(x0 + 8, ROPE_Y - 2, p.vw - 16, 2);

  if (S.ph !== 'play' && S.ph !== 'count') return; // sin HUD fuera de la partida
  // barra de REFACTOR
  const r = clamp(1 - (p.rf - S.el) / 7000, 0, 1);
  sc.hg.fillStyle(C.lime3, 1);
  sc.hg.fillRect(x0 + 12, 55, 90, 5);
  sc.hg.fillStyle(r >= 1 ? C.lime : C.lime2, 1);
  sc.hg.fillRect(x0 + 12, 55, 90 * r, 5);
}

// ---------- leaderboard (top 10) ----------
// Usa window.platanusArcadeStorage; si no existe, localStorage; si falla, memoria.
// Todo dato leído se valida (la forma puede haber cambiado entre versiones).

const TOP_KEY = 'mvp36-top10';
const TOP_N = 10;
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-';
let TOP = [];
const MEM = {};

function store() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(k) {
      try {
        const r = window.localStorage.getItem(k);
        return r === null ? { found: false } : { found: true, value: JSON.parse(r) };
      } catch (e) {
        return k in MEM ? { found: true, value: MEM[k] } : { found: false };
      }
    },
    async set(k, v) {
      try {
        window.localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {
        MEM[k] = v;
      }
    },
  };
}

// evita quedar colgado si el puente de storage no responde
const withTimeout = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

function cleanTop(v) {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (e) =>
        e && typeof e === 'object' && typeof e.n === 'string' && /^[A-Z0-9.\-?]{1,3}$/.test(e.n) &&
        Number.isFinite(e.s) && e.s >= 0 && e.s < 1e9,
    )
    .map((e) => ({
      n: e.n,
      s: Math.floor(e.s),
      h: Number.isFinite(e.h) ? clamp(Math.floor(e.h), 0, 999) : 0,
      d: Number.isFinite(e.d) ? e.d : 0,
    }))
    .sort((a, b) => b.s - a.s || a.d - b.d) // empate: el más antiguo primero
    .slice(0, TOP_N);
}

async function loadTop() {
  try {
    const r = await withTimeout(store().get(TOP_KEY), 2500);
    return cleanTop(r && r.found ? r.value : MEM[TOP_KEY] || []);
  } catch (e) {
    return cleanTop(MEM[TOP_KEY] || TOP);
  }
}

// relee lo último guardado, agrega las entradas nuevas y guarda
async function saveTop(add) {
  const merged = cleanTop((await loadTop()).concat(add));
  MEM[TOP_KEY] = merged;
  try {
    await withTimeout(store().set(TOP_KEY, merged), 2500);
    return { top: merged, ok: true };
  } catch (e) {
    return { top: merged, ok: false };
  }
}

const qualifies = (s) => s > 0 && (TOP.length < TOP_N || s > TOP[TOP_N - 1].s);

function topLines(mark) {
  if (!TOP.length) return TXT.topEmpty;
  return TOP.map(
    (e, i) =>
      `${String(i + 1).padStart(2, '0')}  ${e.n.padEnd(3)}  ${String(e.s).padStart(6, '0')}  ${String(e.h).padStart(3)} pisos` +
      (mark && mark.includes(e.d) ? ' ◄' : '  '),
  ).join('\n');
}

// ---------- ingreso de iniciales (estilo arcade) ----------

function startNames(qs, time) {
  S.ph = 'name';
  S.nameEnd = time + 30000; // si nadie confirma, se guarda solo
  S.t1 = Date.now();
  sc.goStart.setText('');
  sc.goIdle.setText('');
  sc.goTop.setText('');
  S.ent = qs.map((p) => {
    const x = S.n > 1 ? 200 + 400 * p.i : W / 2;
    const e = { p, l: [0, 0, 0], k: 0, done: false, rt: 0, touched: false };
    e.lab = txt(x, 280, (S.n > 1 ? p.id + ' · ' : '') + TXT.rec, 20).setOrigin(0.5);
    e.ch = [0, 1, 2].map((i) => txt(x + (i - 1) * 56, 350, 'A', 52, '#f7ffd8').setOrigin(0.5));
    e.hint = txt(x, 425, TXT.hint, 13, '#a8c700').setOrigin(0.5).setLineSpacing(4);
    sc.go.add([e.lab, ...e.ch, e.hint]);
    return e;
  });
}

function nameFrame(time) {
  for (const e of S.ent) {
    const id = e.p.id;
    if (e.done || time < S.lock) continue;
    if (LI[id] > S.t1) e.touched = true; // tocó algo durante el ingreso
    // ↑↓ cambia la letra (con auto-repetición al mantener)
    let dy = 0;
    if (prs(id + '_U')) dy = 1;
    else if (prs(id + '_D')) dy = -1;
    if (dy) e.rt = time + 380;
    else if ((CTL.held[id + '_U'] || CTL.held[id + '_D']) && time >= e.rt) {
      dy = CTL.held[id + '_U'] ? 1 : -1;
      e.rt = time + 90;
    }
    if (dy) {
      e.l[e.k] = (e.l[e.k] + dy + CHARS.length) % CHARS.length;
      SFX.key();
    }
    // ←→ mueve el cursor; botón 2 retrocede; botón 1 confirma la letra
    if (prs(id + '_R')) e.k = Math.min(2, e.k + 1);
    if (prs(id + '_L') || prs(id + '_2')) e.k = Math.max(0, e.k - 1);
    if (prs(id + '_1')) {
      SFX.ok();
      if (e.k < 2) e.k++;
      else e.done = true;
    }
    if (prs(id === 'P1' ? 'START1' : 'START2')) e.done = true;
  }
  // se acabó el tiempo: quien nunca tocó nada queda como '???'
  if (time > S.nameEnd) {
    for (const e of S.ent) {
      if (!e.done) {
        e.done = true;
        e.anon = !e.touched;
      }
    }
  }
  const blink = Math.floor(time / 180) % 2;
  for (const e of S.ent) {
    e.ch.forEach((t, i) => {
      const cur = !e.done && i === e.k;
      t.setText(CHARS[e.l[i]])
        .setColor(e.done ? '#e1ff00' : cur ? (blink ? '#e1ff00' : '#5d6e12') : '#f7ffd8')
        .setScale(cur ? 1.15 : 1);
    });
    if (e.done) e.hint.setText(TXT.ready);
  }
  if (S.ent.every((e) => e.done)) saveNames(time);
}

function saveNames(time) {
  S.ph = 'over';
  S.lock = time + 800;
  S.idle = time + 20000;
  const now = Date.now();
  const add = S.ent.map((e, j) => ({
    n: e.anon ? '???' : e.l.map((i) => CHARS[i]).join(''), s: e.p.score, h: e.p.maxH, d: now + j,
  }));
  for (const e of S.ent) for (const o of [e.lab, ...e.ch, e.hint]) o.destroy();
  S.ent = [];
  S.mark = add.map((a) => a.d);
  TOP = cleanTop(TOP.concat(add)); // se muestra al tiro; luego se confirma con lo guardado
  showTop(TXT.saving);
  sc.goStart.setText(TXT.again);
  SFX.record();
  saveTop(add).then((r) => {
    TOP = r.top;
    if (S.ph === 'over') showTop(r.ok ? TXT.saved : TXT.local);
  });
}

function showTop(status) {
  sc.goTop.setText(`TOP 10${status ? '   ' + status : ''}\n${topLines(S.mark)}`);
}

// ---------- sonido ----------

// Todo sintetizado con Web Audio: osciladores + un buffer de ruido blanco.
let AC;
let MG;
let NOISE;
function audio() {
  if (!AC) {
    try {
      AC = sc.sound.context;
      MG = AC.createGain();
      MG.gain.value = 0.7;
      MG.connect(AC.destination);
      NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = NOISE.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      AC = null;
    }
  }
  return AC;
}
const at = (d) => (audio() ? AC.currentTime : 0) + d;

function tone(f, d, type, v, f2, t0) {
  if (S && S.ph === 'title') return; // attract mode en silencio
  if (!audio()) return;
  try {
    const o = AC.createOscillator();
    const g = AC.createGain();
    const t = t0 || AC.currentTime;
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g);
    g.connect(MG);
    o.start(t);
    o.stop(t + d);
  } catch (e) {}
}

// ruido filtrado (golpes, derrumbes, hi-hats)
function noise(d, v, f, f2, t0) {
  if (S && S.ph === 'title') return;
  if (!audio()) return;
  try {
    const s = AC.createBufferSource();
    const b = AC.createBiquadFilter();
    const g = AC.createGain();
    const t = t0 || AC.currentTime;
    s.buffer = NOISE;
    b.frequency.setValueAtTime(f, t);
    if (f2) b.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(b);
    b.connect(g);
    g.connect(MG);
    s.start(t, Math.random() * 0.5);
    s.stop(t + d);
  } catch (e) {}
}

const arp = (fs, step, d, type, v) => fs.forEach((f, i) => tone(f, d, type, v, 0, at(i * step)));
const SFX = {
  beep: (hi) => tone(hi ? 880 : 440, hi ? 0.3 : 0.12, 'square', 0.1, hi ? 1320 : 0),
  drop: () => tone(520, 0.08, 'square', 0.05, 300),
  land: () => {
    noise(0.12, 0.3, 900, 200);
    tone(140, 0.15, 'sine', 0.3, 50);
  },
  // arpegio que sube de tono con el combo
  perf: (c) => {
    SFX.land();
    const b = 523 * Math.pow(2, Math.min(c, 8) / 12);
    arp([0, 4, 7, 12].map((s) => b * Math.pow(2, s / 12)), 0.05, 0.12, 'square', 0.06);
  },
  slip: () => {
    tone(400, 0.45, 'sawtooth', 0.08, 70);
    noise(0.3, 0.1, 600, 100);
  },
  crash: () => {
    noise(0.6, 0.4, 1200, 80);
    tone(90, 0.6, 'sine', 0.35, 30);
  },
  creak: (r) => tone(rnd(70, 110), 0.12, 'sawtooth', 0.04 + r * 0.08, rnd(40, 60)),
  // "knock-knock" de notificación + retumbo
  alarm: () => {
    arp([880, 660], 0.16, 0.12, 'triangle', 0.12);
    noise(1.2, 0.15, 200, 60);
  },
  refactor: () => {
    tone(300, 0.3, 'triangle', 0.12, 1200);
    tone(1500, 0.15, 'sine', 0.05, 3000, at(0.15));
  },
  denied: () => tone(120, 0.08, 'square', 0.05),
  mile: () => arp([784, 988, 1175, 1568], 0.08, 0.18, 'square', 0.07),
  die: () => {
    noise(0.9, 0.45, 1500, 60);
    tone(150, 0.8, 'sawtooth', 0.15, 40);
  },
  over: () => arp([523, 440, 349, 262], 0.18, 0.25, 'triangle', 0.12),
  record: () => arp([523, 659, 784, 1047, 1319], 0.09, 0.2, 'square', 0.07),
  key: () => tone(900, 0.04, 'square', 0.05),
  ok: () => tone(1200, 0.06, 'square', 0.06),
};

// Música chiptune: Am - F - C - G (bajo, arpegio, bombo, caja, hi-hat).
// El tempo sube con la hora; bombo desde EASY_H y caja desde la hora 10.
const PROG = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
function music() {
  if (!audio()) return;
  const now = AC.currentTime;
  if (!S.mt || S.mt < now - 0.2) S.mt = now + 0.05;
  const h = hour();
  const sd = 15 / (105 + h * 1.6); // duración de una semicorchea
  const nt = (st, o) => 110 * Math.pow(2, st / 12 + o);
  while (S.mt < now + 0.15) {
    const st = S.ms++ % 64;
    const ch = PROG[st >> 4];
    const i = st % 16;
    const t = S.mt;
    if (i % 2 === 0) tone(nt(ch[0], (i % 4) / 2), sd * 1.8, 'triangle', 0.09, 0, t);
    tone(nt(ch[(h > 24 ? i * 2 : i) % 3], 2), sd * 0.9, 'square', 0.018, 0, t);
    if (h >= EASY_H && i % 8 === 0) tone(150, 0.12, 'sine', 0.25, 45, t);
    if (h >= 10 && i % 8 === 4) noise(0.1, 0.09, 3000, 0, t);
    if (i % 2) noise(0.03, 0.03, 8000, 0, t);
    S.mt += sd;
  }
}
