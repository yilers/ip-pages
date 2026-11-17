import { Xdb } from '../../src/services/ip-query.ts';
export interface Env { API_KEY?: string; ASSETS: Fetcher }
let cached: Xdb | undefined;
let loading: Promise<Xdb> | undefined;
export async function database(env: Env, url: string): Promise<Xdb> {
  if (cached) return cached;
  if (!loading) loading = (async () => {
    const response = await env.ASSETS.fetch(new Request(new URL('/data/ip2region.xdb', url)));
    if (!response.ok) throw new Error('database unavailable');
    return new Xdb(await response.arrayBuffer());
  })();
  try { cached = await loading; return cached; } finally { loading = undefined; }
}
export function json(code: number, message: string, data: unknown = null, status = code || 200) {
  return new Response(JSON.stringify({ code, message, data }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
