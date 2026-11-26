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
      stateNote: 'The same 100,000 CT34 cells, colored by 34 reference states. Figure 2a.',
      timeNote: 'The same 100,000 CT34 cells, colored by reference developmental time. Figure 2a.',
      stateAlt: 'Four methods display the same CT34 cells colored by reference state',
      timeAlt: 'Four methods display the same CT34 cells colored by developmental time',
      topologyNote: 'Displayed fit, seed 44. Correct edges follow the reference direction. Extra edges include additional or reversed connections. These counts describe the displayed graphs. Figure 3c.',
      referenceNote: 'The CT34 reference has 34 states and 33 directed transitions. F1 = 1.000 is the reference compared with itself. The inferred graphs shown here use seed 44. Figure 3c.',
      method: 'Method', complete: 'Complete routes', extra: 'Non-reference transitions',
      regionNote: 'These are two selected local regions, containing two and three reference routes. Counts describe route recovery within those regions. Supplementary Figure S9d.',
      tv: 'Mean fate-distribution TV ↓', ap: 'Macro average precision ↑',
      nativeHeadline: '0.242 mean TV across 978 test clones',
      nativeNote: 'D4 → D6, each method uses its native fate readout. RNA from all three days was used to fit the representations. Barcode-linked outcomes in 978 held-out clones provide the evaluation target. Figure 4d.',
      commonNote: 'A shared day-ordered readout evaluates ten mature fates. RNA from all three days was used for representation fitting. The interval is a paired 95% clone-bootstrap interval for the AP difference versus Diffusion. Figure 4e.',
      clonedMatched: '0.19609 lower TV than the shuffled control',
      clonedShuffled: '+0.19609 TV after shuffling',
      cloneNote: '375 test clones, 530 D2 source cells. Predictions are generated from D2/D4-trained models and evaluated against barcode-linked D6 descendants. Shuffling reassigns whole predicted fate vectors among clones and preserves the clone-averaged predicted fate composition. Figure 5d and Supplementary Figure S13a.',
      source: 'Source clones', vector: 'Predicted fate vectors', clone: 'Clone',
      schematic: 'Schematic pairing with illustrative fate vectors',
      marginal: 'Clone-averaged composition is preserved',
      neutrophil: 'Neutrophil', monocyte: 'Monocyte', other: 'Other',
      reference: 'Reference', selected: 'Selected region'
    },
    zh: {
      stateNote: '相同的 100,000 个 CT34 细胞，按 34 个参考状态着色。图 2a。',
      timeNote: '相同的 100,000 个 CT34 细胞，按参考发育时间着色。图 2a。',
      stateAlt: '四种方法展示相同 CT34 细胞，按参考状态着色',
      timeAlt: '四种方法展示相同 CT34 细胞，按发育时间着色',
      topologyNote: '展示拟合使用 seed 44。正确边与参考方向一致，额外边包含新增或反向连接。这些计数对应当前展示的图。图 3c。',
      referenceNote: 'CT34 参考结构包含 34 个状态和 33 条有向转换。参考图与自身比较时 F1 为 1.000。此处展示的推断图使用 seed 44。图 3c。',
      method: '方法', complete: '完整恢复的路径', extra: '非参考转换',
      regionNote: '这里展示两个选定局部区域，分别包含两条和三条参考路径。计数衡量这些区域内的路径恢复。补图 S9d。',
      tv: '平均命运分布 TV ↓', ap: '宏平均精确率 AP ↑',
      nativeHeadline: '978 个测试克隆，平均 TV 为 0.242',
      nativeNote: 'D4 → D6，各方法使用各自的命运读出。表征拟合使用三天的 RNA，978 个留出克隆的条形码关联后代提供评估目标。图 4d。',
      commonNote: '使用共享的按日排序读出，评估十种成熟命运。表征拟合使用三天的 RNA。区间为相对 Diffusion 的 AP 差异的配对克隆 bootstrap 95% 区间。图 4e。',
      clonedMatched: 'TV 比打乱对照低 0.19609',
      clonedShuffled: '打乱后 TV 增加 0.19609',
      cloneNote: '375 个测试克隆，共 530 个 D2 起始细胞。生成模型使用 D2/D4 训练，以条形码关联的 D6 后代评估。打乱时将完整预测命运向量重新分配给克隆，保留按克隆平均的预测命运组成。图 5d 与补图 S13a。',
      source: '来源克隆', vector: '预测命运向量', clone: '克隆',
      schematic: '使用示例命运向量的配对示意',
      marginal: '按克隆平均的命运组成保持一致',
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
    const color = state.clone === 'matched' ? '#35795d' : '#bd6e48';
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
