/* Replay of the three sampled populations in the D6 forward run of Fig. 5b. */
(() => {
  'use strict';
  const root = document.getElementById('measured-replay');
  if (!root) return;
  const get = selector => root.querySelector(selector);
  const all = selector => Array.from(root.querySelectorAll(selector));
  const canvas = get('[data-mr-canvas]');
  const context = canvas.getContext('2d');
  const days = ['D2', 'D4', 'D6'];
  const colors = { D2: '#7b3294', D4: '#008c95', D6: '#6e9b2d' };
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const routes = all('[data-mr-route]');
  const dayControls = all('[data-mr-day]');
  const overlay = get('[data-mr-overlay]');
  const play = get('[data-mr-play]');
  const labels = {
    title: ['Two fate requests, one D2 source population', '同一组 D2 来源细胞，两种命运请求'],
    figure: ['Fig. 5b ↗', '图 5b ↗'], gif: ['GIF ↓', 'GIF ↓'],
    route: ['Requested route', '请求路径'],
    monocyte: ['Monocyte', '单核细胞'], neutrophil: ['Neutrophil', '中性粒细胞'],
    overlay: ['Observed outline', '观测轮廓'],
    day: ['Sampling day', '采样日'],
    shortD2: ['Source', '来源日'], shortD4: ['Training day', '训练日'], shortD6: ['Held-out day', '留出日'],
    D2: ['Shared observed source', '两条路径共用的起点'], D4: ['Generated · training day', '训练日生成'], D6: ['Generated · held-out day', '留出日预测'],
    play: ['Play day sequence', '播放三个采样日'], pause: ['Pause day sequence', '暂停播放'],
    caption: ['Grey dots show 2,949 observed LARRY cells. Each frame shows the population at one sampling day.', '灰点是 2,949 个实测 LARRY 细胞。每一帧呈现一个采样日的群体分布。'],
    outlineD2: ['The outline encloses 80% of the smoothed D2 observed density.', '轮廓圈出 D2 观测细胞平滑密度的 80%。'],
    outlineRoute: ['The outline encloses 80% of the smoothed observed density for this day and route.', '轮廓圈出该日同路径观测细胞平滑密度的 80%。'],
    loading: ['Loading cell coordinates…', '正在载入细胞坐标…'],
    fallback: ['The replay could not load. This Fig. 5b panel shows all three days for the monocyte route.', '回放未能载入。下方图 5b 原图展示单核细胞路径的三个采样日。']
  };
  const text = key => labels[key][document.documentElement.lang.startsWith('zh') ? 1 : 0];
  let data;
  let route = 'monocyte';
  let dayIndex = 0;
  let previous = null;
  let fadeStart = 0;
  let frame = 0;
  let timer = 0;
  let playing = !motion.matches;
  let visible = true;
  let backdrop;
  let projected;
  let width, height, ratio;
  const contours = new Map();

  function updateLabels() {
    const day = days[dayIndex];
    const zh = document.documentElement.lang.startsWith('zh');
    all('[data-mr-label]').forEach(el => { el.textContent = text(el.dataset.mrLabel); });
    all('[data-mr-aria]').forEach(el => { el.setAttribute('aria-label', text(el.dataset.mrAria)); });
    routes.forEach(el => el.setAttribute('aria-pressed', String(el.dataset.mrRoute === route)));
    dayControls.forEach(el => el.setAttribute('aria-pressed', String(el.dataset.mrDay === day)));
    root.style.setProperty('--mr-day', colors[day]);
    play.dataset.playing = String(playing);
    play.setAttribute('aria-label', text(playing ? 'pause' : 'play'));
    play.title = text(playing ? 'pause' : 'play');
    get('[data-mr-active-day]').textContent = day;
    get('[data-mr-state]').textContent = text(day);
    if (!data) return;
    const n = data.routes[route][day].length.toLocaleString(zh ? 'zh-CN' : 'en');
    const nObserved = data.referenceByDay.D2.length;
    const count = dayIndex
      ? (zh ? n + ' 个生成点' : n + ' generated points')
      : (zh ? nObserved + ' 个观测细胞中的 ' + n + ' 个起点' : n + ' source cells of ' + nObserved + ' observed');
    get('[data-mr-count]').textContent = count;
    get('[data-mr-outline-note]').textContent = overlay.checked ? text(dayIndex ? 'outlineRoute' : 'outlineD2') : '';
    canvas.setAttribute('aria-label', [text(route), day, text(day), count, 'UMAP'].join(' · '));
  }

  /* Find the contour containing 80% of a Gaussian-smoothed histogram.
     The bandwidth and spatial grid are fixed across all routes and days. */
  function densityContour(points, bounds) {
    const [xmin, xmax, ymin, ymax] = bounds;
    const step = Math.max(xmax - xmin, ymax - ymin) / 90;
    const radius = 7, sigma = 2.3;
    const nx = Math.ceil((xmax - xmin) / step) + 2 * radius + 3;
    const ny = Math.ceil((ymax - ymin) / step) + 2 * radius + 3;
    const left = xmin - (radius + 1) * step, bottom = ymin - (radius + 1) * step;
    const field = new Float64Array(nx * ny);
    const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * sigma ** 2)));
    for (const [x, y] of points) {
      const gx = Math.round((x - left) / step), gy = Math.round((y - bottom) / step);
      for (let dy = -radius; dy <= radius; dy++) {
        const row = (gy + dy) * nx;
        for (let dx = -radius; dx <= radius; dx++) {
          field[row + gx + dx] += kernel[dx + radius] * kernel[dy + radius];
        }
      }
    }
    const sorted = field.filter(n => n > 0).sort().reverse();
    if (!sorted.length) return [];
    const target = sorted.reduce((sum, n) => sum + n, 0) * .8;
    let total = 0, threshold = 0;
    for (const value of sorted) {
      total += value;
      if (total >= target) { threshold = value; break; }
    }
    const segments = [];
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let row = 0; row < ny - 1; row++) {
      for (let col = 0; col < nx - 1; col++) {
        const start = row * nx + col;
        const v = [field[start], field[start + 1], field[start + nx + 1], field[start + nx]];
        const crosses = [];
        for (let a = 0; a < 4; a++) {
          const b = (a + 1) % 4;
          if ((v[a] >= threshold) === (v[b] >= threshold)) continue;
          const t = (threshold - v[a]) / (v[b] - v[a]);
          crosses.push([
            left + step * (col + corners[a][0] + (corners[b][0] - corners[a][0]) * t),
            bottom + step * (row + corners[a][1] + (corners[b][1] - corners[a][1]) * t)
          ]);
        }
        // In a saddle cell, link edges around the corner opposite the centre's sign.
        if (crosses.length === 4 && ((v[0] + v[1] + v[2] + v[3]) / 4 >= threshold) !== (v[0] >= threshold)) crosses.unshift(crosses.pop());
        for (let i = 0; i < crosses.length; i += 2) segments.push([crosses[i], crosses[i + 1]]);
      }
    }
    return segments;
  }

  function drawPopulation(state, opacity) {
    if (!state || opacity <= 0) return;
    const { route: selected, day } = state;
    const ctx = context;
    ctx.fillStyle = colors[day];
    ctx.globalAlpha = opacity * (day === 'D2' ? .88 : .64);
    const size = day === 'D2' ? Math.max(2.6, width / 175) : Math.max(1.8, width / 255);
    for (const xy of data.routes[selected][day]) {
      const [x, y] = projected(xy);
      if (day === 'D4') { ctx.fillRect(x - size, y - size, size * 2, size * 2); continue; }
      ctx.beginPath();
      if (day === 'D2') ctx.arc(x, y, size, 0, Math.PI * 2);
      else { ctx.moveTo(x, y - size * 1.35); ctx.lineTo(x + size * 1.15, y + size); ctx.lineTo(x - size * 1.15, y + size); ctx.closePath(); }
      ctx.fill();
    }
    if (overlay.checked) {
      const key = day === 'D2' ? day : selected + day;
      if (!contours.has(key)) {
        const observed = day === 'D2' ? data.referenceByDay[day] : data.observedByRouteDay[selected][day];
        contours.set(key, densityContour(observed, data.bounds));
      }
      ctx.beginPath();
      for (const [a, b] of contours.get(key)) {
        ctx.moveTo(...projected(a)); ctx.lineTo(...projected(b));
      }
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.globalAlpha = opacity * .8; ctx.stroke();
      ctx.lineWidth = 1.35; ctx.strokeStyle = '#324956'; ctx.globalAlpha = opacity; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function draw(now = performance.now()) {
    if (!data || !backdrop) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.drawImage(backdrop, 0, 0, width, height);
    const progress = previous ? Math.min(1, (now - fadeStart) / 420) : 1;
    drawPopulation(previous, 1 - progress);
    drawPopulation({ route, day: days[dayIndex] }, progress);
    cancelAnimationFrame(frame);
    if (progress < 1) frame = requestAnimationFrame(draw);
    else previous = null;
  }

  function resize() {
    if (!data || !context) return;
    width = canvas.clientWidth; height = canvas.clientHeight;
    if (!width || !height) return;
    ratio = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const [xmin, xmax, ymin, ymax] = data.bounds;
    const pad = Math.min(18, width * .035);
    const scale = Math.min((width - 2 * pad) / (xmax - xmin), (height - 2 * pad) / (ymax - ymin));
    const left = (width - (xmax - xmin) * scale) / 2;
    const top = (height - (ymax - ymin) * scale) / 2;
    projected = ([x, y]) => [left + (x - xmin) * scale, top + (data.yDown ? y - ymin : ymax - y) * scale];
    backdrop = document.createElement('canvas'); backdrop.width = canvas.width; backdrop.height = canvas.height;
    const ctx = backdrop.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#aeb8bc'; ctx.globalAlpha = .43;
    const r = Math.max(1.05, Math.min(1.8, width / 350));
    for (const pair of data.reference) {
      const [x, y] = projected(pair); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = '#73868e'; ctx.fillStyle = '#61727c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(9, height - 30); ctx.lineTo(9, height - 10); ctx.lineTo(29, height - 10); ctx.stroke();
    ctx.font = '10px system-ui, sans-serif'; ctx.fillText('UMAP', 14, height - 17);
    draw();
  }

  function schedule() {
    clearTimeout(timer);
    if (data && playing && visible && !document.hidden) {
      timer = setTimeout(() => selectFrame(route, (dayIndex + 1) % days.length), 2800);
    }
  }
  function selectFrame(nextRoute, nextDay) {
    previous = !motion.matches && (route !== nextRoute || dayIndex !== nextDay) ? { route, day: days[dayIndex] } : null;
    fadeStart = performance.now();
    route = nextRoute; dayIndex = nextDay;
    updateLabels(); draw(); schedule();
  }
  routes.forEach(button => button.addEventListener('click', () => {
    selectFrame(button.dataset.mrRoute, dayIndex);
  }));
  dayControls.forEach(button => button.addEventListener('click', () => {
    playing = false; selectFrame(route, days.indexOf(button.dataset.mrDay));
  }));
  play.addEventListener('click', () => {
    playing = !playing;
    if (playing) selectFrame(route, (dayIndex + 1) % days.length);
    else { previous = null; updateLabels(); draw(); schedule(); }
  });
  overlay.addEventListener('change', () => { updateLabels(); draw(); });
  motion.addEventListener('change', () => {
    if (motion.matches) { previous = null; playing = false; updateLabels(); draw(); schedule(); }
  });
  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(root);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  window.addEventListener('sclineage:language', updateLabels);
  updateLabels();

  // Source rows carry an observed-array index. Generated rows are independent
  // samples at each day; the file supplies no longitudinal cell correspondence.
  function forwardFold(raw) {
    const fold = raw.folds.D6;
    const referenceByDay = {};
    for (const day of days) {
      referenceByDay[day] = raw.observed.filter(row => row[2] === Number(day.slice(1)));
    }
    const sharedSources = fold.sourceIndices.map(i => raw.observed[i]);
    const routeNames = { monocyte: 'Monocyte', neutrophil: 'Neutrophil' };
    const routes = {}, observedByRouteDay = {};
    for (const [key, name] of Object.entries(routeNames)) {
      routes[key] = { D2: sharedSources, D4: fold.generated[name].D4, D6: fold.generated[name].D6 };
      observedByRouteDay[key] = {
        D4: referenceByDay.D4.filter(row => row[3] === name),
        D6: referenceByDay.D6.filter(row => row[3] === name)
      };
    }
    return {
      bounds: [...raw.xRange, ...raw.yRange],
      yDown: false, reference: raw.observed, referenceByDay, routes, observedByRouteDay
    };
  }
  async function load() {
    try {
      const response = await fetch(root.dataset.src);
      if (!response.ok) throw new Error(String(response.status));
      data = forwardFold(await response.json());
      if (!context || !data.reference.length || !data.bounds || !data.observedByRouteDay) throw new Error('Incomplete plot data');
      resize();
      for (const el of [...routes, ...dayControls, play, overlay]) el.disabled = false;
      get('[data-mr-loading]').hidden = true;
      updateLabels(); schedule();
    } catch {
      data = null;
      get('.mr-interactive').hidden = true;
      get('.mr-fallback').hidden = false;
    }
  }
  load();
})();
