/* Fig. 5b. The reference UMAP stays fixed while both original route panels change together. */
(() => {
  'use strict';

  const explorer = document.getElementById('generation-map-explorer');
  if (!explorer) return;

  const tasks = {
    D4: { training: 'D2 + D6', source: 'D2', other: 'D6' },
    D6: { training: 'D2 + D4', source: 'D2', other: 'D4' },
    D2: { training: 'D4 + D6', source: 'D4', other: 'D6' }
  };
  const buttons = Array.from(explorer.querySelectorAll('[data-generation-target]'));
  const branchImages = Array.from(explorer.querySelectorAll('img[data-generation-branch]'));
  const reference = explorer.querySelector('[data-generation-reference]');
  const summary = explorer.querySelector('.generation-task-note');
  let target = 'D4';

  function english() {
    return !document.documentElement.lang.startsWith('zh');
  }

  function render() {
    const task = tasks[target];
    const en = english();
    buttons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.generationTarget === target));
    });
    summary.textContent = en
      ? `Train on ${task.training}. Predict ${target} from ${task.source} source cells.`
      : `训练时间点为 ${task.training}，从 ${task.source} 来源细胞预测 ${target}。`;

    reference.alt = en
      ? 'Fig. 5b · Shared UMAP of 2,949 observed LARRY cells.'
      : '图 5b · 2,949 个 LARRY 观测细胞的共享 UMAP。';
    for (const img of branchImages) {
      const branch = img.dataset.generationBranch;
      const source = img.dataset[target.toLowerCase()];
      const name = branch === 'monocyte' ? '单核细胞' : '中性粒细胞';
      if (img.getAttribute('src') !== source) img.src = source;
      img.alt = en
        ? `Fig. 5b · ${branch} route, ${target} held out. Source ${task.source}, other training day ${task.other}.`
        : `图 5b · ${name}路径，留出 ${target}。来源为 ${task.source}，另一个训练日为 ${task.other}。`;
      img.parentElement.dataset.figure = source;
    }
    const legends = { source: task.source, other: task.other, target };
    for (const role of Object.keys(legends)) {
      explorer.querySelector(`[data-generation-day="${role}"]`).textContent = legends[role];
    }
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      target = button.dataset.generationTarget;
      render();
    });
  });
  window.addEventListener('sclineage:language', render);
  render();
})();
