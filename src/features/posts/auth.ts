import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { siteByKeyHash } from './repo';

/** Keys are random and long, so a plain SHA-256 is enough to store them by; no salt or slow hash needed. */
export const hashKey = (key: string): string => createHash('sha256').update(key).digest('hex');

export const generateKey = (): string => `cyk_${randomBytes(32).toString('base64url')}`;

export type AuthResult = 'ok' | 'unauthorized' | 'forbidden';

const bearer = (request: Request): string | null => {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
};

/** Whether the request carries an API key, and whether that key belongs to `siteId`. */
export async function authorize(request: Request, siteId: string): Promise<AuthResult> {
  const key = bearer(request);
  if (!key || key.length > 200) return 'unauthorized';
  const owner = await siteByKeyHash(hashKey(key));
  if (!owner) return 'unauthorized';
  return owner === siteId ? 'ok' : 'forbidden';
}

/** Whether the request carries `siteId`'s key, for public routes that show more to the site itself. */
export async function isSiteRequest(request: Request, siteId: string): Promise<boolean> {
  return bearer(request) !== null && (await authorize(request, siteId)) === 'ok';
}
