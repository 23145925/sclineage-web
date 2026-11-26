/* Reported results from the manuscript. Clone pairing coordinates are schematic. */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assets = 'assets/figures/';
  const state = {
    language: document.documentElement.lang.startsWith('zh') ? 'zh' : 'en',
    map: 'state', topology: 'reference', region: 'I',
    fate: 'native', day: 'D4', clone: 'matched'
  };
  let initialized = false;
  let pairing;

  const topology = {
    reference: { image: 'topology-ground-truth.webp', name: 'Reference', correct: 33, extra: 0, f1: 1 },
    sclineage: { image: 'topology-sclineage.webp', name: 'sclineage', correct: 23, extra: 14, f1: 0.657 },
    stavia: { image: 'topology-stavia.webp', name: 'StaVia', correct: 25, extra: 39, f1: 0.515 }
  };
  const regions = {
    I: { total: 2, complete: [0, 0, 0, 2], extra: [10, 5, 3, 0] },
    II: { total: 3, complete: [0, 2, 0, 3], extra: [3, 2, 9, 0] }
  };
  const methods = ['CellRank 2', 'StaVia', 'Monocle3', 'sclineage'];
  const nativeFates = [0.312, 0.291, 0.276, 0.242];
  const commonFates = {
    D2: { values: [0.369, 0.362, 0.409], difference: 0.040, lower: 0.003, upper: 0.102, clones: 375 },
    D4: { values: [0.532, 0.501, 0.556], difference: 0.024, lower: 0.007, upper: 0.081, clones: 978 }
  };
  const text = {
    en: {
      stateNote: '100,000 CT34 cells · 34 reference states · Fig. 2a.',
      timeNote: 'The same CT34 cells · reference developmental time · Fig. 2a.',
      stateAlt: 'Four methods display the same CT34 cells colored by reference state',
      timeAlt: 'Four methods display the same CT34 cells colored by developmental time',
      topologyNote: 'Single displayed fit, seed 44. Extra edges are additional or reversed connections. Fig. 3c.',
      referenceNote: '34 states, 33 directed transitions. Reference self-comparison F1 = 1.000. Inferred panels show seed 44. Fig. 3c.',
      method: 'Method', complete: 'Complete routes', extra: 'Non-reference transitions',
      regionNote: 'Two selected regions with two and three reference routes. Counts apply locally. Supplementary Fig. S9d.',
      tv: 'Mean fate-distribution TV ↓', ap: 'Macro average precision ↑',
      nativeHeadline: '0.242 mean TV · 978 test clones',
      nativeNote: 'Native readouts for D4 → D6. Representations use D2/D4/D6 RNA. Held-out clone fates come from barcoded descendants. Fig. 4d.',
      commonNote: 'Shared day-ordered readout for ten fates, using D2/D4/D6 RNA. Paired clone-bootstrap 95% CI measures the AP gain over Diffusion. Fig. 4e.',
      clonedMatched: '−0.19609 TV versus shuffled',
      clonedShuffled: '+0.19609 TV after shuffling',
      cloneNote: '375 test clones, 530 D2 sources. D2/D4-trained generation is scored against barcoded D6 descendants. Shuffling whole fate vectors preserves clone-averaged composition. Fig. 5d, Supplementary Fig. S13a.',
      source: 'Source clones', vector: 'Predicted fate vectors', clone: 'Clone',
      schematic: 'Schematic pairing · illustrative fate vectors',
      marginal: 'Clone-averaged composition preserved',
      neutrophil: 'Neutrophil', monocyte: 'Monocyte', other: 'Other',
      reference: 'Reference', selected: 'Selected region'
    },
    zh: {
      stateNote: '100,000 个 CT34 细胞 · 34 个参考状态 · 图 2a。',
      timeNote: '同一批 CT34 细胞 · 参考发育时间 · 图 2a。',
      stateAlt: '四种方法展示相同 CT34 细胞，按参考状态着色',
      timeAlt: '四种方法展示相同 CT34 细胞，按发育时间着色',
      topologyNote: '单次展示拟合，seed 44。额外边包含新增或反向连接。图 3c。',
      referenceNote: '34 个状态，33 条有向转换。参考图与自身比较，F1 为 1.000。推断图使用 seed 44。图 3c。',
      method: '方法', complete: '完整恢复的路径', extra: '非参考转换',
      regionNote: '两个选定区域，分别含两条和三条参考路径。计数适用于区域内的恢复。补图 S9d。',
      tv: '平均命运分布 TV ↓', ap: '宏平均精确率 AP ↑',
      nativeHeadline: '平均 TV 0.242 · 978 个测试克隆',
      nativeNote: 'D4 → D6 · 各自读出。D2/D4/D6 RNA 拟合表征，条形码后代验证留出克隆命运。图 4d。',
      commonNote: '十种命运共享按日读出，表征使用 D2/D4/D6 RNA。95% CI 为相对 Diffusion 的配对克隆 bootstrap AP 差异区间。图 4e。',
      clonedMatched: '比打乱对照低 0.19609 TV',
      clonedShuffled: '打乱后 TV 增加 0.19609',
      cloneNote: '375 个测试克隆，530 个 D2 起始细胞。D2/D4 训练生成模型，以条形码 D6 后代评估。打乱完整命运向量保留按克隆平均的预测组成。图 5d、补图 S13a。',
      source: '来源克隆', vector: '预测命运向量', clone: '克隆',
      schematic: '配对示意 · 示例命运向量',
      marginal: '克隆平均命运组成保持一致',
      neutrophil: '中性粒细胞', monocyte: '单核细胞', other: '其他',
      reference: '参考结构', selected: '选定区域'
    }
  };

  function copy(key) { return text[state.language][key]; }
  function write(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
  }
  function selectButtons(attribute, value) {
    all(`[${attribute}]`).forEach(button => {
      button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === value));
    });
  }
  function image(id, path, description) {
    const element = byId(id);
    if (!element) return;
    const next = assets + path;
    if (element.getAttribute('src') !== next) element.src = next;
    element.alt = description;
  }
  function renderState() {
    selectButtons('data-state-view', state.map);
    image('state-map', state.map === 'state' ? 'ct34-state-maps.webp' : 'ct34-time-maps.webp',
      copy(state.map === 'state' ? 'stateAlt' : 'timeAlt'));
    write('state-view-note', copy(state.map === 'state' ? 'stateNote' : 'timeNote'));
  }
  function renderTopology() {
    const record = topology[state.topology];
    selectButtons('data-topology', state.topology);
    image('topology-image', record.image, `${state.topology === 'reference' ? copy('reference') : record.name} · CT34`);
    write('topology-correct', record.correct);
    write('topology-extra', record.extra);
    write('topology-f1', record.f1.toFixed(3));
    write('topology-note', copy(state.topology === 'reference' ? 'referenceNote' : 'topologyNote'));
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function renderRegion() {
    selectButtons('data-region', state.region);
    write('region-note', copy('regionNote'));
    const container = byId('region-chart');
    if (!container) return;
    const record = regions[state.region];
    const table = element('table', 'rx-region-table');
    const caption = element('caption', 'rx-chart-label', `${copy('selected')} ${state.region}`);
    const head = element('thead');
    const header = element('tr');
    ['method', 'complete', 'extra'].forEach(key => {
      const cell = element('th', '', copy(key));
      cell.scope = 'col';
      header.append(cell);
    });
    head.append(header);
    const body = element('tbody');
    methods.forEach((method, index) => {
      const row = element('tr', method === 'sclineage' ? 'rx-own-row' : '');
      const name = element('th', '', method);
      name.scope = 'row';
      const recovered = element('td');
      const bar = element('span', 'rx-route-track');
      const fill = element('span', 'rx-route-fill');
      fill.style.width = `${record.complete[index] / record.total * 100}%`;
      bar.setAttribute('aria-hidden', 'true');
      bar.append(fill);
      recovered.append(bar, element('span', 'rx-route-value', `${record.complete[index]}/${record.total}`));
      row.append(name, recovered, element('td', 'rx-extra-value', record.extra[index]));
      body.append(row);
    });
    table.append(caption, head, body);
    container.replaceChildren(table);
  }

  function drawBars(container, labels, values, maximum, label) {
    const chart = element('div', 'rx-bars');
    chart.append(element('p', 'rx-chart-label', label));
    labels.forEach((name, index) => {
      const row = element('div', `rx-bar-row${name === 'sclineage' ? ' rx-own-row' : ''}`);
      row.append(element('span', 'rx-bar-name', name));
      const track = element('div', 'rx-bar-track');
      const fill = element('div', 'rx-bar-fill');
      fill.style.width = `${values[index] / maximum * 100}%`;
      track.setAttribute('aria-hidden', 'true');
      track.append(fill);
      row.append(track, element('span', 'rx-bar-value', values[index].toFixed(3)));
      chart.append(row);
    });
    const axis = element('div', 'rx-bar-axis');
    axis.setAttribute('aria-hidden', 'true');
    axis.append(element('span', '', '0'), element('span', '', maximum.toFixed(1)));
    chart.append(axis);
    container.replaceChildren(chart);
  }
  function renderFates() {
    selectButtons('data-fate-view', state.fate);
    selectButtons('data-fate-day', state.day);
    const native = state.fate === 'native';
    const controls = byId('fate-day-controls');
    if (controls) {
      controls.hidden = native;
      controls.style.display = native ? 'none' : '';
    }
    all('[data-fate-day]').forEach(button => { button.disabled = native; });
    const chart = byId('fate-chart');
    if (native) {
      if (chart) drawBars(chart, methods, nativeFates, 0.4, copy('tv'));
      write('fate-headline', copy('nativeHeadline'));
      write('fate-note', copy('nativeNote'));
      return;
    }
    const record = commonFates[state.day];
    if (chart) drawBars(chart, ['Diffusion', 'PCA64', 'sclineage'], record.values, 1, copy('ap'));
    const interval = `[${record.lower.toFixed(3)}, ${record.upper.toFixed(3)}]`;
    write('fate-headline', state.language === 'zh'
      ? `${state.day} → D6 · AP 提升 ${record.difference.toFixed(3)} · 95% CI ${interval}`
      : `${state.day} → D6 · +${record.difference.toFixed(3)} AP · 95% CI ${interval}`);
    write('fate-note', `${record.clones} ${state.language === 'zh' ? '个测试克隆。' : 'test clones. '}${copy('commonNote')}`);
  }

  // Illustrative values keep the right-hand vectors fixed during reassignment.
  const exampleVectors = [[0.8, 0.15, 0.05], [0.6, 0.3, 0.1], [0.15, 0.8, 0.05],
    [0.35, 0.55, 0.1], [0.2, 0.2, 0.6], [0.4, 0.3, 0.3]];
  const permutation = [2, 4, 1, 5, 0, 3];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  function fateVector(values) {
    const bar = element('div', 'rx-vector');
    bar.setAttribute('aria-hidden', 'true');
    values.forEach((value, index) => {
      const segment = element('span', `rx-fate-${index}`);
      segment.style.width = `${value * 100}%`;
      bar.append(segment);
    });
    return bar;
  }

  function createPairing(container) {
    const wrapper = element('div', 'rx-pairing');
    const headings = element('div', 'rx-pairing-headings');
    const sourceHeading = element('span');
    const vectorHeading = element('span');
    headings.append(sourceHeading, vectorHeading);
    const body = element('div', 'rx-pairing-body');
    const sourceColumn = element('div', 'rx-clone-column');
    const vectorColumn = element('div', 'rx-vector-column');
    const canvas = element('canvas', 'rx-connections');
    canvas.setAttribute('aria-hidden', 'true');
    const sourceLabels = [];
    letters.forEach((letter, index) => {
      const sourceRow = element('div', 'rx-source-row');
      sourceLabels.push(sourceRow);
      sourceColumn.append(sourceRow);
      const vectorRow = element('div', 'rx-vector-row');
      vectorRow.append(element('span', 'rx-vector-letter', letter), fateVector(exampleVectors[index]));
      vectorColumn.append(vectorRow);
    });
    body.append(sourceColumn, canvas, vectorColumn);
    const legend = element('div', 'rx-fate-legend');
    const legendLabels = [];
    ['neutrophil', 'monocyte', 'other'].forEach((key, index) => {
      const item = element('span');
      const label = element('span');
      legendLabels.push([label, key]);
      item.append(element('i', `rx-fate-${index}`), label);
      legend.append(item);
    });
    const marginal = element('div', 'rx-marginal');
    const marginalLabel = element('span');
    const averages = [0, 1, 2].map(index => exampleVectors.reduce((sum, vector) => sum + vector[index], 0) / 6);
    marginal.append(marginalLabel, fateVector(averages));
    const note = element('p', 'rx-schematic-note');
    wrapper.append(headings, body, legend, marginal, note);
    container.replaceChildren(wrapper);
    const initialMapping = state.clone === 'matched' ? letters.map((_, index) => index) : permutation.slice();
    pairing = { canvas, context: canvas.getContext('2d'), sourceHeading, vectorHeading,
      sourceLabels, legendLabels, marginalLabel, note, current: initialMapping.slice(),
      target: initialMapping.slice(), frame: 0, width: 0, height: 216 };
    const observer = new ResizeObserver(() => {
      const rectangle = canvas.getBoundingClientRect();
      pairing.width = rectangle.width;
      pairing.height = rectangle.height;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(rectangle.width * ratio);
      canvas.height = Math.round(rectangle.height * ratio);
      if (pairing.context) pairing.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintConnections();
    });
    observer.observe(canvas);
  }
  function paintConnections() {
    if (!pairing || !pairing.context) return;
    const { context, width, height } = pairing;
    context.clearRect(0, 0, width, height);
    const rowHeight = height / 6;
    const color = state.clone === 'matched' ? '#3a63c8' : '#bf814b';
    pairing.current.forEach((target, index) => {
      const fromY = (index + 0.5) * rowHeight;
      const toY = (target + 0.5) * rowHeight;
      context.beginPath();
      context.moveTo(0, fromY);
      context.bezierCurveTo(width * 0.45, fromY, width * 0.55, toY, width, toY);
      context.lineWidth = 1.4;
      context.strokeStyle = color;
      context.globalAlpha = state.clone === 'matched' ? 0.65 : 0.48;
      context.stroke();
      context.beginPath();
      context.arc(Math.max(1, width - 2), toY, 2.2, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
    });
    context.globalAlpha = 1;
  }
  function animatePairing() {
    if (!pairing) return;
    cancelAnimationFrame(pairing.frame);
    pairing.target = state.clone === 'matched' ? letters.map((_, index) => index) : permutation.slice();
    if (media.matches || document.hidden) {
      pairing.current = pairing.target.slice();
      paintConnections();
      return;
    }
    const initial = pairing.current.slice();
    const start = performance.now();
    function step(stamp) {
      const time = Math.min(1, Math.max(0, (stamp - start) / 420));
      const ease = time * time * (3 - 2 * time);
      pairing.current = initial.map((value, index) => value + (pairing.target[index] - value) * ease);
      paintConnections();
      if (time < 1) pairing.frame = requestAnimationFrame(step);
    }
    pairing.frame = requestAnimationFrame(step);
  }
  function renderClone(animate = true) {
    selectButtons('data-clone-view', state.clone);
    write('clone-tv', state.clone === 'matched' ? '0.441' : '0.637');
    write('clone-delta', copy(state.clone === 'matched' ? 'clonedMatched' : 'clonedShuffled'));
    write('clone-note', copy('cloneNote'));
    const container = byId('clone-pairing');
    if (!container) return;
    if (!pairing) createPairing(container);
    pairing.sourceHeading.textContent = copy('source');
    pairing.vectorHeading.textContent = copy('vector');
    pairing.sourceLabels.forEach((label, index) => { label.textContent = `${copy('clone')} ${letters[index]}`; });
    pairing.legendLabels.forEach(([label, key]) => { label.textContent = copy(key); });
    pairing.marginalLabel.textContent = copy('marginal');
    pairing.note.textContent = copy('schematic');
    container.setAttribute('aria-label', `${copy('schematic')}. ${copy('marginal')}.`);
    if (animate) animatePairing();
    else paintConnections();
  }

  function render() {
    renderState(); renderTopology(); renderRegion(); renderFates(); renderClone(false);
  }
  function bind(attribute, key, allowed, update) {
    const buttons = all(`[${attribute}]`);
    const selected = buttons.find(button => button.getAttribute('aria-pressed') === 'true');
    if (selected && allowed.includes(selected.getAttribute(attribute))) state[key] = selected.getAttribute(attribute);
    buttons.forEach(button => button.addEventListener('click', () => {
      const value = button.getAttribute(attribute);
      if (!allowed.includes(value)) return;
      state[key] = value;
      update();
    }));
  }
  function init() {
    if (initialized) return;
    initialized = true;
    bind('data-state-view', 'map', ['state', 'time'], renderState);
    bind('data-topology', 'topology', ['reference', 'sclineage', 'stavia'], renderTopology);
    bind('data-region', 'region', ['I', 'II'], renderRegion);
    bind('data-fate-view', 'fate', ['native', 'common'], renderFates);
    bind('data-fate-day', 'day', ['D2', 'D4'], renderFates);
    bind('data-clone-view', 'clone', ['matched', 'shuffled'], renderClone);
    render();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && pairing) {
        cancelAnimationFrame(pairing.frame);
        pairing.current = pairing.target.slice();
        paintConnections();
      }
    });
  }

  window.ResultsExplorer = {
    setLanguage(language) {
      state.language = language === 'zh' ? 'zh' : 'en';
      if (initialized) render();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
