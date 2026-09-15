async (page) => {
  const kind='FLOW',url='http://127.0.0.1:62320/',key='__UI_'+kind+'__';
  const diagnostics=[],handler=m=>{if(['warning','error'].includes(m.type()))diagnostics.push({type:m.type(),text:m.text()});};page.on('console',handler);
  await page.setViewportSize({width:390,height:844});await page.goto(url);
  await page.waitForFunction(({key,kind})=>window[key]&&(kind==='FLOW'?window[key].page==='home':window[key].totalLevels===100),{key,kind},{timeout:120000});
  const read=()=>page.evaluate(k=>window[k],key),frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const click=async(name)=>{const s=await read(),c=s.controls.find(c=>c.name===name);if(!c)throw Error('Missing '+name);const b=await page.locator('#GameCanvas').boundingBox();let x=c.rect.x+c.rect.width/2,y=c.rect.y+c.rect.height/2;if(c.space==='stage'){x=s.fit.x+x*s.fit.scale;y=s.fit.y+y*s.fit.scale;}await page.mouse.click(b.x+x/s.viewport.width*b.width,b.y+y/s.viewport.height*b.height);await frame();};
  if(kind==='FLOW'){await click('start');await click('beginLevel');await page.waitForFunction(()=>!window.__UI_FLOW__.pending);await frame();}
  for(let i=0;i<5;i++){await click('pause');await click('continue');}
  const session=await page.context().newCDPSession(page),samples=[];
  const collect=async(cycles)=>{await session.send('HeapProfiler.collectGarbage');samples.push({cycles,heap:await session.send('Runtime.getHeapUsage'),retainedNodes:(await read()).retainedNodes});};
  try{
    await collect(0);
    for(let batch=1;batch<=3;batch++){for(let i=0;i<40;i++){await click('pause');await click('continue');}await collect(batch*40);}
  }finally{await session.detach();page.off('console',handler);}
  const nodesStable=new Set(samples.map(x=>x.retainedNodes)).size===1;
  if(!nodesStable||diagnostics.length)throw Error(JSON.stringify({nodesStable,diagnostics}));
  return{passed:true,kind,samples,nodesStable,postGcGrowthBytes:samples.at(-1).heap.usedSize-samples[0].heap.usedSize,diagnostics,note:'Desktop Chromium forced-GC diagnostic after approximate heap rose; 5 warmup + 120 pause cycles. JS heap only, not GPU/Android memory or a complete leak proof.'};
}
