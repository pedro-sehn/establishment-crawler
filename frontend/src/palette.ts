// Pull a small color palette out of the logo (profile picture) client-side.
// The image is served same-origin via /api/proxy-image, so the canvas is not
// CORS-tainted and we can read its pixels.

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

// Perceived distance between two colors (cheap weighted RGB).
function distance(a: number[], b: number[]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
}

/**
 * Extract up to `count` dominant, visually distinct colors from an image URL.
 * Buckets pixels into a coarse grid, ranks by frequency, then greedily keeps
 * colors that are far enough apart so the palette isn't five shades of one hue.
 */
export function extractPalette(url: string, count = 6): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no 2d context"));
      ctx.drawImage(img, 0, 0, size, size);

      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, size, size).data;
      } catch (e) {
        return reject(e);
      }

      // Count colors quantized to a 16-level-per-channel grid.
      const buckets = new Map<number, { rgb: number[]; n: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 125) continue; // skip transparent pixels
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const cur = buckets.get(key);
        if (cur) {
          cur.rgb[0] += r;
          cur.rgb[1] += g;
          cur.rgb[2] += b;
          cur.n += 1;
        } else {
          buckets.set(key, { rgb: [r, g, b], n: 1 });
        }
      }

      const ranked = [...buckets.values()]
        .map((b) => ({ rgb: b.rgb.map((c) => Math.round(c / b.n)), n: b.n }))
        .sort((a, b) => b.n - a.n);

      const chosen: number[][] = [];
      const MIN_DIST = 1200; // keep swatches visually distinct
      for (const { rgb } of ranked) {
        if (chosen.every((c) => distance(c, rgb) > MIN_DIST)) chosen.push(rgb);
        if (chosen.length >= count) break;
      }
      // Backfill from the ranked list if distinctness left us short.
      for (const { rgb } of ranked) {
        if (chosen.length >= count) break;
        if (!chosen.includes(rgb)) chosen.push(rgb);
      }

      resolve(chosen.map(([r, g, b]) => toHex(r, g, b)));
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}
