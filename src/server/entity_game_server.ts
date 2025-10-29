import assert from 'assert';
import {
  EntityFieldEncoding,
  EntityFieldSub,
} from 'glov/common/entity_base_common';
import {
  DataObject,
  ErrorCallback,
} from 'glov/common/types';
import { JSVec3, v3copy } from 'glov/common/vmath';
import {
  ActionHandlerParam,
  EntityBaseServer,
  entityServerRegisterActions,
  entityServerRegisterFieldDefs,
  VAID,
} from 'glov/server/entity_base_server';
import {
  ActionAttackPayload,
  ActionInventoryPayload,
  BroadcastDataDstat,
  entityGameCommonClass,
  EntityGameDataCommon,
  Item,
  StatsData,
} from '../common/entity_game_common';
import { EntityCrawlerDataServer, EntityCrawlerServer } from './crawler_entity_server';

const { max, floor } = Math;

// TODO: move when common/util is moved to TypeScript?
type Integer = { _opaque: 'integer' } & number;
function isInteger(v: unknown): v is Integer {
  return typeof v === 'number' && isFinite(v) && floor(v) === v;
}

export type EntityGameDataServer = EntityCrawlerDataServer & EntityGameDataCommon;

entityServerRegisterFieldDefs<EntityGameDataServer>({
  type: { encoding: EntityFieldEncoding.AnsiString },
  display_name: { encoding: EntityFieldEncoding.String, ephemeral: true },
  user_id: { encoding: EntityFieldEncoding.String, ephemeral: true },
  pos: { encoding: EntityFieldEncoding.IVec3 },
  last_pos: { encoding: EntityFieldEncoding.IVec3, ephemeral: true },
  ready: { encoding: EntityFieldEncoding.Boolean },
  state: { ephemeral: true, encoding: EntityFieldEncoding.AnsiString },
  floor: { encoding: EntityFieldEncoding.Int },
  costume: { encoding: EntityFieldEncoding.Int },
  stats: { sub: EntityFieldSub.Record, encoding: EntityFieldEncoding.Int },
  inventory: { sub: EntityFieldSub.Array, encoding: EntityFieldEncoding.JSON },
  contents: { sub: EntityFieldSub.Array, encoding: EntityFieldEncoding.JSON },
  hats: { encoding: EntityFieldEncoding.JSON },
  books: { encoding: EntityFieldEncoding.JSON },
  seq_ai_update: { encoding: EntityFieldEncoding.AnsiString },
  seq_player_move: { encoding: EntityFieldEncoding.AnsiString },
  seq_unready: { encoding: EntityFieldEncoding.AnsiString },
  seq_inventory: { encoding: EntityFieldEncoding.AnsiString },
  vis_data: { server_only: true },
});

const default_player_stats: StatsData = {
  hp: 50,
  hp_max: 50,
  mp: 5,
  xp: 0,
  level: 2,
  attack: 0,
  defense: 0,
};

const default_player_fields: Partial<EntityGameDataCommon> = {
  inventory: [{
    type: 'potion',
    subtype: 0,
    level: 1,
    count: 10,
  }, {
    type: 'hat',
    subtype: 0,
    level: 1,
    count: 1,
  }, {
    type: 'hat',
    subtype: 1,
    level: 2,
    count: 1,
  }, {
    type: 'hat',
    subtype: 2,
    level: 3,
    count: 1,
  }, {
    type: 'book',
    subtype: 0,
    level: 1,
    count: 1,
  }, {
    type: 'book',
    subtype: 1,
    level: 2,
    count: 1,
  }, {
    type: 'book',
    subtype: 2,
    level: 3,
    count: 1,
  }],
  // hats: [{
  // }],
  books: [{
    type: 'book',
    subtype: 1,
    level: 2,
    count: 1,
  }, {
    type: 'book',
    subtype: 0,
    level: 1,
    count: 1,
  }],
};

export class EntityServer extends entityGameCommonClass(EntityBaseServer) implements EntityCrawlerServer {
  // declare entity_manager: EntityManager;

  declare data: EntityGameDataServer;

  // Type-safe overrides of base class definition
  declare dirty: (field: keyof EntityGameDataServer) => void;
  declare dirtySub: (field: keyof EntityGameDataServer, index: string | number) => void;

  constructor(data: DataObject) {
    super(data);
    if (!this.data.pos) {
      this.data.floor = 0;
      this.data.pos = [0,0,0];
    }
  }

  fixupPostLoad(): void {
    // Data fixups post-load or upon creation
    // if (this.data.type === 'container') {
    //   this.data.model ='chest';
    // }
    if (this.isPlayer()) {
      this.data.type = 'player';
      // let inventory = this.data.inventory;
      // if (!inventory) {
      //   inventory = this.data.inventory = [];
      // }
      if (!this.data.stats) {
        this.data.stats = {} as StatsData;
      }
      let key: keyof StatsData;
      for (key in default_player_stats) {
        if (this.data.stats[key] === undefined) {
          this.data.stats[key] = default_player_stats[key]!;
        }
      }
      let key2: keyof EntityGameDataCommon;
      for (key2 in default_player_fields) {
        if (this.data[key2] === undefined) {
          (this.data as DataObject)[key2] = default_player_fields[key2];
        }
      }
    }
    if ((this.data.pos as number[]).length === 2) {
      // enemies don't have a rotation, but are serialized to the client as a Vec3, so need one here
      this.data.pos.push(0);
    }
  }

  visibleAreaGet(): VAID {
    return this.data.floor as VAID;
  }

  visibleAreaSees(): VAID[] {
    return [this.data.floor as VAID];
  }

  pickup(item: Item): void {
    let inventory = this.data.inventory;
    if (!inventory) {
      this.data.inventory = [item];
      this.dirty('inventory');
      return;
    }
    let open_slot = inventory.length;
    for (let ii = inventory.length - 1; ii >= 0; --ii) {
      let elem = inventory[ii];
      if (!elem) {
        open_slot = ii;
      } else if (elem.type === item.type && elem.subtype === item.subtype && elem.level === item.level) {
        elem.count += item.count;
        this.dirtySub('inventory', ii);
        return;
      }
    }
    inventory[open_slot] = item;
    this.dirtySub('inventory', open_slot);
  }
}

type ActionFloorChangePayload = {
  reason?: string;
  floor: number;
};
entityServerRegisterActions<EntityCrawlerServer>([{
  action_id: 'move_debug',
  allowed_data_assignments: {
    pos: 'array', // actually number[3]
    seq_player_move: 'string',
  },
}, {
  action_id: 'move',
  allowed_data_assignments: {
    pos: 'array', // actually number[3]
    seq_player_move: 'string',
  },
}, {
  action_id: 'ai_move',
  self_only: false,
  allowed_data_assignments: {
    seq_ai_update: 'string',
    pos: 'array',
    last_pos: 'array',
  },
}, {
  action_id: 'set_debug',
  self_only: false,
  allow_any_assignment: true,
}, {
  action_id: 'stat_debug',
  self_only: false,
  handler: function ({ payload }, resp_func) {
    let mod = payload as Partial<Record<string, number>>;
    let broadcast = {} as Partial<Record<string, number>>;
    for (let key in mod) {
      let new_value = mod[key]!;
      let stats = this.data.stats as Partial<Record<string, number>>;
      let old_value = stats[key] || 0;
      let delta = new_value - old_value;
      broadcast[key] = delta;
      // TODO: This should use data_assignments?
      stats[key] = new_value;
      this.dirtySub('stats', key);
    }
    this.entity_manager.broadcast(this, 'dstat', broadcast);
    resp_func();
  },
}, {
  action_id: 'set_vis_data',
  handler: function (this: EntityCrawlerServer, { payload }, resp_func) {
    let { data, floor: floor_id } = payload as { data: string; floor: number };
    let vis_data = this.data.vis_data;
    if (!vis_data) {
      vis_data = this.data.vis_data = {};
    }
    vis_data[floor_id] = data;
    this.dirty('vis_data'); // TODO: Dirty for saving, but not for broadcasting to others
    resp_func();
  }
}, {
  action_id: 'get_vis_data',
  handler: function (this: EntityCrawlerServer, { payload }, resp_func) {
    let vis_data = this.data.vis_data;
    let { floor: floor_id } = payload as { floor: number };
    resp_func(null, vis_data?.[floor_id] || '');
  }
}, {
  action_id: 'floorchange',
  self_only: true,
  allowed_data_assignments: {
    seq_player_move: 'string', // maybe add a special `predicate` field instead?
    pos: 'array',
    floor: 'number',
  },
  handler: function (this: EntityCrawlerServer, { src, payload, data_assignments }, resp_func) {
    let new_pos = data_assignments.pos as JSVec3;
    assert(Array.isArray(new_pos));
    if (!new_pos || new_pos.length !== 3 ||
      !isInteger(data_assignments.floor) ||
      !payload
    ) {
      return void resp_func('ERR_INVALID_DATA');
    }
    let payload2 = payload as ActionFloorChangePayload;
    // if (payload2.reason === 'respawn') {
    //   this.data.stats.hp = this.data.stats.hp_max;
    //   this.dirtySub('stats', 'hp');
    // }

    // TODO: this is using data_assignments (set after this function finishes),
    //   except, we need the new data.floor set within here for dirtyVA(),
    //   should that be more automatic somehow?
    v3copy(this.data.pos, new_pos);
    this.dirty('pos');
    let floor_id = data_assignments.floor;
    this.data.floor = floor_id;
    // Dirty the ent, apply their change to their vaid
    this.dirtyVA('floor', payload2.reason || null);

    let client = this.entity_manager.getClient(src.id);
    this.entity_manager.clientSetVisibleAreaSees(client, [floor_id], () => {
      // By now, client has already received the initial update for all relevant
      //   entities (own entity may still be dirty and unsent, though)
      this.entity_manager.worker.sendChannelMessage(src.channel_id, 'floorchange_ack');
    });
    resp_func(); // Action must always be synchronous, has a predicate
  }
}]);

function handleActionAttack(
  this: EntityServer,
  { self, payload }: ActionHandlerParam,
  resp_func: ErrorCallback<unknown, string>
): void {
  if (!self && this.is_player) {
    return void resp_func('ERR_NOT_SELF');
  }
  let { target_ent_id, type, dam, pred_id, executor, resist } = payload as ActionAttackPayload;
  let target = this.entity_manager.entities[target_ent_id];
  if (!target) {
    return void resp_func('ERR_INVALID_ENT_ID');
  }
  if (target.is_player && this.is_player) {
    return void resp_func('ERR_INVALID_TARGET_TYPE');
  }
  if (!this.isAlive()) {
    return void resp_func('ERR_DEAD');
  }
  if (!target.isAlive()) {
    return void resp_func('ERR_TARGET_DEAD');
  }

  let target_stats = target.data.stats;
  assert(target_stats.hp);

  if (!target.is_player) {
    let attacker_level = this.data.stats.level || 1;
    if (!target_stats.highest_hitter || attacker_level > target_stats.highest_hitter) {
      target.setDataSub('stats', 'highest_hitter', attacker_level);
    }
  }


  let new_hp = max(0, target_stats.hp - dam);
  target.setDataSub('stats', 'hp', new_hp);
  let ret: BroadcastDataDstat = { hp: -dam, source: this.id, action: 'attack', type, pred_id, executor, resist };
  if (!target_stats.hp) {
    ret.fatal = true;
    ret.highest_hitter = target_stats.highest_hitter;
    if (target.is_player) {
      // client should respawn somewhere, eventually
    } else {
      // TODO: loot drop
      // this.entity_manager.addEntityFromSerialized({
      //   type: 'container',
      //   floor: target.data.floor,
      //   pos: target.data.pos.slice(0),
      //   contents: [{
      //     type: 'essence',
      //     list: [{
      //       level: (target_stats.level || 0),
      //       essence: floor(random() * 6),
      //       amount: 10 + floor(random() * 100),
      //     }, {
      //       level: (target_stats.level || 0),
      //       essence: floor(random() * 6),
      //       amount: 10 + floor(random() * 100),
      //     }],
      //   }],
      // });
      this.entity_manager.deleteEntity(target_ent_id, 'killed');
    }
  }
  this.entity_manager.broadcast(target, 'dstat', ret);
  resp_func(null, ret); // broadcasting, but could send back as a response too?
}
entityServerRegisterActions([{
  action_id: 'attack',
  self_only: true,
  handler: handleActionAttack,
  allowed_data_assignments: {
    ready: 'boolean',
    'stats.mp': 'number',
    seq_player_move: 'string',
  },
}, {
  // Same handler, but allow on non-self with data assignments
  action_id: 'ai_attack',
  self_only: false,
  allowed_data_assignments: {
    seq_ai_update: 'string',
  },
  handler: handleActionAttack,
}, {
  action_id: 'ready',
  self_only: true,
  allowed_data_assignments: {
    ready: 'boolean',
    seq_player_move: 'string',
  },
}, {
  action_id: 'unready',
  self_only: false,
  allowed_data_assignments: {
    ready: 'boolean',
    seq_unready: 'string',
  },
}, {
  action_id: 'give_xp',
  self_only: true,
  allowed_data_assignments: {
    'stats.xp': 'number',
    'stats.hp': 'number',
    'stats.hp_max': 'number',
    'stats.level': 'number',
    seq_inventory: 'string',
  },
}, {
  action_id: 'respawn',
  self_only: true,
  allowed_data_assignments: {
    'stats.hp': 'number',
    'stats.xp': 'number',
    seq_inventory: 'string',
  },
}, {
  action_id: 'inv',
  self_only: true,
  allowed_data_assignments: {
    seq_inventory: 'string',
  },
  handler: function ({ payload }, resp_func) {
    let param = payload as ActionInventoryPayload;
    let { stats, inventory } = this.data;
    if (!inventory) {
      inventory = this.data.inventory = [];
    }
    if (param.dstats) {
      let broadcast = {
        executor: this.id,
      } as Partial<Record<string, number>>;
      let key: keyof StatsData;
      for (key in param.dstats) {
        let new_value = param.dstats[key]!;
        let old_value = stats[key] || 0;
        let delta = new_value - old_value;
        broadcast[key] = delta;
        // TODO: This should use data_assignments?
        stats[key] = new_value;
        this.dirtySub('stats', key);
      }
      this.entity_manager.broadcast(this, 'dstat', broadcast);
    }
    for (let ii = 0; ii < param.ops.length; ++ii) {
      let op = param.ops[ii];
      let { list, idx, delta, item } = op;
      let list_arr = inventory;
      if (list) {
        list_arr = this.data[list]!;
        if (!list_arr) {
          list_arr = this.data[list] = [];
        }
      }
      if (item) {
        if (list) {
          list_arr.splice(idx, 0, item);
        } else {
          list_arr[idx] = item;
        }
      } else {
        assert(typeof delta === 'number');
        assert(list_arr[idx]);
        list_arr[idx].count += delta;
        if (!list_arr[idx].count) {
          list_arr[idx] = null;
          if (list) {
            list_arr.splice(idx, 1);
          }
        }
      }
      if (list) {
        this.dirty(list);
      } else {
        this.dirtySub('inventory', idx);
      }
    }
    if (param.ready) {
      this.data.ready = true;
      this.dirty('ready');
    }
    resp_func();
  },
}]);
