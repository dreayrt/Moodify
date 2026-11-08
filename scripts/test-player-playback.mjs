/* Mount the real PlayerProvider in isolated Chromium. API/media doubles never contact application data.
 * Uses the installed React/TypeScript; provide playwright with NODE_PATH or PLAYWRIGHT_MODULE.
 * PLAYER_SOURCE optionally points to a before-fix copy to reproduce the regression.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const loadDependency = createRequire(import.meta.url);
const { chromium } = loadDependency(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(process.env.PLAYER_SOURCE || path.join(root, 'components/dashboard/player-context.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
}}).outputText;
const dependencies = {
  react: 'react/cjs/react.development.js',
  'react/jsx-runtime': 'react/cjs/react-jsx-runtime.development.js',
  'react-dom': 'react-dom/cjs/react-dom.development.js',
  'react-dom/client': 'react-dom/cjs/react-dom-client.development.js',
  scheduler: 'scheduler/cjs/scheduler.development.js',
};
const modules = Object.entries(dependencies).map(([id,file]) => `${JSON.stringify(id)}:function(module,exports,require){\n${fs.readFileSync(path.join(root,'node_modules',file),'utf8')}\n}`);
modules.push(`player:function(module,exports,require){\n${compiled}\n}`);
const bundle = `
const process={env:{NODE_ENV:'development'}};
const factories={${modules.join(',\n')}};
const cache={};
window.telemetry=[]; window.audios=[];
window.tracks=['A','B','C'].map(id=>({id,spotifyId:'external-'+id,name:id,artistName:'Fixture',durationMs:180000}));
const free={tier:'FREE',adPolicy:'FULL_ADS',adFreeDailyLimit:0,adIntervalAfterLimit:2,skipPolicy:'LIMITED',skipDailyLimit:6};
const api={FREE_ENTITLEMENTS:free,resolveTrackAudioUrl:t=>location.origin+'/audio/'+t.id+'.wav',
 getTrackStreamUrl:id=>location.origin+'/audio/'+id+'.wav',getBackendFileUrl:v=>v,
 fetchTrackById:async()=>null,fetchActiveAdCampaigns:async()=>[],recordAdImpression:async()=>{},
 fetchMySubscription:async()=>({isPremium:true,tier:'INDIVIDUAL_FULL',entitlements:{...free,tier:'INDIVIDUAL_FULL',adPolicy:'NO_ADS',skipPolicy:'UNLIMITED'}})};
const auth={recordPlatformVisit:()=>{},recordListeningSessionTelemetry:payload=>{
 window.telemetry.push(payload);
 if(window.deferTelemetry) return new Promise(resolve=>window.deferredTelemetry.push({payload,resolve}));
 return Promise.resolve({success:true,historyId:window.telemetry.length});
},pingDeviceStatus:async()=>{},revokeOtherDevices:async()=>{}};
function require(id){
 if(id==='@/lib/api-client')return api;
 if(id==='@/lib/auth/auth-client')return auth;
 if(id==='next/image')return ()=>null;
 if(id==='lucide-react')return {Crown:()=>null,Laptop:()=>null};
 if(cache[id])return cache[id].exports;
 const m={exports:{}};cache[id]=m;factories[id](m,m.exports,require);return m.exports;
}
const NativeAudio=window.Audio;
if(!location.search.includes('native=1')) {
 window.Audio=class extends EventTarget {
  constructor(){super();this._src='';this.currentTime=0;this.duration=180;this.paused=true;this.ended=false;this.readyState=0;this.seeking=false;this.playbackRate=1;window.audios.push(this);}
  set src(value){this._src=value;this.currentTime=0;this.readyState=0;this.ended=false;}
  get src(){return this._src;} get currentSrc(){return this._src;}
  load(){this.readyState=0;this.currentTime=0;this.ended=false;}
  metadata(){this.readyState=4;this.dispatchEvent(new Event('loadedmetadata'));this.dispatchEvent(new Event('canplay'));}
  play(){this.paused=false;this.ended=false;this.dispatchEvent(new Event('play'));this.dispatchEvent(new Event('playing'));
   if(window.deferPlay){return new Promise((resolve,reject)=>window.deferredPlay.push({resolve,reject}));}return Promise.resolve();}
  pause(){const was=this.paused;this.paused=true;if(!was)this.dispatchEvent(new Event('pause'));}
  tick(value){this.currentTime=value;this.dispatchEvent(new Event('timeupdate'));}
  finish(){this.currentTime=this.duration;this.paused=true;this.ended=true;this.dispatchEvent(new Event('ended'));}
 };
} else window.Audio=function(){const audio=new NativeAudio();window.audios.push(audio);return audio;};
window.music=()=>window.audios[window.audios.length-1];
const React=require('react'),dom=require('react-dom/client'),playerModule=require('player');
function Probe(){const state=playerModule.usePlayer();React.useLayoutEffect(()=>{window.player=state;});return null;}
window.mount=()=>{window.root=dom.createRoot(document.getElementById('root'));const tree=React.createElement(playerModule.PlayerProvider,null,React.createElement(Probe));window.root.render(location.search.includes('strict=1')?React.createElement(React.StrictMode,null,tree):tree);};
window.mount();
`;
function wave(seconds) {
  const rate=8000, length=rate*seconds*2, buffer=Buffer.alloc(44+length);
  buffer.write('RIFF',0);buffer.writeUInt32LE(36+length,4);buffer.write('WAVEfmt ',8);
  buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);
  buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);
  buffer.write('data',36);buffer.writeUInt32LE(length,40);return buffer;
}
const audioBytes=wave(8);
const server=http.createServer((req,res)=>{
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(bundle);return;}
  if(req.url.startsWith('/audio/')){res.setHeader('Content-Type','audio/wav');res.end(audioBytes);return;}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>');
});
async function run() {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  const passed=[];
  const base=`http://127.0.0.1:${server.address().port}`;
  const step=async(page,fn)=>{await page.evaluate(fn);await page.waitForTimeout(30);};
  async function check(name,callback,{native=false,saved=null,strict=false}={}) {
    const context=await browser.newContext(); const page=await context.newPage();
    try {
      if(saved)await page.addInitScript(value=>localStorage.setItem('moodify_playback_state',JSON.stringify(value)),saved);
      await page.goto(base+'/?native='+(native?'1':'0')+'&strict='+(strict?'1':'0'));
      await page.waitForFunction(()=>window.player?.isPremiumUser);
      await callback(page);passed.push(name);console.log('PASS '+name);
    } finally {await context.close();}
  }
  const start=async page=>step(page,()=>{player.playTrack(tracks[0],tracks);music().metadata();});
  try {
    await check('new track never inherits the previous position',async page=>{
      await start(page);await step(page,()=>music().tick(48));
      await step(page,()=>{player.playTrack(tracks[1],tracks);music().metadata();});
      assert.equal(await page.evaluate(()=>music().currentTime),0);
      assert.equal(await page.evaluate(()=>player.currentTime),0);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('moodify_playback_state')).currentTime),0);
    });
    if(process.argv.includes('--baseline'))return;
    await check('auto advance starts an already visited song at zero',async page=>{
      await start(page);await step(page,()=>{player.playTrack(tracks[1],tracks);music().metadata();music().tick(52);});
      await step(page,()=>{player.playTrack(tracks[0],tracks);music().metadata();});
      await step(page,()=>{music().finish();music().metadata();});
      assert.equal(await page.evaluate(()=>player.currentTrack.id),'B');
      assert.equal(await page.evaluate(()=>music().currentTime),0);
    });
    await check('pause and resume preserve the position of the current song',async page=>{
      await start(page);await step(page,()=>{music().tick(37);player.pause();});
      await step(page,()=>player.resume());assert.equal(await page.evaluate(()=>music().currentTime),37);
    });
    await check('shuffle without repeat visits each song once then stops',async page=>{
      await start(page);await step(page,()=>player.toggleShuffle());
      const visited=['A'];
      for(let i=0;i<2;i++) {
        await step(page,()=>{music().finish();music().metadata();});visited.push(await page.evaluate(()=>player.currentTrack.id));
        assert.equal(await page.evaluate(()=>music().currentTime),0);
      }
      assert.equal(new Set(visited).size,3);
      await step(page,()=>music().finish());assert.equal(await page.evaluate(()=>player.isPlaying),false);
    });
    await check('shuffle previous follows actual play order',async page=>{
      await start(page);await step(page,()=>player.toggleShuffle());
      await step(page,()=>{player.nextTrack();music().metadata();});const second=await page.evaluate(()=>player.currentTrack.id);
      await step(page,()=>{player.nextTrack();music().metadata();});
      await step(page,()=>{player.prevTrack();music().metadata();});assert.equal(await page.evaluate(()=>player.currentTrack.id),second);
      await step(page,()=>{player.prevTrack();music().metadata();});assert.equal(await page.evaluate(()=>player.currentTrack.id),'A');
    });
    await check('reload restores only the current song and stays paused',async page=>{
      await start(page);await step(page,()=>{music().tick(41);player.pause();});await page.reload();
      await page.waitForFunction(()=>window.player?.isPremiumUser);
      await step(page,()=>music().metadata());assert.equal(await page.evaluate(()=>music().currentTime),41);
      assert.equal(await page.evaluate(()=>player.isPlaying),false);
      await step(page,()=>{player.nextTrack();music().metadata();});
      assert.equal(await page.evaluate(()=>music().currentTime),0);
    });
    await check('a completed saved song reloads at zero without autoplay',async page=>{
      await start(page);await step(page,()=>{music().tick(180);player.pause();});await page.reload();
      await page.waitForFunction(()=>window.player?.isPremiumUser);
      await step(page,()=>music().metadata());
      assert.equal(await page.evaluate(()=>music().currentTime),0);assert.equal(await page.evaluate(()=>player.isPlaying),false);
    });
    await check('queue completion with repeat off stays stopped',async page=>{
      await step(page,()=>{player.playTrack(tracks[2],tracks);music().metadata();music().finish();});
      await step(page,()=>window.dispatchEvent(new Event('focus')));
      assert.equal(await page.evaluate(()=>player.currentTrack.id),'C');assert.equal(await page.evaluate(()=>player.isPlaying),false);
    });
    await check('previous restarts the song then navigates the actual history',async page=>{
      await start(page);await step(page,()=>{player.nextTrack();music().metadata();});
      await step(page,()=>{player.nextTrack();music().metadata();music().tick(25);});
      await step(page,()=>player.prevTrack());assert.equal(await page.evaluate(()=>player.currentTrack.id),'C');
      assert.equal(await page.evaluate(()=>music().currentTime),0);
      await step(page,()=>{player.prevTrack();music().metadata();});assert.equal(await page.evaluate(()=>player.currentTrack.id),'B');
      await step(page,()=>{player.prevTrack();music().metadata();});assert.equal(await page.evaluate(()=>player.currentTrack.id),'A');
    });
    await check('selecting an existing queue item updates the next index',async page=>{
      await start(page);await step(page,()=>{player.playTrack(tracks[1]);music().metadata();});
      await step(page,()=>{player.nextTrack();music().metadata();});assert.equal(await page.evaluate(()=>player.currentTrack.id),'C');
    });
    await check('one-song queue with repeat off stops and focus does not restart it',async page=>{
      await step(page,()=>{player.playTrack(tracks[0],[tracks[0]]);music().metadata();music().finish();});
      await step(page,()=>window.dispatchEvent(new Event('focus')));
      assert.equal(await page.evaluate(()=>player.isPlaying),false);
      assert.equal(await page.evaluate(()=>music().paused),true);
      assert.equal(await page.evaluate(()=>music().currentTime),0);
    });
    await check('repeat one and repeat all restart at zero',async page=>{
      await start(page);await step(page,()=>{player.toggleRepeat();player.toggleRepeat();});
      await step(page,()=>{music().tick(75);music().finish();music().metadata();});
      assert.equal(await page.evaluate(()=>player.currentTrack.id),'A');assert.equal(await page.evaluate(()=>music().currentTime),0);
      await step(page,()=>{player.toggleRepeat();player.toggleRepeat();});
      await step(page,()=>{player.playTrack(tracks[2],tracks);music().metadata();music().finish();music().metadata();});
      assert.equal(await page.evaluate(()=>player.currentTrack.id),'A');assert.equal(await page.evaluate(()=>music().currentTime),0);
    });
    await check('stale network retry cannot seek a newly selected song',async page=>{
      await start(page);await step(page,()=>{music().tick(66);music().dispatchEvent(new Event('error'));});
      await step(page,()=>{player.playTrack(tracks[1],tracks);music().metadata();});
      await page.waitForTimeout(1700);assert.equal(await page.evaluate(()=>music().currentTime),0);
      assert.equal(await page.evaluate(()=>player.currentTrack.id),'B');
    });
    await check('network retry on the same song keeps the position',async page=>{
      await start(page);await step(page,()=>{music().tick(29);music().dispatchEvent(new Event('error'));});
      await page.waitForTimeout(1600);await step(page,()=>music().metadata());
      assert.equal(await page.evaluate(()=>music().currentTime),29);
    });
    await check('pausing cancels pending network recovery',async page=>{
      await start(page);await step(page,()=>{music().tick(30);music().dispatchEvent(new Event('error'));player.pause();});
      await page.waitForTimeout(1700);assert.equal(await page.evaluate(()=>music().paused),true);
    });
    await check('the play-pause button also cancels pending network recovery',async page=>{
      await start(page);await step(page,()=>{music().tick(30);music().dispatchEvent(new Event('error'));player.togglePlay();});
      await page.waitForTimeout(1700);assert.equal(await page.evaluate(()=>music().paused),true);
    });
    await check('seek before metadata is loaded applies once and clamps invalid positions',async page=>{
      await step(page,()=>{player.playTrack(tracks[0],tracks);player.seek(22);music().metadata();});
      assert.equal(await page.evaluate(()=>music().currentTime),22);
      await step(page,()=>{player.seek(-20);player.seek(NaN);});assert.equal(await page.evaluate(()=>music().currentTime),0);
    });
    await check('an obsolete play rejection does not stop a newer selection',async page=>{
      await step(page,()=>{window.deferPlay=true;window.deferredPlay=[];player.playTrack(tracks[0],tracks);music().metadata();});
      await step(page,()=>{window.deferPlay=false;player.playTrack(tracks[1],tracks);music().metadata();});
      await step(page,()=>window.deferredPlay[0].reject(new DOMException('Interrupted','AbortError')));
      assert.equal(await page.evaluate(()=>player.isPlaying),true);
    });
    await check('ad completion starts the pending song at zero',async page=>{
      await start(page);await step(page,()=>{music().tick(63);player.triggerAd(true,tracks[1],tracks);});
      await step(page,()=>{window.audios[0].finish();music().metadata();});
      assert.equal(await page.evaluate(()=>player.currentTrack.id),'B');assert.equal(await page.evaluate(()=>music().currentTime),0);
    });
    await check('choosing another song during an ad only changes the pending track',async page=>{
      await start(page);await step(page,()=>{music().tick(35);player.triggerAd(true,tracks[1],tracks);});
      await step(page,()=>player.playTrack(tracks[2],tracks));
      assert.equal(await page.evaluate(()=>music().paused),true);
      await step(page,()=>{window.audios[0].finish();music().metadata();});
      assert.equal(await page.evaluate(()=>player.currentTrack.id),'C');assert.equal(await page.evaluate(()=>music().currentTime),0);
    });
    await check('skip limit refusal keeps the original playback session open',async page=>{
      await start(page);await step(page,()=>{
        api.fetchMySubscription=async()=>({isPremium:false,tier:'FREE',entitlements:{...free,adPolicy:'NO_ADS'}});
        window.dispatchEvent(new Event('moodify-subscription-updated'));
        const d=new Date();const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        localStorage.setItem('moodify_daily_'+key,JSON.stringify({tracks:1,skips:6}));
      });
      const before=await page.evaluate(()=>window.telemetry.find(x=>x.eventType==='PLAY').sessionKey);
      await step(page,()=>{music().tick(10);player.nextTrack();});
      assert.equal(await page.evaluate(()=>player.currentTrack.id),'A');
      assert.equal(await page.evaluate(()=>window.telemetry.some(x=>x.eventType==='SKIP_NEXT')),false);
      await step(page,()=>player.pause());
      assert.equal(await page.evaluate(()=>window.telemetry.filter(x=>x.eventType==='PAUSE').at(-1).sessionKey),before);
    });
    await check('rapid A-B-A telemetry responses cannot attach an older session',async page=>{
      await step(page,()=>{window.deferTelemetry=true;window.deferredTelemetry=[];player.playTrack(tracks[0],tracks);music().metadata();});
      await step(page,()=>{player.playTrack(tracks[1],tracks);music().metadata();player.playTrack(tracks[0],tracks);music().metadata();});
      await step(page,()=>{const old=window.deferredTelemetry.find(x=>x.payload.eventType==='PLAY');old.resolve({success:true,historyId:999});});
      await step(page,()=>{music().tick(1);player.pause();});
      const historyId=await page.evaluate(()=>window.telemetry.filter(x=>x.eventType==='PAUSE').at(-1)?.historyId);
      assert.notEqual(historyId,999);
    });
    await check('Strict Mode lifecycle does not restore the old song position on a new source',async page=>{
      await start(page);await step(page,()=>music().tick(48));
      await step(page,()=>{player.nextTrack();music().metadata();});
      assert.equal(await page.evaluate(()=>music().currentTime),0);
    },{strict:true});
    await check('native Chromium audio auto-advances a revisited track from the beginning',async page=>{
      await step(page,()=>player.playTrack(tracks[1],tracks));await page.waitForFunction(()=>music().readyState>=2);
      await step(page,()=>{music().currentTime=4;music().dispatchEvent(new Event('timeupdate'));});
      await step(page,()=>player.playTrack(tracks[0],tracks));await page.waitForFunction(()=>music().readyState>=2);
      await step(page,()=>{music().currentTime=music().duration-.15;});
      await page.waitForFunction(()=>player.currentTrack.id==='B'&&music().readyState>=2);
      assert.ok(await page.evaluate(()=>music().currentTime<1),'native next song must start near zero');
    },{native:true});
    console.log(JSON.stringify({passed:passed.length,checks:passed}));
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
