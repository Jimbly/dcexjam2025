export const ELEMENT_NONE = 0;
export const ELEMENT_FIRE = 1;
export const ELEMENT_EARTH = 2;
export const ELEMENT_ICE = 3;
export const ELEMENT = {
  fire: 1,
  earth: 2,
  ice: 3,
} as const;
export const ELEMENT_NAME: Record<Element, ElementName> = {
  1: 'fire',
  2: 'earth',
  3: 'ice',
};
export type ElementName = keyof typeof ELEMENT;
export type Element = typeof ELEMENT_FIRE | typeof ELEMENT_EARTH | typeof ELEMENT_ICE | number;

import {
  EntityBaseCommon,
  EntityBaseDataCommon,
} from 'glov/common/entity_base_common';
import { EntityID } from 'glov/common/types';
import { JSVec3 } from 'glov/common/vmath';

// import type { JSVec3 } from './crawler_state';

export type BroadcastDataDstat = {
  hp: number;
  source: EntityID;
  action: string;
  type: string;
  resist?: boolean;
  fatal?: boolean;
  highest_hitter?: number; // if fatal, highest level of anyone who it it
  pred_id?: number;
  executor: EntityID; // who did the logic / presumably already predicted it
};

export type ActionAttackPayload = {
  target_ent_id: EntityID;
  type: string;
  resist: boolean;
  dam: number;
  pred_id: number;
  executor: EntityID;
};

export type ActionInventoryOp = {
  list?: 'hats' | 'books';
  idx: number;
  delta?: number;
  item?: Item;
};
export type ActionInventoryPayload = {
  dstats?: Partial<StatsData>;
  ops: ActionInventoryOp[];
  ready: boolean;
};

export type StatsData = {
  hp: number;
  hp_max: number;
  mp: number;
  xp: number; // just players
  level: number;
  attack: number; // just monsters
  defense: number; // just monsters?
  highest_hitter?: number; // just monsters
  element?: Element;
  rfire?: number; // only stored on monsters, re-cacl'd on players
  rearth?: number; // only stored on monsters, re-cacl'd on players
  rice?: number; // only stored on monsters, re-cacl'd on players
};

export type Item = {
  type: 'hat' | 'book' | 'potion';
  subtype: number;
  level: number;
  count: number;
};

export type EntityGameDataCommon = {
  // floor: number;
  // type: string;
  stats: StatsData;
  // pos: JSVec3;
  // state: string;

  // // Players
  display_name: string;
  user_id: string;
  // costume?: number;
  inventory?: (Item|null)[];
  hats?: Item[];
  books?: Item[];
  // refinery?: Refinery;
  seq_player_move?: string;
  seq_unready?: string;
  seq_inventory?: string;
  // seq_refinery?: string;
  // keys?: Partial<Record<string, true>>;
  ready: boolean;
  did_setup?: boolean;

  // // AI state
  seq_ai_update?: string;
  // ready?: boolean;
  // action_dur?: number;
  // ready_start?: number;
  last_pos: JSVec3;

  // Chests
  contents?: Item[];
} & EntityBaseDataCommon;

// eslint-disable-next-line @stylistic/max-len
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/explicit-function-return-type
export function entityGameCommonClass<T extends Constructor<EntityBaseCommon>>(base: T) {
  // Note: `base` is either `EntityBaseServer` or `EntityBaseClient`
  let ret = class EntityGameCommon extends base {
    declare data: EntityGameDataCommon;

    // On prototype properties:
    declare type_id: string;
    declare is_player: boolean;
    declare is_enemy: boolean;
    declare blocks_player: boolean;
    declare is_container: boolean;
    declare ai_wander: boolean;

    // // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // constructor(...args: any[]) {
    //   super(...args);
    // }
    isEnemy(): boolean {
      return this.is_enemy;
    }

    isContainer(): boolean {
      return this.is_container;
    }

    isAlive(): boolean {
      let stats = this.data.stats;
      return stats && stats.hp > 0;
    }
  };
  ret.prototype.is_player = false;
  ret.prototype.is_enemy = false;
  ret.prototype.blocks_player = false;
  ret.prototype.is_container = false;
  ret.prototype.ai_wander = false;
  return ret;
}

export type EntityGameCommon = ReturnType<typeof entityGameCommonClass>;
