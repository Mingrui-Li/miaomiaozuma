import fs from 'node:fs';
import {makePath,parameterize,makeCats,visibleState,gapWitness,rayHits} from './geometry.mjs';

// Offline geometric stress fixtures, not gameplay, legal matches or a spawn plan.
const root='design/track-review/generated/catalog';
const catalog=JSON.parse(fs.readFileSync('design/track-review/catalog.source.json','utf8'));
fs.mkdirSync(`${root}/evidence`,{recursive:true});
const origin=catalog.launcher, records=[];
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
for(const level of catalog.levels){
  const id=String(level.id).padStart(3,'0'), p=parameterize(makePath(level.geometry)), profile=level.geometryProfile;
  const hitRadius=profile.catRadius+profile.projectileRadius;
  const svg=fs.readFileSync(`${root}/levels/${id}.svg`,'utf8');
  const core=svg.slice(svg.indexOf('<rect x="1" y="190"'),svg.indexOf('<text x="26" y="1202"'));
  const fixtures=[.45,.72,.94].map(ratio=>{
    const cats=makeCats(p,ratio,profile.spacing,profile.catRadius), state=visibleState(origin,cats,hitRadius);
    return {ratio,cats,visible:[...state.first],hidden:[...state.hidden],headId:cats.at(-1).id,headVisible:state.first.has(cats.at(-1).id)};
  });
  const late=fixtures.at(-1), witness=gapWitness(origin,late.cats,hitRadius);
  let beforeHit=null,afterHit=null;
  if(witness){
    const angle=witness.angleDegrees*Math.PI/180;
    beforeHit=rayHits(origin,angle,late.cats,hitRadius)[0]?.cat.id;
    afterHit=rayHits(origin,angle,late.cats.filter(c=>!witness.removed.includes(c.id)),hitRadius)[0]?.cat.id;
    if(!witness.removed.includes(beforeHit)||!witness.newlyVisible.includes(afterHit))throw new Error(`L${id}: invalid same-ray witness`);
  }
  const headAngles=[];
  for(let deg=0;deg<360;deg+=.5)if(rayHits(origin,deg*Math.PI/180,late.cats,hitRadius)[0]?.cat.id===late.headId)headAngles.push(deg);
  const record={id:level.id,sourceSha256:level.sourceSha256,geometryProfile:profile,fixtures,witness:witness?{...witness,beforeHit,afterHit}:null,lateHead:{id:late.headId,directAngles:headAngles},limits:['移除三只仅为诊断探针，不保证同色或可合法消除','94% 路程静态快照不等于真实失败时刻','没有验证插入、回吸、生成计划或实际通关率']};
  records.push(record);fs.writeFileSync(`${root}/evidence/${id}.json`,JSON.stringify(record,null,2)+'\n');
  function panel(fixture,x,y,title,removed=[],angle=null){
    const remaining=fixture.cats.filter(c=>!removed.includes(c.id));
    const state=visibleState(origin,remaining,hitRadius);
    const dots=remaining.map(c=>`<circle cx="${c.x}" cy="${c.y}" r="${profile.catRadius}" fill="${state.first.has(c.id)?'#c8e5eb':'#d9c8ed'}" stroke="${c.id===fixture.headId?'#b42636':'#334155'}" stroke-width="${c.id===fixture.headId?6:2}"/><text x="${c.x}" y="${c.y+6}" text-anchor="middle" font-size="18" fill="#253047">${c.id}</text>`).join('');
    const ray=angle===null?'':`<path d="M375,675 L${375+650*Math.cos(angle*Math.PI/180)},${675+650*Math.sin(angle*Math.PI/180)}" stroke="#d06116" stroke-width="5" stroke-dasharray="10 6"/>`;
    return `<text x="${x+12}" y="${y}" font-size="21" font-weight="700">${esc(title)}</text><svg x="${x}" y="${y+12}" width="475" height="625" viewBox="0 175 750 990">${core}${dots}${ray}</svg>`;
  }
  const top=fixtures.map((f,i)=>panel(f,18+i*496,165,`队首 ${Math.round(f.ratio*100)}% · 遮挡 ${f.hidden.length}/${f.cats.length}`)).join('');
  const bottom=witness?panel(late,18,870,`开口前：射线 ${witness.angleDegrees}°`,[],witness.angleDegrees)+panel(late,514,870,`移除 ${witness.removed.join('/')} 后`,witness.removed,witness.angleDegrees):panel(late,18,870,'末段快照：未找到三只移除开口证据');
  const details=[`入口 S (${level.source.x.toFixed(1)}, ${level.source.y.toFixed(1)})`,`老巢 L (${level.lair.x.toFixed(1)}, ${level.lair.y.toFixed(1)})`,`方向角：S ${(level.source.angle*180/Math.PI).toFixed(1)}° / L ${(level.lair.angle*180/Math.PI).toFixed(1)}°`,'角度 0° 向右，90° 向下。',`两层 ${level.geometricPressure.twoLayerDegrees}° / 三层 ${level.geometricPressure.threeLayerDegrees}°`,`静态压力分 ${level.geometricPressure.score}（非通关率）`,witness?`同射线首撞：#${beforeHit} → #${afterHit}`:'此快照没有开口见证。',`末段队首 #${late.headId}`,headAngles.length?`可直射角覆盖 ${headAngles.length*.5}°`:'无直接射线，需先处理近层。',headAngles.length?`示例方向 ${headAngles[0]}°`:'不代表已证明动态可救场。','探针移除不等于合法三消。','当前：几何候选，用户待审。'];
  const text=details.map((s,i)=>`<text x="1028" y="${900+i*39}" font-size="20">${esc(s)}</text>`).join('');
  fs.writeFileSync(`${root}/evidence/${id}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1580" viewBox="0 0 1500 1580"><rect width="1500" height="1580" fill="#f5f7fa"/><g font-family="sans-serif" fill="#24334a"><text x="30" y="45" font-size="30" font-weight="700">第 ${id} 关 · 猫链遮挡几何诊断（不是游戏画面）</text><text x="30" y="83" font-size="21">青色：可被某条射线首先命中；紫色：被近猫完全遮挡；红圈：队首；数字：猫 ID。</text><text x="30" y="118" font-size="20" fill="#994a1f">固定快照 / 无时间轴；开口仅作碰撞探针，不证明合法三消、关卡可解或真实难度。</text>${top}${bottom}${text}<text x="30" y="1550" font-size="18">源哈希 ${level.sourceSha256} · 诊断点沿同一条已冻结轨道采样</text></g></svg>`);
  if(level.id%10===0)console.log(`Evidence ${level.id}/100`);
}
const chapters=Array.from({length:10},(_,c)=>{
  const levels=catalog.levels.slice(c*10,c*10+10), mean=key=>Number((levels.reduce((n,l)=>n+l.geometricPressure[key],0)/10).toFixed(1));
  return {chapter:c+1,meanPressure:mean('score'),meanTwo:mean('twoLayerDegrees'),meanThree:mean('threeLayerDegrees'),minPressure:Math.min(...levels.map(l=>l.geometricPressure.score)),maxPressure:Math.max(...levels.map(l=>l.geometricPressure.score))};
});
fs.writeFileSync(`${root}/evidence/summary.json`,JSON.stringify({chapters,witnessCount:records.filter(r=>r.witness).length,records:records.map(r=>({id:r.id,sourceSha256:r.sourceSha256,witness:r.witness,lateHead:r.lateHead}))},null,2)+'\n');
fs.writeFileSync(`${root}/PRESSURE.md`,['# 百关几何压力与开口诊断','','压力分仅用于编排，不是经过玩家验证的难度或通关率。','每关有 45% / 72% / 94% 路程快照及同射线移除探针。探针不是合法三消，也没有时间轴。','','| 章 | 平均压力 | 压力范围 | 双层角均值 | 三层角均值 |','|---:|---:|---|---:|---:|',...chapters.map(c=>`| ${c.chapter} | ${c.meanPressure} | ${c.minPressure}–${c.maxPressure} | ${c.meanTwo}° | ${c.meanThree}° |`),'','| 关 | 诊断图 | 数据 | 开口证据 | 末段队首 |','|---:|---|---|---|---|',...records.map(r=>{const id=String(r.id).padStart(3,'0');return `| ${r.id} | [查看](evidence/${id}.svg) | [JSON](evidence/${id}.json) | ${r.witness?'有静态探针':'无静态探针'} | ${r.lateHead.directAngles.length?'可直接命中':'需先处理近层；动态可解性待验证'} |`;})].join('\n')+'\n');
console.log(JSON.stringify({chapters,witnessCount:records.filter(r=>r.witness).length},null,2));
