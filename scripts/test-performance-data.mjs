import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';

function compile(file, globals = {}, imports = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => {
    assert.ok(id in imports, `Unexpected dependency ${id}`);
    return imports[id];
  }, console, Date, Promise, Map, Set, URLSearchParams, DOMException, Event, CustomEvent, ...globals }, { filename: file });
  return exports;
}
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let passed = 0;
async function check(name, run) { await run(); passed++; console.log('PASS ' + name); }

await check('read cache deduplicates concurrent callers and invalidates on mutation', async () => {
  const window = new EventTarget();
  const cache = compile('lib/session-read-cache.ts', { window });
  let calls = 0;
  const load = async () => ++calls;
  assert.deepEqual(await Promise.all(Array.from({ length: 12 }, () => cache.readSessionCached('list', 'user-a', load))), Array(12).fill(1));
  window.dispatchEvent(new Event('moodify-playlist-updated'));
  assert.equal(await cache.readSessionCached('list', 'user-a', load), 2);
  assert.equal(await cache.readSessionCached('list', 'user-b', load), 3);
  assert.equal(await cache.readSessionCached('list', 'user-b', load, -1), 3);
});
await check('expired/failed reads retry and obsolete promises cannot poison the new scope', async () => {
  const cache = compile('lib/session-read-cache.ts', { window: new EventTarget() });
  await assert.rejects(cache.readSessionCached('x', 'a', async () => { throw new Error('network'); }));
  assert.equal(await cache.readSessionCached('x', 'a', async () => 'retried', -1), 'retried');
  assert.equal(await cache.readSessionCached('x', 'a', async () => 'fresh'), 'fresh');
  const pending = defer();
  const old = cache.readSessionCached('pending', 'a', () => pending.promise);
  assert.equal(await cache.readSessionCached('pending', 'b', async () => 'account-b'), 'account-b');
  pending.resolve('account-a'); await old;
  assert.equal(await cache.readSessionCached('pending', 'b', async () => 'wrong'), 'account-b');
});

function authFixture() {
  const data = new Map();
  const window = new EventTarget();
  window.location = { protocol: 'http:' };
  window.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const requests = [];
  const auth = compile('lib/auth/auth-client.ts', {
    window, document: { cookie: '' }, process: { env: {} },
    console: { log() {}, warn() {}, error() {} },
    fetch: () => { const pending = defer(); requests.push(pending); return pending.promise; },
  }, { '../session-read-cache': { readSessionCached: (_key,_scope,load) => load(), invalidateSessionReads() {} }, './device-helper': { getCurrentDeviceUuid: () => 'fixture', getDeviceIdentity: () => ({ deviceUuid: 'fixture' }) } });
  const expired = (suffix = 'a') => ({ accessToken: 'expired-' + suffix, refreshToken: 'refresh-' + suffix, accessTokenExpiresAt: Date.now() - 1000, refreshTokenExpiresAt: Date.now() + 60_000 });
  const set = value => window.localStorage.setItem('moodify.auth.session', JSON.stringify(value));
  const response = (token = 'new-a') => ({ ok: true, status: 200, text: async () => JSON.stringify({ accessToken: token, refreshToken: 'rotated-' + token, expiresIn: 3600, refreshExpiresIn: 7200, userId: 1, fullName: 'Fixture', role: 'USER' }) });
  return { auth, requests, expired, set, response };
}
const forbidden = (payload) => ({ok:false,status:403,text:async()=>JSON.stringify(payload)});
const validFixtureSession = f => ({...f.expired(),accessToken:'valid-a',accessTokenExpiresAt:Date.now()+60_000});
await check('guest device ping performs no HTTP request',async()=>{
 const f=authFixture();assert.equal(await f.auth.pingDeviceStatus(),null);assert.equal(f.requests.length,0);
});
await check('stale saved session becomes guest without a device dialog',async()=>{
 const f=authFixture();f.set(validFixtureSession(f));let events=0;f.auth;
 // No profile has been verified in this page lifecycle.
 const profile=f.auth.getCurrentUser('valid-a');f.requests[0].resolve(forbidden({error:'DEVICE_REVOKED',message:'thiết bị'}));
 await assert.rejects(profile);assert.equal(f.auth.getStoredAuthSession(),null);assert.equal(f.auth.hasVerifiedAuthSession(),false);assert.equal(events,0);
});
await check('an unrelated 403 mentioning a device does not clear a valid session',async()=>{
 const f=authFixture();f.set(validFixtureSession(f));const profile=f.auth.getCurrentUser('valid-a');
 f.requests[0].resolve(forbidden({error:'ACCESS_DENIED',message:'Không có quyền xem thiết bị'}));
 await assert.rejects(profile);assert.ok(f.auth.getStoredAuthSession());
});
await check('verified session keeps auth on explicit revocation; stale response cannot clear a new login',async()=>{
 const f=authFixture();f.set(validFixtureSession(f));const profile=f.auth.getCurrentUser('valid-a');
 f.requests[0].resolve({ok:true,status:200,text:async()=>JSON.stringify({id:1,fullName:'Fixture'})});await profile;
 assert.equal(f.auth.hasVerifiedAuthSession(),true);
 const ping=f.auth.pingDeviceStatus();await new Promise(r=>setImmediate(r));f.requests[1].resolve(forbidden({error:'DEVICE_REVOKED'}));await ping;
 assert.ok(f.auth.getStoredAuthSession());
 const old=f.auth.getCurrentUser('valid-a');f.set({...validFixtureSession(f),accessToken:'new-account'});
 f.requests[2].resolve(forbidden({error:'DEVICE_REVOKED'}));await assert.rejects(old);
 assert.equal(f.auth.getStoredAuthSession().accessToken,'new-account');
});
await check('simultaneous expired-token callers perform one refresh', async () => {
  const f = authFixture(); f.set(f.expired());
  const callers = Array.from({ length: 20 }, () => f.auth.getValidAccessToken());
  assert.equal(f.requests.length, 1);
  f.requests[0].resolve(f.response());
  assert.deepEqual(await Promise.all(callers), Array(20).fill('new-a'));
});
await check('a late refresh cannot resurrect logout', async () => {
  const f = authFixture(); f.set(f.expired());
  const pending = f.auth.getValidAccessToken(); f.auth.clearAuthSession();
  f.requests[0].resolve(f.response());
  assert.equal(await pending, null); assert.equal(f.auth.getStoredAuthSession(), null);
});
for (const failed of [false, true]) await check('an obsolete refresh ' + (failed ? 'failure' : 'success') + ' preserves the new login', async () => {
  const f = authFixture(); f.set(f.expired());
  const pending = f.auth.getValidAccessToken();
  f.set({ ...f.expired('b'), accessToken: 'new-login', accessTokenExpiresAt: Date.now() + 60_000 });
  if (failed) f.requests[0].reject(new Error('old refresh rejected'));
  else f.requests[0].resolve(f.response());
  assert.equal(await pending, 'new-login');
  assert.equal(f.auth.getStoredAuthSession().accessToken, 'new-login');
});

await check('catalog exposes the first page early, bounds concurrency and preserves every queue entry in order', async () => {
  const deferred = Array.from({ length: 6 }, defer); const requests = []; let active = 0, maximum = 0;
  const { loadCatalog } = compile('lib/progressive-catalog.ts', {}, { '@/lib/api-client': { fetchTracks: ({ page = 0 }) => {
    requests.push(page); active++; maximum = Math.max(maximum, active);
    return deferred[page].promise.finally(() => active--);
  } } });
  const snapshots = []; const signal = new AbortController().signal;
  const pending = loadCatalog(undefined, signal, next => snapshots.push(next));
  const page = index => ({ content: [{ id: String(index) }], totalPages: 6, totalElements: 6 });
  deferred[0].resolve(page(0)); await new Promise(resolve => setImmediate(resolve));
  assert.equal(snapshots.length, 1); assert.equal(snapshots[0].complete, false);
  assert.deepEqual(requests, [0, 1, 2]);
  for (const index of [2, 1, 4, 3, 5]) { deferred[index].resolve(page(index)); await new Promise(resolve => setImmediate(resolve)); }
  const tracks = await pending;
  assert.deepEqual(Array.from(tracks, track => track.id), ['0', '1', '2', '3', '4', '5']);
  assert.ok(maximum <= 2); assert.equal(snapshots.at(-1).complete, true);
  const before = requests.length; await loadCatalog(undefined, signal, () => {}); assert.equal(requests.length, before);
});
await check('failed catalog pages reject queue completion and are retried instead of cached', async () => {
  let calls = 0;
  const { loadCatalog } = compile('lib/progressive-catalog.ts', {}, { '@/lib/api-client': { fetchTracks: async ({ page = 0 }) => {
    calls++; if (page === 1) throw new Error('missing page');
    return { content: [{ id: 'first' }], totalPages: 2, totalElements: 2 };
  } } });
  for (let i = 0; i < 2; i++) await assert.rejects(loadCatalog(undefined, new AbortController().signal, () => {}), /missing page/);
  assert.equal(calls, 4);
});
await check('an aborted catalog never publishes a late response', async () => {
  const first = defer(); const controller = new AbortController(); let published = 0;
  const { loadCatalog } = compile('lib/progressive-catalog.ts', {}, { '@/lib/api-client': { fetchTracks: () => first.promise } });
  const pending = loadCatalog(undefined, controller.signal, () => published++);
  controller.abort(); first.resolve({ content: [], totalPages: 1, totalElements: 0 });
  await assert.rejects(pending, { name: 'AbortError' }); assert.equal(published, 0);
});
console.log(JSON.stringify({ passed }));
