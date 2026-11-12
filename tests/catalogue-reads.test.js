import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api, bumpCatalogueReads} from '../src/api.js';

test('catalogue reads in the same epoch share one request, and a bump starts a new one', async () => {
  const original = global.fetch;
  global.sessionStorage = {getItem: () => ''};
  let n = 0;
  let releaseFirst;
  const gate = new Promise(resolve => {releaseFirst = resolve;});
  global.fetch = async (url) => {
    const id = ++n;
    if (id === 1) await gate;
    return new Response(JSON.stringify({id, url}), {status: 200, headers: {'Content-Type': 'application/json'}});
  };
  try {
    const sharedA = api('/products');
    const sharedB = api('/products');
    bumpCatalogueReads();
    const fresh = api('/products');
    assert.equal(n, 2);
    releaseFirst();
    const [a, b, c] = await Promise.all([sharedA, sharedB, fresh]);
    assert.equal(a.id, 1);
    assert.equal(b.id, 1);
    assert.equal(c.id, 2);
    assert.equal(n, 2);
  } finally {
    global.fetch = original;
  }
});
