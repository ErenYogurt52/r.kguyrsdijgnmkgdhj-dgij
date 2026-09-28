// Vercel Function for /api/search. All API routes share server/vercel.js.
import { handle } from '../server/vercel.js';

export default { fetch: handle };
