(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let data;
  let language = 'en';
  let depth = 3;
  let mapDepth = 3;
  let condition = 'full';
  let task = 'D6';
  let metric = 'recall';
  let playing = !reducedMotion;
  let depthTimer;
  const english = Object.fromEntries(all('[data-i18n]').map(node => [node.dataset.i18n, node.innerHTML]));
  const chinese = {
    brandCaption:'细胞状态<br>共同的来路<br>可能的未来', navOverview:'研究概览',navHierarchy:'探索层级结构',navPath:'选择生成路径',navEvidence:'查看实验证据',navMethod:'模型如何工作',resources:'研究与资源 ↗',preview:'交互式研究主页',heroTag:'层级结构引导的细胞状态生成',edition:'sclineage / 研究预览',heroTitle:'从细胞状态出发，<br><em>沿一条路径前行。</em>',heroLead:'学习细胞状态之间的层级关系，用这棵树引导模型，生成一个已观测细胞可能到达的后续状态。',heroCta:'探索层级结构 <span>↗</span>',heroVisual:'同一个起始细胞，两条指定路径。',schematic:'概念动画',heroNote:'动画演示路径条件的作用。下方展示论文中的实测结果。',input:'输入',inputValue:'基因表达快照',learn:'学习',learnValue:'由粗到细的层级结构',generate:'生成',generateValue:'指定路径上的细胞状态',depthTag:'探索层级结构',depthTitle:'同一群细胞，<br><em>不同的分辨率。</em>',depthLead:'调整码本深度。每一层把较宽的群体细分成更精细的状态，每个细胞从根到叶遵循一条父子关系一致的路径。',depthLabel:'树的深度',playDepth:'▷ 播放层级',codebook:'层级树码本 HTC',schematicStructure:'结构示意',levels:'层',codes:'可用编码',depthNotTime:'深度表示结构分辨率',ct34:'CT34 · 留出细胞',reported:'论文实测',depthFinding:'细分也有取舍。',depthFindingText:'留出细胞的状态一致性在第 4 层达到峰值。进一步细分时，同一参考状态可能被分配到多个编码。',depthSource:'五次技术重复 · 图 2b，折线连接中位数',pathTag:'用路径作为生成条件',pathTitle:'共享上层结构，<br><em>走向不同分支。</em>',pathLead:'完整路径向生成器提供多个分辨率的信息。在相同层级感知端点配对下，将它与仅使用叶节点的条件进行比较。',ablationTask:'D6 前向预测',ablationTitle:'生成器收到哪些信息？',none:'无路径',noneSub:'起始状态 + 时间',leaf:'仅叶节点',leafSub:'加入末端编码',full:'完整路径',fullSub:'加入八层码本编码',ablationNote:'使用 D2、D4 训练，留出 D6。三种设置采用相同网络容量和端点配对。',precision:'kNN 精确率 ↑',recall:'kNN 召回率 ↑',ablationSource:'论文报告的均值 · 图 5c 与补图 S12',pairedTag:'相同来源 · 相同噪声 · 相同时间',pairedTitle:'切换指定的分支。',pairedText:'固定 530 个 D2 起始细胞后，完整路径模型分别将 98.74% 和 99.55% 的生成状态导向指定的中性粒细胞分支和单核细胞分支。',pairedNote:'使用表达分类器评估模型预测。三次技术重复，采用层级感知 OT。',evidenceTag:'留出时间点的群体预测',evidenceTitle:'生成的细胞，<br><em>接近真实观测吗？</em>',evidenceLead:'切换插值、前向预测和向后重建。在每个任务中，所有方法使用相同的目标细胞和评估基因。',interpolation:'插值',forward:'前向预测',backward:'向后重建',metric:'评估指标',benchmarkSource:'均值 ± 样本标准差 · 补图 S11。条形图从零开始。',downloadData:'下载报告数据 ↓',cloneLabel:'条形码关联的后代',cloneTitle:'预测保留了来源细胞的信息。',cloneText:'在 375 个测试克隆中，D6 生成的平均命运分布 TV 为 0.441，scDiffEq 为 0.452。打乱预测向量与来源克隆的对应关系后，误差升至 0.637。',pancreasLabel:'第二个发育系统',pancreasTitle:'在胰腺时间序列中向前预测。',pancreasText:'独立拟合的模型从 E13.5、E14.5 预测 E15.5。平均 kNN 召回率达到 78.24%，平均 RBF-MMD 在参评生成器中最低。',methodTag:'模型如何工作',methodTitle:'让层级关系，<br><em>参与状态生成。</em>',methodLead:'连续表征、层级分配与条件流匹配依次训练。',step1Title:'学习连续状态',step1Text:'将表达变化编码成连续表征，在拟合层级结构前冻结编码器。',step2Title:'分配一条路径',step2Text:'每层选择一个子节点。细胞可以共享上层编码，在更细分辨率处分开。',step3Title:'沿条件流积分',step3Text:'通过最优传输配对训练端点，从观测起始状态沿指定路径条件下的速度场积分。',evaluationDetails:'如何理解这些评估',eval1:'CT34 是具有参考祖先关系的合成分支数据。树深表示从表达学习到的层级分辨率。',eval2:'978 个克隆的命运分析使用三天 RNA 拟合表征，并留出克隆组测试命运。独立的群体生成实验在预处理和生成器拟合时完全留出目标日。',eval3:'误差线反映各来源图注明的技术训练或重采样变动。分支切换实验衡量模型的可控性。胰腺实验使用独立训练的模型。',resourcesTag:'继续探索',resourcesTitle:'从一个状态，<br><em>走向可能的未来。</em>',dataResource:'论文报告指标 <span>↓</span>',citation:'复制稿件引用 <span>↗</span>',resourceNote:'论文的交互式研究主页。代码与预印本链接将在公开发布时补充。',footerText:'层级细胞状态与路径条件生成。',top:'回到顶部 ↑'
  };

  function setLanguage(next) {
    stopDepth();
    language = next;
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
    document.body.classList.toggle('lang-zh', next === 'zh');
    all('[data-i18n]').forEach(node => { node.innerHTML = (next === 'zh' ? (node.dataset.zh || chinese[node.dataset.i18n]) : english[node.dataset.i18n]) || english[node.dataset.i18n]; });
    all('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === next)));
    translateControls();
    if (data) { updateDepth(depth); updateMapDepth(mapDepth); updateAblation(condition); updateBenchmark(); }
    window.ResultsExplorer?.setLanguage(next);
    window.ScLineageVisuals?.setLanguage?.(next);
    window.dispatchEvent(new CustomEvent('sclineage:language', {detail:{language:next}}));
    updatePlayButton();
  }

  function updateDepth(value) {
    depth = Number(value);
    $('depth-slider').value = depth;
    $('depth-number').textContent = depth;
    $('code-number').textContent = 2 ** depth;
    all('[data-depth]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.depth) === depth)));
    window.ScLineageVisuals.setDepth(depth);
  }

  function updateMapDepth(value) {
    const map = data.depth.displayedMaps.find(row => row.depth === Number(value));
    if (!map) return;
    mapDepth = map.depth;
    all('[data-map-depth]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.mapDepth) === mapDepth)));
    const image = $('depth-image');
    if (map) {
      image.src = map.heldoutImage;
      image.alt = language === 'zh' ? `CT34 第 ${mapDepth} 层，20,000 个留出细胞，seed 44` : `CT34 level ${mapDepth}, 20,000 held-out cells, seed 44`;
      $('depth-stat-label').textContent = language === 'zh' ? '留出细胞 NMI · 示例拟合' : 'Held-out NMI · displayed fit';
      $('depth-stat').textContent = map.heldoutNmi.toFixed(3);
      $('depth-stat-note').textContent = language === 'zh' ? '20,000 个留出细胞，seed 44。图 2b。' : '20,000 held-out cells · seed 44 · Fig. 2b.';
    }
    if ($('map-depth-note')) $('map-depth-note').textContent = language === 'zh' ? '实测投影提供 L1、L3、L6，与结构示意独立切换。' : 'Measured projections are available at L1, L3 and L6, independently of the schematic depth control.';
  }

  function renderBars(target, rows, maximum, format) {
    const container = typeof target === 'string' ? $(target) : target;
    if (!container) return;
    container.replaceChildren();
    rows.forEach(row => {
      const element = document.createElement('div');
      element.className = `bar-row ${row.className || ''}`;
      const label = document.createElement('span');
      label.textContent = row.label;
      const track = document.createElement('div');
      track.className = 'bar-track';
      const bar = document.createElement('div');
      bar.className = 'bar-fill';
      if (row.color) bar.style.background = row.color;
      track.append(bar);
      if (row.sd !== undefined) {
        const error = document.createElement('span');
        error.className = 'error-line';
        error.style.left = `${Math.max(0, row.value - row.sd) / maximum * 100}%`;
        error.style.width = `${(Math.min(maximum, row.value + row.sd) - Math.max(0, row.value - row.sd)) / maximum * 100}%`;
        track.append(error);
      }
      const number = document.createElement('span');
      number.className = 'bar-number';
      number.textContent = format(row.value);
      element.setAttribute('aria-label', `${row.label}, ${format(row.value)}${row.sd === undefined ? '' : ', SD ' + format(row.sd)}`);
      element.title = `${row.label}: ${format(row.value)}${row.sd === undefined ? '' : ' ± ' + format(row.sd)}`;
      element.append(label, track, number);
      container.append(element);
      requestAnimationFrame(() => { bar.style.width = `${row.value / maximum * 100}%`; });
    });
    const axis = document.createElement('div');axis.className = 'metric-axis';
    [0, maximum / 2, maximum].forEach(value => {const tick=document.createElement('span');tick.textContent=format(value);axis.append(tick);});
    container.append(axis);
  }

  function updateAblation(next) {
    condition = next;
    const keys = ['none', 'leaf', 'full'];
    const selected = data.routeAblation.rows[keys.indexOf(next)];
    all('[data-ablation]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ablation === next)));
    $('ablation-precision').innerHTML = `${(selected.precision * 100).toFixed(2)}<small>%</small>`;
    $('ablation-recall').innerHTML = `${(selected.recall * 100).toFixed(2)}<small>%</small>`;
    if ($('ablation-mmd')) $('ablation-mmd').textContent = selected.mmd.toFixed(4);
    const chart = $('ablation-chart');chart.replaceChildren();
    const labels={precision:['kNN precision ↑','kNN 精确率 ↑'],recall:['kNN recall ↑','kNN 召回率 ↑'],mmd:['RBF-MMD ↓','RBF-MMD ↓']};
    const colors=['var(--data-no-route, #C7CCD6)','var(--data-leaf-only, #AACAC4)','var(--data-full-path, #D89A7C)'];
    for(const key of ['precision','recall','mmd']) {
      const block=document.createElement('section');block.className='ablation-metric-block';
      const title=document.createElement('h4');title.textContent=labels[key][language==='zh'?1:0];
      const rows=document.createElement('div');block.append(title,rows);chart.append(block);
      const max=key==='mmd'?Math.max(...data.routeAblation.rows.map(row=>row[key]+(row[key+'Sd']||0)))*1.12:1;
      renderBars(rows,data.routeAblation.rows.map((row,index)=>({label:language==='zh'?chinese[keys[index]]:row.condition,value:row[key],sd:row[key+'Sd'],className:`${keys[index]} ${keys[index]===next?'selected':''}`,color:colors[index]})),max,value=>key==='mmd'?value.toFixed(3):`${(value*100).toFixed(1)}%`);
    }
    chart.setAttribute('aria-label', language === 'zh' ? '三种路径输入的精确率、召回率与 MMD' : 'Precision, recall and MMD for the three route inputs');
    if ($('ablation-uncertainty')) $('ablation-uncertainty').textContent = language === 'zh'
      ? '均值 ± 样本标准差。完整路径的精确率/召回率：3 次重复，每次平均 5 次重采样（各取 500 个生成细胞与观测细胞）；标准差跨 3 次重复计算。其余消融统计来自 3 个模型种子，每次拟合生成 4,000 个细胞。'
      : 'Mean ± sample s.d. Full-path precision/recall: 3 repetitions, each averaging 5 resamples of 500 generated and 500 observed cells; s.d. is across the 3 repetitions. Other ablation estimates use 3 model seeds, with 4,000 generated cells per fit.';
  }

  function updateBenchmark() {
    const record = data.populationBenchmarks.tasks.find(row => row.day === task);
    const definition = data.populationBenchmarks.metrics.find(row => row.key === metric);
    const own = record.rows.find(row => row.method === 'sclineage')[metric];
    const format = value => metric === 'recall' ? `${(value * 100).toFixed(2)}%` : value.toFixed(metric === 'pearson' ? 3 : 4);
    const max = metric === 'recall' || metric === 'pearson' ? 1.03 : Math.max(...record.rows.map(row => row[metric].mean + row[metric].sd)) * 1.12;
    all('[data-task]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.task === task)));
    $('task-description').textContent = language === 'zh' ? `训练 ${record.trainingDays.join(' + ')} → 预测 ${task} · ${record.targetCells.toLocaleString()} 个目标细胞` : `Train ${record.trainingDays.join(' + ')} → predict ${task} · ${record.targetCells.toLocaleString()} target cells`;
    const colors={sclineage:'var(--data-sclineage, #D89A7C)',TIGON:'var(--data-tigon, #8CAAC1)',scDiffEq:'var(--data-scdiffeq, #C7CCD6)'};
    renderBars('benchmark-chart', record.rows.map(row => ({label:row.method, value:row[metric].mean, sd:row[metric].sd, className:row.method,color:colors[row.method]})), max, format);
    $('benchmark-main').innerHTML = metric === 'recall' ? `${(own.mean * 100).toFixed(2)}<small>%</small>` : own.mean.toFixed(4);
    const labels = {recall:['Coverage of observed cell states','对真实细胞状态的覆盖'],pearson:['Population-mean expression correlation','群体平均表达相关性'],swd:['Sliced Wasserstein · lower is better','切片 Wasserstein 距离 · 越低越好'],mmd:['RBF-MMD · lower is better','RBF-MMD · 越低越好']};
    $('metric-direction').textContent = labels[metric][language === 'zh' ? 1 : 0];
    const best = record.rows.reduce((a,b) => (definition.direction === 'higher' ? b[metric].mean > a[metric].mean : b[metric].mean < a[metric].mean) ? b : a);
    $('benchmark-explanation').textContent = language === 'zh' ? `sclineage 在 ${task} 的报告均值。此任务和指标下，${best.method} 的均值最佳。误差线为样本标准差。` : `Reported sclineage mean on ${task}. ${best.method} has the best mean for this task and metric. Whiskers show sample standard deviation.`;
  }

  function translateControls() {
    const zh=language==='zh';
    const groupNames={'Sections':'章节导航','Language':'语言','Cell map coloring':'细胞图着色','Cell-map method':'细胞图方法','Measured cell-map depth':'实测细胞图层数','Fate evaluation':'命运评估','Fate window':'命运评估时间段','Graph reconstruction':'拓扑重建','Prediction task':'预测任务','Region I reference routes':'区域 I 参考路径','Requested branch':'指定分支','Route ablation comparison':'路径消融比较','Route input':'路径输入','Selected reference region':'选择参考区域','Source clone pairing':'来源克隆对应','Training coupling':'训练配对','Path input':'路径输入','Requested fate':'指定命运','Matched baseline prediction task':'匹配基线预测任务','Matched baseline metric':'匹配基线指标'};
    all('[aria-label]').forEach(node=>{node.dataset.originalLabel ||= node.getAttribute('aria-label');if(groupNames[node.dataset.originalLabel])node.setAttribute('aria-label',zh?groupNames[node.dataset.originalLabel]:node.dataset.originalLabel);});
    const aria={'time-slider':['Animation progress','动画进度'],'depth-slider':['Schematic tree depth','示意树深度'],'hero-canvas':['Conceptual path-conditioned flow','路径条件流概念示意'],'tree-canvas':['Schematic hierarchical codebook','层级码本结构示意'],'metric-select':['Evaluation metric','评估指标'],'close-figure':['Close figure','关闭图片'],'figure-viewport':['Figure viewer; scroll to inspect original size','原图查看器；可滚动查看原尺寸']};
    for(const [id,labels] of Object.entries(aria)) $(id)?.setAttribute('aria-label',labels[zh?1:0]);
    const progressLabel=document.querySelector('label[for="time-slider"]');if(progressLabel) progressLabel.textContent=zh?'动画进度':'Animation progress';
    all('[data-figure]').forEach(button=>{button.dataset.originalAria ||= button.getAttribute('aria-label')||'View source figure';button.setAttribute('aria-label',zh?'查看原论文图':button.dataset.originalAria);});
    all('[data-branch]').forEach(button=>{const icon=button.querySelector('i');const name=button.dataset.branch==='monocyte'?(zh?'单核细胞':'Monocyte'):(zh?'中性粒细胞':'Neutrophil');button.replaceChildren(...(icon?[icon]:[]),document.createTextNode(name));});
    const textMap={INTERPOLATION:'插值',FORWARD:'前向预测',BACKWARD:'后向预测',REPRESENTATION:'表征',HIERARCHY:'层级结构',GENERATION:'生成','CLONE-FATE TV ↓':'克隆命运 TV ↓','D6 · NEUTROPHIL PROPORTION':'D6 · 中性粒细胞比例'};
    all('.time-folds small,.method-steps .small-label,.clone-readout .small-label').forEach(node=>{node.dataset.originalText ||= node.textContent;node.textContent=zh?(textMap[node.dataset.originalText]||node.dataset.originalText):node.dataset.originalText;});
    const metrics={recall:['kNN recall ↑','kNN 召回率 ↑'],pearson:['Pearson R ↑','Pearson R ↑'],swd:['Sliced Wasserstein ↓','切片 Wasserstein ↓'],mmd:['RBF-MMD ↓','RBF-MMD ↓']};
    all('#metric-select option').forEach(node=>{if(metrics[node.value])node.textContent=metrics[node.value][zh?1:0];});
    const labels={'figure-original':['Open original image ↗','打开原图 ↗'],'figure-download':['Download image ↓','下载原图 ↓'],'figure-fit':['Fit to screen','适应屏幕'],'figure-native':['Original size','原始尺寸'],'chapter-menu':['Sections','章节']};
    for(const [id,text] of Object.entries(labels)) if($(id)) $(id).textContent=text[zh?1:0];
    $('chapter-menu')?.setAttribute('aria-label',zh?'展开或收起章节导航':'Show or hide chapter navigation');
  }

  function updatePlayButton() {
    $('hero-play').textContent = playing ? 'Ⅱ' : '▷';
    $('hero-play').setAttribute('aria-label', language === 'zh' ? (playing ? '暂停动画' : '播放动画') : (playing ? 'Pause animation' : 'Play animation'));
    window.ScLineageVisuals.setPlaying(playing);
  }

  all('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  all('[data-branch]').forEach(button => button.addEventListener('click', () => {
    all('[data-branch]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    window.ScLineageVisuals.setBranch(button.dataset.branch);
  }));
  $('hero-play').addEventListener('click', () => {playing = !playing;updatePlayButton();});
  $('time-slider').addEventListener('input', event => {playing = false;updatePlayButton();window.ScLineageVisuals.setTime(Number(event.target.value) / 1000);});
  $('hero-canvas').addEventListener('sclineage:frame', event => {
    $('time-slider').value = Math.round(event.detail.time * 1000);
    $('time-label').textContent = `${Math.round(event.detail.time * 100)}%`;
  });
  $('depth-slider').addEventListener('input', event => {stopDepth();if(data)updateDepth(event.target.value);});
  all('[data-depth]').forEach(button => button.addEventListener('click', () => {stopDepth();if(data)updateDepth(button.dataset.depth);}));
  all('[data-map-depth]').forEach(button => button.addEventListener('click', () => {if(data)updateMapDepth(button.dataset.mapDepth);}));
  function stopDepth() {clearInterval(depthTimer);depthTimer = null;$('depth-play').textContent = language === 'zh' ? '▷ 播放层级' : '▷ Play levels';}
  $('depth-play').addEventListener('click', () => {
    if(depthTimer){stopDepth();return;}
    if(!data)return;
    $('depth-play').textContent = language === 'zh' ? 'Ⅱ 暂停' : 'Ⅱ Pause';
    depthTimer = setInterval(() => updateDepth(depth % 6 + 1), 1800);
  });
  all('[data-ablation]').forEach(button => button.addEventListener('click', () => {if(data)updateAblation(button.dataset.ablation);}));
  all('[data-task]').forEach(button => button.addEventListener('click', () => {task=button.dataset.task;if(data)updateBenchmark();}));
  $('metric-select').addEventListener('change', event => {metric=event.target.value;if(data)updateBenchmark();});
  all('[data-figure]').forEach(button => button.addEventListener('click', () => {
    const displayed = button.querySelector('img');
    $('large-figure').src = displayed ? displayed.currentSrc || displayed.src : button.dataset.figure;
    $('large-figure').alt = displayed ? displayed.alt : button.dataset.caption;
    $('large-caption').textContent = displayed ? displayed.alt : button.dataset.caption;
    const source=$('large-figure').src;
    if($('figure-original')) $('figure-original').href=source;
    if($('figure-download')) {$('figure-download').href=source;$('figure-download').download=source.split('/').pop().split('?')[0];}
    setFigureMode(false);
    $('figure-dialog').showModal();
    $('figure-dialog').scrollTop = 0;
  }));
  $('close-figure').addEventListener('click', () => $('figure-dialog').close());
  $('figure-dialog').addEventListener('click', event => {if(event.target === $('figure-dialog'))$('figure-dialog').close();});
  let nativeFigure=false;
  function setFigureMode(native) {
    nativeFigure=native;
    const image=$('large-figure'),viewport=$('figure-viewport');
    viewport?.classList.toggle('is-native',native);
    image.style.width=native&&image.naturalWidth?`${image.naturalWidth}px`:'100%';
    image.style.maxWidth=native?'none':'100%';image.style.maxHeight='none';image.style.height='auto';
    $('figure-fit')?.setAttribute('aria-pressed',String(!native));$('figure-native')?.setAttribute('aria-pressed',String(native));
    if(viewport) {viewport.scrollLeft=0;viewport.scrollTop=0;}
  }
  $('large-figure').addEventListener('load',()=>{if(nativeFigure)setFigureMode(true);});
  $('figure-fit')?.addEventListener('click',()=>setFigureMode(false));
  $('figure-native')?.addEventListener('click',()=>setFigureMode(true));
  const viewport=$('figure-viewport');let drag;
  viewport?.addEventListener('pointerdown',event=>{if(!nativeFigure||event.pointerType==='touch'||event.button!==0)return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');event.preventDefault();});
  viewport?.addEventListener('pointermove',event=>{if(!drag)return;viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;});
  const endDrag=()=>{drag=null;viewport?.classList.remove('is-dragging');};viewport?.addEventListener('pointerup',endDrag);viewport?.addEventListener('pointercancel',endDrag);
  const menu=$('chapter-menu'),sidebar=document.querySelector('.sidebar');
  function closeMenu(){menu?.setAttribute('aria-expanded','false');sidebar?.classList.remove('menu-open');}
  menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));sidebar?.classList.toggle('menu-open',open);});
  all('.sidebar a[href^="#"]').forEach(link=>link.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
  const compact=()=>document.body.classList.toggle('is-scrolled',scrollY>40);window.addEventListener('scroll',compact,{passive:true});compact();
  $('copy-citation').addEventListener('click', async () => {
    const citation = 'Yan, X., Ling, B. W.-K., Yang, F., Li, S. Z. & Zang, Z. sclineage integrates hierarchical lineage inference with conditional cell-state generation. Research manuscript.';
    try {await navigator.clipboard.writeText(citation);$('copy-status').textContent = language === 'zh' ? '稿件引用已复制。' : 'Manuscript citation copied.';}
    catch {$('copy-status').textContent = citation;}
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {if(entry.isIntersecting)all('.sidebar nav a').forEach(link => {link.classList.toggle('active',link.hash === '#' + (entry.target.dataset.navParent || entry.target.id));if(link.hash === '#' + (entry.target.dataset.navParent || entry.target.id))link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});});
  }, {rootMargin:'-15% 0px -65% 0px'});
  all('main>section').forEach(section => observer.observe(section));
  document.addEventListener('visibilitychange', () => {if(document.hidden)stopDepth();});
  window.ScLineageVisuals.initHero($('hero-canvas'));
  window.ScLineageVisuals.initTree($('tree-canvas'));
  updatePlayButton();
  translateControls();
  fetch('assets/research-data.json?v='+(document.documentElement.dataset.dataVersion||'current')).then(response => {if(!response.ok)throw Error('Data unavailable');return response.json();}).then(result => {data=result;window.ScLineageData=result;updateDepth(depth);updateMapDepth(mapDepth);updateAblation(condition);updateBenchmark();window.dispatchEvent(new CustomEvent('sclineage:data',{detail:{data:result,language}}));}).catch(() => {$('depth-stat-note').textContent=language==='zh'?'交互数据暂时未能载入，请刷新页面。':'Interactive data could not be loaded. Please reload the page.';$('benchmark-explanation').textContent=language==='zh'?'请刷新以载入报告指标。':'Please reload to load the reported metrics.';});
})();
