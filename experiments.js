/* Interactive views of reported S14/S15 values; no generated measurements. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const all=selector=>[...document.querySelectorAll(selector)];
  let data=window.ScLineageData;
  let language=document.documentElement.lang.startsWith('zh')?'zh':'en';
  let coupling='Hierarchy-aware',path='Full',request='neutrophil',day='D6',metric='recall';
  const fateColors={neutrophil:'#A85E94',monocyte:'#368882',other:'#BDB8CB'};
  const names={neutrophil:['Neutrophil','中性粒细胞'],monocyte:['Monocyte','单核细胞'],other:['Other','其他']};
  const metricNames={precision:['kNN precision ↑','kNN 精确率 ↑'],recall:['kNN recall ↑','kNN 召回率 ↑'],pearson:['Pearson R ↑','Pearson R ↑'],swd:['Sliced Wasserstein ↓','切片 Wasserstein ↓'],mmd:['RBF-MMD ↓','RBF-MMD ↓']};
  const t=(en,zh)=>language==='zh'?zh:en;
  const write=(id,value)=>{if($(id))$(id).textContent=value;};
  const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const select=(key,value)=>all(`[${key}]`).forEach(button=>button.setAttribute('aria-pressed',String(button.getAttribute(key)===value)));

  function renderSwitch() {
    if(!$('switch-chart')||!data?.branchSwitching)return;
    const record=data.branchSwitching.rows.find(row=>row.coupling===coupling&&row.path===path);
    if(!record)return;
    select('data-switch-coupling',coupling);select('data-switch-path',path);select('data-switch-request',request);
    const prediction=record[request];
    const opposite=request==='neutrophil'?'monocyte':'neutrophil';
    const composition={[request]:prediction.requested,[opposite]:prediction.opposite,other:prediction.other};
    const total=Object.values(composition).reduce((sum,value)=>sum+value,0);
    const chart=$('switch-chart');chart.replaceChildren();
    const bar=make('div','switch-composition');bar.setAttribute('role','img');
    bar.setAttribute('aria-label',Object.entries(composition).map(([key,value])=>`${names[key][language==='zh'?1:0]} ${value.toFixed(2)}%`).join(', '));
    for(const key of ['neutrophil','monocyte','other']) {
      const part=make('span',`switch-segment fate-${key}`);
      part.style.background=fateColors[key];part.style.width=`${composition[key]/total*100}%`;
      part.title=`${names[key][language==='zh'?1:0]}: ${composition[key].toFixed(2)}%`;
      if(composition[key]>=12)part.textContent=`${composition[key].toFixed(1)}%`;
      bar.append(part);
    }
    const axis=make('div','switch-axis');axis.append(make('span','','0%'),make('span','','50%'),make('span','','100%'));chart.append(bar,axis);
    const legend=$('switch-legend');if(legend){legend.replaceChildren();for(const key of ['neutrophil','monocyte','other']){const item=make('span');const swatch=make('i');swatch.style.background=fateColors[key];item.append(swatch,document.createTextNode(`${names[key][language==='zh'?1:0]} ${composition[key].toFixed(2)}%`));legend.append(item);}}
    write('switch-response',t(`Requested ${request} → ${prediction.requested.toFixed(2)}% assigned to the requested fate`,`请求${names[request][1]} → ${prediction.requested.toFixed(2)}% 生成状态被读出为指定命运`));
    write('switch-effect',t(`Paired switching effect: ${record.switching.toFixed(2)} ± ${record.switchingSd.toFixed(2)} percentage points`,`配对路径切换效应：${record.switching.toFixed(2)} ± ${record.switchingSd.toFixed(2)} 个百分点`));
    write('switch-note',t(`530 fixed source cells; identical initial noise and target day D6. Mean ± s.d. across 3 technical fits. Paired clone-bootstrap 95% CI: [${record.ci95[0].toFixed(2)}, ${record.ci95[1].toFixed(2)}] percentage points (2,000 resamples). Independent expression readout. This measures model controllability, not the accuracy of predicting real cell fates.`,`530 个固定来源细胞；初始噪声与目标日 D6 保持相同。3 次技术拟合的均值 ± 标准差；配对克隆 bootstrap 95% CI：[${record.ci95[0].toFixed(2)}, ${record.ci95[1].toFixed(2)}] 个百分点（2,000 次重采样）。使用独立表达读出；检验模型可控性，不是对真实细胞命运预测的准确率。`));
  }

  function renderMatched() {
    if(!$('matched-chart'))return;
    const record=data?.matchedOTCFM?.tasks?.find(task=>task.day===day);
    if(!record){write('matched-note',t('Reported comparison data are loading.','正在载入论文报告的比较数据。'));return;}
    select('data-matched-task',day);
    all('#matched-metric option').forEach(option=>{option.textContent=metricNames[option.value][language==='zh'?1:0];});
    $('matched-metric')?.setAttribute('aria-label',t('Matched baseline evaluation metric','匹配基线的评估指标'));
    const fraction=['recall','precision'].includes(metric);
    const format=value=>fraction?`${(value*100).toFixed(2)}%`:value.toFixed(3);
    const rows=record.rows.filter(row=>row[metric]&&Number.isFinite(row[metric].mean));
    const maximum=['recall','precision','pearson'].includes(metric)?1:Math.max(...rows.map(row=>row[metric].mean+(row[metric].sd||0)))*1.15;
    const chart=$('matched-chart');chart.replaceChildren();
    for(const row of rows){
      const measure=row[metric],own=row.method==='sclineage';
      const line=make('div',`bar-row ${own?'sclineage':'otcfm'}`);line.append(make('span','',row.method));
      const track=make('div','bar-track'),fill=make('div','bar-fill');fill.style.width=`${measure.mean/maximum*100}%`;fill.style.background=own?'var(--data-sclineage, #D89A7C)':'var(--data-otcfm, #8CAAC1)';track.append(fill);
      if(Number.isFinite(measure.sd)){const whisker=make('span','error-line');whisker.style.left=`${Math.max(0,measure.mean-measure.sd)/maximum*100}%`;whisker.style.width=`${(Math.min(maximum,measure.mean+measure.sd)-Math.max(0,measure.mean-measure.sd))/maximum*100}%`;track.append(whisker);}
      line.append(track,make('span','bar-number',format(measure.mean)));line.title=`${row.method}: ${format(measure.mean)}${Number.isFinite(measure.sd)?' ± '+format(measure.sd):''}`;chart.append(line);
    }
    const axis=make('div','metric-axis');[0,maximum/2,maximum].forEach(value=>axis.append(make('span','',format(value))));chart.append(axis);
    const own=rows.find(row=>row.method==='sclineage')?.[metric].mean,baseline=rows.find(row=>row.method!=='sclineage')?.[metric].mean;
    const delta=own-baseline,deltaText=fraction?`${delta>=0?'+':''}${(delta*100).toFixed(2)} ${t('percentage points','个百分点')}`:`${delta>=0?'+':''}${delta.toFixed(3)}`;
    write('matched-description',`${day} · ${metricNames[metric][language==='zh'?1:0]}`);
    write('matched-difference',t(`sclineage − matched OT-CFM: ${deltaText}`,`sclineage − 匹配 OT-CFM：${deltaText}`));
    write('matched-note',t('Mean ± sample s.d. across 3 technical fits (seeds 42, 43, 44). Matched-population evaluation, separate from the TIGON/scDiffEq benchmark; all axes start at zero. Fig. S14.','3 次技术拟合（seed 42、43、44）的均值 ± 样本标准差。匹配群体评估，与 TIGON/scDiffEq 对比是不同实验；所有坐标轴从零开始。补图 S14。'));
  }

  const bind=(selector,callback)=>all(selector).forEach(button=>button.addEventListener('click',()=>{callback(button);renderSwitch();renderMatched();}));
  bind('[data-switch-coupling]',button=>{coupling=button.dataset.switchCoupling;});
  bind('[data-switch-path]',button=>{path=button.dataset.switchPath;});
  bind('[data-switch-request]',button=>{request=button.dataset.switchRequest;});
  bind('[data-matched-task]',button=>{day=button.dataset.matchedTask;});
  $('matched-metric')?.addEventListener('change',event=>{metric=event.target.value;renderMatched();});
  window.addEventListener('sclineage:language',event=>{language=event.detail.language;renderSwitch();renderMatched();});
  window.addEventListener('sclineage:data',event=>{data=event.detail.data;language=event.detail.language;renderSwitch();renderMatched();});
  if(data){renderSwitch();renderMatched();}
})();
