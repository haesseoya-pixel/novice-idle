import { DEFAULT_FPS, type AnimName, type Assets } from './assets';

export interface DrawOpts {
  flip?: boolean;
  scale?: number;
  alpha?: number;
  /** 0..1 additive white flash (hit feedback) */
  flash?: number;
  /** rotation in radians around the anchor */
  rot?: number;
}

/**
 * Draws one frame of a generated sprite. Returns false when the sprite has no usable frames
 * so the caller can draw the procedural fallback instead.
 */
export function drawSprite(ctx: CanvasRenderingContext2D, assets: Assets, id: string, anim: AnimName, t: number, x: number, y: number, opts: DrawOpts = {}): boolean {
  const def = assets.sprite(id);
  const frames = assets.frames(id, anim);
  if (!def || !frames) return false;
  const fps = def.fps?.[anim] ?? DEFAULT_FPS[anim];
  let idx = Math.floor(Math.max(0, t) * fps);
  if (anim === 'death' || anim === 'attack' || anim === 'cast' || anim === 'hit') idx = Math.min(frames.length - 1, idx);
  else idx %= frames.length;
  const img = frames[idx]!;
  const scale = opts.scale ?? 1;
  const h = (def.height ?? 64) * scale;
  const w = (img.naturalWidth / Math.max(1, img.naturalHeight)) * h;
  const [ax, ay] = def.anchor ?? [0.5, 1];
  ctx.save();
  ctx.translate(x, y);
  if (opts.rot) ctx.rotate(opts.rot);
  if (opts.flip) ctx.scale(-1, 1);
  if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
  ctx.drawImage(img, -w * ax, -h * ay, w, h);
  if (opts.flash && opts.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= opts.flash * 0.9;
    ctx.drawImage(img, -w * ax, -h * ay, w, h);
  }
  ctx.restore();
  return true;
}
