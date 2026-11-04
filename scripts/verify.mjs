import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});
const page=await context.newPage();
const errors=[];const badResponses=[];const results=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)badResponses.push(`${response.status()} ${response.url()}`);});
const pass=name=>{results.push(name);console.log('PASS',name);};
const ready=async()=>{
  await page.waitForFunction(()=>window.__atelier && !window.__atelier.ui.busy && !window.__atelier.showroom.transitioning && window.__atelier.showroom.tweens.size===0,null,{timeout:60000});
};
const state=()=>page.evaluate(()=>{const s=window.__atelier.showroom;return {car:s.currentId,mode:s.mode,position:s.camera.position.toArray(),quaternion:s.camera.quaternion.toArray(),fov:s.camera.fov,rotate:s.rotating,night:s.night,color:s.paint[0].color.getHexString()};});

try {
  await page.goto('http://127.0.0.1:4404/?debug',{waitUntil:'networkidle'});
  await ready();
  assert.equal((await state()).car,'ferrari');
  assert(await page.evaluate(()=>window.__atelier.showroom.renderer.info.render.triangles>1000));
  assert(await page.locator('.car-thumbnail img').evaluateAll(images=>images.every(image=>image.complete && image.naturalWidth>0)));
  await expect(page.locator('[data-car]')).toHaveCount(4);
  pass('Real model geometry, dependencies, and thumbnail assets load');

  await page.click('[data-color="#384f43"]');await ready();
  assert.equal((await state()).color,'384f43');
  await expect(page.locator('#finish-name')).toContainText('Forest');
  await page.click('#light-button');await ready();assert.equal((await state()).night,true);
  await expect(page.locator('#light-label')).toHaveText('Night studio');
  await page.screenshot({path:'test-results/verified-night.png'});
  await page.click('#light-button');await ready();
  pass('Paint and lighting controls change the rendered materials and lights');

  const exterior=await state();
  await page.click('[data-angle="side"]');await ready();
  assert(Math.abs((await state()).position[2])<.1);
  await page.click('#zoom-in');assert.notDeepEqual((await state()).position,exterior.position);
  await page.locator('#scene-canvas').focus();await page.keyboard.press('ArrowRight');
  assert.notDeepEqual((await state()).position,exterior.position);
  await page.keyboard.press('Home');await ready();
  assert(Math.abs((await state()).position[0]-exterior.position[0])<.01);
  await page.click('#rotate-button');assert.equal((await state()).rotate,true);
  await page.click('#rotate-button');assert.equal((await state()).rotate,false);
  pass('Exterior presets, zoom, keyboard orbit, Home reset, and rotation');

  const carsToCheck = process.argv.includes('--additions') ? ['porsche','bmw'] : ['ferrari','concept','porsche','bmw'];
  for(const car of carsToCheck){
    if(car!=='ferrari'){
      await page.click(`[data-car="${car}"]`);await ready();
      assert.equal((await state()).car,car);
      assert.equal((await state()).color,'384f43');
    }
    const start=Date.now();await page.click('[data-view="interior"]');await ready();
    assert(Date.now()-start<15000,'Cabin transition must finish promptly even with software graphics');
    const inside=await state();assert.equal(inside.mode,'interior');assert(inside.position[1]>1 && inside.position[1]<2);assert.equal(inside.fov,78);
    assert(await page.evaluate(async()=>{
      const T=await import('three'),s=window.__atelier.showroom;
      // A central ray can leave through the windshield. Also sample the
      // dashboard below it, while rejecting a near seat/body obstruction.
      const directions=[s.camera.getWorldDirection(new T.Vector3()),new T.Vector3(0,-.45,-1).normalize()];
      const nearest=directions.map(direction=>new T.Raycaster(s.camera.position,direction).intersectObject(s.car,true)[0]).filter(Boolean);
      return nearest.length>0 && nearest.every(hit=>hit.distance>.1);
    }),'Cabin view must see the car interior, clear of seat surfaces');
    await expect(page.locator('#rotate-button')).toBeDisabled();
    await page.locator('#scene-canvas').focus();await page.keyboard.press('ArrowRight');assert.notDeepEqual((await state()).quaternion,inside.quaternion);
    await page.click('#zoom-in');assert.equal((await state()).fov,73);
    await page.click('[data-angle="side"]');await ready();assert.notDeepEqual((await state()).quaternion,inside.quaternion);
    await page.click('#reset-button');await ready();
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`test-results/verified-${car}-interior.png`,fullPage:true});
    await page.click('[data-view="exterior"]');await ready();
    assert.equal((await state()).mode,'exterior');
    pass(`${car}: cabin geometry, look controls, field of view, presets, and return to exterior`);
  }

  const downloadPromise=page.waitForEvent('download');await page.click('#snapshot-button');
  const download=await downloadPromise;assert(download.suggestedFilename().endsWith('.png'));
  await download.saveAs('test-results/snapshot.png');
  await page.click('[data-dialog="help-dialog"]');await expect(page.locator('#help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('#help-dialog')).not.toBeVisible();
  pass('PNG download and accessible dialog dismissal');

  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#rotate-button')).toBeDisabled();
  await page.click('[data-view="interior"]');await ready();assert.equal((await state()).fov,78);
  await page.click('[data-view="exterior"]');await ready();
  pass('Live reduced-motion preference disables auto rotation and preserves camera modes');

  for(const width of [1440,1100,800,540,390,320]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForTimeout(200);
    const layout=await page.evaluate(()=>{
      const controls=[...document.querySelectorAll('.edge-panel button,.camera-strip button,.zoom-controls button')].filter(el=>el.getClientRects().length);
      const bounds=document.querySelector('#showroom').getBoundingClientRect();
      const title=getComputedStyle(document.querySelector('.scene-heading h1'));
      const body=getComputedStyle(document.querySelector('.vehicle-info>p'));
      const info=document.querySelector('.vehicle-info').getBoundingClientRect(),views=document.querySelector('.view-controls').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth,headingWeight:Number(title.fontWeight),bodySize:parseFloat(body.fontSize),panelsOverlap:innerWidth<=540 && info.bottom>views.top,clipped:controls.filter(el=>{const r=el.getBoundingClientRect();return r.left<0 || r.right>innerWidth+1 || r.bottom>bounds.bottom+1;}).map(el=>el.id||el.textContent)};
    });
    assert.equal(layout.overflow,false,`No horizontal overflow at ${width}px`);assert.deepEqual(layout.clipped,[],`No clipped controls at ${width}px`);
    assert(layout.headingWeight>=700 && layout.bodySize>=14,`Bold headings and readable body copy at ${width}px`);
    assert.equal(layout.panelsOverlap,false,`Mobile control panels do not overlap at ${width}px`);
    if([1440,390].includes(width))await page.screenshot({path:`test-results/verified-${width}.png`,fullPage:true});
  }
  pass('Responsive layout and control containment at 320, 390, 540, 800, 1100, 1440 pixels');
  assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
  pass('No page errors or failed HTTP assets during the complete flow');

  const fallback=await context.newPage();
  await fallback.route('**/showroom.js',route=>route.abort());
  await fallback.goto('http://127.0.0.1:4404/');
  await expect(fallback.locator('#scene-error')).toBeVisible();
  await expect(fallback.locator('#retry-load')).toBeEnabled();
  await fallback.close();
  pass('Initialization failure shows a readable retry panel');
  await writeFile('test-results/verification.json',JSON.stringify({results,errors,badResponses},null,2));
} finally {
  await browser.close();
}
