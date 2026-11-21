import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const fixture=JSON.parse(fs.readFileSync(path.resolve('../Moodify-Backend/target/recommendation-browser-fixture.json'),'utf8'));
assert(fixture.fixtureOnly && /moodify_recommendation_test_[a-f0-9]{12}/.test(fixture.database));
assert(fixture.webToken && fixture.webUserId===2,'prepare the separate FREE browser account first');
fixture.token=fixture.webToken;fixture.deviceUuid=fixture.webDeviceUuid;
const output=path.resolve('../output/recommendation-check-20261106');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext();
const checks=[];
await context.addCookies([{name:'moodify_token',value:fixture.token,url:'http://localhost:38100'},{name:'moodify_role',value:'USER',url:'http://localhost:38100'}]);
await context.addInitScript(f=>{
  localStorage.setItem('moodify.auth.session',JSON.stringify({accessToken:f.token,refreshToken:'isolated-fixture',accessTokenExpiresAt:Date.now()+4*3600000,refreshTokenExpiresAt:Date.now()+8*3600000}));
  localStorage.setItem('moodify_user_tour_completed_2','true');
  localStorage.setItem('accessToken',f.token);localStorage.setItem('moodify_device_uuid',f.deviceUuid);
  localStorage.setItem('moodify.auth.user',JSON.stringify({id:2,userId:2,username:'rec_test_2',fullName:'Recommendation test 2',email:'test2@example.invalid',role:'USER',status:'ACTIVE'}));
  const Audio=window.Audio;window.fixtureAudios=[];
  window.Audio=class extends Audio { constructor(...args){ super(...args);window.fixtureAudios.push(this); } };
},fixture);
const page=await context.newPage();
let homeRequests=0;
let expiredHomeRequest=0;
let expireNextHome=false;
await page.route('**/api/recommendations/home',async route=>{
  homeRequests++;const response=await route.fetch();
  if(expireNextHome && response.ok()){
    expireNextHome=false;
    expiredHomeRequest=homeRequests;
    const body=await response.json();body.expiresAt=new Date(Date.now()-31*60000).toISOString();
    await route.fulfill({response,json:body});
  }else await route.fulfill({response});
});
try {
  await page.goto('http://localhost:38100/dashboard');
  await page.getByTitle('Xem hướng dẫn sử dụng',{exact:true}).waitFor({timeout:20000});
  await page.getByLabel('Gợi ý cá nhân',{exact:true}).waitFor();
  assert.equal(await page.locator('a[href="/dashboard/recommendations"]:visible').count(),0);
  checks.push('recommendations are integrated in Home without a separate navigation entry');
  expireNextHome=true;
  await page.reload();
  await page.getByRole('button',{name:/^Phát /}).first().waitFor({timeout:30000});
  checks.push('authenticated FREE account reaches recommendation sections');
  console.log('Slate fixture state',{homeRequests,expiredHomeRequest,expireNextHome});
  const [queue]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/playback/queues') && r.request().method()==='POST'), page.getByRole('button',{name:/^Phát /}).first().click()]);
  assert.equal(queue.status(),200);assert(expiredHomeRequest>0 && homeRequests>expiredHomeRequest,`expired 30-minute slate must refresh before queue (${homeRequests}/${expiredHomeRequest})`);
  checks.push('expired slate refreshes before playback');
  // FREE accounts may play the existing 30-second preroll before the song starts.
  await page.waitForFunction(()=>window.fixtureAudios.some(a=>a.currentSrc.includes('/stream') && !a.paused && a.currentTime>0),null,{timeout:65000});
  checks.push('actual HTMLAudioElement loads and advances public audio over the network');
  await page.getByRole('button',{name:/^Mở /}).first().click();
  await page.getByRole('button',{name:'Lưu bản sao',exact:true}).waitFor({timeout:20000});
  const copy=page.waitForResponse(r=>r.url().includes('/copies') && r.request().method()==='POST');
  await page.getByRole('button',{name:'Lưu bản sao',exact:true}).click();
  assert.equal((await copy).status(),200);
  await page.getByRole('status').filter({hasText:'Đã lưu bản sao'}).waitFor({timeout:15000});
  checks.push('mix detail copies a private playlist into the library');
  const refresh=page.waitForResponse(r=>r.url().endsWith('/refresh') && r.request().method()==='POST');
  await page.getByRole('button',{name:'Làm mới',exact:true}).click();
  assert([200,429].includes((await refresh).status()));
  checks.push('mix refresh succeeds or exposes the documented cooldown');
  await page.goto('http://localhost:38100/dashboard#for-you');
  await page.getByRole('button',{name:/^Ẩn Fixture /}).first().waitFor();
  const [feedback]=await Promise.all([
    page.waitForResponse(r=>r.url().endsWith('/feedback') && r.request().method()==='PUT'),
    page.getByRole('button',{name:/^Ẩn Fixture /}).first().click()
  ]);assert.equal(feedback.status(),200);
  await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();
  checks.push('negative feedback and undo use the backend');
  await page.goto('http://localhost:38100/dashboard/search?q=fixture%20happy&mode=mood');
  await page.getByText(/Tìm được .*bài đạt ngưỡng phù hợp/).waitFor({timeout:20000});
  checks.push('FREE account can use emotion search without a VIP gate');
  await page.screenshot({path:path.join(output,'v13-web-e2e.png'),fullPage:true});
  fs.writeFileSync(path.join(output,'v13-web-e2e.json'),JSON.stringify({passed:checks.length,checks,fixtureOnly:true,actualPublicAudio:true},null,2));
  console.log(JSON.stringify({passed:checks.length,checks}));
} catch(error) {
  console.error('Audio state',await page.evaluate(()=>({captured:window.fixtureAudios.map(a=>({src:a.currentSrc,time:a.currentTime,paused:a.paused,error:a.error?.code})),elements:[...document.querySelectorAll('audio')].map(a=>({src:a.currentSrc,time:a.currentTime,paused:a.paused,error:a.error?.code}))})));
  await page.screenshot({path:path.join(output,'v13-web-e2e-failure.png'),fullPage:true}).catch(()=>{});
  console.error('Completed checks',checks);throw error;
} finally { await browser.close(); }
