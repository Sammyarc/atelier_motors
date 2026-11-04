import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.on('pageerror',e=>console.log('ERROR',e.message));
try {
  await page.goto('http://127.0.0.1:4404/?debug');
  await page.waitForFunction(()=>window.__atelier,null,{timeout:60000});
  for(const id of ['porsche','bmw']){
    await page.click(`[data-car="${id}"]`);
    await page.waitForFunction(id=>window.__atelier.ui.car===id && !window.__atelier.ui.busy,id,{timeout:60000});
    await page.evaluate(()=>window.scrollTo(0,0));
    const geometry=await page.evaluate(async()=>{
      const T=await import('three'),s=window.__atelier.showroom,meshes=[];
      s.car.updateMatrixWorld(true);
      s.car.traverse(n=>{if(n.isMesh){const b=new T.Box3().setFromObject(n);meshes.push({name:n.name,parent:n.parent.name,material:n.material.name,min:b.min.toArray(),max:b.max.toArray()});}});
      return meshes;
    });
    await writeFile(`test-results/${id}-geometry.json`,JSON.stringify(geometry,null,2));
    await page.screenshot({path:`test-results/new-${id}.png`});
    await page.click('[data-view="interior"]');
    await page.waitForFunction(()=>!window.__atelier.showroom.transitioning);
    await page.screenshot({path:`test-results/new-${id}-inside.png`});
    console.log(id,'loaded',geometry.length,'meshes');
    await page.click('[data-view="exterior"]');
    const thumb=await page.evaluate(()=>{
      const s=window.__atelier.showroom,visibility=s.scene.children.map(c=>[c,c.visible]);
      visibility.forEach(([c])=>{if(c.isMesh)c.visible=false;});
      s.renderer.setSize(720,360,false);s.camera.aspect=2;s.camera.fov=25;
      s.camera.position.set(5,2.1,-6.5);s.camera.lookAt(0,.8,0);s.camera.updateProjectionMatrix();s.renderer.render(s.scene,s.camera);
      const canvas=document.createElement('canvas');canvas.width=360;canvas.height=180;
      canvas.getContext('2d').drawImage(s.canvas,0,0,360,180);
      const data=canvas.toDataURL('image/webp',.9).split(',')[1];
      visibility.forEach(([c,v])=>c.visible=v);s.resize();s.setView('exterior',false);
      return data;
    });
    await writeFile(`assets/${id}-thumb.webp`,Buffer.from(thumb,'base64'));
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'test-results/collection-mobile-hero.png'});
  await page.locator('.view-controls').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/collection-mobile-controls.png'});
  await page.locator('#collection').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/collection-mobile-cards.png'});
} finally {await browser.close();}
