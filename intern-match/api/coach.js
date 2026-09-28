// Vercel Function for /api/coach. All API routes share server/vercel.js.
import { handle } from '../server/vercel.js';

export default { fetch: handle };
