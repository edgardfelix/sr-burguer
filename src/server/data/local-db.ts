import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createTreeDb, type Db } from './db';

/**
 * Banco local para desenvolvimento: um arquivo JSON em .data/db.json.
 * Lido a cada operação (o Next pode usar mais de um processo em dev) e gravado de forma atômica.
 * Os acessos ao disco são ignorados pelo rastreador do build: este arquivo nunca vai para o deploy.
 */
export function createLocalDb(file = join(/*turbopackIgnore: true*/ process.cwd(), '.data', 'db.json')): Db {
  const load = (): Record<string, unknown> => {
    if (!existsSync(/*turbopackIgnore: true*/ file)) return {};
    try {
      return JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, 'utf8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  };
  const save = (tree: Record<string, unknown>) => {
    mkdirSync(/*turbopackIgnore: true*/ dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(/*turbopackIgnore: true*/ tmp, JSON.stringify(tree, null, 2), 'utf8');
    renameSync(/*turbopackIgnore: true*/ tmp, file);
  };
  return createTreeDb('local', load, save);
}
