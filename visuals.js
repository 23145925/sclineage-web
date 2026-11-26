/* Schematic visual explanations. These coordinates are not model outputs. */
(function () {
  'use strict';

  const palette = {
    ink: '#193c36',
    green: '#17765e',
    greenLight: '#92c1a8',
    copper: '#b96742',
    copperLight: '#ddb597',
    neutral: '#b7c1b7',
    grid: '#d9dfd3',
    paper: '#f7f8f1'
  };
  const state = {
    depth: 4,
    drawnDepth: 4,
    branch: 'monocyte',
    branchMix: 0,
    time: 0.38,
    playing: true,
    lastStamp: 0,
    frameId: 0,
    lastEvent: 0
  };
  const scenes = new Map();
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;
  let disposed = false;

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function smooth(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function () {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const random = seededRandom(4123);
  function normal() {
    return Math.sqrt(-2 * Math.log(Math.max(random(), 0.000001))) *
      Math.cos(2 * Math.PI * random());
  }

  // A deterministic, hand-shaped branching manifold used only as an illustration.
  const cells = Array.from({ length: 2100 }, function (_, index) {
    return {
      t: Math.pow(random(), 0.86),
      branch: index % 2 === 0 ? -1 : 1,
      side: index % 4 < 2 ? -1 : 1,
      spreadY: normal(),
      spreadZ: normal(),
      spreadX: normal(),
      radius: 0.65 + random() * 1.15,
      opacity: 0.24 + random() * 0.58
    };
  });
  cells.sort(function (a, b) {
    const spreadA = 0.011 + 0.014 * smooth(a.t) + 0.011 * smooth((a.t - 0.68) / 0.32);
    const spreadB = 0.011 + 0.014 * smooth(b.t) + 0.011 * smooth((b.t - 0.68) / 0.32);
    return a.spreadZ * spreadA - b.spreadZ * spreadB;
  });
  const movingCells = Array.from({ length: 115 }, function (_, index) {
    return {
      offset: index / 115,
      spreadY: normal() * 0.42,
      spreadZ: normal() * 0.45,
      radius: 0.8 + random() * 1.2
    };
  });

  function project(t, branch, side, spreadY, spreadZ, spreadX, width, height) {
    const split = smooth((t - 0.27) / 0.66);
    const fineSplit = smooth((t - 0.68) / 0.32);
    const widthAtTime = 0.011 + 0.014 * smooth(t) + 0.011 * fineSplit;
    const x = 0.12 + 0.75 * t + (spreadX || 0) * 0.007;
    const y = 0.61 - 0.12 * t + branch * split * 0.265 + side * fineSplit * 0.052;
    const z = spreadZ * widthAtTime;
    return {
      x: width * (x + z * 0.72),
      y: height * (y + spreadY * widthAtTime + z * 0.8),
      z: z,
      split: split
    };
  }

  function line(context, x1, y1, x2, y2, color, lineWidth) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.strokeStyle = color;
    context.lineWidth = lineWidth || 1;
    context.stroke();
  }

  function text(context, label, x, y, size, color, alignment) {
    context.font = `${size || 11}px "DM Sans", "Inter", system-ui, sans-serif`;
    context.textAlign = alignment || 'left';
    context.textBaseline = 'middle';
    context.fillStyle = color || palette.ink;
    context.fillText(label, x, y);
  }

  function renderHero(scene) {
    const { context, width, height } = scene;
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    context.save();

    const compact = width < 420;
    const unit = clamp(width / 680, 0.68, 1.5);
    const selectedBranch = state.branchMix < 0.5 ? -1 : 1;
    const selectedColor = selectedBranch === -1 ? palette.green : palette.copper;

    // Perspective floor makes depth legible without competing with the cell cloud.
    context.globalAlpha = 0.65;
    for (let step = 0; step <= 9; step += 1) {
      const x = width * (0.09 + step * 0.087);
      line(context, x, height * 0.85, x + width * 0.055, height * 0.68, palette.grid, 0.6);
    }
    for (let step = 0; step <= 4; step += 1) {
      const y = height * (0.68 + step * 0.0425);
      const shift = width * (0.055 - step * 0.01375);
      line(context, width * 0.09 + shift, y, width * 0.873 + shift, y, palette.grid, 0.6);
    }
    context.globalAlpha = 1;

    // Projected cloud shadows anchor the diagram to the floor.
    {
      const shadow = context.createRadialGradient(width * 0.62, height * 0.79, 0,
        width * 0.62, height * 0.79, width * 0.34);
      shadow.addColorStop(0, 'rgba(68,100,80,0.045)');
      shadow.addColorStop(1, 'rgba(68,100,80,0)');
      context.save();
      context.translate(width * 0.62, height * 0.79);
      context.scale(1, 0.13);
      context.translate(-width * 0.62, -height * 0.79);
      context.fillStyle = shadow;
      context.fillRect(0, 0, width, height * 6);
      context.restore();
    }

    // Fine center lines show how a shared trunk becomes two possible routes.
    for (const branch of [-1, 1]) {
      const active = branch === selectedBranch;
      context.beginPath();
      for (let i = 0; i <= 100; i += 1) {
        const point = project(i / 100, branch, 0, 0, 0, 0, width, height);
        if (i === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      }
      context.lineWidth = active ? 1.25 : 0.7;
      context.strokeStyle = active ? selectedColor : palette.neutral;
      context.globalAlpha = active ? 0.22 : 0.22;
      context.stroke();
    }

    for (const cell of cells) {
      const point = project(cell.t, cell.branch, cell.side,
        cell.spreadY, cell.spreadZ, cell.spreadX, width, height);
      const isCommon = cell.t < 0.34;
      const activeWeight = cell.branch === -1 ? 1 - state.branchMix : state.branchMix;
      const behindCursor = 1 - smooth((cell.t - state.time) / 0.09);
      const alpha = cell.opacity * (isCommon ? 0.68 : 0.18 + activeWeight * 0.67);
      context.globalAlpha = alpha * (0.48 + behindCursor * 0.52);
      context.fillStyle = isCommon ? palette.ink : cell.branch === -1 ? palette.green : palette.copper;
      context.beginPath();
      context.arc(point.x, point.y, cell.radius * unit * (1 + point.z * 3), 0, Math.PI * 2);
      context.fill();
    }

    // These are illustrative trajectories, with the progress controlled by the UI.
    const travel = state.time;
    for (const particle of movingCells) {
      const t = travel - particle.offset * 0.48;
      if (t < 0 || t > 1) continue;
      const branch = -1 + 2 * state.branchMix;
      const point = project(t, branch, 0, particle.spreadY, particle.spreadZ, 0, width, height);
      const tailPoint = project(Math.max(0, t - 0.014), branch, 0,
        particle.spreadY, particle.spreadZ, 0, width, height);
      context.globalAlpha = (1 - particle.offset) * 0.7;
      line(context, tailPoint.x, tailPoint.y, point.x, point.y, selectedColor, particle.radius * unit * 0.85);
      context.beginPath();
      context.arc(point.x, point.y, particle.radius * unit, 0, Math.PI * 2);
      context.fillStyle = selectedColor;
      context.fill();
    }
    context.globalAlpha = 1;

    const source = project(0.015, 0, 0, 0, 0, 0, width, height);
    context.beginPath();
    context.arc(source.x, source.y, 5.5 * unit, 0, Math.PI * 2);
    context.fillStyle = '#f8faf4';
    context.fill();
    context.lineWidth = 1.5;
    context.strokeStyle = palette.ink;
    context.stroke();
    context.beginPath();
    context.arc(source.x, source.y, 2 * unit, 0, Math.PI * 2);
    context.fillStyle = palette.ink;
    context.fill();
    text(context, 'Shared source', source.x - 10 * unit, source.y + 28 * unit,
      compact ? 10 : 11, palette.ink);

    const cursor = project(travel, -1 + 2 * state.branchMix, 0, 0, 0, 0, width, height);
    const glow = context.createRadialGradient(cursor.x, cursor.y, 2, cursor.x, cursor.y, 25 * unit);
    glow.addColorStop(0, selectedBranch === -1 ? 'rgba(23,118,94,0.18)' : 'rgba(185,103,66,0.18)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = glow;
    context.fillRect(cursor.x - 25 * unit, cursor.y - 25 * unit, 50 * unit, 50 * unit);
    context.beginPath();
    context.arc(cursor.x, cursor.y, 7 * unit, 0, Math.PI * 2);
    context.strokeStyle = selectedColor;
    context.lineWidth = 1.1;
    context.stroke();
    context.beginPath();
    context.arc(cursor.x, cursor.y, 2.4 * unit, 0, Math.PI * 2);
    context.fillStyle = selectedColor;
    context.fill();

    text(context, 'Monocyte', width * 0.88, height * 0.15, compact ? 10 : 12,
      palette.green, 'right');
    text(context, 'Neutrophil', width * 0.93, height * 0.86, compact ? 10 : 12,
      palette.copper, 'right');

    const axisY = height * 0.947;
    line(context, width * 0.12, axisY, width * 0.85, axisY, '#b9c6b9', 0.7);
    line(context, width * 0.85, axisY, width * 0.84, axisY - 3, '#b9c6b9', 0.7);
    line(context, width * 0.85, axisY, width * 0.84, axisY + 3, '#b9c6b9', 0.7);
    text(context, 'Developmental progression', width * 0.485, axisY + 16,
      compact ? 9 : 10, '#75877a', 'center');
    context.restore();
  }

  function treePoint(level, index, drawnDepth, width, height) {
    const count = Math.pow(2, level);
    const usableHeight = height * 0.73;
    return {
      x: width * (0.075 + 0.82 * level / Math.max(drawnDepth, 1)),
      y: height * 0.135 + usableHeight * (index + 0.5) / count
    };
  }

  function renderTree(scene) {
    const { context, width, height } = scene;
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    const depth = state.drawnDepth;
    const selectedLeaf = state.branch === 'monocyte' ? 12 : 51;
    const selectedColor = state.branch === 'monocyte' ? palette.green : palette.copper;
    const levels = Math.ceil(depth);
    const small = width < 440;
    context.save();

    for (let level = 1; level <= levels; level += 1) {
      const visibility = clamp(depth - level + 1, 0, 1);
      const node = treePoint(level, 0, depth, width, height);
      context.globalAlpha = visibility;
      line(context, node.x, height * 0.11, node.x, height * 0.9, '#e2e7dc', 0.5);
      text(context, small ? `L${level}` : `Level ${level}`, node.x, height * 0.06,
        small ? 9 : 10, '#7c8e80', 'center');
    }

    for (let level = 1; level <= levels; level += 1) {
      const count = Math.pow(2, level);
      const visibility = clamp(depth - level + 1, 0, 1);
      const selectedIndex = Math.floor(selectedLeaf / Math.pow(2, 6 - level));
      for (let index = 0; index < count; index += 1) {
        const parent = treePoint(level - 1, Math.floor(index / 2), depth, width, height);
        const node = treePoint(level, index, depth, width, height);
        const active = index === selectedIndex;
        const firstHalf = index < count / 2;
        const color = firstHalf ? palette.green : palette.copper;
        context.beginPath();
        context.moveTo(parent.x, parent.y);
        const bend = (node.x - parent.x) * 0.51;
        context.bezierCurveTo(parent.x + bend, parent.y, node.x - bend, node.y, node.x, node.y);
        context.strokeStyle = active ? selectedColor : color;
        context.lineWidth = active ? 2 : level >= 5 ? 0.65 : 1;
        context.globalAlpha = visibility * (active ? 0.92 : 0.21);
        context.stroke();
      }
    }

    for (let level = 0; level <= levels; level += 1) {
      const count = Math.pow(2, level);
      const visibility = level === 0 ? 1 : clamp(depth - level + 1, 0, 1);
      const selectedIndex = Math.floor(selectedLeaf / Math.pow(2, 6 - level));
      for (let index = 0; index < count; index += 1) {
        const point = treePoint(level, index, depth, width, height);
        const active = index === selectedIndex;
        const radius = level >= 5 ? 2.2 : level >= 3 ? 3.2 : 4.2;
        context.globalAlpha = visibility;
        context.beginPath();
        context.arc(point.x, point.y, active ? radius + 0.6 : radius, 0, Math.PI * 2);
        context.fillStyle = level === 0 ? palette.ink : active ? selectedColor : '#f7f8f2';
        context.fill();
        context.strokeStyle = level === 0 ? palette.ink : index < count / 2 ? '#8ebaa5' : '#d4a58b';
        context.lineWidth = 0.85;
        context.stroke();
        if (active && level === Math.round(state.depth)) {
          context.beginPath();
          context.arc(point.x, point.y, radius + 5, 0, Math.PI * 2);
          context.strokeStyle = selectedColor;
          context.globalAlpha = visibility * 0.33;
          context.stroke();
        }
      }
    }
    context.globalAlpha = 1;
    text(context, 'Root', width * 0.075, height * 0.565, 10, palette.ink, 'center');
    text(context, 'Coarse', width * 0.075, height * 0.96, 10, '#7c8e80', 'center');
    text(context, 'Fine', width * 0.895, height * 0.96, 10, '#7c8e80', 'center');
    line(context, width * 0.15, height * 0.96, width * 0.82, height * 0.96, '#d0d9cc', 0.65);
    line(context, width * 0.82, height * 0.96, width * 0.81, height * 0.96 - 3, '#d0d9cc', 0.65);
    line(context, width * 0.82, height * 0.96, width * 0.81, height * 0.96 + 3, '#d0d9cc', 0.65);
    context.restore();
  }

  function hasVisibleScene() {
    return Array.from(scenes.values()).some(function (scene) { return scene.visible; });
  }

  function isPlaybackVisible() {
    const hero = scenes.get('hero');
    return state.playing && !reducedMotion && hero && hero.visible;
  }

  function animate(stamp) {
    state.frameId = 0;
    if (disposed || document.hidden || !hasVisibleScene()) {
      state.lastStamp = 0;
      return;
    }
    const delta = state.lastStamp ? clamp((stamp - state.lastStamp) / 1000, 0, 0.045) : 0;
    state.lastStamp = stamp;
    if (isPlaybackVisible()) state.time = (state.time + delta * 0.075) % 1;

    const targetMix = state.branch === 'monocyte' ? 0 : 1;
    const mix = reducedMotion ? 1 : 1 - Math.exp(-delta * 9);
    state.drawnDepth += (state.depth - state.drawnDepth) * mix;
    state.branchMix += (targetMix - state.branchMix) * mix;
    if (Math.abs(state.drawnDepth - state.depth) < 0.002) state.drawnDepth = state.depth;
    if (Math.abs(state.branchMix - targetMix) < 0.002) state.branchMix = targetMix;
    const changing = state.drawnDepth !== state.depth || state.branchMix !== targetMix;
    for (const scene of scenes.values()) {
      if (!scene.visible) continue;
      if (scene.type === 'hero') renderHero(scene);
      else renderTree(scene);
    }
    if (stamp - state.lastEvent > 80) {
      for (const scene of scenes.values()) {
        if (scene.type === 'hero' && scene.visible) {
          scene.canvas.dispatchEvent(new CustomEvent('sclineage:frame', {
            detail: { time: state.time, playing: state.playing && !reducedMotion }
          }));
        }
      }
      state.lastEvent = stamp;
    }
    if (isPlaybackVisible() || changing) wake();
    else state.lastStamp = 0;
  }

  function wake() {
    if (!state.frameId && !disposed && !document.hidden && hasVisibleScene()) {
      state.frameId = window.requestAnimationFrame(animate);
    }
  }

  function resize(scene) {
    const box = scene.canvas.getBoundingClientRect();
    scene.width = Math.max(1, box.width);
    scene.height = Math.max(1, box.height);
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    scene.canvas.width = Math.round(scene.width * scale);
    scene.canvas.height = Math.round(scene.height * scale);
    scene.context.setTransform(scale, 0, 0, scale, 0, 0);
    wake();
  }

  function initialize(canvas, type) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('ScLineageVisuals requires an HTMLCanvasElement.');
    }
    if (disposed) throw new Error('This visual instance has been destroyed.');
    const prior = scenes.get(type);
    if (prior) {
      prior.resizeObserver.disconnect();
      prior.visibilityObserver.disconnect();
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    const scene = { canvas, context, type, visible: true, width: 0, height: 0 };
    scenes.set(type, scene);
    scene.resizeObserver = new ResizeObserver(function () { resize(scene); });
    scene.resizeObserver.observe(canvas);
    scene.visibilityObserver = new IntersectionObserver(function (entries) {
      scene.visible = entries[0].isIntersecting;
      state.lastStamp = 0;
      wake();
    }, { rootMargin: '80px' });
    scene.visibilityObserver.observe(canvas);
    resize(scene);
  }

  function onVisibilityChange() {
    state.lastStamp = 0;
    if (document.hidden && state.frameId) {
      window.cancelAnimationFrame(state.frameId);
      state.frameId = 0;
    } else wake();
  }

  function onMotionChange(event) {
    reducedMotion = event.matches;
    state.lastStamp = 0;
    wake();
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  motionQuery.addEventListener('change', onMotionChange);

  window.ScLineageVisuals = {
    initHero: function (canvas) { initialize(canvas, 'hero'); },
    initTree: function (canvas) { initialize(canvas, 'tree'); },
    setDepth: function (depth) {
      if (!Number.isFinite(Number(depth))) return;
      state.depth = clamp(Math.round(Number(depth)), 1, 6);
      wake();
    },
    setBranch: function (branch) {
      if (branch !== 'monocyte' && branch !== 'neutrophil') return;
      state.branch = branch;
      wake();
    },
    setTime: function (time) {
      if (!Number.isFinite(Number(time))) return;
      state.time = clamp(Number(time), 0, 1);
      wake();
    },
    setPlaying: function (playing) {
      state.playing = Boolean(playing);
      state.lastStamp = 0;
      wake();
    },
    destroy: function () {
      disposed = true;
      window.cancelAnimationFrame(state.frameId);
      scenes.forEach(function (scene) {
        scene.resizeObserver.disconnect();
        scene.visibilityObserver.disconnect();
      });
      scenes.clear();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery.removeEventListener('change', onMotionChange);
    }
  };
})();
