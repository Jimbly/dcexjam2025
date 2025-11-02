const fs = require('fs');
const { pngAlloc, pngRead, pngWrite } = require('../build/png');
let { img } = pngRead(fs.readFileSync('stars.png'));

let out = pngAlloc({ width: 256, height: 192, byte_depth: 4 });

for (let ii = 0; ii < 100; ++ii) {
  let r = Math.floor(Math.random() * 4);
  let x = Math.floor(Math.random() * (256-12));
  let y = Math.floor(Math.random() * (192-12));
  img.bitblt(out, r * 12, 0, 12, 12, x, y);
}
fs.writeFileSync('starsout.png', pngWrite(out));
