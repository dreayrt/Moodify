// Approved bounded production journey; only reserved synthetic-account actions.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const output=path.resolve('../output/recommendation-seed-20261107');
const accounts=JSON.parse(fs.readFileSync(path.join(output,'credentials.private.json'),'utf8'));
const auth=accounts.calm;
assert(auth.username.startsWith('rec_seed_')&&auth.email.endsWith('@recommendation-seed.invalid'));
const login=await fetch('https://api.moodify.click/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({identifier:auth.username,password:auth.password,deviceUuid:auth.deviceUuid,deviceName:'SEED recommendation verification',platform:'WEB'})});
assert.equal(login.status,200);Object.assign(auth,await login.json());
fs.writeFileSync(path.join(output,'credentials.private.json'),JSON.stringify(accounts,null,2));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const checks=[];const telemetry=[];let blockedAdImpressions=0;
const exp=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).exp*1000;
await context.addCookies([{name:'moodify_token',value:auth.accessToken,url:'https://moodify.click'},
  {name:'moodify_role',value:'USER',url:'https://moodify.click'}]);
await context.addInitScript(a=>{
  const expiry=t=>JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp*1000;
  localStorage.setItem('moodify.auth.session',JSON.stringify({accessToken:a.accessToken,refreshToken:a.refreshToken,
    accessTokenExpiresAt:expiry(a.accessToken),refreshTokenExpiresAt:expiry(a.refreshToken)}));
  localStorage.setItem('moodify_device_uuid',a.deviceUuid);localStorage.setItem('accessToken',a.accessToken);
  localStorage.setItem(`moodify_user_tour_completed_${a.userId}`,'true');
  localStorage.setItem('moodify.auth.user',JSON.stringify({id:a.userId,userId:a.userId,username:a.username,
    fullName:'[SEED] Thích nhạc nhẹ',email:a.email,role:'USER',status:'ACTIVE'}));
  const OriginalAudio=window.Audio;window.seedObservedAudios=[];
  window.Audio=class extends OriginalAudio {constructor(...args){super(...args);window.seedObservedAudios.push(this);}};
},auth);
// Playback and recommendation APIs are real. Unrelated advertiser impressions
// are explicitly blocked so a synthetic journey cannot bill an ad campaign.
await context.route('**/api/ads/*/impression',route=>{blockedAdImpressions++;return route.abort();});
const page=await context.newPage();
page.on('response',async response=>{
  if(!response.url().endsWith('/api/analytics/listening-session'))return;
  try {
    const data=response.request().postDataJSON();const result=await response.json();
    telemetry.push({sessionKey:data.sessionKey,trackId:data.trackId,eventType:data.eventType,positionMs:data.positionMs,
      deviceType:data.deviceType,source:data.source,status:response.status(),historyId:result.historyId,success:result.success});
  } catch { /* A canceled observation is not fabricated as a successful event. */ }
});
try {
  assert(exp(auth.accessToken)>Date.now()+180000,'Seed login must remain valid for this bounded journey');
  await page.goto('https://moodify.click/dashboard',{waitUntil:'domcontentloaded',timeout:30000});
  const home=page.getByLabel('Gợi ý cá nhân',{exact:true});await home.waitFor({timeout:30000});
  assert.equal(await page.locator('a[href="/dashboard/recommendations"]:visible').count(),0);
  checks.push('recommendations integrated in Home without extra navigation');
  const play=home.getByRole('button',{name:/^Phát /}).first();await play.waitFor({timeout:20000});
  const queueResponse=page.waitForResponse(r=>r.url().endsWith('/api/playback/queues')&&r.request().method()==='POST',{timeout:30000});
  await play.click();assert.equal((await queueResponse).status(),200);checks.push('Home creates real production queue');
  await page.waitForFunction(()=>window.seedObservedAudios.some(a=>!a.paused&&a.currentTime>=8&&a.duration>90),null,{timeout:70000});
  checks.push('actual network audio decodes and advances at least eight seconds');
  const active=await page.evaluate(()=>{const a=window.seedObservedAudios.find(a=>!a.paused&&a.duration>90);return {seconds:a.currentTime,duration:a.duration};});
  await page.getByRole('button',{name:'Pause',exact:true}).first().click();
  await page.waitForFunction(()=>window.seedObservedAudios.filter(a=>a.duration>90).every(a=>a.paused),null,{timeout:5000});
  const pausedAt=await page.evaluate(()=>window.seedObservedAudios.find(a=>a.duration>90&&a.currentTime>0).currentTime);
  await page.waitForTimeout(2500);
  const stillAt=await page.evaluate(()=>window.seedObservedAudios.find(a=>a.duration>90&&a.currentTime>0).currentTime);
  assert(Math.abs(stillAt-pausedAt)<.3);checks.push('pause stops actual audio progress');
  await page.getByRole('button',{name:'Play',exact:true}).first().click();
  await page.waitForFunction(position=>window.seedObservedAudios.some(a=>!a.paused&&a.duration>90&&a.currentTime>position+5),pausedAt,{timeout:15000});
  checks.push('resume revalidates queue and advances actual audio');
  await page.getByRole('button',{name:'Pause',exact:true}).first().click();
  const hidden=home.getByRole('button',{name:/^Ẩn /}).first();
  const feedback=page.waitForResponse(r=>r.url().endsWith('/api/recommendations/feedback')&&r.request().method()==='PUT');
  await hidden.click();assert.equal((await feedback).status(),200);
  const undo=home.getByRole('button',{name:'Hoàn tác',exact:true});await undo.waitFor({timeout:5000});
  const undone=page.waitForResponse(r=>r.url().endsWith('/api/recommendations/feedback')&&r.request().method()==='PUT');
  await undo.click();assert.equal((await undone).status(),200);checks.push('UI hide and undo persist through real API');
  await page.waitForTimeout(1500);
  assert(telemetry.some(e=>e.eventType==='PLAY'&&e.success&&e.deviceType==='WEB'));
  assert(telemetry.some(e=>e.eventType==='HEARTBEAT'&&e.success));
  assert(telemetry.some(e=>e.eventType==='PAUSE'&&e.success));
  assert(telemetry.some(e=>e.eventType==='RESUME'&&e.success));
  const sessions=[...new Set(telemetry.map(e=>e.sessionKey))];assert.equal(sessions.length,1);
  checks.push('PLAY HEARTBEAT PAUSE RESUME reach production on one WEB session');
  await page.screenshot({path:path.join(output,'production-home-seed.png'),fullPage:true});
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({passed:checks.length,checks,telemetry,active,pausedSeconds:stillAt-pausedAt,
    blockedAdImpressions,syntheticAccountId:auth.userId,playbackApiMocked:false},null,2));
  console.log(JSON.stringify({passed:checks.length,oneSession:sessions.length,historyIds:[...new Set(telemetry.map(e=>e.historyId))],blockedAdImpressions}));
} catch(error) {
  await page.screenshot({path:path.join(output,'production-seed-failure.png'),fullPage:true}).catch(()=>{});
  fs.writeFileSync(path.join(output,'browser-failure.json'),JSON.stringify({checks,telemetry,error:String(error)},null,2));throw error;
} finally {await context.close();await browser.close();}
