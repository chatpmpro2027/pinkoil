// Minimal durable order store (JSON file, atomic writes). Swap for a real
// database when volume grows — the interface is intentionally tiny.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
const FILE = path.join(DATA_DIR, 'orders.json');

let cache = null;
let queue = Promise.resolve();

async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    cache = {};
  }
  return cache;
}

async function persist() {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(cache, null, 2));
  await rename(tmp, FILE);
}

// Serialise writes so concurrent webhooks can't clobber each other.
const serial = (fn) => (queue = queue.then(fn, fn));

export const getOrder = async (id) => (await load())[id] ?? null;

export const listOrders = async () =>
  Object.values(await load()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Inserts the order only if it doesn't exist yet. Returns true when inserted. */
export const insertOrderOnce = (order) =>
  serial(async () => {
    const orders = await load();
    if (orders[order.id]) return false;
    orders[order.id] = order;
    await persist();
    return true;
  });

export const updateOrder = (id, patch) =>
  serial(async () => {
    const orders = await load();
    if (!orders[id]) return null;
    orders[id] = { ...orders[id], ...patch, updatedAt: new Date().toISOString() };
    await persist();
    return orders[id];
  });
