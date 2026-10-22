import { chromium } from '@playwright/test';
const browser = await chromium.launch({channel:'msedge', headless:true});
const page = await browser.newPage();
page.on('console', msg => { if(msg.type()==='error') console.log('CONSOLE',msg.text()); });
page.on('pageerror',error=>console.log('PAGE_ERROR',error.message));
page.on('requestfailed',r=>console.log('REQUEST_FAILED',r.url(),r.failure()));
page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
await page.goto('http://127.0.0.1:5173/preview');
try {await page.locator('main h1').waitFor({timeout:15000});}catch(error){console.log(error.message);}
console.log('BODY',await page.locator('body').innerText());
await page.screenshot({path:'artifacts/diagnostic.png',fullPage:true});
await browser.close();
