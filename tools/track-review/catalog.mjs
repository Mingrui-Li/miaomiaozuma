import fs from 'node:fs';
import crypto from 'node:crypto';
import { makePath, parameterize, at, resample, distance, radius, segmentDistance, makeCats, visibleState } from './geometry.mjs';
import { symmetricDifference } from './similarity.mjs';
import { pressure, profileFor, reviewLabel } from './pressure.mjs';

const output='design/track-review/generated/catalog';
const sourceFile='design/track-review/catalog.source.json';
const existing=fs.existsSync(sourceFile)?JSON.parse(fs.readFileSync(sourceFile,'utf8')):null;
const fromPressure=process.argv.includes('--from-pressure');
if(process.argv.includes('--from-candidates'))throw new Error('按长度/形态新奇度排关的旧候选池已废止；请使用 --from-pressure。');
const initialize=fromPressure||!existing;
if(initialize&&existing?.levels.some(l=>l.ownerApproval==='APPROVED'))throw new Error('已存在验收通过的几何，禁止用候选池覆盖。请逐关编辑源参数。');
const draft=initialize?JSON.parse(fs.readFileSync('design/track-review/challenge-candidates.json','utf8')):null;
const first=JSON.parse(fs.readFileSync('design/track-review/levels.json','utf8'));
const chapterNames=['晴日庭院','纸箱小巷','灰尘花房','弯桥午后','海风猫站','果园仓库','雪夜长廊','星光屋顶','灯会巡游','百猫回窝'];
const chapterFocus=['直接瞄准、交换、插入与基础接缝','预留纸箱猫的优先处理位置','预留灰扑扑猫的揭示与补位空间','比较近层与远层的射击窗口','标注速度波下的末端救场方向','为两类障碍保留至少两个目标方向','检查长链覆盖下的断口位置','检查队首进入末段后的可射方向','检查多弯与多遮挡区域之间的切换','综合路线；不新增规则'];
const digits=id=>String(id).padStart(3,'0');
const r=n=>Number(n.toFixed(1));
const esc=s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const selected=initialize?draft.selected.map((item,index)=>({...item,id:index+1,chapter:Math.floor(index/10)+1})):existing.levels;
if(selected.length!==100||selected.some((l,i)=>l.id!==i+1))throw new Error('必须有按 1～100 排列的 100 个独立关卡 ID');
const paths=selected.map(item=>parameterize(makePath(item.geometry)));

function inspect(p,profile){
  const points=resample(p,4), ds=p.length/(points.length-1), errors=[];
  let minRadius=Infinity,minGap=Infinity,crossings=0;
  for(let i=3;i<points.length-3;i++)minRadius=Math.min(minRadius,radius(points[i-3],points[i],points[i+3]));
  for(let i=0;i<points.length-1;i++)for(let j=i+2;j<points.length-1;j++){
    const d=segmentDistance(points[i],points[i+1],points[j],points[j+1]);
    if(d<1e-6)crossings++;
    if((j-i-1)*ds>=profile.spacing*3)minGap=Math.min(minGap,d);
  }
  const centerGap=Math.min(...points.map(pt=>distance(pt,first.launcher)));
  if(points.some(pt=>pt.x<52||pt.x>698||pt.y<212||pt.y>1138))errors.push('轨道中心线越界');
  if(minRadius<profile.minRadius-.5)errors.push(`曲率半径不足 ${profile.minRadius}px`);
  if(minGap<profile.minGap-.01)errors.push(`非相邻轨道间距不足 ${profile.minGap}px`);
  if(centerGap<108)errors.push('中央禁入区不足 108px');
  if(crossings)errors.push('轨道自交或重合');
  if(distance(points[0],points.at(-1))<profile.minGap)errors.push('两个端点过近');
  const end=(s,sign)=>{const pt=at(p,s), other=at(p,s+sign*5),a=Math.atan2((other.y-pt.y)*sign,(other.x-pt.x)*sign);return {...pt,angle:a};};
  const source=end(0,1),lair=end(p.length,-1);
  // Physical schematic mouth width 80, depth 40. Exactly one opening at P(0)/P(L).
  for(const [label,pt,dir] of [['S',source,-1],['L',lair,1]]){
    for(const u of [0,40*dir])for(const v of [-40,40]){
      const x=pt.x+u*Math.cos(pt.angle)-v*Math.sin(pt.angle),y=pt.y+u*Math.sin(pt.angle)+v*Math.cos(pt.angle);
      if(x<5||x>745||y<155||y>1180)errors.push(`${label} 门体示意越界`);
    }
  }
  let startRadius=Infinity,endRadius=Infinity;
  for(let s=12;s<160;s+=4)startRadius=Math.min(startRadius,radius(at(p,s-10),at(p,s),at(p,s+10)));
  for(let s=p.length-140;s<p.length-12;s+=4)endRadius=Math.min(endRadius,radius(at(p,s-10),at(p,s),at(p,s+10)));
  const fixtures=[.45,.72,.94].map(ratio=>{
    const cats=makeCats(p,ratio,profile.spacing,profile.catRadius),v=visibleState(first.launcher,cats,profile.catRadius+profile.projectileRadius);
    return {headRatio:ratio,catCount:cats.length,firstHitCats:v.first.size,hiddenCats:v.hidden.size,angleCoverage:v.covered};
  });
  const full=visibleState(first.launcher,makeCats(p,.995,profile.spacing,profile.catRadius),profile.catRadius+profile.projectileRadius);
  const quadrants=new Set(points.map(q=>Math.floor(((Math.atan2(q.y-675,q.x-375)*180/Math.PI+360)%360)/90)));
  if(quadrants.size!==4)errors.push('缺少可布置猫链的象限');
  if(full.covered<220)errors.push('满链静态角覆盖不足 220°');
  for(const ratio of [.45,.72,.94]){const cats=makeCats(p,ratio,profile.spacing,profile.catRadius);if(cats.some((c,i)=>i>0&&distance(c,cats[i-1])<profile.catRadius*2))errors.push(`${profile.catRadius*2}px 猫径发生重叠`);}
  return {errors:[...new Set(errors)],metrics:{length:r(p.length),minRadius:r(minRadius),minNonLocalGap:r(minGap),launcherClearance:r(centerGap),selfIntersections:crossings,fullFixtureCoverage:full.covered,sourceLeadRadius:Number.isFinite(startRadius)?r(startRadius):'直线',lairLeadRadius:Number.isFinite(endRadius)?r(endRadius):'直线'},source,lair,fixtures};
}
const pairs=[];
for(let i=0;i<100;i++)for(let j=i+1;j<100;j++){
  const rms=symmetricDifference(paths[i],paths[j]);
  pairs.push({a:i+1,b:j+1,rms:r(rms),reviewRequired:rms<48});
}
const levels=selected.map((item,i)=>{
  const geometryProfile=profileFor(item.id);
  const checked=inspect(paths[i],geometryProfile);
  const geometricPressure=pressure(paths[i],geometryProfile);
  const similar=pairs.filter(p=>(p.a===item.id||p.b===item.id)&&p.reviewRequired);
  const nearest=pairs.filter(p=>p.a===item.id||p.b===item.id).sort((a,b)=>a.rms-b.rms)[0];
  const axis=p=>`${p.y<560?'上':p.y>790?'下':'中'}${p.x<280?'左':p.x>470?'右':'中'}`;
  const route=[0,.25,.5,.75,1].map(t=>axis(at(paths[i],paths[i].length*t))).join(' → ');
  const name=reviewLabel(item.id,item.geometry,geometricPressure);
  return {id:item.id,chapter:item.chapter,name,family:name,geometry:item.geometry,geometryProfile,geometricPressure,sourceSha256:crypto.createHash('sha256').update(JSON.stringify({geometry:item.geometry,geometryProfile})).digest('hex'),route,designIntent:chapterFocus[item.chapter-1],geometryPassed:checked.errors.length===0,ownerApproval:'PENDING',similarityReview:similar,nearestShape:nearest,...checked};
});
const source={status:'100_PRESSURE_GEOMETRY_DRAFT_OWNER_REVIEW_PENDING',canvas:first.canvas,launcher:first.launcher,chapters:chapterNames,levels};
if(fromPressure&&existing&&!fs.existsSync('design/track-review/generated/rejected-low-pressure.catalog.json'))fs.writeFileSync('design/track-review/generated/rejected-low-pressure.catalog.json',JSON.stringify(existing,null,2)+'\n');
fs.writeFileSync(sourceFile,JSON.stringify(source,null,2)+'\n');
fs.mkdirSync(`${output}/levels`,{recursive:true});fs.mkdirSync(`${output}/chapters`,{recursive:true});

const dOf=pts=>pts.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
function diagram(i,full=true){
  const p=paths[i],l=levels[i],points=resample(p,4),d=dOf(points),w=l.geometryProfile.trackWidth;
  const danger=dOf(Array.from({length:36},(_,i)=>at(p,p.length-140+140*i/35)));
  const arrows=[];
  for(let s=64;s<p.length-55;s+=200){const pt=at(p,s),next=at(p,s+3);arrows.push(`<path d="M-12,-10 L12,0 L-12,10" fill="none" stroke="#334155" stroke-width="5" transform="translate(${pt.x} ${pt.y}) rotate(${Math.atan2(next.y-pt.y,next.x-pt.x)*180/Math.PI})"/>`);}
  const door=(pt,kind)=>{
    const dir=kind==='S'?-1:1,col=kind==='S'?'#087f6d':'#ad3544';
    return `<g transform="translate(${pt.x} ${pt.y}) rotate(${pt.angle*180/Math.PI})"><path d="M0,-40 H${40*dir} V40 H0" fill="#fff" stroke="${col}" stroke-width="7"/><path d="M0,-39 V39" stroke="${col}" stroke-width="3" stroke-dasharray="5 5"/><circle r="5" fill="${col}"/></g><text x="${pt.x+20*dir*Math.cos(pt.angle)}" y="${pt.y+20*dir*Math.sin(pt.angle)+8}" text-anchor="middle" font-size="23" font-weight="700" fill="${col}">${kind}</text>`;
  };
  const core=`<rect x="1" y="190" width="748" height="970" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><path d="${d}" fill="none" stroke="#a6b1bf" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="butt"/><path d="${d}" fill="none" stroke="#e8ecf1" stroke-width="${w-6}" stroke-linejoin="round" stroke-linecap="butt"/><path d="${danger}" fill="none" stroke="#f1d2d5" stroke-width="${w-9}"/><path d="${d}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="7 9"/>${arrows.join('')}<circle cx="375" cy="675" r="108" fill="#f8fafc" stroke="#8193aa" stroke-width="3" stroke-dasharray="9 8"/><circle cx="375" cy="675" r="52" fill="#263954"/><path d="M375,625 L363,645 L387,645Z" fill="white"/><text x="375" y="688" text-anchor="middle" fill="white" font-size="27">360°</text>${door(l.source,'S')}${door(l.lair,'L')}`;
  if(!full)return core;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1334" viewBox="0 0 750 1334"><rect width="750" height="1334" fill="#f5f7fa"/><g font-family="sans-serif"><text x="26" y="46" font-size="28" font-weight="700">${digits(l.id)} · ${esc(l.name)}</text><text x="26" y="80" font-size="20" fill="#475569">${esc(l.family)} · 第 ${l.chapter} 章 / ${esc(chapterNames[l.chapter-1])}</text><text x="26" y="115" font-size="19" fill="#087f6d">S 出猫口</text><text x="157" y="115" font-size="19">→ 沿箭头唯一行进</text><text x="359" y="115" font-size="19" fill="#ad3544">L 老巢（失败终点）</text><text x="26" y="151" font-size="17" fill="#9b341b">几何候选 · 待你验收；无分叉/闭环，不是最终美术</text>${core}<text x="26" y="1202" font-size="17">路长 ${l.metrics.length}px · 最小曲率 ${l.metrics.minRadius}px · 中央净距 ${l.metrics.launcherClearance}px</text><text x="26" y="1232" font-size="17">轨距 ${l.metrics.minNonLocalGap}px · 轨宽 ${w}px · 猫径 ${l.geometryProfile.catRadius*2}px · 猫间距 ${l.geometryProfile.spacing}px</text><text x="26" y="1262" font-size="17" fill="#64358a">双层方向 ${l.geometricPressure.twoLayerDegrees}° · 三层方向 ${l.geometricPressure.threeLayerDegrees}° · 静态压力 ${l.geometricPressure.score}</text><text x="26" y="1290" font-size="16" fill="${l.geometryPassed?'#087f6d':'#ad3544'}">几何：${l.geometryPassed?'通过':'未通过 '+esc(l.errors.join('、'))} · 用户待审；压力指标不是实际通关率</text><text x="26" y="1315" font-size="14" fill="#59687d">红色末段为最后 140px。源哈希 ${l.sourceSha256.slice(0,16)}</text></g></svg>`;
}
for(let i=0;i<100;i++)fs.writeFileSync(`${output}/levels/${digits(i+1)}.svg`,diagram(i));
for(let c=0;c<10;c++){
  const tiles=levels.slice(c*10,c*10+10).map((l,j)=>`<g transform="translate(${26+(j%5)*249} ${128+Math.floor(j/5)*390})"><rect width="230" height="370" rx="12" fill="white" stroke="#d1d5db"/><text x="12" y="27" font-size="16" font-weight="700">${digits(l.id)} ${esc(l.family)}</text><g transform="translate(6 -20) scale(.29)">${diagram(c*10+j,false)}</g><text x="12" y="333" font-size="12" fill="#64358a">两层 ${l.geometricPressure.twoLayerDegrees}° / 三层 ${l.geometricPressure.threeLayerDegrees}° · 压力 ${l.geometricPressure.score}</text><text x="12" y="354" font-size="12" fill="${l.geometryPassed?'#087f6d':'#ad3544'}">${l.geometryPassed?'几何通过':'需修正'} · 待你验收 · ${l.metrics.length}px</text></g>`).join('');
  fs.writeFileSync(`${output}/chapters/${String(c+1).padStart(2,'0')}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="1273" height="940" viewBox="0 0 1273 940"><rect width="100%" height="100%" fill="#f5f7fa"/><g font-family="sans-serif"><text x="26" y="42" font-size="28" font-weight="700">第 ${c+1} 章 · ${chapterNames[c]} · ${c*10+1}—${c*10+10} 关几何审阅</text><text x="26" y="78" font-size="17">S 唯一出猫口 → 单向连续轨道 → L 单入口老巢；中央 360° 发射</text><text x="26" y="107" font-size="15" fill="#9b341b">本图不包含装饰与正式 UI；请同时审查形态差异、两个洞口与所有箭头。</text>${tiles}</g></svg>`);
}
const report={status:source.status,geometryPassed:levels.filter(l=>l.geometryPassed).length,total:100,ownerApproved:0,similarPairs:pairs.filter(p=>p.reviewRequired),nearestPairs:pairs.sort((a,b)=>a.rms-b.rms).slice(0,30),levels:levels.map(({geometry,...l})=>l),limits:['四像素中心线采样检查不是解析证明','满链静态射线不是动态可解性','尚未验证每关局长、出猫计划、回吸、通关率','实际门体/装饰遮挡必须在美术和 Figma 阶段重新检查']};
fs.writeFileSync(`${output}/audit.json`,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(`${output}/AUDIT.md`,['# 100 关几何图检查记录','','状态：候选提交审阅；项目所有者验收 0/100。',`几何检查 ${report.geometryPassed}/100；全量 4950 对形态比较，小于 48px RMS 的复审对数 ${report.similarPairs.length}。`,'','所有源参数保存在 `design/track-review/catalog.source.json`。没有调用 ImageGen、Figma 或 Cocos。','','| 关 | 章 | 几何 | 路长 | 最小半径 | 非邻段距 | 中央净距 | 检查 | 验收 |','|---:|---:|---|---:|---:|---:|---:|---|---|',...levels.map(l=>`| ${l.id} | ${l.chapter} | ${l.family} | ${l.metrics.length} | ${l.metrics.minRadius} | ${l.metrics.minNonLocalGap} | ${l.metrics.launcherClearance} | ${l.geometryPassed?'通过':l.errors.join('；')} | 待审 |`),'','## 全局近似检查','','配准去除平移、等比缩放、旋转、镜像和行进反向。高于阈值不等于体验有趣。','','| 关卡对 | RMS px |','|---|---:|',...report.nearestPairs.map(p=>`| ${p.a} / ${p.b} | ${p.rms} |`),'','## 边界','',...report.limits.map(l=>`- ${l}`),''].join('\n'));
const cards=levels.map(l=>`<article class="card" data-chapter="${l.chapter}" data-level="${l.id}"><a href="levels/${digits(l.id)}.svg" target="_blank"><img src="levels/${digits(l.id)}.svg" loading="lazy" width="750" height="1334" alt="第 ${l.id} 关 ${esc(l.family)}，S 到 L 的单向几何图"></a><div><b>${digits(l.id)} · ${esc(l.family)}</b><span>${l.geometryPassed?'几何检查通过':'几何待修正'} · 用户待审</span><small>两层 ${l.geometricPressure.twoLayerDegrees}° / 三层 ${l.geometricPressure.threeLayerDegrees}° · 压力 ${l.geometricPressure.score}</small><small>${esc(l.route)}</small><a href="evidence/${digits(l.id)}.svg" target="_blank">猫链遮挡 / 开口诊断</a></div></article>`).join('');
fs.writeFileSync(`${output}/index.html`,`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>喵喵回窝 · 100关几何审阅</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f6f9;color:#24334a;font:15px/1.6 system-ui,-apple-system,"PingFang SC",sans-serif}header{padding:24px;max-width:1440px;margin:auto}h1{font-size:26px;margin:0 0 8px}p{margin:8px 0}a{color:#205c9d}nav{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}button{font:inherit;min-height:44px;padding:8px 13px;border:1px solid #b9c6d8;border-radius:6px;color:#24334a;background:white;cursor:pointer}button[aria-pressed=true]{background:#24334a;color:white}.notice{color:#994a1f}.links{display:flex;gap:18px;flex-wrap:wrap}.gallery{max-width:1440px;margin:auto;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;padding:0 24px 36px}.card{display:block;background:white;border:1px solid #cad3e0;border-radius:8px;overflow:hidden;text-decoration:none;color:#24334a}.card img{display:block;width:100%;height:auto}.card div{padding:12px}.card b,.card span,.card small{display:block}.card b{font-size:14px}.card span,.card small{font-size:12px}.card span{color:#087f6d}[hidden]{display:none!important}@media(max-width:1000px){.gallery{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:600px){header{padding:16px}.gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0 12px 24px}h1{font-size:22px}button{font-size:13px}}</style><header><h1>喵喵回窝 · 100 关几何审阅稿</h1><p>只有几何：出猫入口 S、连续轨道、运动方向、中央 360° 发射器、唯一老巢 L。点击任何一关可查看大图。</p><p class="notice">几何自动检查 ${report.geometryPassed}/100；相似度复审 ${report.similarPairs.length} 对；你的验收 0/100。未调用 ImageGen / Figma，未进行 Cocos 重构。</p><div class="links"><a href="AUDIT.md" target="_blank">百关检查表</a><a href="audit.json" target="_blank">机器诊断数据</a><a id="chapter-sheet" href="chapters/01.svg" target="_blank">当前章节并排大图</a></div><nav aria-label="章节选择"><button data-chapter="0">全部 100 关</button>${chapterNames.map((n,i)=>`<button data-chapter="${i+1}" aria-pressed="${i===0}">${i+1} · ${n}</button>`).join('')}</nav><p id="count">第 1 章 · 10 张图</p></header><main class="gallery">${cards}</main><script>const buttons=[...document.querySelectorAll('button[data-chapter]')],cards=[...document.querySelectorAll('.card')];function show(chapter){for(const b of buttons)b.setAttribute('aria-pressed',String(Number(b.dataset.chapter)===chapter));for(const c of cards)c.hidden=chapter!==0&&Number(c.dataset.chapter)!==chapter;document.getElementById('count').textContent=chapter?'第 '+chapter+' 章 · 10 张图':'全部 100 张几何图';const link=document.getElementById('chapter-sheet');link.hidden=chapter===0;link.href='chapters/'+String(chapter||1).padStart(2,'0')+'.svg';history.replaceState(null,'','#chapter-'+chapter);}for(const b of buttons)b.addEventListener('click',()=>show(Number(b.dataset.chapter)));const requested=Number(location.hash.replace('#chapter-',''));show(Number.isInteger(requested)&&requested>=1&&requested<=10?requested:1);</script></html>`);
const chapterPressure=Array.from({length:10},(_,c)=>{
  const slice=levels.slice(c*10,c*10+10),mean=k=>r(slice.reduce((n,l)=>n+l.geometricPressure[k],0)/10);
  return `<tr><td>第 ${c+1} 章</td><td>${mean('score')}</td><td>${mean('twoLayerDegrees')}°</td><td>${mean('threeLayerDegrees')}°</td></tr>`;
}).join('');
const pressureNote=`<p class="notice">两层/三层指同一方向遇到多段轨道。压力分只描述固定猫链的几何遮挡，不是通关率；开口诊断也不代表已验证合法三消。</p><details><summary>展开十章压力对照（几何指标）</summary><table style="width:100%;max-width:600px;text-align:left"><thead><tr><th>章节</th><th>平均压力</th><th>双层角均值</th><th>三层角均值</th></tr></thead><tbody>${chapterPressure}</tbody></table></details>`;
const gallery=fs.readFileSync(`${output}/index.html`,'utf8').replace('<div class="links">',`${pressureNote}<div class="links"><a href="PRESSURE.md" target="_blank">压力与开口诊断表</a>`);
fs.writeFileSync(`${output}/index.html`,gallery);
console.log(JSON.stringify({geometryPassed:report.geometryPassed,total:100,errors:levels.filter(l=>!l.geometryPassed).map(l=>({id:l.id,errors:l.errors})),similarPairs:report.similarPairs,closest:report.nearestPairs[0],gallery:`${output}/index.html`},null,2));
if(report.geometryPassed!==100||report.similarPairs.length)process.exitCode=1;
