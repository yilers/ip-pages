import { isIPv4 } from '../../src/services/ip-query.ts';
import { database, json, type Env } from './_shared.ts';
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const key = request.headers.get('X-API-Key');
  if (!key) return json(401, 'missing api key');
  if (!env.API_KEY) return json(503, 'service unavailable');
  const a = new TextEncoder().encode(key), b = new TextEncoder().encode(env.API_KEY);
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', a), crypto.subtle.digest('SHA-256', b)]);
  let diff = 0; const xa = new Uint8Array(x), ya = new Uint8Array(y);
  for (let i = 0; i < xa.length; i++) diff |= xa[i]! ^ ya[i]!;
  if (diff) return json(403, 'invalid api key');
  const ip = new URL(request.url).searchParams.get('ip');
  if (!ip || !isIPv4(ip)) return json(400, 'invalid ip address');
  try { const db = await database(env, request.url); return json(200, 'success', { ip, region: db.search(ip) }); }
  catch { return json(503, 'database unavailable'); }
};
