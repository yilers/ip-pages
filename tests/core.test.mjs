import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Xdb, isIPv4, fields } from '../src/services/ip-query.ts';
import { onRequestGet as ipHandler } from '../functions/api/ip.ts';
import { onRequestGet as healthHandler } from '../functions/api/health.ts';
const base = 256 + 256 * 256 * 8;
function fixture() {
  const text = new TextEncoder().encode('测试国|测试省|测试市|测试运营商|ZZ');
  const buf = new ArrayBuffer(base + text.length + 14); const v = new DataView(buf), start = base + text.length;
  v.setUint16(0, 3, true); v.setUint16(16, 4, true); v.setUint16(18, 4, true); v.setUint32(8, start, true); v.setUint32(12, start, true);
  new Uint8Array(buf, base, text.length).set(text); v.setUint32(start, 0x72727200, true); v.setUint32(start+4, 0x727272ff, true); v.setUint16(start+8,text.length,true); v.setUint32(start+10,base,true);
  const ptr=256+(114*256+114)*8; v.setUint32(ptr,start,true); v.setUint32(ptr+4,start,true);
  return buf;
}
test('IPv4 validation and search', () => { assert.equal(isIPv4('114.114.114.114'), true); for (const x of ['1.2.3.256','1.2.3.4x','1.2.3','01.2.3.4','::1']) assert.equal(isIPv4(x), false); const db = new Xdb(fixture()); assert.equal(db.search('114.114.114.114'), '测试国|测试省|测试市|测试运营商|ZZ'); assert.equal(db.search('8.8.8.8'), ''); assert.equal(fields('中国|0').province, '暂无数据'); });
test('missing and corrupt databases are rejected', () => { assert.throws(() => new Xdb(new ArrayBuffer(0))); const b = fixture(); new DataView(b).setUint16(16, 6, true); assert.throws(() => new Xdb(b)); });
test('API authentication, validation, success and health', async () => {
  const env = { API_KEY: 'secret', ASSETS: { fetch: async () => new Response(fixture()) } };
  const call = (url, key) => ipHandler({request: new Request('https://example.com/api/ip'+url, {headers:key ? {'X-API-Key':key}: {}}), env});
  assert.equal((await call('?ip=114.114.114.114')).status, 401);
  assert.equal((await call('?ip=114.114.114.114','wrong')).status, 403);
  assert.equal((await call('?ip=999.1.1.1','secret')).status, 400);
  const response = await call('?ip=114.114.114.114','secret'); assert.equal(response.status, 200); const body = await response.json(); assert.equal(body.code, 200); assert.equal(body.data.region, '测试国|测试省|测试市|测试运营商|ZZ');
  assert.equal((await healthHandler({request:new Request('https://example.com/api/health'),env})).status, 200);
});
