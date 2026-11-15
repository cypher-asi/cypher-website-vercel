import { OPENAPI } from '../_lib/openapi';
import { json, preflight } from '../_lib/http';

export function GET() {
  return json(OPENAPI, { cache: 'public' });
}

export const OPTIONS = preflight;
