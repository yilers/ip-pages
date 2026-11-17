import { isIPv4 } from '../../src/services/ip-query.ts';
import { json } from './_shared.ts';
export const onRequestGet: PagesFunction = ({ request }) => {
  const ip = request.headers.get('CF-Connecting-IP');
  return json(0, 'success', { ip: ip && isIPv4(ip) ? ip : null });
};
