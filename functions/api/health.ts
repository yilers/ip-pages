import { database, json, type Env } from './_shared.ts';
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try { const db = await database(env, request.url); return json(200, 'success', { status: 'ok', database: 'loaded', createdAt: db.createdAt ? new Date(db.createdAt * 1000).toISOString() : null }); }
  catch { return json(503, 'database unavailable', { status: 'unavailable', database: 'unavailable' }); }
};
