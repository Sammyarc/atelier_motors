import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('test-results', {recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page = await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
page.on('pageerror',error => console.log('PAGE ERROR',error.message));
page.on('console',message => {if(message.type() === 'error')console.log('CONSOLE',message.text());});
await page.goto('http://127.0.0.1:4404/?debug',{waitUntil:'networkidle'});
await page.waitForFunction(() => Boolean(window.__atelier),{timeout:60000});
await page.waitForFunction(() => !window.__atelier.showroom.transitioning && window.__atelier.showroom.tweens.size === 0);
console.log(await page.evaluate(() => {
  const s=window.__atelier.showroom;
  const nodes=[];s.car.traverse(n=>{if(/steering|seat|dash/i.test(n.name)){const p=n.getWorldPosition(s.camera.position.clone());nodes.push([n.name,p.toArray()]);}});
  return {camera:s.camera.position.toArray(),render:s.renderer.info.render,nodes};
}));
await page.screenshot({path:'test-results/desktop.png',fullPage:true});
await page.click('#light-button');
await page.waitForFunction(() => window.__atelier.showroom.tweens.size === 0);
await page.screenshot({path:'test-results/night.png'});
console.log('Night text', await page.locator('.vehicle-info').evaluate(el => getComputedStyle(el).color));
await page.click('#light-button');
await page.waitForFunction(() => window.__atelier.showroom.tweens.size === 0);
for (const car of ['ferrari','concept','porsche','bmw']) {
  if (car !== 'ferrari') {
    await page.click(`[data-car="${car}"]`);
    await page.waitForFunction(id => window.__atelier.ui.car === id,car,{timeout:60000});
    await page.waitForFunction(() => !window.__atelier.showroom.transitioning && window.__atelier.showroom.tweens.size === 0);
    await page.screenshot({path:`test-results/${car}.png`,fullPage:true});
    console.log(await page.evaluate(() => {const s=window.__atelier.showroom; const result=[];s.car.traverse(n=>{if(/SteeringWheel01|SeatsColor1|DashMid/.test(n.name)){const p=n.getWorldPosition(s.camera.position.clone());result.push([n.name,p.toArray()]);}});return result;}));
  }
  const thumbnail = await page.evaluate(() => {
    const s=window.__atelier.showroom;
    const states=s.scene.children.map(child=>[child,child.visible]);
    states.forEach(([child])=>{if(child.isMesh)child.visible=false;});
    s.renderer.setSize(720,360,false);
    s.camera.aspect=2;s.camera.fov=25;s.camera.position.set(5,2.1,-6.5);s.camera.lookAt(0,.8,0);s.camera.updateProjectionMatrix();
    s.renderer.render(s.scene,s.camera);
    const out=document.createElement('canvas');out.width=360;out.height=180;const ctx=out.getContext('2d');ctx.drawImage(s.canvas,0,0,360,180);
    const result=out.toDataURL('image/webp',.85).split(',')[1];
    states.forEach(([child,visible])=>child.visible=visible);
    s.resize();s.setView('exterior',false);
    return result;
  });
  await writeFile(`assets/${car}-thumb.webp`,Buffer.from(thumbnail,'base64'));
  await page.click('[data-view="interior"]');
  await page.waitForFunction(() => !window.__atelier.showroom.transitioning && window.__atelier.showroom.tweens.size === 0);
  await page.waitForTimeout(300);
  await page.screenshot({path:`test-results/${car}-interior.png`,fullPage:true});
  await page.click('[data-view="exterior"]');
  await page.waitForFunction(() => !window.__atelier.showroom.transitioning && window.__atelier.showroom.tweens.size === 0);
}
await page.setViewportSize({width:390,height:844});
await page.evaluate(() => window.scrollTo(0,0));
await page.waitForTimeout(600);
await page.screenshot({path:'test-results/mobile.png',fullPage:true});
await page.locator('#collection').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({path:'test-results/mobile-collection.png'});
console.log('Collection visible',await page.locator('#collection-heading').isVisible());
await page.evaluate(() => window.scrollTo(0,0));
const before=await page.evaluate(()=>window.__atelier.showroom.camera.position.toArray());
await page.mouse.move(160,350);await page.mouse.down();await page.mouse.move(230,380,{steps:8});await page.mouse.up();
console.log('Pointer orbit changed',JSON.stringify(before)!==JSON.stringify(await page.evaluate(()=>window.__atelier.showroom.camera.position.toArray())));
await browser.close();
