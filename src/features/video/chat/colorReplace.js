function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = Math.min(Math.max(0, (max + min) / 2), 1);
  const d = Math.min(Math.max(0, max - min), 1);

  if (d === 0) {
    return [d, d, l];
  }

  let h;
  switch (max) {
    case r:
      h = Math.min(Math.max(0, (g - b) / d + (g < b ? 6 : 0)), 6);
      break;
    case g:
      h = Math.min(Math.max(0, (b - r) / d + 2), 6);
      break;
    case b:
      h = Math.min(Math.max(0, (r - g) / d + 4), 6);
      break;
    default:
      break;
  }
  h /= 6;

  let s = l > 0.5 ? d / (2 * (1 - l)) : d / (2 * l);
  s = Math.min(Math.max(0, s), 1);

  return [h, s, l];
}

function hslToRgb(h, s, l) {
  const hueToRgb = (pp, qq, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return pp + (qq - pp) * 6 * t;
    if (t < 1 / 2) return qq;
    if (t < 2 / 3) return pp + (qq - pp) * (2 / 3 - t) * 6;
    return pp;
  };

  if (s === 0) {
    const rgb = Math.round(Math.min(Math.max(0, 255 * l), 255));
    return [rgb, rgb, rgb];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(Math.min(Math.max(0, 255 * hueToRgb(p, q, h + 1 / 3)), 255)),
    Math.round(Math.min(Math.max(0, 255 * hueToRgb(p, q, h)), 255)),
    Math.round(Math.min(Math.max(0, 255 * hueToRgb(p, q, h - 1 / 3)), 255)),
  ];
}

function calculateColorBackground(color) {
  color = color.replace(/[^0-9a-f]/gi, '');
  if (color.length < 6) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }

  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'dark' : 'light';
}

function calculateColorReplacement(color, background) {
  const light = background === 'light';
  const factor = light ? 0.1 : -0.1;

  color = color.replace(/[^0-9a-f]/gi, '');
  if (color.length < 6) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }

  let r = parseInt(color.slice(0, 2), 16);
  let g = parseInt(color.slice(2, 4), 16);
  let b = parseInt(color.slice(4, 6), 16);
  const hsl = rgbToHsl(r, g, b);

  let l = light ? 1 - (1 - factor) * (1 - hsl[2]) : (1 + factor) * hsl[2];
  l = Math.min(Math.max(0, l), 1);

  const rgb = hslToRgb(hsl[0], hsl[1], l);
  r = rgb[0].toString(16);
  g = rgb[1].toString(16);
  b = rgb[2].toString(16);

  return `#${`00${r}`.slice(r.length)}${`00${g}`.slice(g.length)}${`00${b}`.slice(b.length)}`;
}

const colorCache = new Map();

export function calculateColor(color) {
  const darkenedMode = true;
  const cacheKey = `${color}:${darkenedMode}`;
  if (colorCache.has(cacheKey)) return colorCache.get(cacheKey);

  const colorRegex = /^#[0-9a-f]+$/i;
  if (!colorRegex.test(color)) return color;

  let bgColor;
  for (let i = 20; i >= 0; i--) {
    bgColor = calculateColorBackground(color);
    if (bgColor === 'light' && darkenedMode !== true) break;
    if (bgColor === 'dark' && darkenedMode === true) break;
    color = calculateColorReplacement(color, bgColor);
  }

  colorCache.set(cacheKey, color);
  if (colorCache.size > 1000) {
    colorCache.delete(colorCache.entries().next().value[0]);
  }
  return color;
}
