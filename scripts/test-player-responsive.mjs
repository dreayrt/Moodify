// Render the real player and ad components with isolated player/API fixtures.
// No account, backend or real audio is used. Point PLAYWRIGHT_MODULE at Playwright if needed.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'test-results/player-responsive');
fs.mkdirSync(output, { recursive: true });
const sources = {
  react: 'node_modules/react/cjs/react.development.js',
  'react/jsx-runtime': 'node_modules/react/cjs/react-jsx-runtime.development.js',
  'react-dom': 'node_modules/react-dom/cjs/react-dom.development.js',
  'react-dom/client': 'node_modules/react-dom/cjs/react-dom-client.development.js',
  scheduler: 'node_modules/scheduler/cjs/scheduler.development.js',
  'lucide-react': 'node_modules/lucide-react/dist/cjs/lucide-react.js',
  player: 'components/dashboard/global-player.tsx',
  './ad-interstitial-banner': 'components/dashboard/ad-interstitial-banner.tsx',
};
const modules = Object.entries(sources).map(([id, file]) => {
  let code = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.tsx')) code = ts.transpileModule(code, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  }}).outputText;
  return `${JSON.stringify(id)}:function(module,exports,require){${code}\n}`;
});
const utilities = await postcss([tailwind({ base: root })]).process(
  '@import "tailwindcss" source(none); @source "./components/dashboard/global-player.tsx"; @source "./components/dashboard/ad-interstitial-banner.tsx";',
  { from: path.join(root, 'responsive-fixture.css') },
);
const css = utilities.css + fs.readFileSync(path.join(root, 'components/dashboard/global-player.module.css'), 'utf8');
const bundle = `
const process={env:{NODE_ENV:'development'}};
const factories={${modules.join(',\n')}},cache={};
let context;
function require(id){
 if(cache[id])return cache[id].exports;
 if(id==='./global-player.module.css')return new Proxy({},{get:(_,key)=>key==='__esModule'?false:key});
 if(id==='next/navigation')return {usePathname:()=>'/dashboard'};
 if(id==='next/link')return ({children,...props})=>require('react').createElement('a',props,children);
 if(id==='next/image')return ({fill,priority,sizes,...props})=>require('react').createElement('img',{...props,style:{width:'100%',height:'100%',objectFit:'cover'}});
 if(id==='./player-context')return {usePlayer:()=>require('react').useContext(context)};
 if(id==='@/lib/theme')return {useVipTheme:()=>({normalTheme:{playerBg:'bg-[#111020]',playerBorder:''},currentVipTheme:{accent:'#fbbf24'},vipButtonsEnabled:false,vipShellEnabled:false})};
 if(id==='@/lib/api-client')return {isTrackInLibrary:async()=>false,addToLibrary:async()=>{},removeFromLibrary:async()=>{}};
 if(id==='./track-action-menu')return props=>require('react').createElement('button',{className:props.className,'aria-label':'Thao tác bài hát'},'…');
 if(id==='./share-song-card-modal')return ()=>null;
 const m={exports:{}};cache[id]=m;factories[id](m,m.exports,require);return m.exports;
}
const React=require('react'); context=React.createContext(null);
window.calls=[];
function Fixture(){
 const [state,setState]=React.useState({currentTrack:{spotifyId:'fixture',name:'50 CUỘC GỌI NHỠ (feat. một tên bài hát rất dài để kiểm tra bố cục)',artistName:'TÌNH HÀ “SAY HI” · Nghệ sĩ có tên dài'},isPlayerBarHidden:false,isPlaying:true,isBuffering:false,currentTime:59,duration:240,volume:.7,isMuted:false,isAdPlaying:false,isPremiumUser:false,subTier:'FREE',adReason:null,adSecondsRemaining:4,adTotalDuration:15,playbackRate:1,isShuffle:false,repeatMode:'off'});
 window.patch=values=>setState(s=>({...s,...values}));
 const actions={setPlayerBarHidden:v=>window.patch({isPlayerBarHidden:v}),togglePlay:()=>window.patch({isPlaying:!state.isPlaying}),seek:v=>window.patch({currentTime:v}),setVolume:v=>window.patch({volume:v}),toggleMute:()=>window.patch({isMuted:!state.isMuted}),setPlaybackRate:v=>window.patch({playbackRate:v}),toggleShuffle:()=>window.patch({isShuffle:!state.isShuffle}),toggleRepeat:()=>window.patch({repeatMode:state.repeatMode==='off'?'all':'off'}),nextTrack:()=>window.calls.push('next'),prevTrack:()=>window.calls.push('previous'),skipAd:()=>window.patch({isAdPlaying:false})};
 return React.createElement(context.Provider,{value:{...state,...actions}},React.createElement(require('player').GlobalPlayerBar));
}
require('react-dom/client').createRoot(document.getElementById('root')).render(React.createElement(Fixture));
`;
const html = `<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${css}
body{margin:0;background:radial-gradient(ellipse at 70% 40%,#443060,#090b14 70%);color:#eee;font-family:Arial,sans-serif;min-height:100vh}main{padding:24px 20px;padding-bottom:calc(var(--moodify-player-height,160px) + 24px)}h1{font-size:24px}article{padding:20px;border:1px solid #ffffff15;border-radius:16px;margin:12px 0;background:#ffffff06}button,select,input{font:inherit}button{border:0}button:not([class*="bg-"]){background-color:transparent}.playButton{background:linear-gradient(135deg,#a855f7,#ec4899);color:white}.dock{background:#111020f5}.speed select{font-size:12px}.artist{font-size:11px}
</style><main><small style="color:#c084fc">KHÁM PHÁ THƯ VIỆN</small><h1>Từ kho nhạc Moodify</h1>${Array.from({length:6},(_,i)=>`<article>${i+1}　 Bài hát yêu thích<br><small style="color:#aaa">　　Moodify</small></article>`).join('')}</main><div id="root"></div><script>${bundle}</script></html>`;
const server=http.createServer((req,res)=>{
 const asset=path.join(root,'public',req.url.split('?')[0]);
 if(req.url.startsWith('/images/ads/')&&fs.existsSync(asset)) {res.setHeader('Content-Type','image/jpeg');res.end(fs.readFileSync(asset));return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
let checks=0;
try {
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.getByRole('region',{name:'Trình phát nhạc'}).waitFor();
 for(const [width,height] of [[320,568],[360,800],[375,812],[390,844],[412,924],[639,900],[640,900],[768,1024],[1023,768],[1024,768],[1440,900],[1920,1080],[568,320],[812,375]]) {
  await page.setViewportSize({width,height});
  for(const expanded of width<1024?[false,true]:[false]) {
   if(width<1024) {const toggle=page.getByRole('button',{name:'Tùy chọn trình phát'});if((await toggle.getAttribute('aria-expanded'))!==String(expanded))await toggle.click();}
   await page.waitForFunction(()=>Number.parseFloat(document.documentElement.style.getPropertyValue('--moodify-player-height'))>0);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const geometry=await page.evaluate(()=>{
    const dock=document.querySelector('section[aria-label="Trình phát nhạc"]'),rect=dock.getBoundingClientRect();
    const controls=[...dock.querySelectorAll('button,input,select')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map(el=>({label:el.getAttribute('aria-label'),rect:el.getBoundingClientRect().toJSON()}));
    return {overflow:document.documentElement.scrollWidth>innerWidth,dock:rect.toJSON(),controls,reserved:parseFloat(document.documentElement.style.getPropertyValue('--moodify-player-height')),seek:dock.querySelector('input[aria-label="Tiến độ bài hát"]').getBoundingClientRect().width,title:dock.querySelector('h4').getBoundingClientRect().width};
   });
   assert.equal(geometry.overflow,false,`page overflow at ${width}`);
   assert.ok(geometry.dock.x>=0&&geometry.dock.right<=width&&geometry.dock.y>=0&&geometry.dock.bottom<=height,`dock fits ${width}x${height}`);
   assert.ok(Math.abs(geometry.reserved-(height-geometry.dock.y))<=1,'reserved space follows dock');
   assert.ok(geometry.seek>100,`usable seek width at ${width}`);
   assert.ok(geometry.title>35,`track title visible at ${width}`);
   for(const {label,rect} of geometry.controls)assert.ok(rect.x>=geometry.dock.x-1&&rect.right<=geometry.dock.right+1,`${label} fits ${width}`);
   if(width<1024)for(const {rect} of geometry.controls.filter(c=>!['Tiến độ bài hát','Âm lượng','Tốc độ phát'].includes(c.label)))assert.ok(rect.width>=44&&rect.height>=44,'mobile tap targets');
   await page.screenshot({path:path.join(output,`${width}x${height}${expanded?'-options':''}.png`)});
   if(width===412&&!expanded)await page.getByRole('region',{name:'Trình phát nhạc'}).screenshot({path:path.join(output,'player-mobile.png')});
   checks++;
  }
 }
 await page.setViewportSize({width:412,height:924});
 if(await page.getByRole('button',{name:'Tùy chọn trình phát'}).getAttribute('aria-expanded')==='true')await page.getByRole('button',{name:'Tùy chọn trình phát'}).click();
 await page.getByRole('button',{name:'Tạm dừng',exact:true}).click();await page.getByRole('button',{name:'Phát nhạc',exact:true}).waitFor();
 await page.getByRole('button',{name:'Bài tiếp theo'}).click();assert.deepEqual(await page.evaluate(()=>window.calls),['next']);
 await page.getByRole('button',{name:'Phát ngẫu nhiên',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Phát ngẫu nhiên',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Tùy chọn trình phát'}).click();
 await page.getByLabel('Tốc độ phát').selectOption('1.5');assert.equal(await page.getByLabel('Tốc độ phát').inputValue(),'1.5');
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Tùy chọn trình phát'}).getAttribute('aria-expanded'),'false');
 await page.getByRole('button',{name:'Tùy chọn trình phát'}).click();await page.getByRole('button',{name:'Ẩn thanh phát nhạc',exact:true}).click();
 await page.getByRole('button',{name:'Mở thanh phát nhạc'}).click();await page.getByRole('region',{name:'Trình phát nhạc'}).waitFor();
 for(const tier of ['FREE','INDIVIDUAL_BASIC'])for(const width of [320,412,768,1440]) {
  await page.setViewportSize({width,height:924});await page.evaluate(tier=>window.patch({isAdPlaying:true,subTier:tier}),tier);
  const ad=page.getByRole('complementary');await ad.waitFor();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const a=await ad.boundingBox(),p=await page.getByRole('region',{name:'Trình phát nhạc'}).boundingBox();assert.ok(a.y+a.height<=p.y-8,`ad clears player at ${width}/${tier}: ${JSON.stringify({a,p,reserved:await page.evaluate(()=>document.documentElement.style.getPropertyValue('--moodify-player-height'))})}`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'ad does not overflow');
  assert.equal(await page.getByRole('button',{name:'Phát nhạc',exact:true}).isDisabled(),true);
  await page.screenshot({path:path.join(output,`${width}-ad-${tier}.png`)});checks++;
 }
 await page.setViewportSize({width:568,height:320});
 await page.getByRole('button',{name:'Tùy chọn trình phát'}).click();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const landscapeAd=await page.getByRole('complementary').boundingBox();assert.ok(landscapeAd.y>=0,'landscape ad stays inside viewport with options expanded');
 assert.deepEqual(errors,[]);console.log(`PASS: ${checks} responsive layouts, playback controls, options, hide/reopen, and ads. Screenshots: ${output}`);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
