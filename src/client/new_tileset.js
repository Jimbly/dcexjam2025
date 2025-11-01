const assert = require('assert');
const fs = require('fs');
const NEW_SET = 'dun7';
['walls', 'cells', 'vstyles', 'atlases/dcex'].forEach(function (dir) {
  let files = fs.readdirSync(dir);
  files = files.filter((a) => a.startsWith('dun1'));
  assert(files.length);
  files.forEach(function (filename) {
    let outfile = `${dir}/${filename.replace('dun1', NEW_SET)}`;
    console.log(outfile);
    if (filename.endsWith('.png')) {
      if (!fs.existsSync(outfile)) {
        fs.writeFileSync(outfile, fs.readFileSync(`${dir}/${filename}`));
      }
    } else {
      let data = fs.readFileSync(`${dir}/${filename}`, 'utf8');
      let data2 = data.replace(/dun1/g, NEW_SET);
      assert(data !== data2);
      fs.writeFileSync(outfile, data2);
    }
  });
});
