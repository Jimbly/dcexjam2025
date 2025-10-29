export const POTION_HEAL_AMOUNT = 30;
export const MAX_LEVEL = 9;

import assert from 'assert';
import { capitalize } from 'glov/common/util';
import { ELEMENT, Element, ELEMENT_NAME, ELEMENT_NONE, ElementName, Item, StatsData } from './entity_game_common';

const { abs, pow, random, max, min, floor, round } = Math;

// return 0...1 weighted around 0.5
export function bellish(xin: number, exp: number): number {
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

function calcDamage(pair: {
  dam: number;
  element?: Element;
}, defender: StatsData): {
  dam: number;
  style: string;
  resist: boolean;
} {
  let resist = false;
  let { dam, element } = pair;
  let min_damage = 1;
  if (element) {
    let elem_def = defender[`r${ELEMENT_NAME[element]}`] || 0;
    if (elem_def) {
      dam = min(dam * (100 - elem_def)/100, dam - 1);
      resist = true;
      if (elem_def >= 100) {
        min_damage = 0;
      }
    }
  }
  dam -= defender.defense;
  dam = round(dam);
  dam = max(min_damage, dam);
  return {
    dam,
    style: element && ELEMENT_NAME[element] || 'hit',
    resist,
  };
}

export function damage(attacker: StatsData, defender: StatsData): {
  dam: number;
  style: string;
  resist: boolean;
} {
  return calcDamage({
    dam: attacker.attack,
    element: attacker.element,
  }, defender);
}

export function basicAttackDamage(attacker: StatsData, defender: StatsData): {
  dam: number;
  style: string;
  resist: boolean;
} {
  return calcDamage({
    dam: 5,
    element: ELEMENT_NONE,
  }, defender);
}

const XP_TABLE = [
  0,
  20,
  66,
  170,
  402,
  898,
  1986,
  4354,
  9474,
];
export function xpToLevelUp(level: number): number {
  return XP_TABLE[level] || Infinity;
}

export function xpForDeath(enemy_level: number): number {
  return pow(2, enemy_level - 1);
}

export function rewardLevel(my_level: number, enemy_level: number, highest_ally_level: number): number {
  return enemy_level - max(0, min(highest_ally_level, enemy_level) - my_level);
}

export function maxMP(level: number): number {
  return 5 + (level - 1) * 2;
}

export type SkillDetails = {
  mp_cost: number;
  element: Element;
  dam: number;
};
export function skillDetails(item: Item): SkillDetails {
  assert(item.type === 'book');
  let { subtype, level } = item;
  let mp_cost;
  let element: ElementName;
  let dam;
  switch (subtype) {
    case 0:
      mp_cost = 2 + level;
      element = 'fire';
      dam = 5 + 3 * level;
      break;
    case 1:
      mp_cost = 3 + level;
      element = 'earth';
      dam = 7 + floor(3.34 * level); // not sure about this
      break;
    case 2:
      mp_cost = 5 + level;
      element = 'ice';
      dam = 10 + 4 * level;
      break;
    default:
      assert(false);
  }
  return {
    mp_cost,
    element: ELEMENT[element],
    dam,
  };
}

export type HatDetails = {
  element: Element;
  resist: number;
};

export function hatDetails(item: Item): HatDetails {
  assert(item.type === 'hat');
  let { subtype, level } = item;
  let resist = 9 + level;
  let element: ElementName;
  switch (subtype) {
    case 0:
      element = 'fire';
      break;
    case 1:
      element = 'earth';
      break;
    case 2:
      element = 'ice';
      break;
    default:
      assert(false);
  }
  return {
    element: ELEMENT[element],
    resist,
  };
}

export function itemName(item: Item): string {
  if (item.type === 'potion') {
    return 'Potion';
  }
  if (item.type === 'book') {
    let skill_details = skillDetails(item);
    return `L${item.level} Book of ${capitalize(ELEMENT_NAME[skill_details.element])}`;
  }
  if (item.type === 'hat') {
    let hat_details = hatDetails(item);
    return `L${item.level} ${capitalize(ELEMENT_NAME[hat_details.element])} Hat`;
  }
  return 'Unknown';
}

export function skillAttackDamage(skill_details: SkillDetails, defender: StatsData): {
  dam: number;
  style: string;
  resist: boolean;
} {
  let dam = skill_details.dam + 5;
  return calcDamage({
    dam,
    element: skill_details.element,
  }, defender);
}
