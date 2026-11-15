// Render the real room page and catalog with isolated room/media fixtures.
// PLAYWRIGHT_MODULE and PLAYWRIGHT_CHROMIUM_EXECUTABLE can select installed tools.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "test-results/karaoke-room-queue");
fs.mkdirSync(output, { recursive: true });
const sources = {
  react: "node_modules/react/cjs/react.development.js",
  "react/jsx-runtime": "node_modules/react/cjs/react-jsx-runtime.development.js",
  "react-dom": "node_modules/react-dom/cjs/react-dom.development.js",
  "react-dom/client": "node_modules/react-dom/cjs/react-dom-client.development.js",
  scheduler: "node_modules/scheduler/cjs/scheduler.development.js",
  "lucide-react": "node_modules/lucide-react/dist/cjs/lucide-react.js",
  room: "features/dashboard/karaoke/components/karaoke-room-page.tsx",
  "./karaoke-track-catalog": "features/dashboard/karaoke/components/karaoke-track-catalog.tsx",
};
const modules = Object.entries(sources).map(([id, file]) => {
  let code = fs.readFileSync(path.join(root, file), "utf8");
  if (file.endsWith(".tsx")) code = ts.transpileModule(code, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText;
  return `${JSON.stringify(id)}:function(module,exports,require){${code}\n}`;
});
const css = ["karaoke-room-page", "karaoke-track-catalog"].map((name, index) =>
  fs.readFileSync(path.join(root, `features/dashboard/karaoke/components/${name}.module.css`), "utf8")
    .replace(/\.([a-zA-Z_][\w-]*)/g, `.${index ? "catalog" : "room"}_$1`),
).join("\n");
const bundle = `
const process={env:{NODE_ENV:'development'}};
const factories={${modules.join(",\n")}},cache={};
const tracks=['3 Phải 6 Đừng','Anh Không Đòi Quà','Bài hát thứ ba'].map((title,i)=>({songId:'song-'+i,title,artist:'Nghệ sĩ',imageUrl:null,durationMs:180000}));
const room={id:30,name:'Hát cùng bạn bè',visibility:'PUBLIC',hostUserId:1,memberCount:2,maxMembers:6,
 canManage:!location.search.includes('member=1'),members:[{userId:1,name:'Chủ phòng',host:true},{userId:2,name:'Thành viên',host:false}],
 queue:tracks.slice(0,2).map((t,i)=>({...t,id:i+1,trackId:t.songId,requestedBy:i?'Thành viên':'Tôi',requestedByMe:i===0})),
 playback:{status:'IDLE',track:null,positionMs:0,version:0,serverTimeMs:0}};
window.calls=[];
const snapshot=()=>JSON.parse(JSON.stringify(room));
class KaraokeRoomApiError extends Error {}
const api={KaraokeRoomApiError,joinKaraokeRoom:async()=>snapshot(),fetchKaraokeRoom:async()=>snapshot(),
 fetchKaraokeTracks:async()=>({content:tracks,totalElements:3,totalPages:1}),
 addKaraokeRoomQueueItem:async(roomId,trackId)=>{window.calls.push(['add',trackId]);const t=tracks.find(t=>t.songId===trackId);room.queue.push({...t,id:3,trackId,requestedBy:'Tôi',requestedByMe:true});},
 removeKaraokeRoomQueueItem:async(roomId,id)=>{window.calls.push(['remove',id]);room.queue=room.queue.filter(t=>t.id!==id);},
 moveKaraokeRoomQueueItem:async(roomId,id,direction)=>{window.calls.push(['move',id,direction]);const i=room.queue.findIndex(t=>t.id===id),j=i+(direction==='UP'?-1:1);[room.queue[i],room.queue[j]]=[room.queue[j],room.queue[i]];},
 controlKaraokePlayback:async()=>{const next=room.queue.shift();room.playback={...room.playback,status:'PLAYING',track:{...next,instrumentalUrl:null},version:1};window.calls.push(['play',next.trackId]);return snapshot();}};
const voice={remoteVoices:[],speakingUserIds:[],audioInputDevices:[],selectedInputDeviceId:'',ready:false};
const pause=()=>{},router={push:()=>{},replace:()=>{}};
function require(id){
 if(cache[id])return cache[id].exports;
 if(id.endsWith('.module.css'))return new Proxy({},{get:(_,key)=>key==='__esModule'?false:(id.includes('track-catalog')?'catalog_':'room_')+key});
 if(id==='next/link')return ({children,...props})=>require('react').createElement('a',props,children);
 if(id==='next/navigation')return {useRouter:()=>router};
 if(id==='@/components/dashboard/player-context')return {usePlayer:()=>({pause})};
 if(id==='@/lib/api-client')return api;
 if(id==='../hooks/use-karaoke-room-live')return {useKaraokeRoomLive:()=>({connected:true})};
 if(id==='../hooks/use-mediasoup-room')return {useMediasoupRoom:()=>voice};
 if(id==='../hooks/use-karaoke-room-scoring')return {useKaraokeRoomScoring:()=>({})};
 if(id==='./karaoke-score-details')return ()=>null;
 if(!factories[id])throw Error('Missing fixture module '+id);
 const m={exports:{}};cache[id]=m;factories[id](m,m.exports,require);return m.exports;
}
const React=require('react');
require('react-dom/client').createRoot(document.getElementById('root')).render(React.createElement(require('room').default,{roomId:'30'}));
`;
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#110d18;color:#fff;font-family:Arial,sans-serif}button,input,select{font:inherit}${css}</style><div id="root"></div><script>${bundle}</script></html>`;
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  const rows = page.locator(".room_queueItem");
  const titles = () => rows.locator(".room_queueInfo strong").allTextContents();
  const add = page.getByRole("button", { name: "Thêm bài hát", exact: true });
  const addThirdSong = async () => {
    await add.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /Bài hát thứ ba/ }).click();
    await dialog.getByRole("button", { name: "Thêm vào hàng đợi" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".room_queueItem").length === 3);
    assert.ok(await add.isEnabled(), "add button remains available after adding a second own song");
  };
  await page.goto(url);
  await add.waitFor();
  assert.ok(await add.isEnabled(), "an existing request must not hide the add button");
  assert.ok(await page.getByRole("button", { name: "Chuyển 3 Phải 6 Đừng lên trên", exact: true }).isDisabled());
  assert.ok(await page.getByRole("button", { name: "Chuyển Anh Không Đòi Quà xuống dưới", exact: true }).isDisabled());
  await page.getByRole("button", { name: "Chuyển Anh Không Đòi Quà lên trên", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".room_queueInfo strong")?.textContent === "Anh Không Đòi Quà");
  assert.deepEqual(await titles(), ["Anh Không Đòi Quà", "3 Phải 6 Đừng"]);
  await page.getByRole("button", { name: "Chuyển Anh Không Đòi Quà xuống dưới", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".room_queueInfo strong")?.textContent === "3 Phải 6 Đừng");
  await addThirdSong();
  await add.click();
  await page.getByRole("dialog").getByRole("button", { name: /3 Phải 6 Đừng/ }).click();
  assert.ok(await page.getByRole("button", { name: "Bài này đã có trong hàng đợi của bạn" }).isDisabled(), "duplicate own songs are blocked");
  await page.getByRole("dialog").getByRole("button", { name: "Đóng", exact: true }).click();
  for (const width of [1512, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => {
      const card = document.querySelector('.room_queueCard').getBoundingClientRect();
      return [...document.querySelectorAll('.room_queueItem button')].some(el => {const r=el.getBoundingClientRect();return r.x<card.x || r.right>card.right;});
    }), false, `queue buttons fit at ${width}px`);
    await page.locator(".room_queueCard").screenshot({ path: path.join(output, `host-${width}.png`) });
  }
  await page.setViewportSize({ width: 1512, height: 1000 });
  await page.getByRole("button", { name: "Rút Bài hát thứ ba", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".room_queueItem").length === 2);
  assert.deepEqual(await titles(), ["3 Phải 6 Đừng", "Anh Không Đòi Quà"], "remove affects only selected request");
  await page.getByRole("button", { name: "Chuyển Anh Không Đòi Quà lên trên", exact: true }).click();
  await page.waitForFunction(() => document.querySelector(".room_queueInfo strong")?.textContent === "Anh Không Đòi Quà");
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.waitForFunction(() => window.calls.some(c => c[0] === "play"));
  assert.deepEqual(await page.evaluate(() => window.calls.find(c => c[0] === "play")), ["play", "song-1"]);
  await page.goto(url + "?member=1");
  await add.waitFor();
  assert.equal(await page.getByRole("button", { name: /^Chuyển .+ (lên trên|xuống dưới)$/ }).count(), 0, "ordinary members have no reorder controls");
  await addThirdSong();
  assert.equal(await page.getByRole("button", { name: "Rút Anh Không Đòi Quà", exact: true }).count(), 0, "members cannot remove another user's song");
  assert.deepEqual(errors, []);
  console.log("Karaoke queue UI passed: multiple requests, duplicate guard, host reorder, playback, individual removal, member permissions, desktop/mobile layout.");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
