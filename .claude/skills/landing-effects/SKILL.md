---
name: landing-effects
description: Apply landing-effects canvas animations (ASCII art renderer, pixel reveal) to Svelte pages in resinsite. Use when the user wants to add visual effects, animated backgrounds, canvas art, ASCII rendering, or pixel-reveal transitions to any page or component.
---

# landing-effects

Zero-dependency canvas effects library. Installed at `node_modules/landing-effects`.

```ts
import { createAsciiRenderer, createPixelReveal } from 'landing-effects';
```

Both functions return a cleanup `() => void`. Always call it in `onMount`'s return.

---

## createAsciiRenderer

WebGL ASCII art with mouse parallax. Falls back to Canvas2D when `colorFn` is provided.

```ts
interface AsciiOptions {
  canvas: HTMLCanvasElement;
  imageSrc: string;
  chars?: string;           // default: ' .:-=+*#%@'
  fontSize?: number;        // default: 12
  fontFamily?: string;
  brightnessBoost?: number; // default: 1.0
  posterize?: number;
  parallaxStrength?: number; // mouse parallax intensity
  scale?: number;
  colorFn?: (luminance: number, distFromCenter: number) => string;
}
```

**Canvas sizing**: uses `canvas.getBoundingClientRect()` — CSS dimensions drive size, no need for explicit `width`/`height` attributes.

**Resin amber palette** (copy-paste ready):
```ts
colorFn: (lum, _dist) => {
  const r = Math.round(140 + lum * 115);
  const g = Math.round(80 + lum * 80);
  const b = Math.round(30 + lum * 40);
  return `rgba(${r},${g},${b},${0.25 + lum * 0.75})`;
}
```

**Forest green palette**:
```ts
colorFn: (lum, _dist) => {
  const r = Math.round(40 + lum * 60);
  const g = Math.round(80 + lum * 100);
  const b = Math.round(40 + lum * 50);
  return `rgba(${r},${g},${b},${0.2 + lum * 0.8})`;
}
```

---

## createPixelReveal

Block-by-block randomized image reveal with glitch refine phase.

```ts
interface PixelRevealOptions {
  canvas: HTMLCanvasElement;
  imageSrc: string;
  blockSize?: number;       // pixel block size, default: 20
  pixelsPerFrame?: number;  // reveal speed, default: 10
  glitchRegion?: number;    // 0–1, fraction for glitch phase
  delay?: number;           // ms before reveal starts
  onComplete?: () => void;
}
```

**Canvas sizing**: reads `canvas.width` / `canvas.height` HTML attributes directly — must set explicit attributes, not just CSS.

```svelte
<canvas bind:this={pixelCanvas} width="400" height="300"></canvas>
```

---

## Svelte 5 wiring pattern

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createAsciiRenderer, createPixelReveal } from 'landing-effects';

  let asciiCanvas: HTMLCanvasElement;
  let pixelCanvas: HTMLCanvasElement;

  onMount(() => {
    let cleanupAscii: (() => void) | undefined;
    let cleanupPixel: (() => void) | undefined;

    if (asciiCanvas) {
      cleanupAscii = createAsciiRenderer({
        canvas: asciiCanvas,
        imageSrc: '/images/fossils/fossil_dragonfly_amber.png',
        chars: ' ·:+%#',
        fontSize: 10,
        brightnessBoost: 1.6,
        parallaxStrength: 10,
        colorFn: (lum, _dist) => {
          const r = Math.round(140 + lum * 115);
          const g = Math.round(80 + lum * 80);
          const b = Math.round(30 + lum * 40);
          return `rgba(${r},${g},${b},${0.25 + lum * 0.75})`;
        }
      });
    }

    if (pixelCanvas) {
      cleanupPixel = createPixelReveal({
        canvas: pixelCanvas,
        imageSrc: '/images/fossils/fossil_ammonite.png',
        blockSize: 16,
        pixelsPerFrame: 12,
        delay: 300,
      });
    }

    return () => {
      cleanupAscii?.();
      cleanupPixel?.();
    };
  });
</script>

<!-- ASCII: CSS-driven sizing, low opacity, behind content -->
<canvas
  bind:this={asciiCanvas}
  class="absolute inset-0 w-full h-full"
  style="opacity: 0.28; pointer-events: none;"
  aria-hidden="true"
></canvas>

<!-- Pixel reveal: explicit width/height attributes required -->
<canvas
  bind:this={pixelCanvas}
  width="400"
  height="300"
  style="pointer-events: none;"
  aria-hidden="true"
></canvas>
```

---

## Available fossil images (`/static/images/fossils/`)

| File | Best use |
|------|----------|
| `fossil_dragonfly_amber.png` | Hero ASCII — detailed, amber-toned |
| `fossil_ammonite.png` | Pixel reveal — strong circular shape |
| `fossil_ammonite_brush.png` | ASCII — painterly texture |
| `fossil_trilobite_flat.png` | Section dividers |
| `fossil_trex_flat.png` | Bold accent, feature sections |

---

## Positioning tips

- **Behind phone mockup**: `absolute inset-0`, `z-10`; phone at `z-20`; annotations at `z-30`
- **Section background**: `absolute inset-0 w-full h-full overflow-hidden`, canvas inside with `opacity-20`
- **Decorative corner**: `absolute bottom-0 right-0`, fixed pixel dimensions, `opacity-30`
- Always add `pointer-events: none` and `aria-hidden="true"` to canvas elements
