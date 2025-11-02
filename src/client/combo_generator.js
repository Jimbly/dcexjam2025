const fs = require('fs');

// outdoor-only
// 10
// 11 (fog)
// 12 (fog)
// 5

// indoor-only
// 4


let first = [1,2,3,5,6,7,8,9,10,11,12];
let second = [1,2,3,4,6,7,8,9];
for (let ii = 0; ii < first.length; ++ii) {
  let firstv = first[ii];
  let base = fs.readFileSync(`vstyles/dun${firstv}.vstyle`, 'utf8');
  for (let jj = 0; jj < second.length; ++jj) {
    let secondv = second[jj];
    let work = base.split('wall_swaps:');
    work[0] += `  var_open: dun${secondv}_open
  var_detail1: dun${secondv}_detail1
  var_detail2: dun${secondv}_detail2
`;
    work = work.join('wall_swaps:');
    work += `
  var_door: dun${secondv}_door
  var_solid: dun${secondv}_solid1
  var_solid2: dun${secondv}_solid2
  var_stairs_in: dun${secondv}_stairs_in
  var_stairs_out: dun${secondv}_stairs_in
  var_window: dun${secondv}_window # probably unused?
  var_arch: dun${secondv}_arch # probably unused?
`;
    let out = `vstyles/duncombo-${firstv}-${secondv}.vstyle`;
    console.log(out);
    fs.writeFileSync(out, work);
  }
}
