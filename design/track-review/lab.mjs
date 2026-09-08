import { makePath, parameterize, at, resample, makeCats, visibleState, rayHits, TAU } from '../../tools/track-review/geometry.mjs';

const $ = id => document.getElementById(id);
try {
  const [sourceResponse, reportResponse] = await Promise.all([fetch('./levels.json'), fetch('./generated/audit.json')]);
  if (!sourceResponse.ok || !reportResponse.ok) throw new Error('缺少诊断数据，请先执行 npm run review:tracks');
  const source = await sourceResponse.json(), report = await reportResponse.json();
  // Fail closed if a source edit was not re-audited. Never show stale PASS badges.
  const sourceText = await (await fetch('./levels.json')).text();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sourceText)))].map(n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== report.sourceSha256) throw new Error('路径数据已更改但 QA 报告未更新，请执行 npm run review:tracks。');
  const paths = source.levels.map(l => parameterize(makePath(l.geometry)));
  let index = 0, progress = .48, angle = -Math.PI / 2, playing = false, hideCats = false, gapOpen = false, witness = null, frame = 0, lastTime = 0, cats = [], vis = null;
  const colors = ['#f6ab53','#f8f0e2','#82aed5','#e8ca85','#635a77'];
  const ink = ['#563212','#56453a','#163d62','#504221','#ffffff'];
  const esc = str => String(str).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const label = (pt, value, fill) => `<circle cx="${pt.x}" cy="${pt.y}" r="30" fill="${fill}" stroke="white" stroke-width="5"/><text x="${pt.x}" y="${pt.y+10}" text-anchor="middle" font-size="30" fill="white" font-weight="700">${value}</text>`;
  const pathD = points => points.map((p,i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  function stop() { playing = false; $('play').textContent = '推进猫链'; $('play').setAttribute('aria-pressed', 'false'); cancelAnimationFrame(frame); }
  function clearProbe() { witness = null; gapOpen = false; $('gap').disabled = true; $('gap').setAttribute('aria-pressed','false'); $('gap').textContent = '打开诊断缺口'; $('witnessInfo').textContent = '可载入同一快照的开缝前后对照。'; }
  function updateCats() {
    cats = hideCats ? [] : makeCats(paths[index], progress, source.spacing);
    if (gapOpen && witness) cats = cats.filter(c => !witness.removed.includes(c.id));
    vis = visibleState(source.launcher, cats);
  }
  function render() {
    const path = paths[index], points = resample(path, 6), meta = report.levels[index];
    const hits = rayHits(source.launcher, angle, cats), target = hits[0];
    const aimEnd = target?.point ?? { x: 375 + Math.cos(angle)*1000, y: 675 + Math.sin(angle)*1000 };
    const arrows = [.025,.16,.32,.49,.66,.82,.975].map(f => { const a = at(path, path.length*f), b = at(path,path.length*f+4);return `<path d="M -12 -11 L 12 0 L -12 11" fill="none" stroke="#526276" stroke-width="5" transform="translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI})"/>`; }).join('');
    const catMarkup = cats.map(c => {
      const highlighted = gapOpen && witness?.newlyVisible.includes(c.id), hit = target?.cat.id === c.id;
      const hidden = vis.hidden.has(c.id);
      return `<g>${highlighted ? `<circle cx="${c.x}" cy="${c.y}" r="40" fill="none" stroke="#128066" stroke-width="7"/>` : ''}<circle cx="${c.x}" cy="${c.y}" r="32" fill="${colors[c.color]}" stroke="${hit ? '#1e5eaa' : hidden ? '#ae3941' : '#344256'}" stroke-width="${hit ? 7 : 2}" ${hidden ? 'stroke-dasharray="5 4"' : ''}/><text x="${c.x}" y="${c.y+9}" text-anchor="middle" font-size="27" fill="${ink[c.color]}" class="cat-label">${c.color+1}</text></g>`;
    }).join('');
    const headS = progress * path.length, failed = !hideCats && headS >= path.length - source.catRadius;
    const dangerPoints = resample(parameterize(Array.from({length:41}, (_,i)=>at(path,path.length-230+230*i/40))), 8);
    const marked = witness && !gapOpen ? cats.filter(c=>witness.removed.includes(c.id)).map(c=>`<circle cx="${c.x}" cy="${c.y}" r="38" fill="none" stroke="#7a31af" stroke-width="5" stroke-dasharray="7 5"/>`).join('') : '';
    $('board').innerHTML = `<title>${esc(source.levels[index].name)}，S 到 L 单向路线</title><defs><clipPath id="clip"><rect x="0" y="150" width="750" height="1040"/></clipPath></defs><g clip-path="url(#clip)"><rect x="0" y="150" width="750" height="1040" fill="white"/><path d="${pathD(points)}" fill="none" stroke="#e2e8f0" stroke-width="88" stroke-linejoin="round" stroke-linecap="round"/><path d="${pathD(dangerPoints)}" fill="none" stroke="#f4d6d8" stroke-width="88" stroke-linecap="round"/><path d="${pathD(points)}" fill="none" stroke="#8c99aa" stroke-width="3" stroke-dasharray="8 9"/>${arrows}<circle cx="375" cy="675" r="108" fill="none" stroke="#b1bdcc" stroke-width="2" stroke-dasharray="9 7"/><path d="M375 675 L${aimEnd.x} ${aimEnd.y}" fill="none" stroke="#1e5eaa" stroke-width="5" stroke-dasharray="12 9"/>${catMarkup}${marked}${label(meta.endpoints.source,'S','#05766b')}${label(meta.endpoints.lair,'L','#b53838')}<circle cx="375" cy="675" r="54" fill="#233b5d"/><path d="M -10 -15 L 30 0 L -10 15" fill="white" transform="translate(375 675) rotate(${angle*180/Math.PI})"/><text x="375" y="757" text-anchor="middle" font-size="24" fill="#233b5d">中央 360°</text>${failed ? '<rect x="130" y="180" width="490" height="60" rx="8" fill="#b53838"/><text x="375" y="220" font-size="26" fill="white" text-anchor="middle">队首到达失败线 · 推进已停止</text>' : ''}</g>`;
    $('progressLabel').textContent = `${Math.round(progress*100)}%`;
    $('progress').value = Math.round(progress*100);
    const degrees = Math.round((angle*180/Math.PI+360)%360);
    $('angleLabel').textContent = `${degrees}°`;
    $('angle').value = degrees;
    $('hit').textContent = target ? `首撞：第 ${target.cat.id+1} 只（标识 ${target.cat.color+1}） · 路程 ${Math.round(target.cat.s/path.length*100)}% · 后方 ${Math.max(0,hits.length-1)} 只不会被这一发直接命中` : '当前射线没有猫，弹射物会穿过空轨道并离场。';
    $('catCount').textContent = cats.length;
    $('visibleCount').textContent = vis.first.size;
    $('hiddenCount').textContent = vis.hidden.size;
    $('coverage').textContent = `${vis.covered}°`;
    $('gap').disabled = !witness || hideCats;
  }
  function select(i) {
    stop();index=i;progress=source.levels[i].startHead;hideCats=false;clearProbe();
    $('empty').setAttribute('aria-pressed','false');$('empty').textContent='隐藏猫链';
    [...$('levels').children].forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));
    const l=source.levels[i], m=report.levels[i];
    $('title').textContent=`${String(l.id).padStart(2,'0')} · ${l.name}`;$('family').textContent=l.family;
    for (const id of ['decision','risk','sequence']) $(id).textContent=l[id];
    $('metrics').innerHTML=`<p class="${m.geometryPassed?'good':'bad'}">${m.geometryPassed?'几何 / 静态探针通过；玩法待验收':esc(m.failures.join('；'))}</p><p>长度 ${m.metrics.length}px · 最小半径 ${m.metrics.minRadius}px · 非邻段距 ${m.metrics.minSeparation}px · 中央净距 ${m.metrics.launcherClearance}px</p>`;
    updateCats();render();history.replaceState(null,'',`#level-${l.id}`);
  }
  source.levels.forEach((l,i)=>{const b=document.createElement('button');b.innerHTML=`${String(l.id).padStart(2,'0')}<span class="level-name"> ${esc(l.name)}</span><small>${esc(l.family)}</small>`;b.setAttribute('aria-label',`第 ${l.id} 关 ${l.name}`);b.addEventListener('click',()=>select(i));$('levels').append(b);});
  $('progress').addEventListener('input',e=>{stop();clearProbe();progress=Number(e.target.value)/100;updateCats();render();});
  $('angle').addEventListener('input',e=>{angle=Number(e.target.value)*Math.PI/180;render();});
  $('reset').addEventListener('click',()=>select(index));
  $('empty').addEventListener('click',()=>{stop();hideCats=!hideCats;clearProbe();$('empty').setAttribute('aria-pressed',String(hideCats));$('empty').textContent=hideCats?'显示猫链':'隐藏猫链';updateCats();render();});
  $('board').addEventListener('pointermove',e=>{const point=new DOMPoint(e.clientX,e.clientY).matrixTransform($('board').getScreenCTM().inverse());angle=Math.atan2(point.y-675,point.x-375);render();});
  $('board').addEventListener('pointerdown',e=>{e.preventDefault();const point=new DOMPoint(e.clientX,e.clientY).matrixTransform($('board').getScreenCTM().inverse());angle=Math.atan2(point.y-675,point.x-375);render();});
  $('play').addEventListener('click',()=>{
    if(playing){stop();return;}clearProbe();hideCats=false;$('empty').setAttribute('aria-pressed','false');$('empty').textContent='隐藏猫链';
    if(progress>=1-32/paths[index].length)progress=.1;
    playing=true;$('play').textContent='暂停推进';$('play').setAttribute('aria-pressed','true');lastTime=performance.now();
    const tick=now=>{if(!playing)return;const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;progress+=dt*90/paths[index].length;const fail=1-32/paths[index].length;if(progress>=fail){progress=fail;stop();}updateCats();render();if(playing)frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);
  });
  $('witness').addEventListener('click',()=>{
    stop();clearProbe();hideCats=false;$('empty').setAttribute('aria-pressed','false');$('empty').textContent='隐藏猫链';
    const state=report.levels[index].states.find(s=>s.gapWitness);
    if(!state){$('witnessInfo').textContent='三个诊断快照没有完全遮挡目标：本路线用于直接射击教学，不编造穿缝案例。';updateCats();render();return;}
    progress=state.headRatio;witness=state.gapWitness;updateCats();
    angle=witness.angleDegrees*Math.PI/180;
    $('witnessInfo').textContent=`快照 ${Math.round(progress*100)}%：紫圈标记第 ${witness.removed.map(id=>id+1).join('、')} 只；打开缺口后，第 ${witness.newlyVisible.map(id=>id+1).join('、')} 只将从完全遮挡变为可命中。`;
    render();
  });
  $('gap').addEventListener('click',()=>{gapOpen=!gapOpen;$('gap').setAttribute('aria-pressed',String(gapOpen));$('gap').textContent=gapOpen?'恢复原猫链':'打开诊断缺口';updateCats();render();});
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  const requested=Number(location.hash.replace('#level-',''));
  select(Math.max(0,source.levels.findIndex(l=>l.id===requested)));
  // Read-only diagnostic accessor for reproducible browser QA, no hidden game API.
  window.trackReviewSnapshot=()=>({level:index+1,progress,playing,hideCats,gapOpen,catCount:cats.length,hidden:[...vis.hidden],visible:[...vis.first],witness});
}catch(error){$('error').textContent=error.stack ?? String(error);}
