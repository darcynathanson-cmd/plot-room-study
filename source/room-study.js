(()=>{
  'use strict';
  /* gifenc 1.0.3. The MIT License (MIT)
Copyright (c) 2017 Matt DesLauriers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
 */
  const GIFCodec=(()=>{const exports={};
var __defProp = Object.defineProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", {value: true});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {get: all[name], enumerable: true});
};

// src/index.js
__markAsModule(exports);
__export(exports, {
  GIFEncoder: () => GIFEncoder,
  applyPalette: () => applyPalette,
  default: () => src_default,
  nearestColor: () => nearestColor,
  nearestColorIndex: () => nearestColorIndex,
  nearestColorIndexWithDistance: () => nearestColorIndexWithDistance,
  prequantize: () => prequantize,
  quantize: () => quantize,
  snapColorsToPalette: () => snapColorsToPalette
});

// src/constants.js
var constants_default = {
  signature: "GIF",
  version: "89a",
  trailer: 59,
  extensionIntroducer: 33,
  applicationExtensionLabel: 255,
  graphicControlExtensionLabel: 249,
  imageSeparator: 44,
  signatureSize: 3,
  versionSize: 3,
  globalColorTableFlagMask: 128,
  colorResolutionMask: 112,
  sortFlagMask: 8,
  globalColorTableSizeMask: 7,
  applicationIdentifierSize: 8,
  applicationAuthCodeSize: 3,
  disposalMethodMask: 28,
  userInputFlagMask: 2,
  transparentColorFlagMask: 1,
  localColorTableFlagMask: 128,
  interlaceFlagMask: 64,
  idSortFlagMask: 32,
  localColorTableSizeMask: 7
};

// src/stream.js
function createStream(initialCapacity = 256) {
  let cursor = 0;
  let contents = new Uint8Array(initialCapacity);
  return {
    get buffer() {
      return contents.buffer;
    },
    reset() {
      cursor = 0;
    },
    bytesView() {
      return contents.subarray(0, cursor);
    },
    bytes() {
      return contents.slice(0, cursor);
    },
    writeByte(byte) {
      expand(cursor + 1);
      contents[cursor] = byte;
      cursor++;
    },
    writeBytes(data, offset = 0, byteLength = data.length) {
      expand(cursor + byteLength);
      for (let i = 0; i < byteLength; i++) {
        contents[cursor++] = data[i + offset];
      }
    },
    writeBytesView(data, offset = 0, byteLength = data.byteLength) {
      expand(cursor + byteLength);
      contents.set(data.subarray(offset, offset + byteLength), cursor);
      cursor += byteLength;
    }
  };
  function expand(newCapacity) {
    var prevCapacity = contents.length;
    if (prevCapacity >= newCapacity)
      return;
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
    if (prevCapacity != 0)
      newCapacity = Math.max(newCapacity, 256);
    const oldContents = contents;
    contents = new Uint8Array(newCapacity);
    if (cursor > 0)
      contents.set(oldContents.subarray(0, cursor), 0);
  }
}

// src/lzwEncode.js
var BITS = 12;
var DEFAULT_HSIZE = 5003;
var MASKS = [
  0,
  1,
  3,
  7,
  15,
  31,
  63,
  127,
  255,
  511,
  1023,
  2047,
  4095,
  8191,
  16383,
  32767,
  65535
];
function lzwEncode(width, height, pixels, colorDepth, outStream = createStream(512), accum = new Uint8Array(256), htab = new Int32Array(DEFAULT_HSIZE), codetab = new Int32Array(DEFAULT_HSIZE)) {
  const hsize = htab.length;
  const initCodeSize = Math.max(2, colorDepth);
  accum.fill(0);
  codetab.fill(0);
  htab.fill(-1);
  let cur_accum = 0;
  let cur_bits = 0;
  const init_bits = initCodeSize + 1;
  const g_init_bits = init_bits;
  let clear_flg = false;
  let n_bits = g_init_bits;
  let maxcode = (1 << n_bits) - 1;
  const ClearCode = 1 << init_bits - 1;
  const EOFCode = ClearCode + 1;
  let free_ent = ClearCode + 2;
  let a_count = 0;
  let ent = pixels[0];
  let hshift = 0;
  for (let fcode = hsize; fcode < 65536; fcode *= 2) {
    ++hshift;
  }
  hshift = 8 - hshift;
  outStream.writeByte(initCodeSize);
  output(ClearCode);
  const length = pixels.length;
  for (let idx = 1; idx < length; idx++) {
    next_block: {
      const c = pixels[idx];
      const fcode = (c << BITS) + ent;
      let i = c << hshift ^ ent;
      if (htab[i] === fcode) {
        ent = codetab[i];
        break next_block;
      }
      const disp = i === 0 ? 1 : hsize - i;
      while (htab[i] >= 0) {
        i -= disp;
        if (i < 0)
          i += hsize;
        if (htab[i] === fcode) {
          ent = codetab[i];
          break next_block;
        }
      }
      output(ent);
      ent = c;
      if (free_ent < 1 << BITS) {
        codetab[i] = free_ent++;
        htab[i] = fcode;
      } else {
        htab.fill(-1);
        free_ent = ClearCode + 2;
        clear_flg = true;
        output(ClearCode);
      }
    }
  }
  output(ent);
  output(EOFCode);
  outStream.writeByte(0);
  return outStream.bytesView();
  function output(code) {
    cur_accum &= MASKS[cur_bits];
    if (cur_bits > 0)
      cur_accum |= code << cur_bits;
    else
      cur_accum = code;
    cur_bits += n_bits;
    while (cur_bits >= 8) {
      accum[a_count++] = cur_accum & 255;
      if (a_count >= 254) {
        outStream.writeByte(a_count);
        outStream.writeBytesView(accum, 0, a_count);
        a_count = 0;
      }
      cur_accum >>= 8;
      cur_bits -= 8;
    }
    if (free_ent > maxcode || clear_flg) {
      if (clear_flg) {
        n_bits = g_init_bits;
        maxcode = (1 << n_bits) - 1;
        clear_flg = false;
      } else {
        ++n_bits;
        maxcode = n_bits === BITS ? 1 << n_bits : (1 << n_bits) - 1;
      }
    }
    if (code == EOFCode) {
      while (cur_bits > 0) {
        accum[a_count++] = cur_accum & 255;
        if (a_count >= 254) {
          outStream.writeByte(a_count);
          outStream.writeBytesView(accum, 0, a_count);
          a_count = 0;
        }
        cur_accum >>= 8;
        cur_bits -= 8;
      }
      if (a_count > 0) {
        outStream.writeByte(a_count);
        outStream.writeBytesView(accum, 0, a_count);
        a_count = 0;
      }
    }
  }
}
var lzwEncode_default = lzwEncode;

// src/rgb-packing.js
function rgb888_to_rgb565(r, g, b) {
  return r << 8 & 63488 | g << 2 & 992 | b >> 3;
}
function rgba8888_to_rgba4444(r, g, b, a) {
  return r >> 4 | g & 240 | (b & 240) << 4 | (a & 240) << 8;
}
function rgb888_to_rgb444(r, g, b) {
  return r >> 4 << 8 | g & 240 | b >> 4;
}

// src/pnnquant2.js
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
function sqr(value) {
  return value * value;
}
function find_nn(bins, idx, hasAlpha) {
  var nn = 0;
  var err = 1e100;
  const bin1 = bins[idx];
  const n1 = bin1.cnt;
  const wa = bin1.ac;
  const wr = bin1.rc;
  const wg = bin1.gc;
  const wb = bin1.bc;
  for (var i = bin1.fw; i != 0; i = bins[i].fw) {
    const bin = bins[i];
    const n2 = bin.cnt;
    const nerr2 = n1 * n2 / (n1 + n2);
    if (nerr2 >= err)
      continue;
    var nerr = 0;
    if (hasAlpha) {
      nerr += nerr2 * sqr(bin.ac - wa);
      if (nerr >= err)
        continue;
    }
    nerr += nerr2 * sqr(bin.rc - wr);
    if (nerr >= err)
      continue;
    nerr += nerr2 * sqr(bin.gc - wg);
    if (nerr >= err)
      continue;
    nerr += nerr2 * sqr(bin.bc - wb);
    if (nerr >= err)
      continue;
    err = nerr;
    nn = i;
  }
  bin1.err = err;
  bin1.nn = nn;
}
function create_bin() {
  return {
    ac: 0,
    rc: 0,
    gc: 0,
    bc: 0,
    cnt: 0,
    nn: 0,
    fw: 0,
    bk: 0,
    tm: 0,
    mtm: 0,
    err: 0
  };
}
function create_bin_list(data, format) {
  const bincount = format === "rgb444" ? 4096 : 65536;
  const bins = new Array(bincount);
  const size = data.length;
  if (format === "rgba4444") {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const a = color >> 24 & 255;
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const index = rgba8888_to_rgba4444(r, g, b, a);
      let bin = index in bins ? bins[index] : bins[index] = create_bin();
      bin.rc += r;
      bin.gc += g;
      bin.bc += b;
      bin.ac += a;
      bin.cnt++;
    }
  } else if (format === "rgb444") {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const index = rgb888_to_rgb444(r, g, b);
      let bin = index in bins ? bins[index] : bins[index] = create_bin();
      bin.rc += r;
      bin.gc += g;
      bin.bc += b;
      bin.cnt++;
    }
  } else {
    for (let i = 0; i < size; ++i) {
      const color = data[i];
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const index = rgb888_to_rgb565(r, g, b);
      let bin = index in bins ? bins[index] : bins[index] = create_bin();
      bin.rc += r;
      bin.gc += g;
      bin.bc += b;
      bin.cnt++;
    }
  }
  return bins;
}
function quantize(rgba, maxColors, opts = {}) {
  const {
    format = "rgb565",
    clearAlpha = true,
    clearAlphaColor = 0,
    clearAlphaThreshold = 0,
    oneBitAlpha = false
  } = opts;
  if (!rgba || !rgba.buffer) {
    throw new Error("quantize() expected RGBA Uint8Array data");
  }
  if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
    throw new Error("quantize() expected RGBA Uint8Array data");
  }
  const data = new Uint32Array(rgba.buffer);
  let useSqrt = opts.useSqrt !== false;
  const hasAlpha = format === "rgba4444";
  const bins = create_bin_list(data, format);
  const bincount = bins.length;
  const bincountMinusOne = bincount - 1;
  const heap = new Uint32Array(bincount + 1);
  var maxbins = 0;
  for (var i = 0; i < bincount; ++i) {
    const bin = bins[i];
    if (bin != null) {
      var d = 1 / bin.cnt;
      if (hasAlpha)
        bin.ac *= d;
      bin.rc *= d;
      bin.gc *= d;
      bin.bc *= d;
      bins[maxbins++] = bin;
    }
  }
  if (sqr(maxColors) / maxbins < 0.022) {
    useSqrt = false;
  }
  var i = 0;
  for (; i < maxbins - 1; ++i) {
    bins[i].fw = i + 1;
    bins[i + 1].bk = i;
    if (useSqrt)
      bins[i].cnt = Math.sqrt(bins[i].cnt);
  }
  if (useSqrt)
    bins[i].cnt = Math.sqrt(bins[i].cnt);
  var h, l, l2;
  for (i = 0; i < maxbins; ++i) {
    find_nn(bins, i, false);
    var err = bins[i].err;
    for (l = ++heap[0]; l > 1; l = l2) {
      l2 = l >> 1;
      if (bins[h = heap[l2]].err <= err)
        break;
      heap[l] = h;
    }
    heap[l] = i;
  }
  var extbins = maxbins - maxColors;
  for (i = 0; i < extbins; ) {
    var tb;
    for (; ; ) {
      var b1 = heap[1];
      tb = bins[b1];
      if (tb.tm >= tb.mtm && bins[tb.nn].mtm <= tb.tm)
        break;
      if (tb.mtm == bincountMinusOne)
        b1 = heap[1] = heap[heap[0]--];
      else {
        find_nn(bins, b1, false);
        tb.tm = i;
      }
      var err = bins[b1].err;
      for (l = 1; (l2 = l + l) <= heap[0]; l = l2) {
        if (l2 < heap[0] && bins[heap[l2]].err > bins[heap[l2 + 1]].err)
          l2++;
        if (err <= bins[h = heap[l2]].err)
          break;
        heap[l] = h;
      }
      heap[l] = b1;
    }
    var nb = bins[tb.nn];
    var n1 = tb.cnt;
    var n2 = nb.cnt;
    var d = 1 / (n1 + n2);
    if (hasAlpha)
      tb.ac = d * (n1 * tb.ac + n2 * nb.ac);
    tb.rc = d * (n1 * tb.rc + n2 * nb.rc);
    tb.gc = d * (n1 * tb.gc + n2 * nb.gc);
    tb.bc = d * (n1 * tb.bc + n2 * nb.bc);
    tb.cnt += nb.cnt;
    tb.mtm = ++i;
    bins[nb.bk].fw = nb.fw;
    bins[nb.fw].bk = nb.bk;
    nb.mtm = bincountMinusOne;
  }
  let palette = [];
  var k = 0;
  for (i = 0; ; ++k) {
    let r = clamp(Math.round(bins[i].rc), 0, 255);
    let g = clamp(Math.round(bins[i].gc), 0, 255);
    let b = clamp(Math.round(bins[i].bc), 0, 255);
    let a = 255;
    if (hasAlpha) {
      a = clamp(Math.round(bins[i].ac), 0, 255);
      if (oneBitAlpha) {
        const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
        a = a <= threshold ? 0 : 255;
      }
      if (clearAlpha && a <= clearAlphaThreshold) {
        r = g = b = clearAlphaColor;
        a = 0;
      }
    }
    const color = hasAlpha ? [r, g, b, a] : [r, g, b];
    const exists = existsInPalette(palette, color);
    if (!exists)
      palette.push(color);
    if ((i = bins[i].fw) == 0)
      break;
  }
  return palette;
}
function existsInPalette(palette, color) {
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    let matchesRGB = p[0] === color[0] && p[1] === color[1] && p[2] === color[2];
    let matchesAlpha = p.length >= 4 && color.length >= 4 ? p[3] === color[3] : true;
    if (matchesRGB && matchesAlpha)
      return true;
  }
  return false;
}

// src/color.js
function euclideanDistanceSquared(a, b) {
  var sum = 0;
  var n;
  for (n = 0; n < a.length; n++) {
    const dx = a[n] - b[n];
    sum += dx * dx;
  }
  return sum;
}

// src/palettize.js
function roundStep(byte, step) {
  return step > 1 ? Math.round(byte / step) * step : byte;
}
function prequantize(rgba, {roundRGB = 5, roundAlpha = 10, oneBitAlpha = null} = {}) {
  const data = new Uint32Array(rgba.buffer);
  for (let i = 0; i < data.length; i++) {
    const color = data[i];
    let a = color >> 24 & 255;
    let b = color >> 16 & 255;
    let g = color >> 8 & 255;
    let r = color & 255;
    a = roundStep(a, roundAlpha);
    if (oneBitAlpha) {
      const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
      a = a <= threshold ? 0 : 255;
    }
    r = roundStep(r, roundRGB);
    g = roundStep(g, roundRGB);
    b = roundStep(b, roundRGB);
    data[i] = a << 24 | b << 16 | g << 8 | r << 0;
  }
}
function applyPalette(rgba, palette, format = "rgb565") {
  if (!rgba || !rgba.buffer) {
    throw new Error("quantize() expected RGBA Uint8Array data");
  }
  if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
    throw new Error("quantize() expected RGBA Uint8Array data");
  }
  if (palette.length > 256) {
    throw new Error("applyPalette() only works with 256 colors or less");
  }
  const data = new Uint32Array(rgba.buffer);
  const length = data.length;
  const bincount = format === "rgb444" ? 4096 : 65536;
  const index = new Uint8Array(length);
  const cache = new Array(bincount);
  const hasAlpha = format === "rgba4444";
  if (format === "rgba4444") {
    for (let i = 0; i < length; i++) {
      const color = data[i];
      const a = color >> 24 & 255;
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const key = rgba8888_to_rgba4444(r, g, b, a);
      const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGBA(r, g, b, a, palette);
      index[i] = idx;
    }
  } else {
    const rgb888_to_key = format === "rgb444" ? rgb888_to_rgb444 : rgb888_to_rgb565;
    for (let i = 0; i < length; i++) {
      const color = data[i];
      const b = color >> 16 & 255;
      const g = color >> 8 & 255;
      const r = color & 255;
      const key = rgb888_to_key(r, g, b);
      const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGB(r, g, b, palette);
      index[i] = idx;
    }
  }
  return index;
}
function nearestColorIndexRGBA(r, g, b, a, palette) {
  let k = 0;
  let mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    const a2 = px2[3];
    let curdist = sqr2(a2 - a);
    if (curdist > mindist)
      continue;
    const r2 = px2[0];
    curdist += sqr2(r2 - r);
    if (curdist > mindist)
      continue;
    const g2 = px2[1];
    curdist += sqr2(g2 - g);
    if (curdist > mindist)
      continue;
    const b2 = px2[2];
    curdist += sqr2(b2 - b);
    if (curdist > mindist)
      continue;
    mindist = curdist;
    k = i;
  }
  return k;
}
function nearestColorIndexRGB(r, g, b, palette) {
  let k = 0;
  let mindist = 1e100;
  for (let i = 0; i < palette.length; i++) {
    const px2 = palette[i];
    const r2 = px2[0];
    let curdist = sqr2(r2 - r);
    if (curdist > mindist)
      continue;
    const g2 = px2[1];
    curdist += sqr2(g2 - g);
    if (curdist > mindist)
      continue;
    const b2 = px2[2];
    curdist += sqr2(b2 - b);
    if (curdist > mindist)
      continue;
    mindist = curdist;
    k = i;
  }
  return k;
}
function snapColorsToPalette(palette, knownColors, threshold = 5) {
  if (!palette.length || !knownColors.length)
    return;
  const paletteRGB = palette.map((p) => p.slice(0, 3));
  const thresholdSq = threshold * threshold;
  const dim = palette[0].length;
  for (let i = 0; i < knownColors.length; i++) {
    let color = knownColors[i];
    if (color.length < dim) {
      color = [color[0], color[1], color[2], 255];
    } else if (color.length > dim) {
      color = color.slice(0, 3);
    } else {
      color = color.slice();
    }
    const r = nearestColorIndexWithDistance(paletteRGB, color.slice(0, 3), euclideanDistanceSquared);
    const idx = r[0];
    const distanceSq = r[1];
    if (distanceSq > 0 && distanceSq <= thresholdSq) {
      palette[idx] = color;
    }
  }
}
function sqr2(a) {
  return a * a;
}
function nearestColorIndex(colors, pixel, distanceFn = euclideanDistanceSquared) {
  let minDist = Infinity;
  let minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const paletteColor = colors[j];
    const dist = distanceFn(pixel, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      minDistIndex = j;
    }
  }
  return minDistIndex;
}
function nearestColorIndexWithDistance(colors, pixel, distanceFn = euclideanDistanceSquared) {
  let minDist = Infinity;
  let minDistIndex = -1;
  for (let j = 0; j < colors.length; j++) {
    const paletteColor = colors[j];
    const dist = distanceFn(pixel, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      minDistIndex = j;
    }
  }
  return [minDistIndex, minDist];
}
function nearestColor(colors, pixel, distanceFn = euclideanDistanceSquared) {
  return colors[nearestColorIndex(colors, pixel, distanceFn)];
}

// src/index.js
function GIFEncoder(opt = {}) {
  const {initialCapacity = 4096, auto = true} = opt;
  const stream = createStream(initialCapacity);
  const HSIZE = 5003;
  const accum = new Uint8Array(256);
  const htab = new Int32Array(HSIZE);
  const codetab = new Int32Array(HSIZE);
  let hasInit = false;
  return {
    reset() {
      stream.reset();
      hasInit = false;
    },
    finish() {
      stream.writeByte(constants_default.trailer);
    },
    bytes() {
      return stream.bytes();
    },
    bytesView() {
      return stream.bytesView();
    },
    get buffer() {
      return stream.buffer;
    },
    get stream() {
      return stream;
    },
    writeHeader,
    writeFrame(index, width, height, opts = {}) {
      const {
        transparent = false,
        transparentIndex = 0,
        delay = 0,
        palette = null,
        repeat = 0,
        colorDepth = 8,
        dispose = -1
      } = opts;
      let first = false;
      if (auto) {
        if (!hasInit) {
          first = true;
          writeHeader();
          hasInit = true;
        }
      } else {
        first = Boolean(opts.first);
      }
      width = Math.max(0, Math.floor(width));
      height = Math.max(0, Math.floor(height));
      if (first) {
        if (!palette) {
          throw new Error("First frame must include a { palette } option");
        }
        encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth);
        encodeColorTable(stream, palette);
        if (repeat >= 0) {
          encodeNetscapeExt(stream, repeat);
        }
      }
      const delayTime = Math.round(delay / 10);
      encodeGraphicControlExt(stream, dispose, delayTime, transparent, transparentIndex);
      const useLocalColorTable = Boolean(palette) && !first;
      encodeImageDescriptor(stream, width, height, useLocalColorTable ? palette : null);
      if (useLocalColorTable)
        encodeColorTable(stream, palette);
      encodePixels(stream, index, width, height, colorDepth, accum, htab, codetab);
    }
  };
  function writeHeader() {
    writeUTFBytes(stream, "GIF89a");
  }
}
function encodeGraphicControlExt(stream, dispose, delay, transparent, transparentIndex) {
  stream.writeByte(33);
  stream.writeByte(249);
  stream.writeByte(4);
  if (transparentIndex < 0) {
    transparentIndex = 0;
    transparent = false;
  }
  var transp, disp;
  if (!transparent) {
    transp = 0;
    disp = 0;
  } else {
    transp = 1;
    disp = 2;
  }
  if (dispose >= 0) {
    disp = dispose & 7;
  }
  disp <<= 2;
  const userInput = 0;
  stream.writeByte(0 | disp | userInput | transp);
  writeUInt16(stream, delay);
  stream.writeByte(transparentIndex || 0);
  stream.writeByte(0);
}
function encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth = 8) {
  const globalColorTableFlag = 1;
  const sortFlag = 0;
  const globalColorTableSize = colorTableSize(palette.length) - 1;
  const fields = globalColorTableFlag << 7 | colorDepth - 1 << 4 | sortFlag << 3 | globalColorTableSize;
  const backgroundColorIndex = 0;
  const pixelAspectRatio = 0;
  writeUInt16(stream, width);
  writeUInt16(stream, height);
  stream.writeBytes([fields, backgroundColorIndex, pixelAspectRatio]);
}
function encodeNetscapeExt(stream, repeat) {
  stream.writeByte(33);
  stream.writeByte(255);
  stream.writeByte(11);
  writeUTFBytes(stream, "NETSCAPE2.0");
  stream.writeByte(3);
  stream.writeByte(1);
  writeUInt16(stream, repeat);
  stream.writeByte(0);
}
function encodeColorTable(stream, palette) {
  const colorTableLength = 1 << colorTableSize(palette.length);
  for (let i = 0; i < colorTableLength; i++) {
    let color = [0, 0, 0];
    if (i < palette.length) {
      color = palette[i];
    }
    stream.writeByte(color[0]);
    stream.writeByte(color[1]);
    stream.writeByte(color[2]);
  }
}
function encodeImageDescriptor(stream, width, height, localPalette) {
  stream.writeByte(44);
  writeUInt16(stream, 0);
  writeUInt16(stream, 0);
  writeUInt16(stream, width);
  writeUInt16(stream, height);
  if (localPalette) {
    const interlace = 0;
    const sorted = 0;
    const palSize = colorTableSize(localPalette.length) - 1;
    stream.writeByte(128 | interlace | sorted | 0 | palSize);
  } else {
    stream.writeByte(0);
  }
}
function encodePixels(stream, index, width, height, colorDepth = 8, accum, htab, codetab) {
  lzwEncode_default(width, height, index, colorDepth, stream, accum, htab, codetab);
}
function writeUInt16(stream, short) {
  stream.writeByte(short & 255);
  stream.writeByte(short >> 8 & 255);
}
function writeUTFBytes(stream, text) {
  for (var i = 0; i < text.length; i++) {
    stream.writeByte(text.charCodeAt(i));
  }
}
function colorTableSize(length) {
  return Math.max(Math.ceil(Math.log2(length)), 1);
}
var src_default = GIFEncoder;


return exports;})();
  const POINT_SIZE = 1.35;
  const $=id=>document.getElementById(id),canvas=$('room');
  let photos=JSON.parse($('photo-data').textContent).photos,photoIndex=0;
  let raw=atob(photos[0].samples),W=photos[0].width,H=photos[0].height;
  let graphicsFailed=false,exportJob=null;
  const configs=[
  {
    name:'Original points',slug:'original-points',label:'Point density',min:10,max:100,step:1,value:100,format:v=>v+'%'
  },
  {
    name:'White reveal',slug:'white-reveal',label:'Reveal contrast',min:20,max:100,step:1,value:100,format:v=>v+'%'
  },
  {
    name:'Sparse glow',slug:'sparse-glow',label:'Glow radius',min:2,max:12,step:.1,value:5.3,format:v=>Number(v).toFixed(1)
  },
  {
    name:'Chunky voxels',slug:'chunky-voxels',label:'Block size',min:.04,max:.16,step:.01,value:.07,format:v=>Math.round(v/.07*100)+'%'
  },
  {
    name:'Wire structure',slug:'wire-structure',label:'Line spacing',min:3,max:12,step:1,value:5,format:v=>v+' px'
  },
  {
    name:'Depth slice',slug:'depth-slice',label:'Slice position',min:0,max:100,step:1,value:48,format:v=>v+'%'
  }
  ];
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),smooth=t=>{
    t=clamp(t,0,1);
    return t*t*(3-2*t);
  },reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let selected=1,overview=false,showSource=false,depth=1,yaw=-8,pitch=0,targetYaw=-8,targetPitch=0,velYaw=0,velPitch=0,drag=null,frame=0,lastTime=0,playStart=null,revealPlayed=false,thumbTimer=0,lastThumb=0;
  function sample(x,y){
    let i=(y*W+x)*2,d=1.4+raw.charCodeAt(i)/255*4.6,l=raw.charCodeAt(i+1);
    return [(x+.5-W/2)/(W*.85),-(y+.5-H/2)/(W*.85),d,l?(l-1)/254:.35];
  }
  const all=[],sparse=[],cubes=[],corners=[];
  function buildSamples(){all.length=sparse.length=cubes.length=corners.length=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(raw.charCodeAt((y*W+x)*2+1)){
    let p=sample(x,y);
    all.push(...p);
    if((x*31+y*17)%37===0)sparse.push(...p);
  }
  const faces=[[[1,0,0],.85],[[-1,0,0],.65],[[0,1,0],1],[[0,-1,0],.55],[[0,0,1],.7],[[0,0,-1],.95]];
  for(let y=0;y<H;y+=5)for(let x=0;x<W;x+=5){
    let p=sample(x,y);
    for(const[n,shade]of faces){
      let axis=n.findIndex(v=>v!==0),u=(axis+1)%3,v=(axis+2)%3;
      for(const[a,b]of[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){
        let c=[0,0,0];
        c[axis]=n[axis]*.48;
        c[u]=a*.48;
        c[v]=b*.48;
        cubes.push(...p);
        corners.push(...c,shade);
      }
    }
  }
  }
  buildSamples();
  function makeLines(step){
    const rows=[];
    for(let y=0;y<H-step;y+=step)for(let x=0;x<W-step;x+=step){
      let p=sample(x,y);
      for(const q of[sample(x+step,y),sample(x,y+step)])if(Math.abs(p[2]-q[2])<.38)rows.push(...p,...q);
    }
    return new Float32Array(rows);
  }
  const gl=canvas.getContext('webgl',{
    alpha:false,antialias:true,preserveDrawingBuffer:true
  });
  function fail(message){
    graphicsFailed=true;if(exportJob)exportJob.cancelled=true;for(const b of $('effects').children)b.disabled=true;
    // Graphics failure: cancel pending work and expose the source photo in focus view.
    cancelAnimationFrame(frame);
    clearTimeout(thumbTimer);
    frame=0;
    playStart=null;
    drag=null;
    document.body.classList.remove('dragging');
    $('play').textContent=revealPlayed?'replay reveal':'play reveal';
    $('play').setAttribute('aria-pressed','false');
    overview=false;
    showSource=false;
    $('focus-view').hidden=false;
    $('workspace').classList.remove('overview');
    $('effects').classList.remove('overview');
    $('compare').setAttribute('aria-pressed','false');
    $('compare').textContent='compare';
    $('compare').setAttribute('aria-label','Compare all six effects');
    $('source-view').hidden=true;
    $('stage-row').classList.remove('compare');
    $('source-toggle').setAttribute('aria-pressed','false');
    $('source-toggle').textContent='show photo';
    $('error').hidden=false;
    $('error').textContent=message;
    for(const id of['save','gif','play','depth','turn','material','source-toggle','compare','reset','photo','load-photos','photo-file'])$(id).disabled=true;
    canvas.hidden=true;
    $('fallback-photo').hidden=false;
    $('status').textContent='Source photograph shown. The 3D view is unavailable.';
  }
  if(!gl){
    fail('The 3D view needs WebGL. Try a browser with WebGL graphics support.');
    return;
  }
  try{
    const vert=`attribute vec4 p;attribute vec4 corner;uniform vec4 state;uniform vec2 size;uniform float mode;uniform float material;varying float lum;varying float dep;varying float seed;void main(){float d=mix(3.6,p.z,state.x);vec3 q=vec3(p.xy*d,d);if(mode>2.5&&mode<3.5)q=floor(q/material+.5)*material+corner.xyz*material;q.z-=3.6;float c=cos(state.y),s=sin(state.y);q=vec3(c*q.x+s*q.z,q.y,-s*q.x+c*q.z);c=cos(state.z);s=sin(state.z);q=vec3(q.x,c*q.y-s*q.z,s*q.y+c*q.z);q.z+=3.6;float f=size.x*.60;gl_Position=vec4(q.x*f*2.0/size.x,q.y*f*2.0/size.y,(q.z-1.0)*.05,q.z);gl_PointSize=max(1.0,state.w*size.x/450.0);lum=pow(.06+.94*p.w,.4545);if(mode>2.5&&mode<3.5)lum*=corner.w;dep=p.z;seed=fract(sin(dot(p.xy,vec2(12.9898,78.233)))*43758.5453);}`;
    const frag=`precision highp float;uniform float mode;uniform float reveal;uniform float material;varying float lum;varying float dep;varying float seed;void main(){float v=lum;if(mode<.5||mode>4.5){if(length(gl_PointCoord-.5)>.5)discard;}if(mode<.5&&seed>material/100.0)discard;if(mode>.5&&mode<1.5){if(length(gl_PointCoord-.5)>.5)discard;v=1.0-lum*smoothstep(0.0,.7,reveal)*material/100.0;}if(mode>1.5&&mode<2.5){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;v=lum*exp(-r*r*5.0);}if(mode>3.5&&mode<4.5)v*=.7;if(mode>4.5){float band=1.0-smoothstep(.12,.42,abs(dep-(1.4+material/100.0*4.6)));v*=.10+.90*band;}gl_FragColor=vec4(vec3(v),1.0);}`;
    const program=gl.createProgram();
    for(const[type,src]of[[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]){
      const s=gl.createShader(type);
      gl.shaderSource(s,src);
      gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
      gl.attachShader(program,s);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const pLoc=gl.getAttribLocation(program,'p'),cLoc=gl.getAttribLocation(program,'corner'),uniform={
    };
    for(const n of['state','size','mode','reveal','material'])uniform[n]=gl.getUniformLocation(program,n);
    function buffer(data){
      const b=gl.createBuffer();
      if(!b)throw Error('Could not allocate a graphics buffer.');
      try{
        gl.bindBuffer(gl.ARRAY_BUFFER,b);
        gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
        if(gl.getError()!==gl.NO_ERROR)throw Error('Could not upload graphics data.');
      }catch(e){gl.deleteBuffer(b);throw e;}
      return {b,count:data.length/4};
    }
    let data=[buffer(new Float32Array(all)),buffer(new Float32Array(sparse)),buffer(makeLines(5)),buffer(new Float32Array(cubes))],cornerBuffer=buffer(new Float32Array(corners));
    function render(mode,w,h){
      if(canvas.width!==w||canvas.height!==h){
        canvas.width=w;
        canvas.height=h;
      }
      gl.viewport(0,0,w,h);
      gl.useProgram(program);
      const d=data[mode===2?1:mode===4?2:mode===3?3:0];
      gl.bindBuffer(gl.ARRAY_BUFFER,d.b);
      gl.enableVertexAttribArray(pLoc);
      gl.vertexAttribPointer(pLoc,4,gl.FLOAT,false,0,0);
      if(mode===3){
        gl.bindBuffer(gl.ARRAY_BUFFER,cornerBuffer.b);
        gl.enableVertexAttribArray(cLoc);
        gl.vertexAttribPointer(cLoc,4,gl.FLOAT,false,0,0);
      }
      else{
        gl.disableVertexAttribArray(cLoc);
        gl.vertexAttrib4f(cLoc,0,0,0,1);
      }
      if(mode===2){
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE,gl.ONE);
      }
      else{
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
      }
      gl.depthFunc(gl.LEQUAL);
      const white=mode===1?1:0;
      gl.clearColor(white,white,white,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(uniform.size,w,h);
      gl.uniform1f(uniform.mode,mode);
      gl.uniform1f(uniform.material,configs[mode].value);
      gl.uniform1f(uniform.reveal,depth);
      gl.uniform4f(uniform.state,depth,yaw*Math.PI/180,pitch*Math.PI/180,mode===2?configs[2].value:POINT_SIZE);
      gl.drawArrays(mode===4?gl.LINES:mode===3?gl.TRIANGLES:gl.POINTS,0,d.count);
    }
    const thumbImages=[];
    configs.forEach((c,i)=>{
      const b=document.createElement('button');
      b.className='effect';
      b.type='button';
      b.setAttribute('aria-label','Explore '+c.name);
      b.setAttribute('aria-pressed',String(i===selected));
      const image=new Image();
      image.alt=c.name+' treatment of Plot';
      image.width=450;
      image.height=300;
      thumbImages.push(image);
      b.append(image);
      const name=document.createElement('span');
      name.className='effect-name';
      const number=document.createElement('span');
      number.className='effect-number';
      number.textContent=String(i+1).padStart(2,'0');
      const text=document.createElement('span');
      text.className='effect-title';
      text.textContent=c.name;
      const tag=document.createElement('span');
      tag.className='selected';
      tag.setAttribute('aria-hidden','true');
      tag.textContent=i===selected?'↗':'→';
      name.append(number,text,tag);
      b.append(name);
      b.addEventListener('click',()=>select(i));
      $('effects').append(b);
    });
    function mainSize(){
      let w=$('stage-row').clientWidth;
      if(showSource&&innerWidth>700)w=(w-16)/2;
      let ratio=Math.min(devicePixelRatio||1,2);
      return[Math.max(1,Math.round(w*ratio)),Math.max(1,Math.round(w*ratio*2/3))];
    }
    function drawMain(){
      if(!overview){
        const[w,h]=mainSize();
        render(selected,w,h);
      }
      syncOutputs();
    }
    function thumbnails(){
      clearTimeout(thumbTimer);
      configs.forEach((c,i)=>{
        render(i,450,300);
        thumbImages[i].src=canvas.toDataURL('image/png');
      });
      lastThumb=performance.now();
      drawMain();
    }
    function scheduleThumbs(){
      clearTimeout(thumbTimer);
      thumbTimer=setTimeout(thumbnails,100);
    }
    function syncOutputs(){
      $('depth').value=Math.round(depth*100);
      $('turn').value=Math.round(targetYaw);
      $('depth-value').textContent=Math.round(depth*100)+'%';
      $('turn-value').textContent=Math.round(targetYaw)+'°';
      $('material').value=configs[selected].value;
      $('material-value').textContent=configs[selected].format(configs[selected].value);
    }
    function configure(){
      const c=configs[selected];
      const ends=[['sparse','dense'],['soft','bold'],['small','large'],['small','large'],['tight','wide'],['front','back']][selected];
      $('material-min').textContent=ends[0];
      $('material-max').textContent=ends[1];
      $('current-effect').textContent=c.name;
      $('effect-counter').textContent=String(selected+1).padStart(2,'0')+' / 06';
      $('material-label').textContent=c.label;
      for(const k of['min','max','step'])$('material')[k]=c[k];
      $('material').value=c.value;
      Array.from($('effects').children).forEach((b,i)=>{
        b.setAttribute('aria-pressed',String(i===selected));
        b.querySelector('.selected').textContent=i===selected?'↗':'→';
      });
      syncOutputs();
    }
    function layout(){
      $('focus-view').hidden=overview;
      $('workspace').classList.toggle('overview',overview);
      $('effects').classList.toggle('overview',overview);
      $('compare').setAttribute('aria-pressed',String(overview));
      $('compare').textContent=overview?'single view':'compare';
      $('compare').setAttribute('aria-label',overview?'Show selected effect':'Compare all six effects');
      $('source-toggle').disabled=overview;
      $('source-view').hidden=!showSource;
      $('stage-row').classList.toggle('compare',showSource);
    }
    function stop(){
      playStart=null;
      $('play').textContent=revealPlayed?'replay reveal':'play reveal';
      $('play').setAttribute('aria-pressed','false');
    }
    function select(i){if(exportJob||graphicsFailed)return;
      const fromOverview=overview;
      stop();
      selected=i;
      overview=false;
      layout();
      configure();
      drawMain();
      $('status').textContent=configs[i].name+' selected.';
      $('current-effect').focus({
        preventScroll:true
      });
      if(fromOverview||innerWidth<=800)$('current-effect').scrollIntoView({
        block:'start',behavior:'instant'
      });
    }
    function tick(t){
      const dt=Math.min((t-lastTime)/1000||.016,1/30);
      lastTime=t;
      let active=false;
      if(playStart!==null){
        const f=reduce.matches?1:(t-playStart)/1800;
        if(f>=1){
          depth=1;
          stop();
          $('status').textContent=reduce.matches?'Full depth shown (reduced motion).':'Reveal complete.';
        }else{
          depth=smooth(f);
          active=true;
        }
      }
      if(reduce.matches){
        yaw=targetYaw;
        pitch=targetPitch;
      }
      else{
        velYaw+=(160*(targetYaw-yaw)-26*velYaw)*dt;
        velPitch+=(160*(targetPitch-pitch)-26*velPitch)*dt;
        yaw+=velYaw*dt;
        pitch+=velPitch*dt;
        active=active||Math.abs(targetYaw-yaw)>.015||Math.abs(targetPitch-pitch)>.015||Math.abs(velYaw)>.02||Math.abs(velPitch)>.02;
      }
      drawMain();
      if(overview&&t-lastThumb>160)thumbnails();
      if(active||drag){
        frame=requestAnimationFrame(tick);
      }
      else{
        frame=0;
        lastTime=0;
        thumbnails();
      }
    }
    function animate(){
      if(!frame){
        lastTime=0;
        frame=requestAnimationFrame(tick);
      }
    }
    function reset(){
      stop();
      depth=1;
      targetYaw=-8;
      targetPitch=0;
      configs.forEach(c=>c.value=({
        0:100,1:100,2:5.3,3:.07,4:5,5:48
      })[configs.indexOf(c)]);
      gl.deleteBuffer(data[2].b);
      data[2]=buffer(makeLines(5));
      configure();
      if(reduce.matches){
        yaw=-8;
        pitch=0;
      }
      animate();
      $('status').textContent='View and controls reset.';
    }
    $('reset').addEventListener('click',reset);
    $('depth').addEventListener('input',()=>{
      stop();
      depth=+$('depth').value/100;
      drawMain();
      scheduleThumbs();
    });
    $('turn').addEventListener('input',()=>{
      stop();
      targetYaw=+$('turn').value;
      animate();
    });
    $('material').addEventListener('input',()=>{
      stop();
      configs[selected].value=+$('material').value;
      if(selected===4){
        gl.deleteBuffer(data[2].b);
        data[2]=buffer(makeLines(configs[4].value));
      }
      drawMain();
      scheduleThumbs();
    });
    $('source-toggle').addEventListener('click',()=>{
      showSource=!showSource;
      $('source-toggle').setAttribute('aria-pressed',String(showSource));
      $('source-toggle').textContent=showSource?'hide photo':'show photo';
      layout();
      drawMain();
    });
    $('compare').addEventListener('click',()=>{
      if(playStart!==null){depth=1;stop();}
      overview=!overview;
      layout();
      thumbnails();
    });
    function playReveal(){
      if(exportJob||graphicsFailed)return;
      if(playStart!==null){
        stop();
        $('status').textContent='Reveal stopped.';
        return;
      }
      revealPlayed=true;
      if(reduce.matches){
        depth=1;stop();drawMain();thumbnails();
        $('status').textContent='Full depth shown (reduced motion).';
        return;
      }
      depth=0;playStart=performance.now();
      $('play').textContent='stop reveal';
      $('play').setAttribute('aria-pressed','true');
      $('status').textContent='Revealing depth…';
      drawMain();animate();
    }
    $('play').addEventListener('click',playReveal);
    function resist(v,lo,hi){
      if(v<lo)return lo-Math.sqrt(lo-v)*.65;
      if(v>hi)return hi+Math.sqrt(v-hi)*.65;
      return v;
    }
    canvas.addEventListener('keydown',e=>{
      if(exportJob||graphicsFailed||overview)return;
      const move={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]}[e.key];
      if(!move)return;
      e.preventDefault();stop();
      targetYaw=clamp(targetYaw+move[0],-30,30);
      targetPitch=clamp(targetPitch+move[1],-10,10);
      $('status').textContent='Turn '+Math.round(targetYaw)+'°, tilt '+Math.round(targetPitch)+'°.';
      animate();
    });
    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.isPrimary===false||drag||overview||exportJob||graphicsFailed)return;
      stop();
      canvas.setPointerCapture(e.pointerId);
      drag={
        id:e.pointerId,x:e.clientX,y:e.clientY,yaw:targetYaw,pitch:targetPitch,lastX:e.clientX,lastY:e.clientY,t:performance.now(),vx:0,vy:0
      };
      document.body.classList.add('dragging');
      animate();
    });
    canvas.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      let now=performance.now(),dt=Math.max(now-drag.t,1);
      drag.vx=(e.clientX-drag.lastX)/dt;
      drag.vy=(e.clientY-drag.lastY)/dt;
      drag.lastX=e.clientX;
      drag.lastY=e.clientY;
      drag.t=now;
      targetYaw=resist(drag.yaw+(e.clientX-drag.x)*.13,-30,30);
      targetPitch=e.pointerType==='touch'?drag.pitch:resist(drag.pitch+(e.clientY-drag.y)*.08,-10,10);
      animate();
    });
    function endDrag(e){
      if(!drag||e.pointerId!==drag.id)return;
      const recent=e.type==='pointerup'&&performance.now()-drag.t<80;
      if(e.type==='pointercancel'&&e.pointerType==='touch'){targetYaw=drag.yaw;targetPitch=drag.pitch;}
      targetYaw=clamp(targetYaw+(recent?drag.vx*7:0),-30,30);
      targetPitch=clamp(targetPitch+(recent?drag.vy*4:0),-10,10);
      drag=null;
      document.body.classList.remove('dragging');
      animate();
    }
    canvas.addEventListener('pointerup',endDrag);
    canvas.addEventListener('pointercancel',endDrag);
    canvas.addEventListener('lostpointercapture',endDrag);
    $('save').addEventListener('click',()=>{
      if(exportJob||graphicsFailed)return;
      if(playStart!==null)depth=1;
      stop();
      $('save').disabled=true;
      try{
        if(document.fonts&&!document.fonts.check('20px FluxischElse'))throw Error('Plot font is still loading or unavailable. Try again after it loads.');
        render(selected,1920,1280);
        const image=document.createElement('canvas');
        image.width=1920;
        image.height=1352;
        const ctx=image.getContext('2d'),light=selected===1;
        ctx.fillStyle=light?'#fff':'#000';
        ctx.fillRect(0,0,image.width,image.height);
        ctx.drawImage(canvas,0,0);
        ctx.fillStyle=light?'#333':'#c8c8c8';
        ctx.font='400 20px FluxischElse';
        ctx.fillText('Plot room study / '+currentPhoto().label+' / '+configs[selected].name,32,1310,1856);
        ctx.font='400 16px FluxischElse';
        ctx.fillText('Photo: '+currentPhoto().credit+' · estimated depth · not a measured scan',32,1338,1856);
        const a=document.createElement('a');
        a.download='room-study-'+currentPhoto().id+'-'+configs[selected].slug+'.png';
        a.href=image.toDataURL('image/png');
        document.body.append(a);
        a.click();
        a.remove();
        $('status').textContent='PNG download requested: '+a.download+'.';
      }
      catch(e){
        $('status').textContent='Could not save the image: '+e.message;
      }
      finally{
        $('save').disabled=graphicsFailed;
        drawMain();
      }
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){
        if(exportJob)exportJob.cancelled=true;
        if(playStart!==null)depth=1;
        stop();cancelAnimationFrame(frame);clearTimeout(thumbTimer);
        frame=0;lastTime=0;drag=null;
        yaw=targetYaw=clamp(targetYaw,-30,30);
        pitch=targetPitch=clamp(targetPitch,-10,10);
        velYaw=velPitch=0;
        document.body.classList.remove('dragging');
      }else if(!graphicsFailed&&!exportJob){thumbnails();}
    });
    canvas.addEventListener('webglcontextlost',e=>{
      e.preventDefault();
      fail('The graphics session was interrupted. Reopen this file to restore the room.');
    });
    const lockIds=['save','play','depth','turn','material','source-toggle','compare','reset','photo','load-photos','photo-file'];
    function lockExport(locked){
      lockIds.forEach(id=>$(id).disabled=locked||graphicsFailed);
      for(const b of $('effects').children)b.disabled=locked||graphicsFailed;
      $('gif').textContent=locked?'cancel GIF':'save loop (GIF)';
      $('gif').setAttribute('aria-busy',String(locked));
      $('gif').disabled=graphicsFailed;
      if(!locked&&!graphicsFailed)layout();
    }
    function currentPhoto(){return photos[photoIndex];}
    function sourceUI(){
      const p=currentPhoto();
      for(const id of ['original-photo','fallback-photo']){$(id).src=p.image;$(id).alt=p.alt;}
      $('photo-credit').textContent='photo: '+p.credit;
      $('depth-model').textContent=p.depthModel;
      $('source-description').textContent=p.label+' · '+p.credit+'.';
      $('source-link').href=p.url||'#';$('source-link').hidden=!p.url;
      $('photo-caption').textContent=p.label+' · '+p.credit;
    }
    function photoOptions(){
      $('photo').replaceChildren();
      photos.forEach((p,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=String(i+1).padStart(2,'0')+' · '+p.label;$('photo').append(option);});
      $('photo').value=String(photoIndex);
      const single=photos.length===1;
      $('photo-label').hidden=single;
      $('photo').hidden=single;
      $('photo-name').hidden=!single;
      $('photo-name').textContent=single?photos[0].label:'';
    }
    function choosePhoto(index){
      if(exportJob||graphicsFailed||!Number.isInteger(index)||index<0||index>=photos.length)return false;
      stop();cancelAnimationFrame(frame);clearTimeout(thumbTimer);frame=0;drag=null;
      document.body.classList.remove('dragging');
      const p=photos[index],previous={raw,W,H};
      const pending=[];
      const upload=values=>{const result=buffer(values);pending.push(result);return result;};
      let nextData,nextCorner;
      try{
        raw=atob(p.samples);W=p.width;H=p.height;buildSamples();
        nextData=[upload(new Float32Array(all)),upload(new Float32Array(sparse)),upload(makeLines(configs[4].value)),upload(new Float32Array(cubes))];
        nextCorner=upload(new Float32Array(corners));
      }catch(e){
        for(const d of pending)gl.deleteBuffer(d.b);
        raw=previous.raw;W=previous.W;H=previous.H;
        throw e;
      }
      // Keep the previous room and attribution intact until all new buffers exist.
      for(const d of [...data,cornerBuffer])gl.deleteBuffer(d.b);
      data=nextData;cornerBuffer=nextCorner;photoIndex=index;
      depth=1;yaw=targetYaw=-8;pitch=targetPitch=velYaw=velPitch=0;
      try{sourceUI();configure();layout();thumbnails();}
      catch(e){fail('Could not display the selected photo: '+e.message);return false;}
      $('status').textContent=p.label+' selected.';
      return true;
    }
    function validatePhotoSet(value){
      if(value?.version!==1||!Array.isArray(value.photos)||value.photos.length<1||value.photos.length>3)throw Error('Use a prepared set containing one to three photos.');
      const ids=new Set();
      return value.photos.map(p=>{
        if(!p||typeof p.id!=='string'||!/^[-a-z0-9]{1,48}$/.test(p.id)||ids.has(p.id))throw Error('Photo IDs must be unique.');ids.add(p.id);
        for(const key of ['label','credit','alt'])if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>240)throw Error('Each photo needs a short label, credit and description.');
        if(!Number.isInteger(p.width)||!Number.isInteger(p.height)||p.width!==435||p.height!==290)throw Error('Prepare photos and depth at 435 × 290 pixels.');
        if(typeof p.samples!=='string'||p.samples.length>400000||!/^[A-Za-z0-9+/=]+$/.test(p.samples))throw Error('Missing prepared depth samples.');
        const bytes=atob(p.samples);if(bytes.length!==p.width*p.height*2||!Array.from(bytes).some((v,i)=>i%2===1&&v.charCodeAt(0)>0))throw Error('Depth sample dimensions do not match the photo.');
        if(typeof p.image!=='string'||p.image.length>1500000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.image))throw Error('Use embedded JPEG photos.');
        if(p.url&&(!/^https?:\/\//i.test(p.url)||p.url.length>3000))throw Error('Source links must use https or http.');
        if(typeof p.depthModel!=='string'||!p.depthModel.trim()||p.depthModel.length>160)throw Error('Each photo needs its depth-model credit.');
        return {...p};
      });
    }
    async function verifyPhotoImages(set){
      await Promise.all(set.map(p=>new Promise((resolve,reject)=>{
        const image=new Image();image.onload=()=>image.naturalWidth===435&&image.naturalHeight===290?resolve():reject(Error('JPEG dimensions do not match prepared depth.'));image.onerror=()=>reject(Error('A photo could not be decoded.'));image.src=p.image;
      })));
    }
    $('photo').addEventListener('change',()=>{
      try{choosePhoto(Number($('photo').value));}
      catch(e){$('photo').value=String(photoIndex);$('status').textContent='Could not change photo: '+e.message;}
    });
    $('load-photos').addEventListener('click',()=>$('photo-file').click());
    $('photo-file').addEventListener('change',async()=>{
      const file=$('photo-file').files?.[0];if(!file||exportJob||graphicsFailed)return;
      $('load-photos').disabled=true;$('gif').disabled=true;$('photo').disabled=true;
      try{
        if(file.size>6500000)throw Error('Photo sets must be under 6.5 MB.');
        const set=validatePhotoSet(JSON.parse(await file.text()));await verifyPhotoImages(set);
        if(graphicsFailed)return;
        const previousPhotos=photos,previousIndex=photoIndex;
        photos=set;
        let applied;
        try{applied=choosePhoto(0);photoOptions();}
        catch(e){photos=previousPhotos;photoIndex=previousIndex;photoOptions();throw e;}
        if(!applied)return;
        $('status').textContent=set.length+' prepared photo'+(set.length===1?'':'s')+' loaded locally.';
      }catch(e){$('status').textContent='Could not load photos: '+e.message;}
      finally{$('photo-file').value='';$('load-photos').disabled=graphicsFailed;$('gif').disabled=graphicsFailed;$('photo').disabled=graphicsFailed;}
    });
    async function exportGIF(){
      if(exportJob){exportJob.cancelled=true;$('status').textContent='Cancelling GIF…';return;}
      if(graphicsFailed)return;
      if(playStart!==null)depth=1;
      stop();cancelAnimationFrame(frame);clearTimeout(thumbTimer);frame=0;drag=null;document.body.classList.remove('dragging');
      const job={cancelled:false};exportJob=job;lockExport(true);
      const saved={depth,yaw,pitch,targetYaw,targetPitch,velYaw,velPitch};
      const mode=selected,p=currentPhoto(),width=640,height=466,frames=50;
      const image=document.createElement('canvas');image.width=width;image.height=height;
      try{
        if(document.fonts&&!document.fonts.check('20px FluxischElse'))throw Error('Plot font is still loading or unavailable. Try again after it loads.');
        const ctx=image.getContext('2d',{willReadFrequently:true});
        if(!ctx)throw Error('2D canvas is unavailable.');
        const encoder=GIFCodec.GIFEncoder();
        const palette=Array.from({length:256},(_,i)=>[i,i,i]);
        for(let i=0;i<frames;i++){
          if(job.cancelled||graphicsFailed)throw Error('cancelled');
          const phase=i/frames*Math.PI*2;
          yaw=saved.yaw+8*Math.sin(phase);pitch=saved.pitch;depth=saved.depth;
          render(mode,640,426);
          ctx.fillStyle=mode===1?'#fff':'#000';ctx.fillRect(0,0,width,height);ctx.drawImage(canvas,0,0);
          ctx.fillStyle=mode===1?'#333':'#ccc';ctx.font='400 11px FluxischElse';
          ctx.fillText('Plot room study / '+p.label+' / '+configs[mode].name,12,442,width-24);
          ctx.font='400 10px FluxischElse';ctx.fillText('Photo: '+p.credit+' · estimated depth',12,458,width-24);
          const rgba=ctx.getImageData(0,0,width,height).data,index=new Uint8Array(width*height);
          for(let pixel=0;pixel<index.length;pixel++)index[pixel]=rgba[pixel*4];
          encoder.writeFrame(index,width,height,{palette:i===0?palette:undefined,delay:80,repeat:0});
          // Restore the still view before yielding; encoding frames need not flash on screen.
          depth=saved.depth;yaw=saved.yaw;pitch=saved.pitch;drawMain();
          $('status').textContent='Making GIF: '+Math.round((i+1)/frames*100)+'%';
          await new Promise(resolve=>setTimeout(resolve,0));
        }
        if(job.cancelled||graphicsFailed)throw Error('cancelled');
        encoder.finish();
        const blob=new Blob([encoder.bytes()],{type:'image/gif'}),url=URL.createObjectURL(blob),a=document.createElement('a');
        a.download='room-study-'+p.id+'-'+configs[mode].slug+'.gif';a.href=url;document.body.append(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),60000);
        $('status').textContent='GIF download requested: '+a.download+'.';
      }catch(e){if(!graphicsFailed)$('status').textContent=job.cancelled?'GIF cancelled.':'Could not save GIF: '+e.message;}
      finally{
        depth=saved.depth;yaw=saved.yaw;pitch=saved.pitch;targetYaw=saved.targetYaw;targetPitch=saved.targetPitch;velYaw=saved.velYaw;velPitch=saved.velPitch;
        if(reduce.matches||document.hidden){yaw=targetYaw;pitch=targetPitch;velYaw=velPitch=0;}
        exportJob=null;lockExport(false);if(!graphicsFailed){
          drawMain();scheduleThumbs();
          if(!document.hidden&&(Math.abs(targetYaw-yaw)>.015||Math.abs(targetPitch-pitch)>.015||Math.abs(velYaw)>.02||Math.abs(velPitch)>.02))animate();
        }
      }
    }
    $('gif').addEventListener('click',exportGIF);
    photoOptions();sourceUI();

    new ResizeObserver(()=>{
      if(!graphicsFailed&&!exportJob)drawMain();
    }).observe($('stage-row'));
    configure();
    layout();
    thumbnails();
    if(!reduce.matches&&!document.hidden)playReveal();
  }
  catch(e){
    fail('The 3D view could not start: '+e.message);
  }
})();
