import { test, expect } from '@playwright/test';

test('all five transparent busts load, keep their proportions, and persist across language changes', async ({ browser }) => {
  for (const [portrait, dialogue, scene, name] of [
    ['shen','intro','lane','沈砚'],['aunt','aunt','lane','周姨'],
    ['lin','lin','press','林岚'],['doctor','doctor','clinic','罗医生'],['gu','gu','clinic','顾文山'],
  ]) {
    const page=await browser.newPage({viewport:{width:1100,height:900}});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(({scene,dialogue})=>localStorage.setItem('wudu-save-v1',JSON.stringify({
      state:{version:1,scene,inventory:['letter','key','photo','proof','record','testimony','ticket'],flags:['intro'],
        visited:['lane','home','press','clinic','archive','river'],log:[],ending:null,x:368,y:400},
      dialogue,savedAt:new Date().toISOString(),
    })),{scene,dialogue});
    await page.goto('http://127.0.0.1:5173');
    await page.locator('#title-screen [data-action="continue"]').click();
    const bust=page.locator('.portrait');
    await expect(bust).toHaveAttribute('data-illustration',portrait);
    await expect(page.locator('.speaker-badge h2')).toHaveText(name);
    const pixels=await bust.evaluate((canvas:HTMLCanvasElement)=>{
      const rgba=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
      let clear=0,painted=0;for(let i=3;i<rgba.length;i+=4){if(rgba[i]===0)clear++;if(rgba[i]>200)painted++;}
      return {clear,painted};
    });
    expect(pixels.clear).toBeGreaterThan(1000);
    expect(pixels.painted).toBeGreaterThan(8000);
    await page.locator("#game-menu").click();
    await page.locator('[data-action="lang"]').click();
    await page.keyboard.press("Escape");
    await expect(bust).toHaveAttribute('data-illustration',portrait);
    // On a narrow phone the full bust stays beside the text instead of being
    // squeezed into the previous square face-graphic slot.
    await page.setViewportSize({width:390,height:844});
    const bounds=await bust.boundingBox();
    expect(bounds!.height/bounds!.width).toBeCloseTo(320/192,1);
    expect(bounds!.width).toBeGreaterThanOrEqual(80);
    const body=await page.locator('.dialogue-body').boundingBox();
    expect(body!.x).toBeGreaterThanOrEqual(bounds!.x+bounds!.width);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.close();
  }
});
