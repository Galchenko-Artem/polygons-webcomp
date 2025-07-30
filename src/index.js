const SVG = 'http://www.w3.org/2000/svg';

/* ---------- <poly-item> ---------- */
class PolyItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    const points = JSON.parse(this.dataset.points);
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('width', 80);
    svg.setAttribute('height', 80);
    const poly = document.createElementNS(SVG, 'polygon');
    poly.setAttribute('points', points.map(p => p.join(',')).join(' '));
    poly.setAttribute('fill', 'var(--accent)');
    svg.append(poly);
    this.shadowRoot.append(svg);
    this.draggable = true;
    this.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', this.dataset.points);
      dragged = this.closest('foreignObject') || this;
    });
  }
}
customElements.define('poly-item', PolyItem);

/* ---------- helpers ---------- */
const $ = sel => document.getElementById(sel);
const bufferZone = $('buffer-zone');
const workZone = $('work-zone');
const workSvg = $('work-svg');
const grid = $('grid');
const viewport = $('viewport');
let dragged = null;

/* ---------- генерация ---------- */
function rndPoly() {
  const v = 3 + Math.floor(Math.random() * 5);
  const pts = [];
  for (let i = 0; i < v; i++) {
    const a = ((Math.PI * 2) / v) * i + Math.random() * 0.5;
    const d = 20 + Math.random() * 15;
    pts.push([40 + Math.cos(a) * d, 40 + Math.sin(a) * d]);
  }
  return pts;
}
function createPolygons() {
  bufferZone.replaceChildren();
  const n = 5 + Math.floor(Math.random() * 16);
  for (let i = 0; i < n; i++) {
    const el = document.createElement('poly-item');
    el.dataset.points = JSON.stringify(rndPoly());
    bufferZone.append(el);
  }
  save();
}

/* ---------- drag & drop ---------- */
[bufferZone, workZone].forEach(z =>
  z.addEventListener('dragover', e => e.preventDefault())
);
bufferZone.addEventListener('drop', e => {
  e.preventDefault();
  if (!dragged) return;
  bufferZone.append(dragged.nodeName === 'poly-item' ? dragged : dragged.firstElementChild);
  dragged.remove();
  save();
  dragged = null;
});

workZone.addEventListener('drop', e => {
  e.preventDefault();
  const json = e.dataTransfer.getData('application/json');
  if (!json) return;
  const pt = workSvg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const loc = pt.matrixTransform(viewport.getScreenCTM().inverse());
  const fo = document.createElementNS(SVG, 'foreignObject');
  fo.setAttribute('x', loc.x - 40);
  fo.setAttribute('y', loc.y - 40);
  fo.setAttribute('width', 80);
  fo.setAttribute('height', 80);
  const el = document.createElement('poly-item');
  el.dataset.points = json;
  fo.append(el);
  viewport.append(fo);
  dragged?.remove();
  save();
  dragged = null;
});

/* ---------- zoom + pan ---------- */
let scale = 1,
  ox = 0,
  oy = 0,
  pan = false,
  sx = 0,
  sy = 0;

function gridRedraw() {
  grid.replaceChildren();
  const step = 40 * scale;
  const w = workSvg.clientWidth,
    h = workSvg.clientHeight;
  const startX = ((-ox % step) + step) % step;
  const startY = ((-oy % step) + step) % step;
  for (let x = startX, n = 0; x <= w; x += step, n++) {
    addLine(x, 0, x, h);
    addLabel(x + 2, h - 4, n * 10);
  }
  for (let y = startY, n = 0; y <= h; y += step, n++) {
    addLine(0, y, w, y);
    addLabel(2, y - 2, n * 10);
  }
}
function addLine(x1, y1, x2, y2) {
  const l = document.createElementNS(SVG, 'line');
  l.setAttribute('x1', x1);
  l.setAttribute('y1', y1);
  l.setAttribute('x2', x2);
  l.setAttribute('y2', y2);
  l.setAttribute('stroke', 'var(--grid)');
  grid.append(l);
}
function addLabel(x, y, text) {
  const t = document.createElementNS(SVG, 'text');
  t.textContent = text;
  t.setAttribute('x', x);
  t.setAttribute('y', y);
  t.setAttribute('font-size', 10);
  t.setAttribute('fill', 'var(--text)');
  grid.append(t);
}

function apply() {
  viewport.setAttribute('transform', `translate(${ox},${oy}) scale(${scale})`);
  gridRedraw();
}

workSvg.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  const prev = scale;
  scale = Math.max(0.2, Math.min(3, scale * factor));
  const r = workSvg.getBoundingClientRect();
  const cx = e.clientX - r.left,
    cy = e.clientY - r.top;
  ox = cx - ((cx - ox) * scale) / prev;
  oy = cy - ((cy - oy) * scale) / prev;
  apply();
});

workSvg.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  pan = true;
  sx = e.clientX;
  sy = e.clientY;
});
window.addEventListener('mousemove', e => {
  if (!pan) return;
  ox += e.clientX - sx;
  oy += e.clientY - sy;
  sx = e.clientX;
  sy = e.clientY;
  apply();
});
window.addEventListener('mouseup', () => (pan = false));

/* ---------- localStorage ---------- */
function save() {
  const buf = Array.from(bufferZone.children, el => el.dataset.points);
  const wrk = Array.from(
    viewport.querySelectorAll('foreignObject'),
    fo => ({
      p: fo.firstElementChild.dataset.points,
      x: fo.getAttribute('x'),
      y: fo.getAttribute('y'),
    })
  );
  localStorage.setItem('polygons', JSON.stringify({ buf, wrk, scale, ox, oy }));
}
function load() {
  const raw = localStorage.getItem('polygons');
  if (!raw) return;
  try {
    const { buf, wrk, scale: s, ox: tx, oy: ty } = JSON.parse(raw);
    buf.forEach(str => addPolyToBuffer(str));
    wrk.forEach(({ p, x, y }) =>
      addPolyToWork(p, +x + 40, +y + 40)
    );
    scale = s;
    ox = tx;
    oy = ty;
    apply();
  } catch (e) {
    console.warn('restore error', e);
  }
}
function addPolyToBuffer(str) {
  const el = document.createElement('poly-item');
  el.dataset.points = str;
  bufferZone.append(el);
}

/* ---------- bootstrap ---------- */
window.addEventListener('load', () => {
  $('create-btn').onclick = createPolygons;
  $('save-btn').onclick = save;
  $('reset-btn').onclick = () => {
    localStorage.removeItem('polygons');
    location.reload();
  };
  gridRedraw();
  load();
});
