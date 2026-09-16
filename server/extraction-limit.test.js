const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./server');
const id = '4aawyAB9vmqN3uQ7FjRGTy';

test('both routes share a limit; changing untrusted forwarded headers cannot bypass it', async t => {
  // Spoofed headers deliberately trigger the middleware's configuration warning.
  t.mock.method(console, 'error', () => {});
  let calls = 0;
  const app = createApp({extract: async () => {
    calls++;
    return {success:true,data:{url:`https://open.spotify.com/artist/${id}`,id,deviceType:'desktop',images:[{label:'profile photo',imagePath:'/images/test.jpg'}]}};
  }});
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (let n = 0; n < 6; n++) {
    const legacy = n % 2 === 0;
    const response = await fetch(base + (legacy ? '/api/extractbanner' : '/api/extractartwork'), {
      method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':`203.0.113.${n + 1}`},
      body:JSON.stringify({[legacy ? 'artistUrl' : 'spotifyUrl']:`https://open.spotify.com/artist/${id}`})
    });
    assert.equal(response.status, n < 5 ? 200 : 429);
    if (n === 5) {
      assert.ok(Number(response.headers.get('retry-after')) > 0);
      assert.equal((await response.json()).success, false);
    }
  }
  assert.equal(calls,5);
  assert.equal((await fetch(base + '/api/health')).status,200);
});
