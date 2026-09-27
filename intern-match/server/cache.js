// Small TTL cache: memory first, then JSON files on disk so a restart doesn't spend
// SearchApi credits again. Keys are hashed; values must be JSON-serialisable.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

export function createCache({ dir, ttlMs, now = () => Date.now() }) {
  const mem = new Map();
  const file = (h) => join(dir, `${h}.json`);
  const hash = (key) => createHash('sha256').update(key).digest('hex').slice(0, 40);

  async function get(key) {
    if (!ttlMs) return null;
    const h = hash(key);
    let hit = mem.get(h);
    if (!hit && dir) {
      try { hit = JSON.parse(await readFile(file(h), 'utf8')); mem.set(h, hit); } catch { hit = null; }
    }
    if (!hit) return null;
    if (now() - hit.savedAt > ttlMs) { mem.delete(h); return null; }
    return hit.value;
  }

  async function set(key, value) {
    if (!ttlMs) return;
    const h = hash(key);
    const entry = { savedAt: now(), value };
    mem.set(h, entry);
    if (mem.size > 500) mem.delete(mem.keys().next().value);
    if (!dir) return;
    try {
      await mkdir(dir, { recursive: true });
      const tmp = `${file(h)}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(entry));
      await rename(tmp, file(h));
    } catch (e) {
      console.warn('[cache] could not write to disk:', e.message);
    }
  }

  return { get, set };
}

// Per-user daily counter for searches that actually call SearchApi.
export function createDailyLimit({ limit, now = () => Date.now() }) {
  const day = () => new Date(now() + 7 * 3600e3).toISOString().slice(0, 10); // Vietnam day (UTC+7)
  let current = day();
  const used = new Map();
  const roll = () => { const d = day(); if (d !== current) { current = d; used.clear(); } };
  return {
    remaining(uid) { roll(); return Math.max(0, limit - (used.get(uid) || 0)); },
    take(uid) { roll(); used.set(uid, (used.get(uid) || 0) + 1); },
  };
}
