import type { JobPath, JobTier } from '@/game/jobs';

export type AnimName = 'idle' | 'walk' | 'attack' | 'cast' | 'hit' | 'death';

export interface SpriteDef {
  /** frame image paths per animation (relative to assets/) */
  frames: Partial<Record<AnimName, string[]>>;
  fps?: Partial<Record<AnimName, number>>;
  /** logical height in arena pixels (default 64) */
  height?: number;
  /** anchor as a fraction of the frame [x, y]; default bottom-center */
  anchor?: [number, number];
}

export interface Manifest {
  version: number;
  sprites: Record<string, SpriteDef>;
  images: Record<string, string>;
}

export const DEFAULT_FPS: Record<AnimName, number> = { idle: 4, walk: 8, attack: 12, cast: 8, hit: 8, death: 6 };

export const heroSpriteId = (job: JobPath | null, tier: JobTier): string => (job && tier > 0 ? `hero_${job}_${tier}` : 'hero_novice');

/**
 * Loads `assets/manifest.json` and every image it references.
 * When the manifest is missing (assets not generated yet) everything falls back to procedural drawing.
 */
export class Assets {
  manifest: Manifest | null = null;
  ready = false;
  total = 0;
  loaded = 0;
  private images = new Map<string, HTMLImageElement>();
  private missing = new Set<string>();

  get progress(): number {
    return this.total > 0 ? this.loaded / this.total : 1;
  }

  async load(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const base = import.meta.env.BASE_URL;
    try {
      const res = await fetch(`${base}assets/manifest.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      this.manifest = (await res.json()) as Manifest;
    } catch {
      this.manifest = null;
      this.ready = true;
      onProgress?.(0, 0);
      return;
    }
    const paths = new Set<string>();
    for (const def of Object.values(this.manifest.sprites)) for (const list of Object.values(def.frames)) for (const p of list ?? []) paths.add(p);
    for (const p of Object.values(this.manifest.images)) paths.add(p);
    this.total = paths.size;
    this.loaded = 0;
    const queue = [...paths];
    const workers = Array.from({ length: 8 }, async () => {
      while (queue.length) {
        const p = queue.shift()!;
        await this.loadImage(base, p);
        this.loaded++;
        onProgress?.(this.loaded, this.total);
      }
    });
    await Promise.all(workers);
    this.ready = true;
  }

  private loadImage(base: string, path: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.images.set(path, img);
        resolve();
      };
      img.onerror = () => {
        this.missing.add(path);
        resolve();
      };
      img.src = `${base}assets/${path}`;
    });
  }

  sprite(id: string): SpriteDef | null {
    return this.manifest?.sprites[id] ?? null;
  }

  hasSprite(id: string): boolean {
    const def = this.sprite(id);
    if (!def) return false;
    const idle = def.frames.idle ?? def.frames.walk;
    return !!idle && idle.length > 0 && this.images.has(idle[0]!);
  }

  frames(id: string, anim: AnimName): HTMLImageElement[] | null {
    const def = this.sprite(id);
    if (!def) return null;
    const list = def.frames[anim] ?? (anim === 'cast' ? def.frames.attack : anim === 'hit' ? def.frames.idle : anim === 'walk' ? def.frames.idle : anim === 'idle' ? def.frames.walk : undefined);
    if (!list || list.length === 0) return null;
    const out: HTMLImageElement[] = [];
    for (const p of list) {
      const img = this.images.get(p);
      if (img) out.push(img);
    }
    return out.length ? out : null;
  }

  image(id: string): HTMLImageElement | null {
    const p = this.manifest?.images[id];
    return p ? (this.images.get(p) ?? null) : null;
  }
}
