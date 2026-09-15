async (page) => {
  const width=390,height=844,output='output/playwright/ui07/editor';
  const diagnostics=[],handler=m=>{if(['warning','error'].includes(m.type()))diagnostics.push({type:m.type(),text:m.text()});};
  page.on('console',handler);await page.route('**/*',route=>route.continue());
  await page.setViewportSize({width,height});await page.reload();await page.waitForFunction(()=>window.__UI_CATALOG__?.totalLevels===100,null,{timeout:120000});
  const read=()=>page.evaluate(()=>window.__UI_CATALOG__),frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const assert=(v,m)=>{if(!v)throw Error(m);};
  const point=async(x,y,stage=true)=>{const s=await read(),b=await page.locator('#GameCanvas').boundingBox();if(stage){x=s.fit.x+x*s.fit.scale;y=s.fit.y+y*s.fit.scale;}return{x:b.x+x/s.viewport.width*b.width,y:b.y+y/s.viewport.height*b.height};};
  const click=async(name)=>{const s=await read(),c=s.controls.find(c=>c.name===name);assert(c,'missing '+name);const p=await point(c.rect.x+c.rect.width/2,c.rect.y+c.rect.height/2,c.space==='stage');await page.mouse.click(p.x,p.y);await frame();};
  const shot=async(name)=>page.locator('#GameCanvas').screenshot({path:output+'/'+width+'/'+name+'.png'});
  await click('debug-safe');await click('debug-obstacles');
  const rows=[];
  for(let level=1;level<=100;level++){
    for(let phase=0;phase<3;phase++){
      const s=await read();assert(s.level===level&&s.phase===phase,'wrong level/phase');
      assert(s.sourceSHA==='fab0b72c634d89b6b4081c16a4253c2b1046183308304091b8f0510e75c72e7c','wrong source');
      assert(s.catDiameter===(level<=20?64:56),'cat size');assert(s.next.gap>=8,'next collision');
      assert(s.assetBatch.cats===5&&s.assetBatch.ui===7&&s.fontLoaded,'missing assets');
      const controls=s.controls.filter(c=>c.space==='stage'),unit=s.cssScale*s.fit.scale;
      for(const c of controls){assert(c.rect.width*unit>=43.99&&c.rect.height*unit>=43.99,'small '+c.name);assert(c.rect.x>=0&&c.rect.y>=0&&c.rect.x+c.rect.width<=750&&c.rect.y+c.rect.height<=1334,'outside '+c.name);if(c.name==='pause')assert(s.occupied.top-c.rect.y-c.rect.height>=8,'pause collision');if(c.name.startsWith('tool'))assert(c.rect.y-s.occupied.bottom>=8,'tool collision');}
      for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=controls[i].rect,b=controls[j].rect;assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),'overlap');}
      assert(s.fit.y>=s.safe.y+64-.001,'capsule');assert(s.fit.y+s.fit.height<=s.safe.y+s.safe.height-s.toolbarHeight+.001,'bottom safe');
      if(phase===(width===360?2:width===430?0:1))await shot('L'+String(level).padStart(3,'0'));
      rows.push({level,phase,obstacles:s.obstacles,catCss:s.catDiameter*unit,next:s.next,retainedNodes:s.retainedNodes});
      await click('debug-phase');
    }
    await click('debug-next');
  }
  assert((await read()).level===1,'100->1');await click('debug-prev');assert((await read()).level===100,'1->100');
  await click('debug-obstacles');await shot('obstacle-hp1');await click('debug-obstacles');await shot('obstacle-revealed');
  const before=(await read()).swaps,p=await point(375,675);await page.mouse.click(p.x,p.y);await frame();assert((await read()).swaps===before+1,'swap');
  await click('pause');const shots=(await read()).shots;const q=await point(600,600);await page.mouse.click(q.x,q.y);await frame();assert((await read()).shots===shots,'modal leaked input');await click('continue');
  page.off('console',handler);assert(!diagnostics.length,'diagnostics '+JSON.stringify(diagnostics));
  return{passed:true,width,height,samples:rows.length,diagnostics,rows,final:await read()};
}
