// Run through playwright-cli run-code. All actions use actual canvas pointer events.
async (page) => {
  const diagnostics=[];
  const log=message=>{if(['warning','error'].includes(message.type()))diagnostics.push({type:message.type(),text:message.text()});};
  page.on('console',log);
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await page.waitForFunction(()=>window.__UI_GREYBOX__?.level===1);
  const read=()=>page.evaluate(()=>window.__UI_GREYBOX__);
  const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const point=async(x,y,stage=true)=>{
    const s=await read(),r=await page.locator('#GameCanvas').boundingBox();
    if(stage){x=s.fit.x+x*s.fit.scale;y=s.fit.y+y*s.fit.scale;}
    return {x:r.x+x/s.viewport.width*r.width,y:r.y+y/s.viewport.height*r.height};
  };
  const click=async(name)=>{
    const s=await read(),c=s.controls.find(c=>c.name===name);assert(c,`missing control ${name}`);
    const p=await point(c.rect.x+c.rect.width/2,c.rect.y+c.rect.height/2,c.space==='stage');
    await page.mouse.click(p.x,p.y);
    await frame();
  };
  const at=async(x,y)=>{const p=await point(x,y);await page.mouse.click(p.x,p.y);await frame();};
  const shot=(await read()).shots;
  await at(375,675);assert((await read()).swaps===1,'central tap did not swap');
  await at(500,700);assert((await read()).shots===shot+1,'aim did not emit');
  await click('tool0');assert((await read()).selected==='逗猫棒','tool selection');
  await click('tool0');assert((await read()).selected==='','tool cancellation');
  await click('pause');assert((await read()).panel==='pause','pause');
  await at(28,240);assert((await read()).shots===shot+1,'modal leaked a shot');
  await click('settings');assert((await read()).panel==='settings','settings');
  await click('back');assert((await read()).panel==='pause','settings caller');
  await click('restart');await click('cancel');assert((await read()).panel==='pause','cancel restart');
  await page.locator('#GameCanvas').screenshot({path:'output/playwright/ui03g/pause.png'});
  await click('continue');assert((await read()).panel==='','continue');
  const start=await point(76,108),end=await point(500,700);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:10});await page.mouse.up();
  await frame();
  assert((await read()).shots===shot+1 && (await read()).panel==='','UI drag leaked');
  await click('debug-lose');await click('revive');assert((await read()).resumes===1,'free revive demonstration');
  await click('debug-lose');await click('revive');assert((await read()).panel==='lose' && (await read()).resumes===1,'free limit');
  await click('freeRestart');assert((await read()).resumes===0 && !(await read()).panel,'free restart');
  const levels=[];
  for(let i=0;i<7;i++){
    const s=await read();assert(s.topGap>=19.99 && s.bottomGap>=25.99 && s.next.gap>=8,'layout clearance');
    levels.push({level:s.level,topGap:s.topGap,bottomGap:s.bottomGap,next:s.next});
    await page.locator('#GameCanvas').screenshot({path:`output/playwright/ui03g/l${String(s.level).padStart(3,'0')}.png`});
    await click('debug-case');
  }
  await click('debug-case'); // L020, paid revive state fixture
  await click('debug-lose');await click('revive');assert((await read()).panel==='ad','ad loading');
  await click('adCancel');assert((await read()).panel==='lose' && (await read()).resumes===0,'cancel granted reward');
  await click('revive');await click('adError');assert((await read()).panel==='error','ad unavailable');
  await click('revive');await click('adSuccess');await click('debug-lose');await click('revive');await click('adSuccess');
  assert((await read()).resumes===2,'repeated valid ad demo capped');
  await click('debug-lose');await click('revive');await click('freeRestart');assert(!(await read()).panel,'loading has no free escape');
  await click('debug-home');assert((await read()).home,'home');
  await page.locator('#GameCanvas').screenshot({path:'output/playwright/ui03g/home.png'});
  await click('start');await click('debug-win');await page.locator('#GameCanvas').screenshot({path:'output/playwright/ui03g/win.png'});
  await click('next');
  const sizes=[];
  for(const [width,height] of [[360,640],[390,844],[430,932]]){
    await page.setViewportSize({width,height});
    // Creator preview fixes the wrapper width at bootstrap: reload for each device size.
    await page.reload();await page.waitForFunction(()=>window.__UI_GREYBOX__?.level===1);
    await frame();
    await page.waitForFunction(()=>Math.abs(document.querySelector('#GameCanvas').getBoundingClientRect().width-window.innerWidth)<2);
    while((await read()).level!==87)await click('debug-case');
    await click('debug-safe');await click('debug-bounds');
    const s=await read(),r=await page.locator('#GameCanvas').boundingBox();
    assert(s.notched && s.next.docked,'safe/preview fixture lost');
    assert(s.fit.y>=s.safe.y+64 && s.fit.y+s.fit.height<=s.safe.y+s.safe.height-52+0.01,'safe area overlap');
    await click('pause');assert((await read()).panel==='pause','resize input mapping');await click('continue');
    sizes.push({width,height,canvas:r,fit:s.fit,safe:s.safe});
    await page.locator('#GameCanvas').screenshot({path:`output/playwright/ui03g/l087-safe-${width}.png`});
  }
  page.off('console',log);
  assert(!diagnostics.some(d=>d.type==='error'||/WebGL|buffer overflow|Missing class/.test(d.text)),'engine diagnostics: '+JSON.stringify(diagnostics));
  return {passed:true,levels,sizes,diagnostics,final:await read()};
}
