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
  const branchColors = { monocyte: '#368882', neutrophil: '#a85e94' };
  const branches = Object.keys(branchColors);
  const samplesPerSegment = 40;
  const holdTimes = [1150, 1300, 3600];
  const growthTime = 1450;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const routes = all('[data-mr-route]');
  const dayControls = all('[data-mr-day]');
  const overlay = get('[data-mr-overlay]');
  const play = get('[data-mr-play]');
  const labels = {
    title: ['Two branches from one D2 population', '同一 D2 来源群体的两条分支'],
    figure: ['Fig. 5b ↗', '图 5b ↗'], gif: ['GIF ↓', 'GIF ↓'],
    route: ['Requested route', '请求路径'],
    both: ['Both paths', '两条路径'], monocyte: ['Monocyte', '单核细胞'], neutrophil: ['Neutrophil', '中性粒细胞'],
    overlay: ['Observed outline', '观测轮廓'],
    day: ['Sampling day', '采样日'],
    shortD2: ['Source', '来源日'], shortD4: ['Training day', '训练日'], shortD6: ['Held-out day', '留出日'],
    D2: ['Shared observed source', '两条路径共用的起点'], D4: ['Generated · training day', '训练日生成'], D6: ['Generated · held-out day', '留出日预测'],
    play: ['Play day sequence', '播放三个采样日'], pause: ['Pause day sequence', '暂停播放'],
    caption: ['Branches connect population medians at D2, D4 and D6. Grey dots show 2,949 observed LARRY cells.', '枝线连接 D2、D4、D6 各群体的坐标中位数。灰点是 2,949 个实测 LARRY 细胞。'],
    outlineD2: ['The outline encloses 80% of the smoothed D2 observed density.', '轮廓圈出 D2 观测细胞平滑密度的 80%。'],
    outlineRoute: ['Each outline encloses 80% of the observed density after smoothing for its day and route.', '每条轮廓圈出该日对应路径观测细胞平滑密度的 80%。'],
    loading: ['Loading cell coordinates…', '正在载入细胞坐标…'],
    fallback: ['Interactive coordinates could not load. The original panel shows the monocyte route.', '交互坐标未能载入。这里显示图 5b 的单核细胞路径原图。'],
    fallbackGif: ['Open the recorded branch animation ↗', '观看已导出的分支动画 ↗']
  };
  const text = key => labels[key][document.documentElement.lang.startsWith('zh') ? 1 : 0];
  let data;
  let route = 'both';
  let dayIndex = 0;
  let growing = null;
  let frame = 0;
  let timer = 0;
  let playing = !motion.matches;
  let visible = true;
  let backdrop;
  let projected;
  let width, height, ratio;
  const contours = new Map();
  const layers = new Map();

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
    const firstRoute = route === 'both' ? branches[0] : route;
    const n = data.routes[firstRoute][day].length.toLocaleString(zh ? 'zh-CN' : 'en');
    const nObserved = data.referenceByDay.D2.length;
    const count = dayIndex
      ? (route === 'both' ? (zh ? '每条路径 ' + n + ' 个生成点' : n + ' points per path')
        : (zh ? n + ' 个生成点' : n + ' generated points'))
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

  function populationLayer(day, selected) {
    const key = day === 'D2' ? day : selected + day;
    if (layers.has(key)) return layers.get(key);
    const layer = document.createElement('canvas');
    layer.width = canvas.width; layer.height = canvas.height;
    const ctx = layer.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.fillStyle = colors[day];
    ctx.globalAlpha = day === 'D2' ? .83 : .42;
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
      if (!contours.has(key)) {
        const observed = day === 'D2' ? data.referenceByDay[day] : data.observedByRouteDay[selected][day];
        contours.set(key, densityContour(observed, data.bounds));
      }
      ctx.beginPath();
      for (const [a, b] of contours.get(key)) {
        ctx.moveTo(...projected(a)); ctx.lineTo(...projected(b));
      }
      ctx.lineWidth = 2.6; ctx.strokeStyle = '#fff'; ctx.globalAlpha = .7; ctx.stroke();
      ctx.lineWidth = 1.05; ctx.strokeStyle = '#465b64'; ctx.globalAlpha = .85; ctx.stroke();
    }
    layers.set(key, layer);
    return layer;
  }

  function drawPopulation(day, alpha) {
    if (alpha <= 0) return;
    const visibleRoutes = day === 'D2' ? [branches[0]] : (route === 'both' ? branches : [route]);
    context.globalAlpha = alpha;
    for (const selected of visibleRoutes) context.drawImage(populationLayer(day, selected), 0, 0, width, height);
    context.globalAlpha = 1;
  }

  function node(xy, radius, color) {
    context.beginPath(); context.arc(...xy, radius, 0, 2 * Math.PI);
    context.fillStyle = color; context.fill();
    context.lineWidth = 1.6; context.strokeStyle = '#fff'; context.stroke();
  }

  function plotLabel(name, xy, dx, dy, color) {
    const ctx = context;
    ctx.font = '600 ' + (width < 420 ? 10 : 12) + 'px system-ui, sans-serif';
    const labelWidth = ctx.measureText(name).width;
    const x = Math.max(3, Math.min(xy[0] + dx, width - labelWidth - 4));
    const y = Math.max(13, Math.min(xy[1] + dy, height - 4));
    ctx.lineWidth = 3.6; ctx.strokeStyle = '#fff'; ctx.strokeText(name, x, y);
    ctx.fillStyle = color; ctx.fillText(name, x, y);
  }

  function traceBranch(branch, position) {
    const samples = data.curves[branch];
    const last = position * samplesPerSegment;
    const stop = Math.floor(last);
    context.beginPath(); context.moveTo(...projected(samples[0]));
    for (let i = 1; i <= stop; i++) context.lineTo(...projected(samples[i]));
    if (last > stop) {
      const [x, y] = samples[stop], [xx, yy] = samples[stop+1];
      context.lineTo(...projected([x + (xx - x) * (last - stop), y + (yy - y) * (last - stop)]));
    }
  }

  function drawTree(position) {
    const ctx = context;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const branch of branches) {
      const track = data.medians[branch].map(projected);
      const active = route === 'both' || route === branch;
      // Guides use precisely the same observed and generated medians as the growth.
      traceBranch(branch, 2);
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = active ? branchColors[branch] : '#a7b4b9';
      ctx.lineWidth = 1.4; ctx.globalAlpha = active ? .34 : .24; ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (!active || position <= 0) continue;

      traceBranch(branch, position);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5.3; ctx.stroke();
      ctx.strokeStyle = branchColors[branch]; ctx.lineWidth = 3.0; ctx.stroke();
      if (position >= 1) node(track[1], 3.8, branchColors[branch]);
      if (position >= 2) node(track[2], 4.6, branchColors[branch]);
      if (position >= 1) {
        // Labels sit on the tip reached at the most recent sampled day.
        const tip = position >= 2 ? track[2] : track[1];
        plotLabel(text(branch), tip, branch === 'monocyte' ? 8 : 4, branch === 'monocyte' ? 17 : -10, branchColors[branch]);
      }
    }
    const origin = projected(data.medians.monocyte[0]);
    node(origin, 5.3, '#243b48');
    plotLabel('D2', origin, -17, -9, '#243b48');
    ctx.restore();
  }

  function draw(now = performance.now()) {
    if (!data || !backdrop) return;
    cancelAnimationFrame(frame);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.drawImage(backdrop, 0, 0, width, height);
    if (!growing) {
      drawPopulation(days[dayIndex], 1);
      drawTree(dayIndex);
      return;
    }
    const live = playing && visible && !document.hidden;
    if (live) {
      if (growing.stamp !== null) growing.elapsed += Math.max(0, now - growing.stamp);
      growing.stamp = now;
    }
    const progress = Math.min(1, growing.elapsed / growthTime);
    const fraction = progress * progress * (3 - 2 * progress);
    // A branch grows between two population medians. Only whole snapshots fade.
    drawPopulation(days[dayIndex - 1], 1 - fraction);
    drawPopulation(days[dayIndex], fraction);
    drawTree(dayIndex - 1 + fraction);
    if (progress >= 1) { growing = null; schedule(); }
    else if (live) frame = requestAnimationFrame(draw);
  }

  function resize() {
    if (!data || !context) return;
    width = canvas.clientWidth; height = canvas.clientHeight;
    if (!width || !height) return;
    ratio = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    layers.clear();
    const [xmin, xmax, ymin, ymax] = data.bounds;
    const pad = Math.min(18, width * .035);
    const scale = Math.min((width - 2 * pad) / (xmax - xmin), (height - 2 * pad) / (ymax - ymin));
    const left = (width - (xmax - xmin) * scale) / 2;
    const top = (height - (ymax - ymin) * scale) / 2;
    projected = ([x, y]) => [left + (x - xmin) * scale, top + (data.yDown ? y - ymin : ymax - y) * scale];
    backdrop = document.createElement('canvas'); backdrop.width = canvas.width; backdrop.height = canvas.height;
    const ctx = backdrop.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#aeb8bc'; ctx.globalAlpha = .36;
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
    cancelAnimationFrame(frame);
    if (growing) growing.stamp = null;
    if (!data || !playing || !visible || document.hidden) return;
    if (growing) frame = requestAnimationFrame(draw);
    else timer = setTimeout(advance, holdTimes[dayIndex]);
  }
  function advance() {
    dayIndex = (dayIndex + 1) % days.length;
    growing = dayIndex > 0 && !motion.matches ? { elapsed: 0, stamp: null } : null;
    updateLabels(); draw(); schedule();
  }
  routes.forEach(button => button.addEventListener('click', () => {
    route = button.dataset.mrRoute;
    updateLabels(); draw();
  }));
  dayControls.forEach(button => button.addEventListener('click', () => {
    playing = false; growing = null; dayIndex = days.indexOf(button.dataset.mrDay);
    updateLabels(); draw(); schedule();
  }));
  play.addEventListener('click', () => {
    playing = !playing;
    if (playing && !growing) advance();
    else { updateLabels(); schedule(); }
  });
  overlay.addEventListener('change', () => { layers.clear(); updateLabels(); draw(); });
  motion.addEventListener('change', () => {
    if (motion.matches) { growing = null; playing = false; updateLabels(); draw(); schedule(); }
  });
  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(root);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  window.addEventListener('sclineage:language', () => { updateLabels(); draw(); });
  updateLabels();

  // Source rows carry an observed-array index. Generated rows are independent
  // samples at each day; the file supplies no longitudinal cell correspondence.
  function medianPoint(points) {
    return [0, 1].map(axis => {
      const sorted = points.map(point => point[axis]).sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    });
  }
  // Shape-preserving cubic interpolation, component-wise as in Fig. 5b.
  // D2, D4 and D6 are equally spaced. Each curve passes through its three medians.
  function medianCurve(centres) {
    function endSlope(near, far) {
      const slope = (3 * near - far) / 2;
      if (Math.sign(slope) !== Math.sign(near)) return 0;
      if (Math.sign(near) !== Math.sign(far) && Math.abs(slope) > 3 * Math.abs(near)) return 3 * near;
      return slope;
    }
    const slopes = [0, 1].map(axis => {
      const a = centres[1][axis] - centres[0][axis], b = centres[2][axis] - centres[1][axis];
      return [endSlope(a, b), a*b > 0 ? 2*a*b / (a+b) : 0, endSlope(b, a)];
    });
    const samples = [centres[0]];
    for (let i = 0; i < 2; i++) {
      for (let j = 1; j <= samplesPerSegment; j++) {
        const t = j / samplesPerSegment, u = 1 - t;
        samples.push([0, 1].map(axis =>
          u*u*(1+2*t)*centres[i][axis] + t*u*u*slopes[axis][i]
          + t*t*(3-2*t)*centres[i+1][axis] - t*t*u*slopes[axis][i+1]));
      }
    }
    return samples;
  }
  function forwardFold(raw) {
    const fold = raw.folds.D6;
    const referenceByDay = {};
    for (const day of days) {
      referenceByDay[day] = raw.observed.filter(row => row[2] === Number(day.slice(1)));
    }
    const sharedSources = fold.sourceIndices.map(i => raw.observed[i]);
    const routeNames = { monocyte: 'Monocyte', neutrophil: 'Neutrophil' };
    const routes = {}, observedByRouteDay = {}, medians = {}, curves = {};
    const origin = medianPoint(sharedSources);
    for (const [key, name] of Object.entries(routeNames)) {
      routes[key] = { D2: sharedSources, D4: fold.generated[name].D4, D6: fold.generated[name].D6 };
      medians[key] = [origin, medianPoint(routes[key].D4), medianPoint(routes[key].D6)];
      curves[key] = medianCurve(medians[key]);
      observedByRouteDay[key] = {
        D4: referenceByDay.D4.filter(row => row[3] === name),
        D6: referenceByDay.D6.filter(row => row[3] === name)
      };
    }
    return {
      bounds: [...raw.xRange, ...raw.yRange],
      yDown: false, reference: raw.observed, referenceByDay, routes, observedByRouteDay, medians, curves
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
