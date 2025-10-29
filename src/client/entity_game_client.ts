import assert from 'assert';
import { getFrameTimestamp } from 'glov/client/engine';
import { EntityBaseClient } from 'glov/client/entity_base_client';
import { ClientEntityManagerInterface } from 'glov/client/entity_manager_client';
import {
  ActionDataAssignments,
} from 'glov/common/entity_base_common';
import {
  DataObject,
  EntityID,
  NetErrorCallback,
} from 'glov/common/types.js';
import type { ROVec2 } from 'glov/common/vmath';
import { hatDetails, maxMP } from '../common/combat';
import { EntityCrawlerDataCommon, entSamePos } from '../common/crawler_entity_common';
import {
  ELEMENT_NAME,
  entityGameCommonClass,
  EntityGameDataCommon,
  Item,
} from '../common/entity_game_common';
import {
  crawlerEntClientDefaultDraw2D,
  crawlerEntClientDefaultOnDelete,
  crawlerEntityManager,
  EntityCrawlerClient,
  EntityDraw2DOpts,
  EntityDrawOpts,
  EntityOnDeleteSubParam,
  entityPosManager,
  Floater,
} from './crawler_entity_client';

const { random } = Math;

type Entity = EntityClient;

export function entitiesAt(cem: ClientEntityManagerInterface<Entity>,
  pos: [number, number] | ROVec2,
  floor_id: number,
  skip_fading_out: boolean
): Entity[] {
  return cem.entitiesFind((ent) => entSamePos(ent, pos) && ent.data.floor === floor_id, skip_fading_out);
}

export function entityManager(): ClientEntityManagerInterface<Entity> {
  return crawlerEntityManager() as ClientEntityManagerInterface<Entity>;
}

export type EntityDataClient = {
  // type: string;
  // pos: JSVec3;
  // state: string;
  // floor: number;
  // stats: StatsData;
  // Player:
  events_done?: Partial<Record<string, boolean>>;
} & EntityGameDataCommon & EntityCrawlerDataCommon;


// export class EntityClient extends EntityBaseClient implements EntityCrawlerClient {
export class EntityClient extends entityGameCommonClass(EntityBaseClient) implements EntityCrawlerClient {
  declare entity_manager: ClientEntityManagerInterface<Entity>;
  declare data: EntityDataClient;

  floaters: Floater[];
  delete_reason?: string;

  // for calculating closest player / battle zone
  closest_ent: EntityID = 0;
  closest_ent_dist: number = Infinity;
  in_zone_ents: EntityID[] = []; // on an enemy, which players are in our zone
  last_closest_ent: EntityID = 0;
  battle_zone: EntityID = 0; // on a player, if we share a battle zone with others, what's the lowest EntityID

  hit_by_us = false; // whether or not we get XP from their death

  declare onDelete: (reason: string) => number;
  declare draw2D: (param: EntityDraw2DOpts) => void;
  declare draw?: (param: EntityDrawOpts) => void;
  declare onDeleteSub?: (param: EntityOnDeleteSubParam) => void;
  declare triggerAnimation?: (anim: string) => void;

  // On prototype properties:
  declare type_id: string; // will be constant on the prototype
  declare do_split: boolean;
  declare is_player: boolean;
  declare is_enemy: boolean;
  declare blocks_player: boolean;
  declare ai_move_min_time: number;
  declare ai_move_rand_time: number;
  declare display_name: string;

  constructor(data_in: DataObject) {
    super(data_in);
    let data = this.data;

    if (!data.pos) {
      data.pos = [0,0,0];
    }
    while (data.pos.length < 3) {
      data.pos.push(0);
    }
    this.floaters = [];
    this.aiResetMoveTime(true);
  }
  applyAIUpdate(
    action_id: string,
    data_assignments: ActionDataAssignments,
    payload?: unknown,
    resp_func?: NetErrorCallback,
  ): void {
    this.applyBatchUpdate({
      field: 'seq_ai_update',
      action_id,
      data_assignments,
      payload,
    });
    entityPosManager().otherEntityChanged(this.id);
    // this.actionSend({
    //   action_id,
    //   data_assignments,
    //   payload,
    // }, resp_func);
  }
  aiLastUpdatedBySomeoneElse(): boolean {
    return false;
  }
  ai_next_move_time!: number;
  aiResetMoveTime(initial: boolean): void {
    this.ai_next_move_time = getFrameTimestamp() + this.ai_move_min_time + random() * this.ai_move_rand_time;
  }

  isAlive(): boolean {
    return this.data.stats ? this.getData('stats.hp', 0) > 0 : true;
  }

  isEnemy(): boolean {
    return this.is_enemy;
  }
  isPlayer(): boolean {
    return this.is_player;
  }

  maxMP(): number {
    // Note: level up logic doesn't call this entity-scoped function
    let level = this.getData('stats.level', 1);
    return maxMP(level);
  }

  calcPlayerResist(): void {
    assert(this.isPlayer());
    let hats = this.getData<Item[]>('hats', []);
    let { stats } = this.data;
    stats.rfire = 0;
    stats.rearth = 0;
    stats.rice = 0;
    for (let ii = 0; ii < hats.length; ++ii) {
      let hat = hats[ii];
      let details = hatDetails(hat);
      stats[`r${ELEMENT_NAME[details.element]}`]! += details.resist;
    }
  }

  onCreate(is_initial: boolean): number {
    return is_initial ? 0 : 250;
  }
}
EntityClient.prototype.draw2D = crawlerEntClientDefaultDraw2D;
EntityClient.prototype.onDelete = crawlerEntClientDefaultOnDelete;
EntityClient.prototype.do_split = true;
EntityClient.prototype.ai_move_min_time = 500;
EntityClient.prototype.ai_move_rand_time = 500;
EntityClient.prototype.display_name = '?';
