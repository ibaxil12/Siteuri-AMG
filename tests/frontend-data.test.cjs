const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {gzipSync} = require('node:zlib');
const vm = require('node:vm');
const {test} = require('node:test');

const payload = {count: 1, items: [{title: 'Anul I', type: 'anunt', url: 'https://example.com', date: '2026-09-30'}]};
function context(fetch, decompression = true) {
  const document = {addEventListener(){}, dispatchEvent(){}, getElementById(){return null}, querySelectorAll(){return []}, body: {dataset: {page: 'home'}}};
  const window = {addEventListener(){}, ...(decompression ? {DecompressionStream} : {})};
  const ctx = vm.createContext({document, window, fetch, Response, DecompressionStream, navigator: {}, localStorage: {getItem(){return null}}, console, URLSearchParams});
  vm.runInContext(readFileSync('docs/app.js', 'utf8'), ctx);
  return ctx;
}

test('loads gzip directly', async () => {
  const calls = [];
  const ctx = context(async url => {
    calls.push(url);
    return new Response(url === 'manual.json' ? '[]' : gzipSync(JSON.stringify(payload)));
  });
  assert.equal((await vm.runInContext('loadData()', ctx)).length, 1);
  assert.equal(calls.includes('data.json'), false);
});

for (const mode of ['unsupported', 'http-error', 'invalid-gzip']) {
  test(`loads plain JSON when gzip is ${mode}`, async () => {
    const calls = [];
    const ctx = context(async url => {
      calls.push(url);
      if (url === 'manual.json') return new Response('[]');
      if (url === 'data.json') return new Response(JSON.stringify(payload));
      return new Response('invalid gzip', {status: mode === 'http-error' ? 404 : 200});
    }, mode !== 'unsupported');
    assert.equal((await vm.runInContext('loadData()', ctx)).length, 1);
    assert.equal(calls.includes('data.json'), true);
  });
}

test('home shows a visible error when both indexes fail', async () => {
  const ctx = context(async () => new Response('', {status: 404}));
  const box = {innerHTML: 'Se încarcă…', querySelector(){return {}}};
  ctx.document.querySelectorAll = selector => selector === 'ol.results' ? [box] : [];
  ctx.console = {error(){}};
  vm.runInContext('renderShell=()=>{};applyTheme=()=>{};', ctx);
  await vm.runInContext('init()', ctx);
  assert.match(box.innerHTML, /Datele nu au putut fi încărcate/);
});

test('first-year news passes items before the target ID', async () => {
  const ctx = context();
  const box = {id: 'firstYearNews'};
  ctx.document.getElementById = id => id === box.id ? box : null;
  ctx.items = payload.items;
  ctx.renderCalls = [];
  vm.runInContext('loadData=async()=>items; renderList=(...args)=>renderCalls.push(args);', ctx);
  await vm.runInContext('initFirstYear()', ctx);
  ctx.box = box;
  await vm.runInContext('initFirstYearNewsOnly(box)', ctx);
  assert.equal(ctx.renderCalls.length, 2);
  for (const [items, target, limit] of ctx.renderCalls) {
    assert.equal(items.length, 1);
    assert.equal(target, box.id);
    assert.equal(limit, 6);
  }
});

test('loads JSON returned from the gzip URL when the server already decoded it', async () => {
  const calls = [];
  const ctx = context(async url => {
    calls.push(url);
    return new Response(url === 'manual.json' ? '[]' : JSON.stringify(payload));
  });
  assert.equal((await vm.runInContext('loadData()', ctx)).length, 1);
  assert.equal(calls.includes('data.json'), false);
});
