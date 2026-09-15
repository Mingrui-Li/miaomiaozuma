async (page) => {
  const kind='FLOW',url='http://127.0.0.1:62320/';
  const key='__UI_'+kind+'__',diagnostics=[];
  const handler=m=>{if(['warning','error'].includes(m.type()))diagnostics.push({type:m.type(),text:m.text()});};
  page.on('console',handler);
  await page.route('**/*',r=>r.continue()); // routing disables HTTP cache
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(({key,kind})=>{
    const poll=()=>{const q=window[key];if(q&&(kind==='FLOW'?q.page==='home':q.totalLevels===100))window.__UI08_READY_MS__=performance.now();else requestAnimationFrame(poll);};
    requestAnimationFrame(poll);
  },{key,kind});
  const launches=[];
  for(let i=0;i<3;i++){
    await page.goto(url);await page.waitForFunction(()=>window.__UI08_READY_MS__>0,null,{timeout:120000});
    launches.push(await page.evaluate(()=>({readyMs:window.__UI08_READY_MS__,navigation:performance.getEntriesByType('navigation')[0].toJSON(),resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,duration:r.duration}))})));
  }
  const read=()=>page.evaluate(k=>window[k],key);
  const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const click=async(name)=>{const s=await read(),c=s.controls.find(c=>c.name===name);if(!c)throw Error('missing '+name);const b=await page.locator('#GameCanvas').boundingBox();let x=c.rect.x+c.rect.width/2,y=c.rect.y+c.rect.height/2;if(c.space==='stage'){x=s.fit.x+x*s.fit.scale;y=s.fit.y+y*s.fit.scale;}await page.mouse.click(b.x+x/s.viewport.width*b.width,b.y+y/s.viewport.height*b.height);await frame();};
  if(kind==='FLOW'){await click('start');await click('beginLevel');await page.waitForFunction(()=>!window.__UI_FLOW__.pending);await frame();}
  const memory=()=>page.evaluate(()=>performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null);
  const before=await memory(),nodes=[];
  for(let i=0;i<40;i++){
    await click('pause');await click('continue');nodes.push((await read()).retainedNodes);
  }
  const after=await memory();
  const intervals=await page.evaluate(()=>new Promise(resolve=>{const a=[];let prev,start;function tick(t){if(start===undefined)start=t;if(prev!==undefined)a.push(t-prev);prev=t;if(t-start>=5000)resolve(a);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
  const sorted=[...intervals].sort((a,b)=>a-b),percentile=p=>sorted[Math.floor((sorted.length-1)*p)];
  const stable=new Set(nodes.slice(10)).size===1;
  page.off('console',handler);
  if(!stable||diagnostics.length)throw Error(JSON.stringify({stable,diagnostics}));
  return{passed:true,kind,scope:'desktop Chromium, localhost HTTP cache disabled; static UI only, not Android or dynamic gameplay',viewport:{width:390,height:844},userAgent:await page.evaluate(()=>navigator.userAgent),launches,nodeCycles:nodes,nodePlateau:stable,memory:{before,after,note:'Chromium approximate JS heap; excludes GPU/native textures, no leak verdict from this delta'},frames:{count:intervals.length,medianMs:percentile(.5),p95Ms:percentile(.95),maxMs:sorted.at(-1),intervals,note:'foreground static UI rAF sample; not target-phone gameplay FPS'},diagnostics};
}
