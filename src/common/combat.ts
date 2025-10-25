import { lerp } from 'glov/common/util';
import { StatsData } from './entity_game_common';

const { abs, pow, random, max, floor, round } = Math;

// return 0...1 weighted around 0.5
function bellish(xin: number, exp: number): number {
  // also reasonable: return easeInOut(xin, 1/exp);
  xin = xin * 2 - 1; // -> -1..1
  let y = 1 - abs(pow(xin, exp)); // 0..1 weighted to 1
  // Earlier was missing the `1 - ` above and it weights heavily to the min/max,
  //   which is maybe interesting to try?  Will feel more like a "hit" and a
  //   "miss", with the same average, but more swingy.  Probably want to use
  //   another stat to influence, this, though, so it's not just 50% chance of a
  //   poor hit!
  if (xin < 0) {
    return y * 0.5;
  } else {
    return 1 - y * 0.5;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function roundRand(v: number): number {
  return floor(v + random());
}

export function damage(attacker: StatsData, defender: StatsData): {
  dam: number;
  style: 'miss' | 'hit';
} {
  // let dam = lerp(bellish(random(), 3), 1, 3);
  let dam = lerp(bellish(0.5, 3), 1, 3);

  // dam = roundRand(dam);
  dam = round(dam);
  dam = max(1, dam);
  return {
    dam,
    style: 'hit',
  };
}
