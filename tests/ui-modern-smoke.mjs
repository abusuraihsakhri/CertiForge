import { chromium } from 'playwright';
import fs from 'node:fs';

function assert(cond, msg){ if(!cond) throw new Error(msg); }
fs.mkdirSync('artifacts',{recursive:true});

const browser=await chromium.launch({headless:true});
try{
  for(const tc of [
    {name:'desktop',viewport:{width:1440,height:960}},
    {name:'mobile',viewport:{width:390,height:844}}
  ]){
    const page=await browser.newPage({viewport:tc.viewport});
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
    await page.waitForSelector('.template-card');

    let dims=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,cards:document.querySelectorAll('.template-card').length}));
    assert(dims.sw<=dims.iw+2,tc.name+': horizontal overflow on templates');
    assert(dims.cards>=10,tc.name+': templates missing');
    await page.screenshot({path:'artifacts/'+tc.name+'-templates.png',fullPage:true});

    await page.locator('.template-card').first().click();
    await page.waitForSelector('.editor-layout');
    await page.waitForSelector('.canvas-toolbar');
    dims=await page.evaluate(()=>{
      const c=document.querySelector('.certificate-canvas')?.getBoundingClientRect();
      return {sw:document.documentElement.scrollWidth,iw:innerWidth,cw:c?.width||0,ch:c?.height||0,toolbar:!!document.querySelector('.canvas-toolbar')};
    });
    assert(dims.sw<=dims.iw+2,tc.name+': horizontal overflow in editor');
    assert(dims.cw>100&&dims.ch>60,tc.name+': certificate canvas collapsed');
    assert(dims.toolbar,tc.name+': canvas toolbar missing');
    await page.screenshot({path:'artifacts/'+tc.name+'-editor.png',fullPage:true});

    await page.locator('[data-zoom="75"]').click();
    assert(await page.locator('[data-zoom="75"]').getAttribute('aria-pressed')==='true',tc.name+': zoom control failed');

    await page.locator('[data-step="data"]').click();
    await page.setInputFiles('#dataFile','examples/participants.csv');
    await page.waitForSelector('.import-summary');
    assert(await page.locator('.import-summary').isVisible(),tc.name+': import summary missing');

    await page.locator('#toMapping').click();
    await page.waitForSelector('.mapping-table');
    dims=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,rows:document.querySelectorAll('.mapping-table tbody tr').length}));
    assert(dims.sw<=dims.iw+2,tc.name+': horizontal overflow in mapping');
    assert(dims.rows>=8,tc.name+': mapping rows missing');
    await page.screenshot({path:'artifacts/'+tc.name+'-mapping.png',fullPage:true});

    await page.goto('http://127.0.0.1:4173/verify.html',{waitUntil:'networkidle'});
    await page.waitForSelector('.verify-card');
    dims=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,vw:document.querySelector('.verify-card')?.getBoundingClientRect().width||0}));
    assert(dims.sw<=dims.iw+2,tc.name+': horizontal overflow on verification');
    assert(dims.vw>200,tc.name+': verification card collapsed');

    await page.screenshot({path:'artifacts/'+tc.name+'-verify.png',fullPage:true});
    await page.close();
  }
}finally{await browser.close();}
console.log('Modern UI browser smoke: PASS');
