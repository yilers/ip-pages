// IPv4 memory-search adaptation of ip2region v3.18.0, Apache-2.0:
// https://github.com/lionsoul2014/ip2region/blob/v3.18.0/binding/javascript/searcher.js
const BASE = 256 + 256 * 256 * 8;
const INDEX = 14;
export function isIPv4(ip: string): boolean {
  const parts = ip.split('.');
  return parts.length === 4 && parts.every(p => /^(0|[1-9]\d{0,2})$/.test(p) && Number(p) <= 255);
}
export class Xdb {
  private view: DataView;
  readonly createdAt: number;
  readonly bytes: ArrayBuffer;
  constructor(bytes: ArrayBuffer) {
    this.bytes = bytes;
    if (bytes.byteLength < BASE + INDEX || bytes.byteLength > 25 * 1024 * 1024) throw new Error('invalid xdb size');
    this.view = new DataView(bytes);
    const version = this.view.getUint16(0, true);
    if (!(version === 2 || (version === 3 && this.view.getUint16(16, true) === 4 && this.view.getUint16(18, true) === 4))) throw new Error('unsupported IPv4 xdb');
    this.createdAt = this.view.getUint32(4, true);
    const start = this.view.getUint32(8, true), end = this.view.getUint32(12, true);
    if (start < BASE || end < start || end + INDEX > bytes.byteLength || (end - start) % INDEX !== 0) throw new Error('invalid xdb index');
  }
  search(ip: string): string {
    if (!isIPv4(ip)) throw new Error('invalid ip address');
    const b = ip.split('.').map(Number);
    const value = (((b[0]! * 256 + b[1]!) * 256 + b[2]!) * 256 + b[3]!) >>> 0;
    const offset = 256 + (b[0]! * 256 + b[1]!) * 8;
    const start = this.view.getUint32(offset, true), rawEnd = this.view.getUint32(offset + 4, true);
    const end = Math.min(rawEnd, this.view.getUint32(12, true));
    if (!start && !rawEnd) return '';
    if (rawEnd > this.view.getUint32(12, true) + INDEX) throw new Error('invalid xdb vector');
    if (start < BASE || end < start || end + INDEX > this.bytes.byteLength || (end - start) % INDEX) throw new Error('invalid xdb vector');
    let lo = 0, hi = (end - start) / INDEX;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2), p = start + mid * INDEX;
      if (value < this.view.getUint32(p, true)) hi = mid - 1;
      else if (value > this.view.getUint32(p + 4, true)) lo = mid + 1;
      else {
        const len = this.view.getUint16(p + 8, true), ptr = this.view.getUint32(p + 10, true);
        if (ptr + len > this.bytes.byteLength) throw new Error('invalid xdb region');
        return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(this.bytes, ptr, len));
      }
    }
    return '';
  }
}
export function fields(region: string) {
  const parts = region.split('|');
  const value = (i: number) => parts[i] && parts[i] !== '0' ? parts[i] : '暂无数据';
  return { country: value(0), province: value(1), city: value(2), isp: value(3) };
}
let browserDb: Promise<Xdb> | undefined;
export function loadBrowserDb(): Promise<Xdb> {
  if (!browserDb) browserDb = fetch('/data/ip2region.xdb').then(async r => { if (!r.ok) throw new Error('数据库加载失败'); return new Xdb(await r.arrayBuffer()); }).catch(e => { browserDb = undefined; throw e; });
  return browserDb;
}
