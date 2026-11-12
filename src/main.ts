import './style.css';
import {createIcons,Route,Maximize,CircleHelp,GraduationCap,Search,ChevronRight,PersonStanding,Tags,Box,ArrowUpRight,Plus,Minus,Rotate3d,Scan,Focus,Layers2,MousePointer2,Play,Pause,ArrowRight,ChevronLeft,X,Bean,Shapes,Activity,MoveRight,Lightbulb,ChevronDown,TriangleAlert,Microscope} from 'lucide';
import {organs,steps,nutrients,type Group} from './content';
import {AnatomyScene} from './scene';
import {swallowPhases,swallowState} from './swallow-motion';
const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const icon=(name:string,cls='')=>`<i data-lucide="${name}" class="${cls}"></i>`;
const refreshIcons=()=>createIcons({icons:{Route,Maximize,CircleHelp,GraduationCap,Search,ChevronRight,PersonStanding,Tags,Box,ArrowUpRight,Plus,Minus,Rotate3d,Scan,Focus,Layers2,MousePointer2,Play,Pause,ArrowRight,ChevronLeft,X,Bean,Shapes,Activity,MoveRight,Lightbulb,ChevronDown,TriangleAlert,Microscope},attrs:{'stroke-width':1.6}});
let active:Exclude<Group,'body'>='stomach',mode:'structure'|'journey'|'absorption'|'swallow'='structure',playing=false,playTimer:ReturnType<typeof setInterval>|null=null,speed=1,nutrient=0,scene:AnatomyScene|undefined;
document.querySelector('#app')!.innerHTML=`
<header class="topbar">
  <a class="brand" href="#" aria-label="消化与吸收交互课堂首页"><span class="brand-mark">${icon('route')}</span><span>生理学<span class="brand-separator">/</span><strong>交互课堂</strong></span></a>
  <nav class="main-nav" aria-label="课程导航"><button class="nav-item active" data-mode="structure">结构探索</button><button class="nav-item" data-mode="journey">消化旅程</button><button class="nav-item" data-mode="swallow">吞咽演示</button><button class="nav-item" data-mode="absorption">吸收机制</button></nav>
  <div class="header-actions"><span class="course-label"><span></span>消化生理学</span><button class="icon-button" id="help" aria-label="使用说明" title="使用说明">${icon('circle-help')}</button><button class="presentation-button" id="fullscreen" aria-label="切换专注授课">${icon('maximize')}<span>专注授课</span></button></div>
</header>
<main>
  <section class="page-intro"><div><div class="eyebrow"><span class="tiny-line"></span> EXPLORE THE HUMAN BODY <span class="chapter">CHAPTER 06</span></div><h1>食物的旅程<span class="title-dot">.</span></h1><p>从一口食物，到身体所需。看见消化，理解吸收。</p></div><div class="intro-side"><span class="lesson-badge">${icon('graduation-cap')} 消化与吸收</span><p>结构 · 过程 · 功能</p></div></section>
  <div class="workspace" id="workspace">
  <aside class="structure-panel">
    <div class="panel-heading"><div><span class="eyebrow">ANATOMY</span><h2>消化系统</h2></div><span class="count-badge">13</span></div>
    <div class="search-field">${icon('search')}<input id="organ-search" placeholder="查找结构" aria-label="查找消化系统结构" autocomplete="off"/><kbd>/</kbd></div>
    <div class="tree-title">消化道 <span>07</span></div><div class="organ-list" id="tract-list">${steps.map((s,i)=>`<button class="organ-item ${s.group===active?'active':''}" data-organ="${s.group}"><span class="organ-number">${String(i+1).padStart(2,'0')}</span><span>${s.name}</span><span class="organ-item-dot" style="--organ-color:${organs[s.group].color}"></span></button>`).join('')}</div>
    <div class="tree-title accessory-heading">辅助消化器官 <span>03</span></div><div class="organ-list" id="accessory-list">${(['liver','gallbladder','pancreas'] as const).map(g=>`<button class="organ-item" data-organ="${g}"><span class="accessory-dot" style="background:${organs[g].color}"></span><span>${organs[g].name}</span>${icon('chevron-right')}</button>`).join('')}</div><p class="empty-search" hidden>未找到匹配结构</p>
    <div class="tree-title">喉部结构 <span>03</span></div><div class="organ-list" id="throat-list">${(['thyroid','epiglottis','airway'] as const).map(g=>`<button class="organ-item" data-organ="${g}"><span class="accessory-dot" style="background:${organs[g].color}"></span><span>${organs[g].name}</span>${icon('chevron-right')}</button>`).join('')}</div><button id="open-swallow" class="swallow-entry">${icon('play')} 会厌工作演示</button>
    <div class="layer-controls"><div class="tree-title">显示图层</div><label class="switch-row"><span>${icon('person-standing')} 人体轮廓</span><input id="body-toggle" type="checkbox" role="switch" checked/><span class="switch"></span></label><label class="switch-row"><span>${icon('tags')} 结构标签</span><input id="label-toggle" type="checkbox" role="switch" checked/><span class="switch"></span></label></div>
    <button class="source-link" id="source-button">${icon('box')}<span>BodyParts3D 解剖模型</span>${icon('arrow-up-right')}</button>
  </aside>
  <section class="viewer-panel" aria-label="消化系统模型观察区"><div class="viewer-top"><div class="viewer-caption"><span class="live-dot"></span><span id="viewer-title">消化系统 · 三维结构</span></div><span class="model-status" id="model-status">正在载入模型</span></div>
    <div id="anatomy-canvas"></div><div class="viewer-wash"></div>
    <div class="viewer-tabs" aria-label="观察方向"><button data-view="front" class="active">正面</button><button data-view="side">侧面</button><button data-view="back">背面</button></div>
    <div class="orientation"><span>上 S</span><span>右 R <b>＋</b> 左 L</span><span>下 I</span></div>
    <div class="model-loading" id="model-loading"><span class="loading-ring"></span><strong>正在准备三维解剖模型</strong><span>加载完成后即可自由旋转与观察</span></div>
    <div class="viewer-toolbar"><button id="zoom-in" aria-label="放大模型" title="放大">${icon('plus')}</button><button id="zoom-out" aria-label="缩小模型" title="缩小">${icon('minus')}</button><span></span><button id="auto-rotate" aria-label="自动旋转模型" title="自动旋转" aria-pressed="false">${icon('rotate-3d')}</button><button id="reset-view" aria-label="恢复整体正面视图" title="恢复视图">${icon('scan')}</button></div>
    <div class="selection-card"><span class="selection-swatch" id="selection-swatch"></span><div><strong id="selection-name">胃</strong><span id="selection-en">Stomach</span></div><button id="focus-organ" aria-label="聚焦当前器官" title="聚焦当前器官">${icon('focus')}</button></div>
    <div class="viewer-bottom"><span>${icon('mouse-pointer-2')} 左键平移<span class="hint-sep">·</span>右键旋转<span class="hint-sep">·</span>滚轮缩放</span><button id="isolate-button" aria-pressed="false">${icon('layers-2')}<span>单独观察</span></button></div>
  </section>
  <aside class="detail-panel" id="detail-panel" aria-live="polite"></aside>
  <section class="absorption-panel" id="absorption-panel" hidden></section>
  <aside class="swallow-panel" id="swallow-panel" hidden>
    <div class="detail-overline">吞咽与气道保护 <span class="detail-category">慢速示意</span></div>
    <h2>会厌怎样保护气道？</h2>
    <div class="swallow-phase-card"><span id="swallow-phase-number">第 1 / 4 步</span><h3 id="swallow-phase-title">呼吸准备</h3><p id="swallow-phase-text"></p></div>
    <div class="swallow-state"><span id="swallow-air-state">气道开放</span><span id="swallow-food-state">食团待送</span></div>
    <div class="swallow-color-key"><span><i class="air-dot"></i>蓝色：呼吸道</span><span><i class="food-dot"></i>金色：食团</span><span><i class="eso-dot"></i>棕色：后方食管</span></div>
    <p class="swallow-note">会厌翻转、喉上提、喉前庭及声门关闭共同保护气道。入口轮廓、腔道和运动为教学示意；时间已放慢。</p>
  </aside>
  </div>
  <section class="journey-panel" aria-label="分步骤消化教学"><div class="journey-heading"><div><span class="eyebrow">THE DIGESTIVE JOURNEY</span><h2>跟随一口食物，走过消化全程</h2></div><div class="journey-actions"><button id="play-button" class="play-button">${icon('play')}<span>开始演示</span></button></div></div>
    <div class="journey-timeline">${steps.map((s,i)=>`<button class="journey-step ${s.group===active?'active':''}" data-step="${i}"><span class="step-line"></span><span class="step-top"><span class="step-number">${String(i+1).padStart(2,'0')}</span>${icon('arrow-right')}</span><strong>${s.name}</strong><span class="step-action">${s.action.replace(' · ','<br/>')}</span></button>`).join('')}</div>
    <div class="journey-controls"><span id="step-status">第 3 / 7 站<span>点击任意站点，展开讲解</span></span><div><button id="prev-step" class="text-control">${icon('chevron-left')} 上一步</button><button class="speed-button" id="speed-button" aria-label="切换演示速度">1×</button><button id="next-step" class="text-control">下一步 ${icon('chevron-right')}</button></div></div>
  </section>
  <section class="swallow-timeline-panel" id="swallow-timeline-panel" aria-label="吞咽分步骤演示" hidden>
    <div class="journey-heading"><h2>从呼吸到吞咽，再恢复呼吸</h2><div class="swallow-actions"><button id="swallow-reset" class="text-control">${icon('rotate-3d')} 重置</button><button id="swallow-play" class="play-button">${icon('play')}<span>播放吞咽</span></button></div></div>
    <div class="swallow-steps">${swallowPhases.map((p,i)=>`<button data-swallow-phase="${i}" class="swallow-step ${i===0?'active':''}"><strong><span>${i+1}</span>${p.name}</strong><span>${p.short}</span></button>`).join('')}</div>
    <div class="swallow-scrub"><label for="swallow-progress">拖动分步讲解</label><input id="swallow-progress" type="range" min="0" max="1000" step="1" value="0" aria-label="吞咽演示进度"/><span id="swallow-progress-value">0%</span></div>
  </section>
  <footer><span>看见结构，连接功能。<span class="footer-divider">|</span>生理学 · 消化与吸收</span><button id="credits-footer">模型来源与教学说明 ${icon('arrow-up-right')}</button></footer>
</main>
<dialog id="info-dialog"><div class="dialog-top"><span class="eyebrow">CLASSROOM NOTES</span><button id="close-dialog" class="icon-button" aria-label="关闭">${icon('x')}</button></div><div id="dialog-body"></div></dialog><div id="toast" role="status"></div>`;
document.body.classList.add('large-type');
const stage=document.createElement('div');stage.className='presentation-stage';stage.id='presentation-stage';
stage.append($('.topbar'),$('main'));$('#app').prepend(stage);
// A 1920 × 1080 lesson canvas scales as one unit; phones use a natural document.
function fitPresentation(){const desktop=innerWidth>=1000;document.body.classList.toggle('desktop-presentation',desktop);document.documentElement.style.setProperty('--stage-scale',String(Math.min(innerWidth/1920,innerHeight/1080)));}
window.addEventListener('resize',fitPresentation);fitPresentation();

function renderDetails(){const o=organs[active],idx=steps.findIndex(s=>s.group===active),throat=['thyroid','epiglottis','airway'].includes(active);$('#detail-panel').innerHTML=`
  <div class="detail-overline"><span>${idx>=0?`消化旅程 / ${String(idx+1).padStart(2,'0')}`:throat?'吞咽相关结构':'辅助消化器官'}</span><span class="detail-category">${o.tag}</span></div>
  <div class="detail-title"><div><h2>${o.name}</h2><span>${o.en}</span></div><span class="organ-glyph" style="--glyph-color:${o.color}">${icon(active==='stomach'?'bean':active==='small'?'route':active==='liver'?'shapes':'activity')}</span></div>
  <h3>${o.subtitle}</h3><p class="detail-intro">${o.intro}</p>
  <div class="feature-tags">${o.focus.map(f=>`<span>${f}</span>`).join('')}</div>
  ${throat||active==='esophagus'?`<button id="detail-swallow" class="swallow-entry">${icon('play')} 播放会厌吞咽演示</button>`:''}
  <div class="facts">${o.facts.map((f,i)=>`<div class="fact"><span class="fact-number">0${i+1}</span><div><h4>${f.title}</h4><p>${f.text}</p></div></div>`).join('')}</div>
  <div class="detail-output"><div><span>${o.phLabel}</span><strong>${o.ph}</strong></div><p>${icon('move-right')} ${o.output}</p></div>
  <details class="teaching-question"><summary>${icon('lightbulb')}<span>课堂思考</span>${icon('chevron-down')}</summary><p>${o.question}</p><div class="question-answer">${o.answer}</div></details>
  <button class="detail-next" id="detail-next"><span>${idx>=0&&idx<6?'下一站 · '+steps[idx+1].name:idx===6?'重新开始 · 口腔':throat?'讲解 · 咽与食管':'观察 · 十二指肠'}</span>${icon('arrow-right')}</button>`;
  $('#detail-next').onclick=()=>selectOrgan(idx>=0?steps[(idx+1)%7].group:throat?'esophagus':'duodenum',true);
  const demoButton=document.querySelector<HTMLElement>('#detail-swallow');if(demoButton)demoButton.onclick=()=>setMode('swallow');
  $('#selection-name').textContent=o.name;$('#selection-en').textContent=o.en;$('#selection-swatch').style.background=o.color;
  document.querySelectorAll<HTMLElement>('[data-organ]').forEach(b=>{b.classList.toggle('active',b.dataset.organ===active);b.setAttribute('aria-pressed',String(b.dataset.organ===active));});
  document.querySelectorAll<HTMLElement>('[data-step]').forEach(b=>{const i=Number(b.dataset.step);b.classList.toggle('active',i===idx);b.classList.toggle('completed',idx>=0&&i<idx);if(i===idx)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  $('#step-status').innerHTML=idx>=0?`第 ${idx+1} / 7 站<span>${mode==='journey'?'金色光团表示食物的位置':'点击任意站点，展开讲解'}</span>`:throat?'喉部结构<span>观察吞咽相关解剖</span>':'辅助器官<span>食物不经过肝、胆囊和胰</span>';
  $<HTMLButtonElement>('#prev-step').disabled=idx===0;$<HTMLButtonElement>('#next-step').disabled=idx===6;
  refreshIcons();
}
function selectOrgan(group:Group,journey=false){if(group==='body')return;const throat=['thyroid','epiglottis','airway'].includes(group);if((throat&&mode!=='structure')||mode==='swallow')setMode('structure');active=group;if(journey&&mode!=='journey')setMode('journey');scene?.select(group);if(journey)scene?.setMotion(true);if(throat)scene?.focus();renderDetails();}
function setMode(next:typeof mode){mode=next;document.querySelectorAll<HTMLElement>('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===next);b.setAttribute('aria-pressed',String(b.dataset.mode===next));});
  $('#workspace').classList.toggle('absorption-mode',next==='absorption');$('#workspace').classList.toggle('swallow-mode',next==='swallow');$('#detail-panel').hidden=next==='absorption'||next==='swallow';$('#absorption-panel').hidden=next!=='absorption';$('#swallow-panel').hidden=next!=='swallow';$('.journey-panel').hidden=next==='swallow';$('#swallow-timeline-panel').hidden=next!=='swallow';
  $('#isolate-button').hidden=next==='swallow';$('.selection-card').hidden=next==='swallow';
  $('#viewer-title').textContent=next==='journey'?'消化系统 · 食物移动示意':next==='swallow'?'喉部侧面 · 吞咽教学示意':'消化系统 · 三维结构';scene?.setJourney(next==='journey');scene?.setMotion(next==='journey');scene?.setSwallow(next==='swallow');document.querySelectorAll<HTMLElement>('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===(next==='swallow'?'side':'front')));$('#auto-rotate').setAttribute('aria-pressed','false');
  if(next!=='journey')stopPlay();if(next==='absorption'){selectOrgan('small');renderAbsorption();}else if(next!=='swallow')renderDetails();}
function updateSwallow(progress:number,isPlaying:boolean){const s=swallowState(progress),p=swallowPhases[s.phase];$('#swallow-phase-number').textContent=`第 ${s.phase+1} / 4 步`;$('#swallow-phase-title').textContent=p.name;$('#swallow-phase-text').textContent=p.text;$('#swallow-air-state').textContent=p.air;$('#swallow-food-state').textContent=p.food;$<HTMLInputElement>('#swallow-progress').value=String(Math.round(progress*1000));$('#swallow-progress-value').textContent=`${Math.round(progress*100)}%`;document.querySelectorAll<HTMLElement>('[data-swallow-phase]').forEach(b=>{const selected=Number(b.dataset.swallowPhase)===s.phase;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});$('#swallow-play span').textContent=isPlaying?'暂停吞咽':progress>=.995?'重播吞咽':'播放吞咽';$('#swallow-play').classList.toggle('playing',isPlaying);}
function renderAbsorption(){const n=nutrients[nutrient];$('#absorption-panel').innerHTML=`<div class="absorption-top"><span class="eyebrow">FROM LUMEN TO CIRCULATION</span><h2>从肠腔，进入身体</h2><p>小肠绒毛与微绒毛扩大吸收面积。<br/>选择一种营养物质，追踪它的去向。</p></div><div class="nutrient-tabs" role="tablist" aria-label="营养物质">${nutrients.map((v,i)=>`<button data-nutrient="${i}" role="tab" aria-selected="${i===nutrient}" class="${i===nutrient?'active':''}">${v.name}</button>`).join('')}</div><div class="absorption-flow" style="--nutrient:${n.color}"><div class="flow-zone lumen"><span class="zone-label">肠腔 LUMEN</span><strong>${n.substrate}</strong><span class="flow-arrow">↓</span><p>${n.enzyme}</p><strong class="product-pill">${n.products}</strong></div><div class="brush-border"><span>刷状缘 · ${n.entry}</span></div><div class="flow-zone enterocyte"><span class="zone-label">小肠上皮细胞 ENTEROCYTE</span><div class="cell-particles"><i></i><i></i><i></i><i></i><i></i><i></i></div><p>${n.cell}</p><span class="exit-label">${n.exit} ↓</span></div><div class="flow-zone blood"><span class="zone-label">${nutrient===2?'淋巴通路 LYMPH':'血液通路 BLOOD'}</span><strong>${n.route}</strong></div></div><div class="absorption-note">${icon('lightbulb')}<p>${n.note}</p></div><p class="diagram-caption">机制示意图 · 未按实际比例绘制</p>`;
  document.querySelectorAll<HTMLElement>('[data-nutrient]').forEach(b=>b.onclick=()=>{nutrient=Number(b.dataset.nutrient);renderAbsorption();});refreshIcons();}
function updatePlay(){const b=$('#play-button');b.classList.toggle('playing',playing);b.innerHTML=`${icon(playing?'pause':'play')}<span>${playing?'暂停演示':'开始演示'}</span>`;refreshIcons();}
function stopPlay(){playing=false;if(playTimer)clearInterval(playTimer);playTimer=null;scene?.setMotion(false);updatePlay();}
function startPlay(){setMode('journey');let idx=steps.findIndex(s=>s.group===active);if(idx<0||idx===6)selectOrgan('mouth');playing=true;scene?.setMotion(true);updatePlay();if(playTimer)clearInterval(playTimer);playTimer=setInterval(()=>{const i=steps.findIndex(s=>s.group===active);if(i>=6){stopPlay();toast('消化旅程已完成，可选择任意站点再次讲解');return;}selectOrgan(steps[i+1].group);},12000/speed);}
function stepBy(delta:number){stopPlay();const i=steps.findIndex(s=>s.group===active);selectOrgan(steps[Math.max(0,Math.min(6,(i<0?0:i)+delta))].group,true);}
function toast(text:string){$('#toast').textContent=text;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function showInfo(kind:'help'|'source'){$('#dialog-body').innerHTML=kind==='help'?`<h2>让结构，讲出功能</h2><p>围绕模型和七站旅程组织一次课堂讲解。</p><div class="help-grid"><div>${icon('rotate-3d')}<strong>自由观察</strong><p>鼠标左键拖动平移，右键拖动旋转，滚轮缩放。触屏单指旋转，双指缩放或平移。</p></div><div>${icon('mouse-pointer-2')}<strong>定位器官</strong><p>点击模型、标签或左侧目录查看要点。使用“聚焦”放大，使用“单独观察”隐藏其他结构。</p></div><div>${icon('route')}<strong>分步讲解</strong><p>点击底部站点，或用左右方向键逐站切换。食物以柔和金色光团表示，不显示固定轨迹。自动演示每站默认停留 12 秒，可暂停或调速。打开“吞咽演示”可播放会厌翻转与食团进入后方食管的四阶段过程，支持点击阶段和拖动进度条。</p></div><div>${icon('microscope')}<strong>连接微观机制</strong><p>打开“吸收机制”，切换糖类、蛋白质和脂肪，比较它们进入血液或淋巴的不同路径。</p></div></div><div class="key-hints"><kbd>←</kbd><kbd>→</kbd> 切换站点 <kbd>空格</kbd> 播放 / 暂停 <kbd>/</kbd> 查找结构 <kbd>Esc</kbd> 关闭窗口</div>`:`<h2>模型来源与教学说明</h2><p>本站使用 <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noopener">ashemag / human-atlas</a> 开源库中的解剖素材，选取消化道、肝胆胰、舌、唾液腺、牙齿、甲状软骨、会厌、环状软骨、杓状软骨、声韧带、气管上段和人体外形。</p><h3>BodyParts3D 4.0 · CC BY 4.0</h3><p>BodyParts3D, © The Database Center for Life Science，依据 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC Attribution 4.0 International</a> 使用。此处对上游已简化模型进行筛选、重新打包、配色与透明度调整。<a href="${import.meta.env.BASE_URL}ATTRIBUTION.md" target="_blank">查看完整署名</a>。</p><h3>教学范围</h3><p>三维模型为成人男性参考解剖。模型未完整呈现咽、肛管和微观结构；消化路径、吸收机制图为教学示意，不对应精确腔内轨迹、组织比例或实际时间。生理范围随饮食、部位及个体变化。</p><p>吞咽模式中的喉入口轮廓、腔道、关闭面、食团和运动为教学示意；时间已放慢。会厌翻转与喉上提、喉前庭及声门关闭、吞咽性呼吸暂停共同保护气道。</p><p>消化过程是连续且相互重叠的；七步顺序用于组织课堂。小肠是多数营养物质以及水、电解质吸收的主要部位。食物不经过肝、胆囊或胰。</p><h3>内容参考</h3><p>OpenStax, Anatomy and Physiology 2e, Chapter 23: The Digestive System。<a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/23-introduction" target="_blank" rel="noopener">阅读开放教材</a>。本站内容用于生理学教学。</p>`;if(kind==='source'){const credits=document.querySelector('#embedded-credits');if(credits){$('#dialog-body').querySelector('a[href$="ATTRIBUTION.md"]')?.remove();const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');details.className='full-credits';summary.textContent='完整素材署名与软件许可（离线）';pre.textContent=credits.textContent;details.append(summary,pre);$('#dialog-body').append(details);}}refreshIcons();$<HTMLDialogElement>('#info-dialog').showModal();}

document.querySelectorAll<HTMLElement>('[data-organ]').forEach(b=>b.onclick=()=>selectOrgan(b.dataset.organ as Group));
document.querySelectorAll<HTMLElement>('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode as typeof mode));
$('#open-swallow').onclick=()=>setMode('swallow');
$('#swallow-play').onclick=()=>scene?.playSwallow();
$('#swallow-reset').onclick=()=>scene?.seekSwallow(0);
$<HTMLInputElement>('#swallow-progress').oninput=e=>scene?.seekSwallow(Number((e.target as HTMLInputElement).value)/1000);
document.querySelectorAll<HTMLElement>('[data-swallow-phase]').forEach(b=>b.onclick=()=>scene?.seekSwallow([.08,.44,.64,.99][Number(b.dataset.swallowPhase)]));
document.querySelectorAll<HTMLElement>('[data-step]').forEach(b=>b.onclick=()=>{stopPlay();selectOrgan(steps[Number(b.dataset.step)].group,true);});
document.querySelectorAll<HTMLElement>('[data-view]').forEach(b=>b.onclick=()=>{scene?.view(b.dataset.view as 'front');document.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('active',v===b));});
$('#body-toggle').onchange=e=>scene?.setBody((e.target as HTMLInputElement).checked);$('#label-toggle').onchange=e=>scene?.setLabels((e.target as HTMLInputElement).checked);
$('#zoom-in').onclick=()=>scene?.zoom(.8);$('#zoom-out').onclick=()=>scene?.zoom(1.25);$('#focus-organ').onclick=()=>scene?.focus();
$('#auto-rotate').onclick=()=>{const b=$('#auto-rotate'),on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));scene?.setRotate(on);};
$('#reset-view').onclick=()=>{scene?.setIsolate(false);scene?.setRotate(false);scene?.view('front');$('#isolate-button').setAttribute('aria-pressed','false');$('#isolate-button span').textContent='单独观察';$('#auto-rotate').setAttribute('aria-pressed','false');document.querySelectorAll<HTMLElement>('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='front'));};
$('#isolate-button').onclick=()=>{const b=$('#isolate-button'),on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.querySelector('span')!.textContent=on?'显示全部':'单独观察';scene?.setIsolate(on);};
$('#play-button').onclick=()=>playing?stopPlay():startPlay();$('#prev-step').onclick=()=>stepBy(-1);$('#next-step').onclick=()=>stepBy(1);
$('#speed-button').onclick=()=>{speed=speed===.5?1:speed===1?1.5:speed===1.5?2:.5;$('#speed-button').textContent=`${speed}×`;if(playing)startPlay();};
$('#organ-search').oninput=e=>{const q=(e.target as HTMLInputElement).value.trim().toLowerCase();let found=0;document.querySelectorAll<HTMLElement>('[data-organ]').forEach(b=>{const g=b.dataset.organ as keyof typeof organs;const match=(organs[g].name+' '+organs[g].en).toLowerCase().includes(q);b.hidden=!match;if(match)found++;});$('.empty-search').hidden=found>0;};
$('#help').onclick=()=>showInfo('help');$('#source-button').onclick=$('#credits-footer').onclick=()=>showInfo('source');$('#close-dialog').onclick=()=>$<HTMLDialogElement>('#info-dialog').close();$('#info-dialog').onclick=e=>{if(e.target===$('#info-dialog')){const r=$('#info-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$<HTMLDialogElement>('#info-dialog').close();}};
$('#fullscreen').onclick=async()=>{if(!document.fullscreenElement&&document.body.classList.contains('focus-mode')){document.body.classList.remove('focus-mode');$('#fullscreen span').textContent='专注授课';return;}try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{document.body.classList.add('focus-mode');$('#fullscreen span').textContent='退出专注';toast('已切换专注授课布局');}};
document.addEventListener('fullscreenchange',()=>{document.body.classList.toggle('focus-mode',!!document.fullscreenElement);$('#fullscreen span').textContent=document.fullscreenElement?'退出专注':'专注授课';});
document.addEventListener('keydown',e=>{if($<HTMLDialogElement>('#info-dialog').open||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;if(mode==='swallow'){if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const current=Number($<HTMLInputElement>('#swallow-progress').value)/1000;scene?.seekSwallow(Math.max(0,Math.min(1,current+(e.key==='ArrowRight'?.05:-.05))));}if(e.key===' '&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();scene?.playSwallow();}return;}if(e.key==='ArrowRight'){e.preventDefault();stepBy(1);}if(e.key==='ArrowLeft'){e.preventDefault();stepBy(-1);}if(e.key===' '&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();playing?stopPlay():startPlay();}if(e.key==='/'){e.preventDefault();$('#organ-search').focus();}});
renderDetails();refreshIcons();
try{scene=new AnatomyScene($('#anatomy-canvas'),g=>selectOrgan(g),parts=>{$('#model-loading').hidden=true;$('#model-status').textContent=`${parts} 个结构网格 · 可交互`;},s=>{$('#model-loading').innerHTML=`${icon('triangle-alert')}<strong>模型暂时无法显示</strong><span>${s}</span><button onclick="location.reload()">重新加载</button>`;$('#model-status').textContent='模型未就绪';refreshIcons();});}catch{$('#model-loading').innerHTML='<strong>当前浏览器未能启动三维显示</strong><span>请使用支持 WebGL 的浏览器；文字讲解与吸收机制仍可使用。</span>';}
if(scene)scene.onSwallowChange=updateSwallow;
updateSwallow(0,false);

