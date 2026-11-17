import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Xdb } from '../src/services/ip-query.ts';
try {
  const path = process.argv[2]; if (!path) throw new Error('missing file path');
  const buf = await readFile(path); const db = new Xdb(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  // Check every vector and every segment pointer, order and referenced UTF-8 region.
  const v = new DataView(db.bytes), min = 256 + 256 * 256 * 8, start = v.getUint32(8, true), end = v.getUint32(12, true);
  let previous = -1; const decoder = new TextDecoder('utf-8', { fatal: true });
  for (let p = start; p <= end; p += 14) {
    const low = v.getUint32(p, true), high = v.getUint32(p + 4, true), len = v.getUint16(p + 8, true), ptr = v.getUint32(p + 10, true);
    if (low > high || low <= previous || ptr < min || ptr + len > start) throw new Error(`invalid segment at ${p}`);
    decoder.decode(new Uint8Array(db.bytes, ptr, len)); previous = high;
  }
  for (let p = 256; p < min; p += 8) { const a = v.getUint32(p, true), b = v.getUint32(p + 4, true); if ((a || b) && (a < start || b > end + 14 || b < a || (a-start)%14 || (b-start)%14)) throw new Error(`invalid vector at ${p}`); }
  console.log(`有效 IPv4 XDB: ${buf.length} bytes, SHA256 ${createHash('sha256').update(buf).digest('hex')}`);
} catch (e) { console.error(`XDB 校验失败: ${e.message}`); process.exitCode = 1; }
