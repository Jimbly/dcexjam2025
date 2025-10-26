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
  fatal?: boolean;
  pred_id?: number;
};

export type ActionAttackPayload = {
  target_ent_id: EntityID;
  type: string;
  dam: number;
  pred_id: number;
};

export type StatsData = {
  hp: number;
  hp_max: number;
  mp: number;
  mp_max: number;
  xp: number;
  level: number;
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
  // inventory?: ItemInventory[];
  // refinery?: Refinery;
  seq_player_move?: string;
  // seq_refinery?: string;
  // keys?: Partial<Record<string, true>>;

  // // AI state
  seq_ai_update?: string;
  // ready?: boolean;
  // action_dur?: number;
  // ready_start?: number;
  last_pos: JSVec3;

  // // Chests
  // contents?: Item[];
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
