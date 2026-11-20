import { randomBytes } from 'node:crypto';

/**
 * Interface mínima com a semântica do Firebase Realtime Database.
 * Serviços e repositórios usam apenas isto; os drivers (Firebase, arquivo local, memória) implementam.
 */
export interface Db {
  readonly kind: 'firebase' | 'local' | 'memory';
  get<T = unknown>(path: string): Promise<T | null>;
  set(path: string, value: unknown): Promise<void>;
  /** Atualização multi-caminho relativa a `path`; valor null remove o filho. */
  update(path: string, patch: Record<string, unknown>): Promise<void>;
  remove(path: string): Promise<void>;
  /** Leitura-modificação-escrita atômica. Retornar undefined aborta. */
  transaction<T>(path: string, fn: (current: T | null) => T | null | undefined): Promise<{ committed: boolean; value: T | null }>;
  newId(): string;
}

/** Remove undefined (o RTDB recusa) e objetos vazios (o RTDB não os guarda). Mantém null para remoções. */
export function cleanForDb(value: unknown, keepNull = false): unknown {
  if (value === undefined) return undefined;
  if (value === null) return keepNull ? null : undefined;
  if (Array.isArray(value)) {
    const items = value.map((v) => cleanForDb(v)).filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = cleanForDb(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return undefined;
  return value;
}

/** IDs ordenáveis no tempo, no estilo do push() do Firebase. */
const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
let lastPushTime = 0;
let lastRandom: number[] = [];

export function generatePushId(now = Date.now()): string {
  const duplicate = now === lastPushTime;
  lastPushTime = now;
  const timeChars: string[] = [];
  let t = now;
  for (let i = 7; i >= 0; i--) {
    timeChars[i] = PUSH_CHARS.charAt(t % 64);
    t = Math.floor(t / 64);
  }
  if (!duplicate) {
    const bytes = randomBytes(12);
    lastRandom = Array.from(bytes, (b) => b % 64);
  } else {
    let i = 11;
    while (i >= 0 && lastRandom[i] === 63) {
      lastRandom[i] = 0;
      i--;
    }
    if (i >= 0) lastRandom[i] = (lastRandom[i] ?? 0) + 1;
  }
  return timeChars.join('') + lastRandom.map((n) => PUSH_CHARS.charAt(n)).join('');
}

// ------------------------------------------------------------------ árvore JSON

type Tree = Record<string, unknown>;

const segments = (path: string) => path.split('/').filter(Boolean);

function readAt(root: Tree, path: string): unknown {
  let node: unknown = root;
  for (const s of segments(path)) {
    if (node === null || typeof node !== 'object') return null;
    node = (node as Tree)[s];
  }
  return node === undefined ? null : node;
}

function writeAt(root: Tree, path: string, value: unknown): Tree {
  const segs = segments(path);
  const cleaned = cleanForDb(value);
  if (segs.length === 0) return (cleaned && typeof cleaned === 'object' ? cleaned : {}) as Tree;
  const trail: Tree[] = [root];
  let node: Tree = root;
  for (const s of segs.slice(0, -1)) {
    const next = node[s];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) node[s] = {};
    node = node[s] as Tree;
    trail.push(node);
  }
  const last = segs[segs.length - 1] as string;
  if (cleaned === undefined) delete node[last];
  else node[last] = cleaned;
  // Poda nós vazios, como o RTDB.
  for (let i = trail.length - 1; i > 0; i--) {
    if (Object.keys(trail[i] as Tree).length === 0) delete (trail[i - 1] as Tree)[segs[i - 1] as string];
  }
  return root;
}

/** Driver genérico sobre uma árvore JSON (arquivo local ou memória). */
export function createTreeDb(kind: 'local' | 'memory', load: () => Tree, save: (tree: Tree) => void): Db {
  const clone = <T>(v: T): T => (v === null || v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));
  return {
    kind,
    async get<T>(path: string) {
      return clone(readAt(load(), path)) as T | null;
    },
    async set(path, value) {
      save(writeAt(load(), path, value));
    },
    async update(path, patch) {
      let tree = load();
      for (const [key, value] of Object.entries(patch)) tree = writeAt(tree, `${path}/${key}`, value);
      save(tree);
    },
    async remove(path) {
      save(writeAt(load(), path, null));
    },
    async transaction<T>(path: string, fn: (current: T | null) => T | null | undefined) {
      const tree = load();
      const current = clone(readAt(tree, path)) as T | null;
      const next = fn(current);
      if (next === undefined) return { committed: false, value: current };
      save(writeAt(tree, path, next));
      return { committed: true, value: clone(next) };
    },
    newId: () => generatePushId(),
  };
}

export function createMemoryDb(initial: Tree = {}): Db {
  let tree: Tree = JSON.parse(JSON.stringify(initial)) as Tree;
  return createTreeDb(
    'memory',
    () => tree,
    (next) => {
      tree = next;
    },
  );
}
