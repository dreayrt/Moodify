// Exercise the real menu and portaled dialogs with isolated API/player fixtures.
// Set PLAYWRIGHT_MODULE and PLAYWRIGHT_CHROMIUM_EXECUTABLE for a local browser.
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
const output = path.join(root, 'test-results/track-action-overlays');
fs.mkdirSync(output, { recursive: true });
const sources = {
  react: 'node_modules/react/cjs/react.development.js',
  'react/jsx-runtime': 'node_modules/react/cjs/react-jsx-runtime.development.js',
  'react-dom': 'node_modules/react-dom/cjs/react-dom.development.js',
  'react-dom/client': 'node_modules/react-dom/cjs/react-dom-client.development.js',
  scheduler: 'node_modules/scheduler/cjs/scheduler.development.js',
  'lucide-react': 'node_modules/lucide-react/dist/cjs/lucide-react.js',
  menu: 'components/dashboard/track-action-menu.tsx',
  './add-to-playlist-modal': 'components/dashboard/add-to-playlist-modal.tsx',
  './create-playlist-modal': 'components/dashboard/create-playlist-modal.tsx',
  './share-song-card-modal': 'components/dashboard/share-song-card-modal.tsx',
};
const modules = Object.entries(sources).map(([id, file]) => {
  let code = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.tsx')) code = ts.transpileModule(code, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  }}).outputText;
  return `${JSON.stringify(id)}:function(module,exports,require){${code}\n}`;
});
const { css } = await postcss([tailwind({ base: root })]).process(
  '@import "tailwindcss" source(none); @source "./components/dashboard/track-action-menu.tsx"; @source "./components/dashboard/add-to-playlist-modal.tsx"; @source "./components/dashboard/create-playlist-modal.tsx"; @source "./components/dashboard/share-song-card-modal.tsx";',
  { from: path.join(root, 'track-action-fixture.css') },
);
const bundle = `
const process={env:{NODE_ENV:'development'}};
const factories={${modules.join(',\n')}},cache={};
window.calls=[];
const playlist={id:'playlist-1',name:'Nhạc yêu thích',tracks:[]};
function require(id){
 if(cache[id])return cache[id].exports;
 if(id==='./realtime-lyrics')return {parseLyrics:()=>[]};
 if(id==='@/lib/api-client')return {
  isTrackInLibrary:async()=>false,addToLibrary:async()=>window.calls.push('like'),removeFromLibrary:async()=>window.calls.push('unlike'),
  fetchUserPlaylists:async()=>[playlist],
  addTrackToPlaylist:async(id,trackId)=>{window.calls.push(['add',id,trackId]);return playlist},
  createPlaylist:async data=>{window.calls.push(['create',data.name]);return {...playlist,id:'new-playlist',name:data.name}}
 };
 const m={exports:{}};cache[id]=m;factories[id](m,m.exports,require);return m.exports;
}
const React=require('react');
const track={id:'track-1',spotifyId:'track-1',name:'Con Tim Tan Vỡ',artistName:'Lưu Bích',durationMs:240000};
function Fixture(){
 return React.createElement('main',{style:{padding:24}},
  React.createElement('h1',null,'Moodify — kiểm tra thao tác bài hát'),
  React.createElement(require('menu').default,{track,isLiked:false}),
  React.createElement(require('menu').default,{track:{...track,name:'Tên bài hát rất dài để kiểm tra menu trên màn hình điện thoại'},isLiked:false,onRemoveFromPlaylist:()=>window.calls.push('remove')}));
}
require('react-dom/client').createRoot(document.getElementById('root')).render(React.createElement(Fixture));
`;
const html = `<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0;background:#111827;color:white;font-family:Arial,sans-serif}</style><div id="root"></div><script>${bundle}</script></html>`;
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
    ? route.continue() : route.abort());
  const visibleAction = page.getByTitle('Thêm vào Playlist', { exact: true });
  for (const [width, height] of [[1440, 900], [320, 568], [390, 844], [812, 375]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const trigger = page.getByRole('button', { name: 'Tùy chọn bài hát', exact: true }).first();
    await trigger.click();
    const panel = page.getByRole('group', { name: 'Thao tác bài hát', exact: true });
    await panel.waitFor();
    assert.equal(await panel.getByRole('button').count(), 4, 'only close, like, playlist and Story remain');
    assert.equal(await panel.getByRole('button', { name: /Xem lời bài hát|Hàng chờ|Tải MP3/i }).count(), 0,
      'removed actions are absent');
    const bounds = await panel.locator('..').boundingBox();
    assert.ok(bounds.x >= 15 && bounds.y >= 15 && bounds.x + bounds.width <= width - 15 && bounds.y + bounds.height <= height - 15,
      'menu fits the viewport');
    await page.screenshot({ path: path.join(output, `menu-${width}.png`), animations: 'disabled' });
    await panel.getByRole('button', { name: /^Yêu thích/ }).click();
    assert.equal(await panel.getByRole('button', { name: /^Bỏ yêu thích/ }).getAttribute('aria-pressed'), 'true');
    await panel.getByRole('button', { name: /^Bỏ yêu thích/ }).click();
    assert.ok(await page.evaluate(() => window.calls.includes('like') && window.calls.includes('unlike')),
      'like and unlike still reach the API');
    await visibleAction.click();
    const addDialog = page.getByRole('dialog', { name: 'Thêm vào Playlist', exact: true });
    await addDialog.waitFor();
    assert.equal(await visibleAction.isVisible(), false, 'menu hides while playlist dialog is open');
    await addDialog.getByRole('button', { name: /Nhạc yêu thích/ }).click();
    assert.ok(await page.evaluate(() => window.calls.some(c => c[0] === 'add' && c[1] === 'playlist-1')),
      'portaled dialog click adds the song without unmounting');
    await addDialog.getByRole('button', { name: 'Tạo playlist mới', exact: true }).click();
    const createDialog = page.getByRole('dialog', { name: 'Tạo danh sách phát mới', exact: true });
    await createDialog.getByRole('textbox').first().fill('Playlist kiểm tra');
    await createDialog.getByRole('button', { name: 'Tạo Playlist', exact: true }).click();
    await createDialog.waitFor({ state: 'detached' });
    assert.ok(await page.evaluate(() => window.calls.some(c => c[0] === 'add' && c[1] === 'new-playlist')),
      'new playlist automatically receives the song');
    await addDialog.getByRole('button', { name: 'Tạo playlist mới', exact: true }).click();
    await createDialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(await addDialog.isVisible(), true, 'cancel returns to playlist picker');
    await page.screenshot({ path: path.join(output, `playlist-${width}.png`) });
    await addDialog.getByRole('button', { name: 'Đóng hộp thoại Playlist', exact: true }).click();
    await visibleAction.waitFor({ state: 'visible' });

    await page.getByTitle('Tạo Story & Card bài hát', { exact: true }).click();
    const storyDialog = page.getByRole('dialog', { name: 'Tạo Story bài hát', exact: true });
    await storyDialog.waitFor();
    assert.equal(await visibleAction.isVisible(), false, 'menu hides while Story is open');
    if (width >= 1024) {
      await storyDialog.getByRole('button', { name: 'Vuông (1:1)', exact: true }).click();
      await storyDialog.getByRole('textbox').fill('Caption kiểm tra');
      assert.equal(await storyDialog.getByRole('textbox').inputValue(), 'Caption kiểm tra', 'Story remains editable');
      await page.screenshot({ path: path.join(output, `story-${width}.png`) });
    }
    await storyDialog.getByRole('button', { name: 'Đóng hộp thoại Story', exact: true }).click();
    await visibleAction.waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Đóng tùy chọn', exact: true }).click();
    const playlistTrigger = page.getByRole('button', { name: 'Tùy chọn bài hát', exact: true }).nth(1);
    await playlistTrigger.evaluate(el => { el.style.position = 'fixed'; el.style.bottom = '8px'; el.style.right = '8px'; });
    await playlistTrigger.click();
    const playlistBounds = await panel.locator('..').boundingBox();
    assert.ok(playlistBounds.x >= 15 && playlistBounds.y >= 15 && playlistBounds.x + playlistBounds.width <= width - 15 && playlistBounds.y + playlistBounds.height <= height - 15,
      'menu with optional removal action fits near bottom right');
    await panel.getByTitle('Xóa khỏi playlist', { exact: true }).click();
    assert.ok(await page.evaluate(() => window.calls.includes('remove')), 'playlist removal still works');
    assert.equal(await playlistTrigger.getAttribute('aria-expanded'), 'false', 'removal closes menu');
    await trigger.click();
    await page.keyboard.press('Escape');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false', 'Escape still dismisses menu');
    await trigger.click();
    await page.mouse.click(width - 5, height - 5);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false', 'outside click still dismisses menu');
    console.log(`PASS ${width}x${height}: three-action layout, favorites, playlist, create/cancel, Story, removal, dismissal`);
  }
  assert.deepEqual(errors, [], 'no browser runtime errors');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
