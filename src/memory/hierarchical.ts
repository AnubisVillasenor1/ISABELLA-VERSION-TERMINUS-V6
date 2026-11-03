import fs from 'node:fs';
import path from 'node:path';

export type MemoryScope = 'immediate' | 'session' | 'project' | 'territorial' | 'historical';

export interface MemoryEntry {
  scope: MemoryScope;
  key: string;
  value: unknown;
  createdAt: number;
  expiresAt: number | null;
}

export class HierarchicalMemory {
  private store = new Map<string, MemoryEntry>();
  private readonly filePath: string | null;

  constructor() {
    const mode = (process.env.ISABELLA_MEMORY_STORE ?? 'file').trim().toLowerCase();
    const vercel =
      (process.env.VERCEL ?? '').trim() !== '' || (process.env.VERCEL_ENV ?? '').trim() !== '';
    if (mode === 'file' && !vercel) {
      this.filePath = path.resolve(
        process.cwd(),
        process.env.ISABELLA_MEMORY_STORE_PATH ?? '.data/memory.json'
      );
      this.load();
    } else {
      this.filePath = null;
    }
  }

  private load(): void {
    if (!this.filePath) return;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as MemoryEntry[];
      for (const e of parsed) this.store.set(this.k(e.scope, e.key), e);
    } catch {
      // ignore
    }
  }

  private save(): void {
    if (!this.filePath) return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify([...this.store.values()], null, 2));
    } catch {
      // ignore
    }
  }

  private k(scope: MemoryScope, key: string): string {
    return `${scope}::${key}`;
  }

  set(scope: MemoryScope, key: string, value: unknown, ttlMs?: number): void {
    const now = Date.now();
    this.store.set(this.k(scope, key), {
      scope,
      key,
      value,
      createdAt: now,
      expiresAt: ttlMs ? now + ttlMs : null,
    });
    this.save();
  }

  get(scope: MemoryScope, key: string): MemoryEntry | null {
    const entry = this.store.get(this.k(scope, key));
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(this.k(scope, key));
      return null;
    }
    return entry;
  }

  list(scope?: MemoryScope): MemoryEntry[] {
    const now = Date.now();
    const out: MemoryEntry[] = [];
    for (const e of this.store.values()) {
      if (e.expiresAt && e.expiresAt < now) continue;
      if (scope && e.scope !== scope) continue;
      out.push(e);
    }
    return out;
  }

  clear(scope?: MemoryScope): void {
    if (!scope) {
      this.store.clear();
      this.save();
      return;
    }
    for (const [k, v] of this.store) {
      if (v.scope === scope) this.store.delete(k);
    }
    this.save();
  }
}

export const hierarchicalMemory = new HierarchicalMemory();
