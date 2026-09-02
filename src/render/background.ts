import type { Region } from '@/game/monsters';
import { TAU } from '@/util/math';
import type { Assets } from './assets';

type Decor = 'trees' | 'forest' | 'beach' | 'house' | 'snow' | 'desert' | 'ruins' | 'sky' | 'lava' | 'abyss';
const DECOR: Record<string, Decor> = { meadow: 'trees', fireflyforest: 'forest', shellbeach: 'beach', candlehouse: 'house', frostpeak: 'snow', sanddune: 'desert', ruins: 'ruins', skygarden: 'sky', dragonnest: 'lava', abyss: 'abyss' };

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function hash(i: number): number {
  let x = (i * 374761393 + 668265263) | 0;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function tileImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, y: number, h: number, w: number, offset: number): void {
  const tw = (img.naturalWidth / img.naturalHeight) * h;
  let x = -((offset % tw) + tw) % tw;
  for (; x < w; x += tw) ctx.drawImage(img, x, y, tw + 0.5, h);
}

/**
 * Draws sky, parallax layers and the ground strip for a region in screen space.
 * `scroll` is the world distance walked (px); layers move at different fractions of it.
 */
export function drawBackground(ctx: CanvasRenderingContext2D, region: Region, w: number, h: number, groundY: number, scroll: number, time: number, assets: Assets, hue: number): void {
  const far = assets.image(`bg_${region.id}_far`);
  const near = assets.image(`bg_${region.id}_near`);
  const groundImg = assets.image(`ground_${region.id}`);
  ctx.save();
  if (hue) ctx.filter = `hue-rotate(${hue}deg)`;
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, shade(region.sky, -30));
  sky.addColorStop(1, shade(region.sky, 25));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, groundY + 2);
  const decor = DECOR[region.id] ?? 'trees';
  const dark = decor === 'forest' || decor === 'house' || decor === 'lava' || decor === 'abyss';
  // sun / moon
  ctx.fillStyle = dark ? 'rgba(230,235,255,0.85)' : 'rgba(255,245,200,0.9)';
  ctx.beginPath();
  ctx.arc(w * 0.78 - scroll * 0.02, groundY * 0.22, dark ? 18 : 26, 0, TAU);
  ctx.fill();
  if (dark) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 40; i++) {
      const sx = ((hash(i) * w * 2 - scroll * 0.03) % (w + 20) + w + 20) % (w + 20) - 10;
      const sy = hash(i + 100) * groundY * 0.7;
      const tw = 0.5 + Math.sin(time * 2 + i) * 0.5;
      ctx.globalAlpha = 0.3 + tw * 0.6;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  if (far) tileImage(ctx, far, 0, groundY, w, scroll * 0.2);
  else drawFarLayer(ctx, region, decor, w, groundY, scroll * 0.2);
  if (near) tileImage(ctx, near, groundY * 0.35, groundY * 0.65 + 4, w, scroll * 0.5);
  else drawNearLayer(ctx, region, decor, w, groundY, scroll * 0.5, time);
  // ground
  const gh = h - groundY;
  if (groundImg) tileImage(ctx, groundImg, groundY, gh, w, scroll);
  else {
    const g = ctx.createLinearGradient(0, groundY, 0, h);
    g.addColorStop(0, shade(region.ground, 20));
    g.addColorStop(0.12, region.ground);
    g.addColorStop(0.13, shade(region.ground, -40));
    g.addColorStop(1, shade(region.ground, -80));
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY, w, gh);
    // ground detail moving with scroll
    ctx.fillStyle = shade(region.ground, -25);
    const period = 46;
    let off = -((scroll % period) + period) % period;
    for (let x = off; x < w; x += period) {
      const i = Math.floor((x - off + scroll) / period);
      const r = hash(i);
      ctx.beginPath();
      ctx.ellipse(x + r * 20, groundY + 14 + r * (gh - 24), 6 + r * 10, 2.5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = shade(region.ground, 40);
    off = -((scroll % 18) + 18) % 18;
    for (let x = off; x < w; x += 18) {
      const i = Math.floor((x - off + scroll) / 18);
      if (hash(i + 7) < 0.4) continue;
      ctx.beginPath();
      ctx.moveTo(x, groundY + 1);
      ctx.lineTo(x + 2, groundY - 4 - hash(i + 3) * 4);
      ctx.lineTo(x + 4, groundY + 1);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFarLayer(ctx: CanvasRenderingContext2D, region: Region, decor: Decor, w: number, groundY: number, off: number): void {
  const col = shade(region.sky, -55);
  ctx.fillStyle = col;
  const period = 260;
  const start = -((off % period) + period) % period - period;
  for (let x = start; x < w + period; x += period) {
    const i = Math.floor((x - start + off) / period);
    const r = hash(i + 11);
    switch (decor) {
      case 'sky':
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        cloud(ctx, x + r * 100, groundY * (0.25 + r * 0.3), 60 + r * 40);
        break;
      case 'abyss':
        ctx.fillStyle = 'rgba(120,80,200,0.25)';
        ctx.beginPath();
        ctx.arc(x + r * 200, groundY * 0.5, 40 + r * 40, 0, TAU);
        ctx.fill();
        break;
      default: {
        ctx.fillStyle = col;
        const hgt = groundY * (0.25 + r * 0.3);
        ctx.beginPath();
        ctx.moveTo(x - 40, groundY);
        ctx.quadraticCurveTo(x + period * 0.25, groundY - hgt, x + period * 0.5, groundY - hgt * 0.6);
        ctx.quadraticCurveTo(x + period * 0.75, groundY - hgt * 0.9, x + period + 40, groundY);
        ctx.fill();
        if (decor === 'snow') {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.moveTo(x + period * 0.15, groundY - hgt * 0.75);
          ctx.quadraticCurveTo(x + period * 0.25, groundY - hgt, x + period * 0.4, groundY - hgt * 0.7);
          ctx.fill();
        }
      }
    }
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.arc(x, y, s * 0.3, 0, TAU);
  ctx.arc(x + s * 0.3, y - s * 0.12, s * 0.36, 0, TAU);
  ctx.arc(x + s * 0.65, y, s * 0.28, 0, TAU);
  ctx.fill();
}

function drawNearLayer(ctx: CanvasRenderingContext2D, region: Region, decor: Decor, w: number, groundY: number, off: number, time: number): void {
  const period = 150;
  const start = -((off % period) + period) % period - period;
  const base = shade(region.ground, -35);
  for (let x = start; x < w + period; x += period) {
    const i = Math.floor((x - start + off) / period);
    const r = hash(i + 23);
    const px = x + r * 60;
    ctx.fillStyle = base;
    ctx.strokeStyle = 'rgba(20,15,40,0.5)';
    ctx.lineWidth = 2;
    switch (decor) {
      case 'trees':
      case 'forest': {
        const th = 60 + r * 50;
        ctx.fillStyle = '#6b4a2b';
        ctx.fillRect(px - 5, groundY - th * 0.5, 10, th * 0.5);
        ctx.fillStyle = decor === 'forest' ? '#2f6a3a' : '#4caf50';
        ctx.beginPath();
        ctx.arc(px, groundY - th * 0.55, th * 0.35, 0, TAU);
        ctx.arc(px - th * 0.22, groundY - th * 0.4, th * 0.27, 0, TAU);
        ctx.arc(px + th * 0.22, groundY - th * 0.42, th * 0.28, 0, TAU);
        ctx.fill();
        if (decor === 'forest') {
          ctx.fillStyle = `rgba(200,255,107,${0.5 + Math.sin(time * 3 + i) * 0.4})`;
          ctx.beginPath();
          ctx.arc(px + Math.sin(time + i) * 20, groundY - 30 - Math.cos(time * 0.7 + i) * 15, 2.5, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'beach': {
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.moveTo(px - 80, groundY - 6);
        for (let k = 0; k <= 8; k++) ctx.lineTo(px - 80 + k * 20, groundY - 6 - Math.sin(time * 2 + k + i) * 4);
        ctx.lineTo(px + 80, groundY + 2);
        ctx.lineTo(px - 80, groundY + 2);
        ctx.fill();
        ctx.fillStyle = '#ffb086';
        ctx.beginPath();
        ctx.arc(px, groundY - 4, 6 + r * 4, Math.PI, 0);
        ctx.fill();
        break;
      }
      case 'house': {
        ctx.fillStyle = '#3a2f4f';
        ctx.fillRect(px - 40, groundY - 70, 80, 70);
        ctx.fillStyle = '#2a2140';
        ctx.beginPath();
        ctx.moveTo(px - 48, groundY - 70);
        ctx.lineTo(px, groundY - 105);
        ctx.lineTo(px + 48, groundY - 70);
        ctx.fill();
        ctx.fillStyle = `rgba(255,179,71,${0.6 + Math.sin(time * 6 + i) * 0.3})`;
        ctx.fillRect(px - 22, groundY - 52, 14, 16);
        ctx.fillRect(px + 8, groundY - 52, 14, 16);
        break;
      }
      case 'snow': {
        ctx.fillStyle = '#2f5d4a';
        for (let k = 0; k < 3; k++) {
          const s = 40 - k * 8;
          ctx.beginPath();
          ctx.moveTo(px - s, groundY - k * 22);
          ctx.lineTo(px, groundY - 40 - k * 22);
          ctx.lineTo(px + s, groundY - k * 22);
          ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(px - 12, groundY - 72);
        ctx.lineTo(px, groundY - 84);
        ctx.lineTo(px + 12, groundY - 72);
        ctx.fill();
        break;
      }
      case 'desert': {
        ctx.fillStyle = '#5faa4a';
        ctx.fillRect(px - 6, groundY - 60 - r * 20, 12, 60 + r * 20);
        ctx.fillRect(px - 26, groundY - 40, 10, 22);
        ctx.fillRect(px - 26, groundY - 40, 22, 9);
        ctx.fillRect(px + 16, groundY - 50, 10, 24);
        ctx.fillRect(px + 4, groundY - 50, 22, 9);
        break;
      }
      case 'ruins': {
        ctx.fillStyle = '#7c7c8c';
        ctx.fillRect(px - 10, groundY - 80 - r * 30, 20, 80 + r * 30);
        ctx.fillRect(px - 16, groundY - 84 - r * 30, 32, 8);
        ctx.fillStyle = '#64ffda';
        ctx.globalAlpha = 0.5 + Math.sin(time * 2 + i) * 0.3;
        ctx.fillRect(px - 3, groundY - 50, 6, 6);
        ctx.globalAlpha = 1;
        break;
      }
      case 'sky': {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        cloud(ctx, px - 30, groundY - 20 + Math.sin(time + i) * 3, 60);
        ctx.fillStyle = '#ffe082';
        ctx.beginPath();
        ctx.arc(px + 20, groundY - 30, 5, 0, TAU);
        ctx.fill();
        break;
      }
      case 'lava': {
        ctx.fillStyle = '#3a1a1a';
        ctx.beginPath();
        ctx.moveTo(px - 50, groundY);
        ctx.lineTo(px - 20, groundY - 70 - r * 30);
        ctx.lineTo(px + 10, groundY - 40);
        ctx.lineTo(px + 50, groundY);
        ctx.fill();
        ctx.fillStyle = `rgba(255,82,82,${0.5 + Math.sin(time * 3 + i) * 0.3})`;
        ctx.fillRect(px - 20, groundY - 14, 40, 6);
        break;
      }
      case 'abyss': {
        ctx.fillStyle = '#2a2050';
        ctx.beginPath();
        ctx.moveTo(px - 18, groundY);
        ctx.lineTo(px - 6, groundY - 70 - r * 30);
        ctx.lineTo(px + 8, groundY - 30);
        ctx.lineTo(px + 20, groundY);
        ctx.fill();
        ctx.fillStyle = `rgba(179,136,255,${0.4 + Math.sin(time * 2 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(px - 4, groundY - 50 - r * 20, 4, 0, TAU);
        ctx.fill();
        break;
      }
    }
  }
}
