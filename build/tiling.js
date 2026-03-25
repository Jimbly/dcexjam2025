const assert = require('assert');
const gb = require('glov-build');
const micromatch = require('micromatch');
const { pngAlloc, pngRead, pngWrite } = require('./png.js');

const { floor } = Math;

exports.tilingExpand = function (param) {
  let zeroes;
  let zeroes_length = 0;
  let {
    rules,
    pix,
  } = param;
  pix = pix || 1;
  rules = rules || [];
  rules.push('**:bauto');
  let modes = [];
  for (let ii = 0; ii < rules.length; ++ii) {
    let pair = rules[ii].split(':');
    assert.equal(pair.length, 2);
    rules[ii] = pair[0];
    let mode = pair[1].split(',');
    assert(mode[0][0] === 'b' || mode.length === 2, `Invalid rule mode ${pair[1]}`);
    let horz;
    let vert;
    for (let jj = 0; jj < mode.length; ++jj) {
      let elem = mode[jj];
      if (elem[0] === 'v') {
        vert = elem.slice(1);
      } else if (elem[0] === 'h') {
        horz = elem.slice(1);
      } else if (elem[0] === 'b') {
        horz = vert = elem.slice(1);
      } else {
        assert(false, `Invalid rule mode ${elem}`);
      }
    }
    assert(!horz || horz === 'alpha' || horz === 'auto' || horz === 'clamp' || horz === 'wrap');
    assert(!vert || vert === 'alpha' || vert === 'auto' || vert === 'clamp' || vert === 'wrap');
    modes.push({
      horz,
      vert,
    });
  }
  function imgproc(job, done) {
    let file = job.getFile();
    if (file.relative.endsWith('.9.png')) { // not yet handled
      job.out(file);
      return void done();
    }
    let horz;
    let vert;
    for (let ii = 0; ii < rules.length; ++ii) {
      if (micromatch(file.relative, rules[ii]).length) {
        let mode = modes[ii];
        horz = horz || mode.horz;
        vert = vert || mode.vert;
      }
    }
    assert(horz && vert); // should at least get auto
    // if (horz === 'clamp' && vert === 'clamp') { // depixel handles this?
    //   job.out(file);
    //   return void done();
    // }
    let { err, img: pngin } = pngRead(file.contents);
    if (err) {
      return void done(err);
    }
    let { width, height, data } = pngin;
    assert.equal(width * height * 4, data.length);
    if (horz === 'auto' || vert === 'auto') {
      let border_transparent = {};
      for (let ii = 0; ii < width; ++ii) {
        if (!data[ii*4 + 3]) {
          border_transparent.top = true;
        }
        if (!data[((height - 1) * width + ii)*4 + 3]) {
          border_transparent.bottom = true;
        }
      }
      for (let ii = 0; ii < height; ++ii) {
        if (!data[ii*width*4 + 3]) {
          border_transparent.left = true;
        }
        if (!data[(ii * width + width - 1)*4 + 3]) {
          border_transparent.right = true;
        }
      }
      if (horz === 'auto' && vert === 'auto' &&
        border_transparent.top &&
        border_transparent.bottom &&
        border_transparent.left &&
        border_transparent.right
      ) {
        horz = vert = 'alpha';
      }
      if (horz === 'auto') {
        if (border_transparent.left || border_transparent.right) {
          horz = 'clamp';
        } else {
          horz = 'wrap';
        }
      }
      if (vert === 'auto') {
        if (border_transparent.top || border_transparent.bottom) {
          vert = 'clamp';
        } else {
          vert = 'wrap';
        }
      }
    }

    let newwidth = width + pix * 2;
    let newheight = height + pix * 2;
    if (newwidth > zeroes_length) {
      zeroes_length = newwidth;
      zeroes = Buffer.alloc(newwidth * 4);
    }
    let pngout = pngAlloc({ width: newwidth, height: newheight, byte_depth: 4, comment: 'tilingExpand' });
    let outdata = pngout.data;
    for (let ii = 0; ii < newheight; ++ii) {
      let target_row = ii * newwidth * 4;
      // copy body
      let source_row;
      let source_use = data;
      if (ii < pix || ii >= newheight - pix) {
        // we're off the top/bottom
        if (vert === 'wrap') {
          source_row = ((ii - pix + height * pix) % height) * width * 4;
        } else if (vert === 'clamp') {
          if (ii < pix) {
            source_row = 0;
          } else {
            source_row = (height - 1) * width * 4;
          }
        } else {
          source_row = 0;
          source_use = zeroes;
        }
      } else {
        source_row = (ii - pix) * width * 4;
      }
      source_use.copy(outdata, target_row + pix * 4, source_row, source_row + width * 4);

      // copy left/right
      for (let xx = 0; xx < pix * 4; ++xx) {
        let vleft;
        let vright;
        if (horz === 'wrap') {
          vleft = source_use[(source_row + (xx - pix * 4) + width * pix * 4) % (width * 4)];
          vright = source_use[(source_row + xx) % (width * 4)];
        } else if (horz === 'clamp') {
          vleft = source_use[source_row + (xx % 4)];
          vright = source_use[source_row + (width - 1) * 4 + (xx % 4)];
        } else {
          vleft = 0;
          vright = 0;
        }
        outdata[target_row + xx] = vleft;
        outdata[target_row + (pix + width) * 4 + xx] = vright;
      }
    }
    let suffix = `-tile-${width}-${height}-${pix}.png`;
    let buffer = pngWrite(pngout);
    job.out({
      relative: file.relative.replace('.png', suffix),
      contents: buffer,
    });
    done();
  }
  return {
    type: gb.SINGLE,
    func: imgproc,
    version: [
      imgproc,
      param,
    ],
  };
};

function isInteger(v) {
  return typeof v === 'number' && isFinite(v) && floor(v) === v;
}

exports.tilingContract = function () {
  function imgproc(job, done) {
    let file = job.getFile();
    let m = file.relative.match(/^(.*)-tile-(\d+)-(\d+)-(\d+)(.*)$/);
    if (!m) {
      job.out(file);
      return void done();
    }
    let relative = `${m[1]}${m[5]}`;
    let orig_width = Number(m[2]);
    let orig_height = Number(m[3]);
    let orig_pix = Number(m[4]);
    let tile_horz = true;
    let tile_vert = true;
    assert(tile_horz || tile_vert);

    let { err, img: pngin } = pngRead(file.contents);
    if (err) {
      return void done(err);
    }
    let { width, height, data } = pngin;
    assert.equal(width * height * 4, data.length);
    let orig_dw = tile_horz ? orig_pix : 0;
    let orig_dh = tile_vert ? orig_pix : 0;
    let scalex = width / (orig_width + orig_dw * 2);
    assert(isInteger(scalex), file.relative);
    let scaley = height / (orig_height + orig_dh * 2);
    assert(isInteger(scaley));
    assert.equal(scalex, scaley);

    let dw = orig_dw * scalex;
    let dh = orig_dh * scaley;
    let newwidth = width - dw * 2;
    let newheight = height - dh * 2;
    let pngout = pngAlloc({ width: newwidth, height: newheight, byte_depth: 4, comment: 'tilingContract' });
    let outdata = pngout.data;
    for (let ii = 0; ii < newheight; ++ii) {
      let source_row = (ii + dh) * width * 4 + dw * 4;
      let target_row = ii * newwidth * 4;
      data.copy(outdata, target_row, source_row, source_row + newwidth * 4);
    }
    let buffer = pngWrite(pngout);
    job.out({
      relative,
      contents: buffer,
    });
    done();
  }
  return {
    type: gb.SINGLE,
    func: imgproc,
    version: [
      imgproc,
    ],
  };
};
