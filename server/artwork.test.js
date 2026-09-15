const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const {parseSpotifyUrl,createArtworkService} = require('./artwork');
const {readMetadata,isSpotifyImage} = require('./artwork-network');
const {createBrowserBudget} = require('./browser-budget');
const id = '4aawyAB9vmqN3uQ7FjRGTy';
const cover = 'https://i.scdn.co/image/cover';
const banner = 'https://image-cdn-ak.spotifycdn.com/image/banner';
async function fixture(t, overrides={}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(),'artwork-test-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const calls=[];
  const request=async (url,opts)=>{
    calls.push(url);
    if (url.includes('open.spotify.com')) return {body:Buffer.from(`<meta content="Example &amp; Artist | Spotify" property="og:title"><meta property='og:image' content='${cover}'>`),headers:{}};
    assert.ok(opts.allow(url));
    return {body:Buffer.from(url),headers:{'content-type':'image/jpeg'}};
  };
  return {calls,directory,service:createArtworkService({directory,request,...overrides})};
}
test('normalizes supported links and rejects untrusted or unsupported inputs',()=>{
  for (const type of ['artist','album','track','playlist']) {
    assert.equal(parseSpotifyUrl(`spotify:${type}:${id}`).type,type);
    assert.equal(parseSpotifyUrl(`https://open.spotify.com/intl-es/${type}/${id}?si=x`).url,`https://open.spotify.com/${type}/${id}`);
  }
  for (const input of [null,{},'https://evilspotify.com/album/'+id,'https://open.spotify.com.evil.test/album/'+id,'https://open.spotify.com@localhost/album/'+id,'http://open.spotify.com/album/'+id,'https://open.spotify.com/episode/'+id,'https://open.spotify.com/album/../'+id]) assert.equal(parseSpotifyUrl(input),null);
  assert.equal(isSpotifyImage('https://i.scdn.co.evil.test/a'),false);
  assert.equal(isSpotifyImage('https://localhost/a'),false);
});
test('reads reordered, escaped and quoted metadata without matching arbitrary images',()=>{
  const data=readMetadata(`<meta content='A &quot;title&quot; &amp; B > C' property='og:title'><meta property="og:image" content="${cover}?a=1&amp;b=2"><img src="bad">`);
  assert.equal(data.title,'A "title" & B > C'); assert.equal(data.image,cover+'?a=1&b=2');
});
test('album, track and playlist extraction never use a browser',async t=>{
  const {service}=await fixture(t,{browser:()=>assert.fail('No browser for covers'),budget:{run:()=>assert.fail('No budget for covers')}});
  for (const type of ['album','track','playlist']) {
    const result=await service.processSpotifyUrl(`https://open.spotify.com/${type}/${id}`);
    assert.equal(result.success,true); assert.equal(result.data.images[0].label,`${type} cover`);
  }
});
test('cache and concurrent identical requests reuse work; expiry refreshes',async t=>{
  let clock=100;
  const {service,calls}=await fixture(t,{now:()=>clock,ttl:1000});
  const url=`https://open.spotify.com/album/${id}`;
  const results=await Promise.all([service.processSpotifyUrl(url),service.processSpotifyUrl(url)]);
  assert.deepEqual(results[0],results[1]); assert.equal(calls.length,2);
  await service.processSpotifyUrl(url,'mobile'); assert.equal(calls.length,2);
  clock=1200; await service.processSpotifyUrl(url); assert.equal(calls.length,4);
});
test('artist uses one browser and direct downloads, retaining separate banner and photo',async t=>{
  let browsers=0,charges=0;
  const {service,calls}=await fixture(t,{browser:async()=>{browsers++;return [{url:banner,label:'artist banner'}];},budget:{run:async fn=>{charges++;return fn();}}});
  const r=await service.processSpotifyUrl(`https://open.spotify.com/artist/${id}`,'mobile');
  assert.equal(r.success,true);assert.equal(browsers,1);assert.equal(charges,1);
  assert.deepEqual(r.data.images.map(i=>i.label),['artist banner','profile photo']);assert.ok(calls.includes(banner));
});
test('budget exhaustion still allows profile artwork and does not falsely label it a banner',async t=>{
  const {service}=await fixture(t,{budget:{run:async()=>{throw new Error('Banner extraction has reached its usage limit.');}},browser:()=>assert.fail('Budget blocked browser')});
  const r=await service.processSpotifyUrl(`https://open.spotify.com/artist/${id}`);
  assert.equal(r.success,true);assert.match(r.data.notice,/usage limit/);assert.equal(r.data.images[0].label,'profile photo');
});
test('failed downloads return an actionable error and have a cooldown',async t=>{
  let requests=0;
  const {service}=await fixture(t,{request:async url=>{requests++;if(url.includes('open.spotify'))return {body:Buffer.from(`<meta property="og:image" content="${cover}">`)};throw new Error('offline');}});
  const url=`https://open.spotify.com/album/${id}`;
  assert.equal((await service.processSpotifyUrl(url)).success,false);await service.processSpotifyUrl(url);assert.equal(requests,2);
});
test('budget persists across service restarts, counts failures and resets each day',async t=>{
  const {directory}=await fixture(t);const file=path.join(directory,'budget.json');let day='2026-09-15';let calls=0;
  const options={file,daily:2,monthly:4,now:()=>new Date(day)};
  await assert.rejects(createBrowserBudget(options).run(async()=>{calls++;throw new Error('network');}),/network/);
  await assert.rejects(createBrowserBudget(options).run(async()=>calls++),/usage limit/);
  day='2026-09-16';await createBrowserBudget(options).run(async()=>calls++);
  day='2026-09-17';await assert.rejects(createBrowserBudget(options).run(async()=>calls++),/usage limit/);assert.equal(calls,2);
});
test('malformed budget fails closed and zero budget disables browsers',async t=>{
  const {directory}=await fixture(t);const file=path.join(directory,'budget.json');await fs.writeFile(file,'bad');
  await assert.rejects(createBrowserBudget({file}).run(()=>assert.fail('should not run')));
  await assert.rejects(createBrowserBudget({file,daily:0}).run(()=>assert.fail('should not run')),/paused/);
});

test('artist portrait renditions collapse to the largest image without removing distinct assets',()=>{
  const {consolidateArtistImages}=require('./artwork-images');
  const hash='0123456789abcdef01234567';
  const small={sourceUrl:`https://i.scdn.co/image/ab67616100005174${hash}`,label:'artist image',width:320,height:320};
  const large={sourceUrl:`https://i.scdn.co/image/ab6761610000e5eb${hash}`,label:'profile photo',width:640,height:640};
  const different={...large,sourceUrl:'https://i.scdn.co/image/ab6761610000e5ebffffffffffffffffffffffff'};
  const header={sourceUrl:banner,label:'artist banner',width:1920,height:1080};
  for (const pair of [[small,large],[large,small]]) {
    const images=consolidateArtistImages([...pair,different,header]);
    assert.equal(images.length,3);assert.equal(images[0].width,640);assert.equal(images[0].label,'profile photo');
    assert.equal(images[2].label,'artist banner');
  }
});
test('image dimensions are read from bytes, including malformed-input fallback',()=>{
  const {imageDimensions}=require('./artwork-images');
  const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(640,16);png.writeUInt32BE(640,20);
  assert.deepEqual(imageDimensions(png),{width:640,height:640});
  const jpeg=Buffer.from([255,216,255,192,0,8,8,1,64,2,128,0]);
  assert.deepEqual(imageDimensions(jpeg),{width:640,height:320});
  assert.deepEqual(imageDimensions(Buffer.from('invalid')),{width:null,height:null});
});
test('extraction consolidates actual downloaded portrait sizes in the final result',async t=>{
  const hash='0123456789abcdef01234567';
  const small=`https://i.scdn.co/image/ab67616100005174${hash}`;
  const large=`https://i.scdn.co/image/ab6761610000e5eb${hash}`;
  const request=async url=>{
    if(url.includes('open.spotify'))return {body:Buffer.from(`<meta property="og:image" content="${large}">`)};
    const size=url===small?320:640;const bytes=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);bytes.writeUInt32BE(size,16);bytes.writeUInt32BE(size,20);
    return {body:bytes,headers:{'content-type':'image/png'}};
  };
  const {service}=await fixture(t,{request,browser:async()=>[{url:small,label:'artist image'}],budget:{run:fn=>fn()}});
  const result=await service.processSpotifyUrl(`https://open.spotify.com/artist/${id}`,'mobile');
  assert.equal(result.data.images.length,1);assert.equal(result.data.images[0].width,640);assert.equal(result.data.images[0].label,'profile photo');
});
