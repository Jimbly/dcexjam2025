import assert from 'assert';
import {
  EntityFieldEncoding,
  EntityFieldSub,
} from 'glov/common/entity_base_common';
import {
  DataObject,
} from 'glov/common/types';
import { JSVec3, v3copy } from 'glov/common/vmath';
import {
  EntityBaseServer,
  entityServerRegisterActions,
  entityServerRegisterFieldDefs,
} from 'glov/server/entity_base_server';
import {
  entityGameCommonClass,
  EntityGameDataCommon,
} from '../common/entity_game_common';
import { EntityCrawlerDataServer, EntityCrawlerServer } from './crawler_entity_server';

const { floor } = Math;

// TODO: move when common/util is moved to TypeScript?
type Integer = { _opaque: 'integer' } & number;
function isInteger(v: unknown): v is Integer {
  return typeof v === 'number' && isFinite(v) && floor(v) === v;
}

export type EntityGameDataServer = EntityCrawlerDataServer & EntityGameDataCommon;

entityServerRegisterFieldDefs<EntityGameDataServer>({
  type: { encoding: EntityFieldEncoding.AnsiString },
  pos: { encoding: EntityFieldEncoding.IVec3 },
  state: { ephemeral: true, encoding: EntityFieldEncoding.AnsiString },
  floor: { encoding: EntityFieldEncoding.Int },
  costume: { encoding: EntityFieldEncoding.Int },
  stats: { sub: EntityFieldSub.Record, encoding: EntityFieldEncoding.Int },
  seq_player_move: { encoding: EntityFieldEncoding.AnsiString },
  vis_data: { server_only: true },
});

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
    }
    if ((this.data.pos as number[]).length === 2) {
      // enemies don't have a rotation, but are serialized to the client as a Vec3, so need one here
      this.data.pos.push(0);
    }
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
  },
}, {
  action_id: 'set_debug',
  self_only: false,
  allow_any_assignment: true,
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
