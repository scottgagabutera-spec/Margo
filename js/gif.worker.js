/*
  gif.js 0.2.0 worker
  https://github.com/jnordberg/gif.js
  MIT License
*/
self.onmessage = function(event) {
  var data = event.data;
  if (data.task === 'quantize') {
    var palette = quantize(data.pixels, data.colorDepth);
    self.postMessage({ task: 'quantized', palette: palette, index: data.index });
  } else if (data.task === 'encode') {
    var stream = encode(data);
    self.postMessage({ task: 'encoded', data: stream, index: data.index }, [stream.buffer]);
  }
};

// NeuQuant neural-net quantization algorithm
function quantize(pixels, colorDepth) {
  var netsize = 256;
  var maxnetpos = netsize - 1;
  var netbiasshift = 4;
  var ncycles = 100;
  var intbiasshift = 16;
  var intbias = 1 << intbiasshift;
  var gammashift = 10;
  var gamma = 1 << gammashift;
  var betashift = 10;
  var beta = intbias >> betashift;
  var betagamma = intbias << (gammashift - betashift);
  var initrad = netsize >> 3;
  var radiusbiasshift = 6;
  var radiusbias = 1 << radiusbiasshift;
  var initradius = initrad * radiusbias;
  var radiusdec = 30;
  var alphabiasshift = 10;
  var initalpha = 1 << alphabiasshift;
  var radbiasshift = 8;
  var radbias = 1 << radbiasshift;
  var alpharadbshift = alphabiasshift + radbiasshift;
  var alpharadbias = 1 << alpharadbshift;

  var network = [];
  var netindex = new Int32Array(256);
  var bias = new Int32Array(netsize);
  var freq = new Int32Array(netsize);
  var radpower = new Int32Array(netsize >> 3);

  for (var i = 0; i < netsize; i++) {
    var v = (i << (netbiasshift + 8)) / netsize;
    network[i] = new Float64Array([v, v, v, 0]);
    freq[i] = intbias / netsize;
    bias[i] = 0;
  }

  var samplefac = colorDepth;
  var lengthcount = pixels.length;
  var alphadec = 30 + ((samplefac - 1) / 3) | 0;
  var samplepixels = lengthcount / (4 * samplefac);
  var delta = (samplepixels / ncycles) | 0;
  var alpha = initalpha;
  var radius = initradius;
  var rad = radius >> radiusbiasshift;

  for (var i = 0; i < rad; i++) {
    radpower[i] = alpha * (((rad * rad - i * i) * radbias) / (rad * rad));
  }

  var step;
  if (lengthcount < 1200) step = 4;
  else if (lengthcount % 2503 !== 0) step = 4 * 2503;
  else if (lengthcount % 3217 !== 0) step = 4 * 3217;
  else if (lengthcount % 4049 !== 0) step = 4 * 4049;
  else step = 4 * 4051;

  var pix = 0;
  var i2 = 0;
  while (i2 < samplepixels) {
    var b = (pixels[pix] & 0xff) << netbiasshift;
    var g = (pixels[pix + 1] & 0xff) << netbiasshift;
    var r = (pixels[pix + 2] & 0xff) << netbiasshift;

    var bestd = ~(1 << 31);
    var bestbiasd = bestd;
    var bestpos = -1;
    var bestbiaspos = bestpos;

    for (var n = 0; n < netsize; n++) {
      var nn = network[n];
      var dist = Math.abs(nn[0] - b) + Math.abs(nn[1] - g) + Math.abs(nn[2] - r);
      if (dist < bestd) { bestd = dist; bestpos = n; }
      var biasdist = dist - ((bias[n]) >> (intbiasshift - netbiasshift));
      if (biasdist < bestbiasd) { bestbiasd = biasdist; bestbiaspos = n; }
      freq[n] -= freq[n] >> 5;
      bias[n] += freq[n] << (gammashift - 5);
    }
    freq[bestpos] += beta;
    bias[bestpos] -= betagamma;

    var nn2 = network[bestbiaspos];
    nn2[0] -= (alpha * (nn2[0] - b)) >> alphabiasshift;
    nn2[1] -= (alpha * (nn2[1] - g)) >> alphabiasshift;
    nn2[2] -= (alpha * (nn2[2] - r)) >> alphabiasshift;

    if (rad !== 0) {
      var lo = Math.max(bestbiaspos - rad, 0);
      var hi = Math.min(bestbiaspos + rad, netsize);
      var jj = bestbiaspos + 1;
      var k = bestbiaspos - 1;
      var m = 1;
      while (jj < hi || k > lo) {
        var a2 = radpower[m++];
        if (jj < hi) {
          var pp = network[jj++];
          pp[0] -= (a2 * (pp[0] - b)) >> alpharadbshift;
          pp[1] -= (a2 * (pp[1] - g)) >> alpharadbshift;
          pp[2] -= (a2 * (pp[2] - r)) >> alpharadbshift;
        }
        if (k > lo) {
          var pp = network[k--];
          pp[0] -= (a2 * (pp[0] - b)) >> alpharadbshift;
          pp[1] -= (a2 * (pp[1] - g)) >> alpharadbshift;
          pp[2] -= (a2 * (pp[2] - r)) >> alpharadbshift;
        }
      }
    }

    pix += step;
    if (pix >= lengthcount) pix -= lengthcount;

    i2++;
    if (delta === 0) delta = 1;
    if (i2 % delta === 0) {
      alpha -= alpha / alphadec;
      radius -= radius / radiusdec;
      rad = radius >> radiusbiasshift;
      if (rad <= 1) rad = 0;
      for (var jjj = 0; jjj < rad; jjj++) {
        radpower[jjj] = alpha * (((rad * rad - jjj * jjj) * radbias) / (rad * rad));
      }
    }
  }

  var map = new Uint8Array(netsize * 3);
  var index = new Int32Array(netsize);
  for (var i = 0; i < netsize; i++) index[network[i][3]] = i;
  var k2 = 0;
  for (var i = 0; i < netsize; i++) {
    var j = index[i];
    map[k2++] = (network[j][0] >> netbiasshift) & 0xff;
    map[k2++] = (network[j][1] >> netbiasshift) & 0xff;
    map[k2++] = (network[j][2] >> netbiasshift) & 0xff;
  }
  return map;
}

function encode(data) {
  var width = data.width;
  var height = data.height;
  var palette = data.palette;
  var pixels = data.pixels;
  var delay = data.delay;
  var dispose = data.dispose !== undefined ? data.dispose : -1;
  var transparent = data.transparent !== null ? data.transparent : null;
  var isFirst = data.isFirst;

  var out = new ByteArray();

  if (isFirst) {
    // Header
    out.writeUTFBytes('GIF89a');
    // Logical screen descriptor
    out.writeShort(width);
    out.writeShort(height);
    out.writeByte(0x80 | 0x70 | 0x07); // global color table, 256 colors
    out.writeByte(0);
    out.writeByte(0);
    // Global color table
    out.writeBytes(palette);
    var padding = 768 - palette.length;
    for (var p = 0; p < padding; p++) out.writeByte(0);
    // Netscape loop extension
    out.writeByte(0x21);
    out.writeByte(0xff);
    out.writeByte(0x0b);
    out.writeUTFBytes('NETSCAPE2.0');
    out.writeByte(3);
    out.writeByte(1);
    out.writeShort(0); // loop forever
    out.writeByte(0);
  }

  // Graphic control extension
  out.writeByte(0x21);
  out.writeByte(0xf9);
  out.writeByte(4);
  var transp, disp;
  if (transparent === null) {
    transp = 0; disp = 0;
  } else {
    transp = 1;
    disp = 2;
  }
  if (dispose >= 0) disp = dispose & 7;
  disp <<= 2;
  out.writeByte(0 | disp | transp);
  out.writeShort(Math.round(delay / 10));
  out.writeByte(transparent !== null ? transparent : 0);
  out.writeByte(0);

  // Image descriptor
  out.writeByte(0x2c);
  out.writeShort(0); out.writeShort(0);
  out.writeShort(width); out.writeShort(height);
  out.writeByte(0);

  // Image data - LZW encode
  var minCodeSize = 8;
  out.writeByte(minCodeSize);
  lzwEncode(width * height, minCodeSize, pixels, palette, out);
  out.writeByte(0);

  return out.getData();
}

function lzwEncode(pixelCount, minCodeSize, pixels, palette, out) {
  var clearCode = 1 << minCodeSize;
  var eoiCode = clearCode + 1;
  var codeSize = minCodeSize + 1;
  var maxCode = clearCode << 1;
  var codeTable = {};
  var accum = new Uint8Array(256);
  var accumCount = 0;
  var curAccum = 0;
  var curBits = 0;

  function output(code) {
    curAccum &= (1 << curBits) - 1;
    if (curBits > 0) curAccum |= code << curBits;
    else curAccum = code;
    curBits += codeSize;
    while (curBits >= 8) {
      accum[accumCount++] = curAccum & 0xff;
      if (accumCount >= 254) { out.writeByte(accumCount); out.writeBytes(accum.subarray(0, accumCount)); accumCount = 0; }
      curAccum >>= 8;
      curBits -= 8;
    }
  }

  function flushAccum() {
    if (curBits > 0) {
      accum[accumCount++] = curAccum & 0xff;
      curBits = 0; curAccum = 0;
    }
    if (accumCount > 0) { out.writeByte(accumCount); out.writeBytes(accum.subarray(0, accumCount)); accumCount = 0; }
  }

  // Map pixels to palette indices
  var indices = new Uint8Array(pixelCount);
  // Build reverse lookup from rgb to palette index
  var paletteMap = {};
  for (var pi = 0; pi < 256; pi++) {
    var key = palette[pi*3] + ',' + palette[pi*3+1] + ',' + palette[pi*3+2];
    paletteMap[key] = pi;
  }
  for (var i = 0; i < pixelCount; i++) {
    var r = pixels[i*4], g = pixels[i*4+1], b = pixels[i*4+2];
    var k = r + ',' + g + ',' + b;
    indices[i] = paletteMap[k] !== undefined ? paletteMap[k] : 0;
  }

  codeTable = {};
  output(clearCode);
  var ent = indices[0];
  for (var i = 1; i < pixelCount; i++) {
    var c = indices[i];
    var key2 = ent + ',' + c;
    if (codeTable[key2] !== undefined) {
      ent = codeTable[key2];
    } else {
      output(ent);
      if (maxCode < 4096) {
        codeTable[key2] = maxCode++;
        if (maxCode > (1 << codeSize)) codeSize++;
      } else {
        output(clearCode);
        codeTable = {};
        codeSize = minCodeSize + 1;
        maxCode = eoiCode + 1;
      }
      ent = c;
    }
  }
  output(ent);
  output(eoiCode);
  flushAccum();
}

function ByteArray() {
  this.page = -1;
  this.pages = [];
  this.newPage();
}
ByteArray.pageSize = 4096;
ByteArray.prototype.newPage = function() {
  this.pages[++this.page] = new Uint8Array(ByteArray.pageSize);
  this.cursor = 0;
};
ByteArray.prototype.getData = function() {
  var len = this.page * ByteArray.pageSize + this.cursor;
  var out = new Uint8Array(len);
  for (var i = 0; i < this.page; i++) out.set(this.pages[i], i * ByteArray.pageSize);
  out.set(this.pages[this.page].subarray(0, this.cursor), this.page * ByteArray.pageSize);
  return out;
};
ByteArray.prototype.writeByte = function(val) {
  if (this.cursor >= ByteArray.pageSize) this.newPage();
  this.pages[this.page][this.cursor++] = val;
};
ByteArray.prototype.writeUTFBytes = function(str) {
  for (var i = 0; i < str.length; i++) this.writeByte(str.charCodeAt(i));
};
ByteArray.prototype.writeBytes = function(arr, off, len) {
  var l = len || arr.length;
  for (var i = off || 0; i < l; i++) this.writeByte(arr[i]);
};
ByteArray.prototype.writeShort = function(val) {
  this.writeByte(val & 0xff);
  this.writeByte((val >> 8) & 0xff);
};
