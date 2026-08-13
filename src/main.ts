/**
 * Arís Vista — Model Training dashboard
 * Hand-built SVG charts, count-up animations and light interactions.
 * Frontend-only by default, but reads real GPU stats via Tauri when available.
 */

import { invoke } from "@tauri-apps/api/core";

interface GpuStats {
  name: string;
  vendor: string;
  utilization: number | null;
  vram_used_mb: number | null;
  vram_total_mb: number | null;
  temperature_c: number | null;
  real: boolean;
}

interface CpuStats {
  name: string;
  utilization: number | null;
  cores: number | null;
  real: boolean;
}

interface RamStats {
  used_mb: number | null;
  total_mb: number | null;
  real: boolean;
}

interface SystemStats {
  gpu: GpuStats;
  cpu: CpuStats;
  ram: RamStats;
}

/* ===================== SVG helpers ===================== */

function svgEl(
  ns: string,
  name: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS(ns, name) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Build an SVG sparkline from a data series. */
function sparkline(
  container: SVGSVGElement | null,
  data: number[],
  color: string,
  fill = false,
): void {
  if (!container) return;
  const w = 120;
  const h = 40;
  const pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });

  const pathD = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  if (fill) {
    const areaD = `${pathD} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
    const area = svgEl(SVG_NS, "path", {
      d: areaD,
      class: "area",
      fill: color,
      opacity: 0.15,
    });
    container.appendChild(area);
  }

  const line = svgEl(SVG_NS, "path", { d: pathD, stroke: color });
  container.appendChild(line);
}

/** Smooth a series of points into a cubic bezier path (for area/line charts). */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  const d: string[] = [`M${pts[0][0]},${pts[0][1]}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(
      `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`,
    );
  }
  return d.join(" ");
}

/* ===================== Line chart ===================== */

interface NamedSeries {
  key: string;
  stroke: string;
  area: string;
  data: number[];
}

function makeLineChart(host: HTMLElement | null, series: NamedSeries[]): void {
  if (!host) return;
  const w = 620;
  const h = 225;
  const ml = 40;
  const mb = 28;
  const mt = 12;
  const mr = 16;
  const iw = w - ml - mr;
  const ih = h - mt - mb;

  const maxVal =
    Math.ceil(Math.max(...series.flatMap((s) => s.data)) / 0.2) * 0.2;

  const x = (i: number) => ml + (i / (series[0].data.length - 1)) * iw;
  const y = (v: number) => mt + ih - (v / maxVal) * ih;

  const svg = svgEl(SVG_NS, "svg", {
    viewBox: `0 0 ${w} ${h}`,
    "aria-label": "Training progress chart",
  }) as SVGSVGElement;

  // gradients
  const defs = svgEl(SVG_NS, "defs", {});
  series.forEach((s) => {
    const grad = svgEl(SVG_NS, "linearGradient", {
      id: `${s.key}Grad`,
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    });
    grad.appendChild(
      svgEl(SVG_NS, "stop", {
        offset: "0%",
        "stop-color": s.stroke,
        "stop-opacity": 0.6,
      }),
    );
    grad.appendChild(
      svgEl(SVG_NS, "stop", {
        offset: "100%",
        "stop-color": s.stroke,
        "stop-opacity": 0,
      }),
    );
    defs.appendChild(grad);
  });
  svg.appendChild(defs);

  // horizontal grid + y labels
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (maxVal / ticks) * i;
    const yy = y(v);
    svg.appendChild(
      svgEl(SVG_NS, "line", {
        class: "grid-line",
        x1: ml,
        y1: yy,
        x2: w - mr,
        y2: yy,
      }),
    );
    svg.appendChild(
      svgEl(SVG_NS, "text", {
        class: "tick",
        x: ml - 8,
        y: yy + 4,
        "text-anchor": "end",
        content: v.toFixed(2) === "0.00" ? "0" : v.toFixed(2),
      }),
    );
  }

  const n = series[0].data.length;
  // x axis labels every few epochs
  for (let i = 0; i < n; i += 8) {
    svg.appendChild(
      svgEl(SVG_NS, "text", {
        class: "tick",
        x: x(i),
        y: h - 8,
        "text-anchor": "middle",
        content: `E${i}`,
      }),
    );
  }
  svg.appendChild(
    svgEl(SVG_NS, "text", {
      class: "axis-label",
      x: x(n - 1),
      y: h - 8,
      "text-anchor": "middle",
      content: "E42",
    }),
  );

  series.forEach((s) => {
    const pts: [number, number][] = s.data.map((v, i) => [x(i), y(v)]);
    const lineD = smoothPath(pts);

    const areaD = `${lineD} L${x(n - 1)},${mt + ih} L${x(0)},${mt + ih} Z`;
    svg.appendChild(
      svgEl(SVG_NS, "path", {
        class: `${s.key}-area`,
        d: areaD,
        fill: `url(#${s.key}Grad)`,
      }),
    );

    // glow under the line
    svg.appendChild(
      svgEl(SVG_NS, "path", {
        class: `${s.key}-path`,
        d: lineD,
        stroke: s.stroke,
        opacity: 0.35,
        "stroke-width": 6,
      }),
    );
    svg.appendChild(
      svgEl(SVG_NS, "path", {
        class: `${s.key}-path`,
        d: lineD,
        stroke: s.stroke,
      }),
    );

    // end point dot
    const last = pts[pts.length - 1];
    svg.appendChild(
      svgEl(SVG_NS, "circle", {
        cx: last[0],
        cy: last[1],
        r: 4,
        fill: s.stroke,
      }),
    );
    svg.appendChild(
      svgEl(SVG_NS, "circle", {
        cx: last[0],
        cy: last[1],
        r: 4,
        fill: s.stroke,
        opacity: 0.3,
        "stroke-width": 6,
      }),
    );
  });

  host.innerHTML = "";
  host.appendChild(svg);
}

/* ===================== Donut chart ===================== */

function makeDonut(host: HTMLElement | null, percent: number): void {
  if (!host) return;
  host.innerHTML = "";
  const size = 180;
  const r = 78;
  const c = 2 * Math.PI * r;
  const svg = svgEl(SVG_NS, "svg", {
    viewBox: `0 0 ${size} ${size}`,
    width: size,
    height: size,
  }) as SVGSVGElement;

  const defs = svgEl(SVG_NS, "defs", {});
  const grad = svgEl(SVG_NS, "linearGradient", {
    id: "donutGrad",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1",
  });
  grad.appendChild(
    svgEl(SVG_NS, "stop", { offset: "0%", "stop-color": "#ffffff" }),
  );
  grad.appendChild(
    svgEl(SVG_NS, "stop", { offset: "100%", "stop-color": "#9a9a9a" }),
  );
  defs.appendChild(grad);
  svg.appendChild(defs);

  const track = svgEl(SVG_NS, "circle", {
    class: "donut-circle donut-track",
    cx: size / 2,
    cy: size / 2,
    r,
    "stroke-dasharray": c,
    "stroke-dashoffset": 0,
  });
  const fg = svgEl(SVG_NS, "circle", {
    class: "donut-circle donut-fg",
    cx: size / 2,
    cy: size / 2,
    r,
    "stroke-dasharray": c,
    "stroke-dashoffset": c,
    transform: `rotate(-90 ${size / 2} ${size / 2})`,
  });
  svg.appendChild(track);
  svg.appendChild(fg);
  host.appendChild(svg);

  requestAnimationFrame(() => {
    fg.setAttribute("stroke-dashoffset", String(c - (c * percent) / 100));
  });
}

/* ===================== Bar chart ===================== */

function makeBarChart(host: HTMLElement | null): void {
  if (!host) return;
  const data = [
    { label: "B1", value: 620 },
    { label: "B2", value: 890 },
    { label: "B4", value: 1420 },
    { label: "B8", value: 2380 },
    { label: "B16", value: 3110 },
    { label: "B32", value: 3870 },
  ];
  const w = 620;
  const h = 225;
  const ml = 46;
  const mb = 28;
  const mt = 12;
  const mr = 16;
  const iw = w - ml - mr;
  const ih = h - mt - mb;
  const maxV = Math.max(...data.map((d) => d.value));

  const x = (i: number) => ml + (i / data.length) * iw + iw / data.length / 2;
  const y = (v: number) => mt + ih - (v / maxV) * ih;

  const svg = svgEl(SVG_NS, "svg", {
    viewBox: `0 0 ${w} ${h}`,
    "aria-label": "Batch throughput chart",
  }) as SVGSVGElement;

  // grid
  for (let i = 0; i <= 4; i++) {
    const v = (maxV / 4) * i;
    const yy = y(v);
    svg.appendChild(
      svgEl(SVG_NS, "line", {
        class: "grid-line",
        x1: ml,
        y1: yy,
        x2: w - mr,
        y2: yy,
      }),
    );
    svg.appendChild(
      svgEl(SVG_NS, "text", {
        class: "tick",
        x: ml - 8,
        y: yy + 4,
        "text-anchor": "end",
        content: String(Math.round(v)),
      }),
    );
  }

  const barW = (iw / data.length) * 0.52;

  data.forEach((d, i) => {
    const cx = x(i);
    const bh = y(d.value) - (mt + ih);
    const g = svgEl(SVG_NS, "g", { class: "bar-group" });
    const rect = svgEl(SVG_NS, "rect", {
      x: cx - barW / 2,
      y: y(d.value),
      width: barW,
      height: Math.abs(bh),
      rx: 7,
      fill: "url(#usrBarGrad)",
    });
    g.appendChild(rect);
    g.appendChild(
      svgEl(SVG_NS, "text", {
        class: "tick",
        x: cx,
        y: h - 8,
        "text-anchor": "middle",
        content: d.label,
      }),
    );
    svg.appendChild(g);
  });

  const defs = svgEl(SVG_NS, "defs", {});
  const grad = svgEl(SVG_NS, "linearGradient", {
    id: "usrBarGrad",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1",
  });
  grad.appendChild(
    svgEl(SVG_NS, "stop", { offset: "0%", "stop-color": "#e6e6e6" }),
  );
  grad.appendChild(
    svgEl(SVG_NS, "stop", { offset: "100%", "stop-color": "#999999" }),
  );
  defs.appendChild(grad);
  svg.insertBefore(defs, svg.firstChild);

  // value labels above bars
  data.forEach((d, i) => {
    const cx = x(i);
    svg.appendChild(
      svgEl(SVG_NS, "text", {
        class: "axis-label",
        x: cx,
        y: y(d.value) - 8,
        "text-anchor": "middle",
        content: String(d.value),
      }),
    );
  });

  host.innerHTML = "";
  host.appendChild(svg);
}

/* ===================== Count-up animation ===================== */

function animateCount(el: Element): void {
  const target = parseFloat(el.getAttribute("data-count") || "0");
  const decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
  const isPct = !!el.querySelector(".unit");
  const duration = 1500;
  const start = performance.now();

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = target * eased;
    const text = decimals > 0 ? val.toFixed(decimals) : String(Math.round(val));
    el.childNodes[0].textContent = text;
    if (t < 1) requestAnimationFrame(step);
    else void isPct;
  };
  requestAnimationFrame(step);
}

/* ===================== Routing (modular pages) ===================== */

type Route = "home" | "overview" | "train" | "test";

import { homeView } from "./pages/home";
import { overviewView } from "./pages/overview";
import { trainView } from "./pages/train";
import { testView } from "./pages/test";

const VIEW_HTML: Record<Route, string> = {
  home: homeView,
  overview: overviewView,
  train: trainView,
  test: testView,
};

function setRoute(route: Route): void {
  const root = document.querySelector<HTMLElement>("#app-root");
  if (!root) return;
  root.innerHTML = VIEW_HTML[route];
  root.querySelector<HTMLElement>(".view")?.classList.add("active");

  document.querySelectorAll<HTMLElement>(".nav-item").forEach((n) => {
    n.classList.toggle("active", n.dataset.nav === route);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });

  initViewFeatures(route);
}

function parseRoute(hash: string): Route {
  const clean = hash.replace("#", "") as Route;
  return ["home", "overview", "train", "test"].includes(clean) ? clean : "home";
}

function applyRoute(): void {
  setRoute(parseRoute(window.location.hash));
}

/** Run page-specific setup after a view is (re)rendered. */
function initViewFeatures(route: Route): void {
  if (route === "home") {
    startHomeClock();
  } else if (route === "overview") {
    renderOverviewCharts();
    bindCountUps();
  } else if (route === "train") {
    bindTrainControls();
  } else if (route === "test") {
    bindTestControls();
  }
}

/* ===================== Home clock ===================== */

function greetingForHour(h: number): string {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

let clockInterval: number | null = null;

function updateClock(): void {
  const clockEl = document.querySelector<HTMLElement>("#home-clock");
  const dateEl = document.querySelector<HTMLElement>("#home-date");
  const greetEl = document.querySelector<HTMLElement>("#home-greeting");
  if (!clockEl && !dateEl) return;
  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  if (clockEl) clockEl.textContent = time;
  if (dateEl) dateEl.textContent = date;
  if (greetEl) greetEl.textContent = greetingForHour(now.getHours());
}

function startHomeClock(): void {
  updateClock();
  if (clockInterval !== null) window.clearInterval(clockInterval);
  clockInterval = window.setInterval(updateClock, 1000);
}

/* ===================== GPU meter (real stats via Tauri) ===================== */

function setGpuMeter(pct: number): void {
  const meter = document.querySelector<HTMLElement>("#gpu-meter");
  const label = document.querySelector<HTMLElement>("#gpu-count");
  if (meter) requestAnimationFrame(() => (meter.style.width = `${pct}%`));
  if (label) label.textContent = `${pct}%`;
}

/** Format MB as a human-readable GB string. */
function formatMem(mb: number | null): string {
  if (mb == null) return "—";
  const gb = mb / 1024;
  return gb >= 100 ? `${gb.toFixed(0)} GB` : `${gb.toFixed(1)} GB`;
}

/** Set a labeled meter + value row (generic helper). */
function setMeterRow(
  meterId: string,
  valueId: string,
  pct: number,
  text: string,
): void {
  const meter = document.querySelector<HTMLElement>(`#${meterId}`);
  const value = document.querySelector<HTMLElement>(`#${valueId}`);
  if (meter)
    requestAnimationFrame(
      () => (meter.style.width = `${Math.min(100, Math.max(0, pct))}%`),
    );
  if (value) value.textContent = text;
}

/** Apply real system stats (GPU, CPU, RAM) to the sidebar card. */
function applySystemStats(stats: SystemStats): void {
  // GPU
  const gpuNameEl = document.querySelector<HTMLElement>("#gpu-name");
  if (gpuNameEl) gpuNameEl.textContent = stats.gpu.name || "GPU unavailable";
  setGpuMeter(stats.gpu.utilization ?? 0);
  const vramEl = document.querySelector<HTMLElement>("#vram-val");
  if (vramEl)
    vramEl.textContent = `${formatMem(stats.gpu.vram_used_mb)} / ${formatMem(stats.gpu.vram_total_mb)}`;
  const tempEl = document.querySelector<HTMLElement>("#gpu-temp");
  if (tempEl)
    tempEl.textContent =
      stats.gpu.temperature_c != null ? `${stats.gpu.temperature_c}°C` : "—";

  // CPU
  const cpuNameEl = document.querySelector<HTMLElement>("#cpu-name");
  if (cpuNameEl) cpuNameEl.textContent = stats.cpu.name || "CPU unavailable";
  setMeterRow(
    "cpu-meter",
    "cpu-count",
    stats.cpu.utilization ?? 0,
    `${stats.cpu.utilization ?? 0}%`,
  );
  const cpuCoresEl = document.querySelector<HTMLElement>("#cpu-cores");
  if (cpuCoresEl)
    cpuCoresEl.textContent =
      stats.cpu.cores != null ? `${stats.cpu.cores} cores` : "—";

  // RAM
  const ramUsed = stats.ram.used_mb ?? 0;
  const ramTotal = stats.ram.total_mb ?? 0;
  const ramPct = ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 100) : 0;
  setMeterRow("ram-meter", "ram-count", ramPct, `${ramPct}%`);
  const ramEl = document.querySelector<HTMLElement>("#ram-val");
  if (ramEl)
    ramEl.textContent = `${formatMem(stats.ram.used_mb)} / ${formatMem(stats.ram.total_mb)}`;
}

/** Fetch real system stats from the Tauri backend; fall back to mock data offline. */
async function loadSystemStats(): Promise<void> {
  // Fallback values used when running outside the Tauri runtime.
  const fallback: SystemStats = {
    gpu: {
      name: "RTX A6000 ×4",
      vendor: "NVIDIA",
      utilization: 86,
      vram_used_mb: 172 * 1024,
      vram_total_mb: 192 * 1024,
      temperature_c: 64,
      real: false,
    },
    cpu: {
      name: "Intel Core i9‑13900K",
      utilization: 38,
      cores: 24,
      real: false,
    },
    ram: {
      used_mb: 28 * 1024,
      total_mb: 64 * 1024,
      real: false,
    },
  };

  try {
    const stats = await invoke<SystemStats>("system_stats");
    applySystemStats(stats);
  } catch {
    applySystemStats(fallback);
  }
}

/* ===================== Count-up for stats ===================== */

function bindCountUps(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 },
  );
  document
    .querySelectorAll<HTMLElement>(".stat-value")
    .forEach((el) => observer.observe(el));
}

/* ===================== Charts for Overview ===================== */

const SPARK_DATA: Record<string, number[]> = {
  acc: [28, 34, 41, 48, 55, 63, 70, 78, 86, 94.8],
  loss: [1.2, 1.05, 0.9, 0.78, 0.66, 0.55, 0.47, 0.4, 0.352, 0.312],
  epoch: [8, 12, 16, 20, 24, 28, 32, 36, 40, 42],
  f1: [40, 46, 52, 58, 64, 71, 77, 83, 89, 92.1],
};
const SPARK_COLORS: Record<string, string> = {
  acc: "#ffffff",
  loss: "#d6d6d6",
  epoch: "#c4c4c4",
  f1: "#e8e8e8",
};

function renderOverviewCharts(): void {
  document.querySelectorAll<SVGSVGElement>("svg.spark").forEach((el) => {
    const key = el.dataset.spark;
    if (key && SPARK_DATA[key] && SPARK_COLORS[key]) {
      sparkline(el, SPARK_DATA[key], SPARK_COLORS[key], true);
    }
  });

  const loss = [
    1.35, 1.12, 0.96, 0.84, 0.74, 0.65, 0.58, 0.52, 0.47, 0.42, 0.39, 0.36,
    0.34, 0.326, 0.312,
  ];
  const acc = [
    62, 68, 73, 77, 80, 83, 85, 87.5, 89, 90.4, 91.5, 92.4, 93.2, 94, 94.8,
  ];

  makeLineChart(document.querySelector('[data-chart="line"]'), [
    { key: "train", stroke: "#ffffff", area: "#ffffff", data: loss },
    { key: "val", stroke: "#9a9a9a", area: "#9a9a9a", data: acc },
  ]);
  makeDonut(document.querySelector('[data-chart="donut"]'), 72);
  makeBarChart(document.querySelector('[data-chart="bar"]'));
}

/* ===================== Train simulation ===================== */

interface TrainState {
  epochs: number;
  current: number;
  loss: number;
  acc: number;
  running: boolean;
  timer: number | null;
}

const trainState: TrainState = {
  epochs: 50,
  current: 0,
  loss: 1.5,
  acc: 60,
  running: false,
  timer: null,
};

function trainConsoleLog(msg: string, cls = "ok"): void {
  const consoleEl = document.querySelector<HTMLElement>("#run-console");
  if (!consoleEl) return;
  const line = document.createElement("div");
  line.className = `console-line ${cls}`;
  const now = new Date();
  line.textContent = `${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · ${msg}`;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function updateTrainUI(): void {
  const pct = trainState.epochs
    ? Math.round((trainState.current / trainState.epochs) * 100)
    : 0;
  const set = (id: string, val: string) => {
    const el = document.querySelector<HTMLElement>(`#${id}`);
    if (el) el.textContent = val;
  };
  set("run-pct", `${pct}%`);
  set("run-epoch", `${trainState.current} / ${trainState.epochs}`);
  set("run-loss", trainState.current > 0 ? trainState.loss.toFixed(3) : "—");
  set(
    "run-acc",
    trainState.current > 0 ? `${trainState.acc.toFixed(1)}%` : "—",
  );
  const remaining = trainState.epochs - trainState.current;
  set(
    "run-eta",
    remaining > 0 ? `~${Math.max(1, Math.round(remaining * 0.4))}m` : "done",
  );

  const meter = document.querySelector<HTMLElement>("#run-meter");
  if (meter) meter.style.width = `${pct}%`;
}

function stopTraining(): void {
  trainState.running = false;
  if (trainState.timer !== null) {
    window.clearInterval(trainState.timer);
    trainState.timer = null;
  }
  const status = document.querySelector<HTMLElement>("#run-status");
  if (status) {
    status.textContent = "◼ Paused";
    status.classList.remove("ok");
  }
}

function startTraining(): void {
  const btn = document.querySelector<HTMLButtonElement>("#train-run-btn");
  if (trainState.running) {
    stopTraining();
    if (btn) btn.textContent = "▸ Start Run";
    trainConsoleLog("Run paused.", "warn");
    return;
  }

  const epochsEl = document.querySelector<HTMLInputElement>("#train-epochs");
  const archEl = document.querySelector<HTMLSelectElement>("#train-arch");
  trainState.epochs = epochsEl ? parseInt(epochsEl.value, 10) || 50 : 50;
  trainState.current = 0;
  trainState.loss = 1.5;
  trainState.acc = 60;
  trainState.running = true;

  const runLabel = document.querySelector<HTMLElement>("#run-label");
  if (runLabel) runLabel.textContent = `Arís · ${archEl?.value ?? "Model"}`;
  if (btn) btn.textContent = "◼ Pause";
  const status = document.querySelector<HTMLElement>("#run-status");
  if (status) {
    status.textContent = "● Running";
    status.classList.add("ok");
  }
  trainConsoleLog(
    `Starting run · ${archEl?.value ?? "Model"} · ${trainState.epochs} epochs.`,
  );
  trainConsoleLog("Loading dataset…", "warn");
  trainConsoleLog("Compiling on GPU · batch 32.", "dim");

  trainState.timer = window.setInterval(() => {
    trainState.current += 1;
    trainState.loss = Math.max(
      0.08,
      trainState.loss - 0.028 - Math.random() * 0.02,
    );
    trainState.acc = Math.min(
      96.5,
      trainState.acc + (Math.random() * 1.4 + 0.3),
    );
    updateTrainUI();
    if (
      trainState.current % 10 === 0 ||
      trainState.current === trainState.epochs
    ) {
      trainConsoleLog(
        `Epoch ${trainState.current}/${trainState.epochs} · loss ${trainState.loss.toFixed(3)} · acc ${trainState.acc.toFixed(1)}%`,
        "ok",
      );
    }
    if (trainState.current >= trainState.epochs) {
      stopTraining();
      trainConsoleLog(
        `Run complete · final acc ${trainState.acc.toFixed(1)}%.`,
        "ok",
      );
      if (btn) btn.textContent = "▸ Start Run";
    }
  }, 700);
  updateTrainUI();
}

/** Bind train page controls (called after the train view renders). */
function bindTrainControls(): void {
  document
    .querySelector<HTMLButtonElement>("#train-run-btn")
    ?.addEventListener("click", startTraining);
}

/* ===================== Test simulation ===================== */

const CLASS_POOL = [
  "Tennis ball",
  "Golden retriever",
  "Coffee mug",
  "Mountain landscape",
  "Sports car",
  "Pineapple",
  "Cathedral",
];

function simulateTest(): void {
  const btn = document.querySelector<HTMLButtonElement>("#test-run-btn");
  if (btn) btn.textContent = "◽ Testing…";

  const status = document.querySelector<HTMLElement>("#test-status");
  if (status) {
    status.textContent = "● Evaluating";
    status.classList.remove("done");
  }

  // build ranked predictions
  const preds = CLASS_POOL.map((label, i) => ({
    label,
    conf: 0.92 - i * 0.1 - Math.random() * 0.04,
  }))
    .sort((a, b) => b.conf - a.conf)
    .map((p, i) => ({ ...p, conf: Math.max(0.02, p.conf - i * 0.03) }));

  window.setTimeout(() => {
    const top = preds[0];
    if (btn) btn.textContent = "▶ Run Test";
    if (status) {
      status.textContent = "✓ Done";
      status.classList.add("done");
    }

    const predEl = document.querySelector<HTMLElement>("#test-prediction");
    if (predEl) predEl.textContent = top.label;

    const confMeter = document.querySelector<HTMLElement>("#test-confidence");
    const confVal = document.querySelector<HTMLElement>("#test-conf-val");
    const pct = Math.round(top.conf * 100);
    if (confMeter) confMeter.style.width = `${pct}%`;
    if (confVal) confVal.textContent = `${pct}%`;

    const listEl = document.querySelector<HTMLElement>("#test-classes");
    if (!listEl) return;
    listEl.innerHTML = "";
    preds.slice(0, 5).forEach((p) => {
      const pct2 = Math.round(p.conf * 100);
      const row = document.createElement("div");
      row.className = "class-row";
      row.innerHTML = `
        <span class="cr-label">${p.label}</span>
        <div class="cr-bar-wrap"><div class="meter"><div class="meter-fill run" style="width:${pct2}%"></div></div></div>
        <span class="cr-pct">${pct2}%</span>
      `;
      listEl.appendChild(row);
    });
  }, 1400);
}

function showThumb(f: File): void {
  const thumb = document.querySelector<HTMLElement>("#test-thumb");
  if (!thumb) return;
  const url = URL.createObjectURL(f);
  const img = document.createElement("img");
  img.src = url;
  img.alt = "uploaded sample";
  thumb.innerHTML = "";
  thumb.appendChild(img);
}

/** Bind test page controls (called after the test view renders). */
function bindTestControls(): void {
  document
    .querySelector<HTMLButtonElement>("#test-run-btn")
    ?.addEventListener("click", simulateTest);

  const drop = document.querySelector<HTMLElement>("#test-drop");
  const file = document.querySelector<HTMLInputElement>("#test-file");
  if (drop && file) {
    drop.addEventListener("click", () => file.click());
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("dragover");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("dragover");
      const f = e.dataTransfer?.files?.[0];
      if (f) showThumb(f);
    });
    file.addEventListener("change", () => {
      const f = file.files?.[0];
      if (f) showThumb(f);
    });
  }
}

/* ===================== Init ===================== */

window.addEventListener("DOMContentLoaded", () => {
  // Nav click routing (sidebar is static in index.html)
  document.querySelectorAll<HTMLAnchorElement>(".nav-item").forEach((item) => {
    item.addEventListener("click", () => setRoute(item.dataset.nav as Route));
  });

  // Persist-level features (sidebar, always present)
  loadSystemStats();

  // Initial route
  setRoute(window.location.hash ? parseRoute(window.location.hash) : "home");
  window.addEventListener("hashchange", applyRoute);
});
