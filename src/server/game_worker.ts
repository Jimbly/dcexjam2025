import assert from 'assert';
import fs from 'fs';
import { CmdRespFunc } from 'glov/common/cmd_parse';
import {
  ClientHandlerSource,
  DataObject,
  HandlerSource,
  NetErrorCallback,
  NetResponseCallback,
  TSMap,
} from 'glov/common/types';
import { empty, isInteger, msToSS2020 } from 'glov/common/util';
import { v3copy } from 'glov/common/vmath';
import { channelDataDifferCreate } from 'glov/server/channel_data_differ';
import { ChannelServer } from 'glov/server/channel_server';
import { ChannelData } from 'glov/server/channel_worker';
import { chattableWorkerInit } from 'glov/server/chattable_worker';
import { entityServerDefaultLoadPlayerEntity } from 'glov/server/entity_base_server';
import {
  createServerEntityManager,
  ServerEntityManager,
  ServerEntityManagerInterface,
} from 'glov/server/entity_manager_server';
import { CrawlerJoinPayload } from '../common/crawler_entity_common';
import '../common/crawler_events'; // side effects: register events
import {
  CrawlerLevel,
  CrawlerLevelSerialized,
} from '../common/crawler_state';
import { ELEMENT_NAME, FloorData, Item } from '../common/entity_game_common';
import { CrawlerWorker } from './crawler_worker';
import {
  EntityServer,
} from './entity_game_server';
import {
  serverEntitiesStartup,
  serverEntityAlloc,
} from './server_entities';

const { floor, random } = Math;

const GAME_WORKER_VERSION = 2;
const ENT_VERSION = 1; // Drops all serialized ents when this changes

type Entity = EntityServer;

type GameWorkerPrivateChannelData = {
  version: number;
  last_floor_id: number;
};
type GameWorkerPublicChannelData = {
  seed: string;
  floors: Partial<Record<number, FloorData>>;
};

type ChannelDataDiffer = ReturnType<typeof channelDataDifferCreate>;

export class GameWorker extends CrawlerWorker<Entity, GameWorker> {
  game_id: string;
  declare entity_manager: ServerEntityManager<Entity, GameWorker>;
  declare data: ChannelData<GameWorkerPrivateChannelData, GameWorkerPublicChannelData>;
  differ: ChannelDataDiffer;

  constructor(channel_server: ChannelServer, channel_id: string, channel_data: DataObject) {
    super(channel_server, channel_id, channel_data);

    this.differ = channelDataDifferCreate(this);
    this.game_id = this.channel_subid;

    if (!this.exists()) {
      // Debug: auto-create upon instantiation
      this.onCreate({ seed: 'test' }, false);
      this.setChannelData('private', this.data.private);
      this.setChannelData('public', this.data.public);
    }

    if (this.exists()) {
      // an actual, created game, do any migration/fixup needed
      let public_data = this.data.public;
      let private_data = this.data.private;
      private_data.version = private_data.version || 0;
      if (private_data.version < GAME_WORKER_VERSION) {
        this.onCreate(null, true);
        this.setChannelData('private', private_data);
        this.setChannelData('public', public_data);
      }
      if (!this.game_state) {
        this.initCrawlerState();
      }
    }
  }

  onCreate(data: { seed: string } | null, is_upgrade: boolean): void {
    let public_data = this.data.public;
    let private_data = this.data.private;
    if (!public_data.seed) {
      public_data.seed = data && data.seed || 'test';
    }
    private_data.version = GAME_WORKER_VERSION;
    private_data.last_floor_id = 100;
    this.initCrawlerState();
  }

  gameWorkerEntitiesOnUserReflectedData(
    user_id: string,
    user_data: DataObject,
    key: string | undefined,
    value: unknown,
  ): void {
    // let do_costume = !key || key.startsWith('public.costume');
    let do_display_name = !key || key === 'public.display_name';
    let display_name = key ? value : user_data.display_name;
    if (/*do_costume || */do_display_name) {
      // Find all entities associated with this user_id
      let { entity_manager } = this;
      let { clients } = entity_manager;
      for (let client_id in clients) {
        let client = clients[client_id]!;
        if (!client.ent_id) {
          continue;
        }
        let ent = entity_manager.getEntityForClient(client);
        assert(ent);
        if (ent.data.user_id === user_id) {
          // if (do_costume) {
          //   ent.setData('costume', user_data.costume || null);
          // }
          if (do_display_name) {
            ent.setData('display_name', display_name || null);
          }
        }
      }
    }
  }

  workerOnChannelData(src: HandlerSource, key: string | undefined, value: DataObject): void {
    if (src.type !== 'user') {
      return;
    }
    const { id } = src; // Note: `src` is a UserWorker, not a ClientWorker, so `id` is a user_id here
    if (key || !key && value?.public) {
      this.gameWorkerEntitiesOnUserReflectedData(id, value?.public as DataObject, key, value);
    }
  }

  // generator?: LevelGenerator;
  // levelFallbackProvider(floor_id: number, cb: (level_data: CrawlerLevelSerialized) => void): void {
  //   assert(this.generator);
  //   this.generator.provider(floor_id, cb);
  // }
  floor_level_for_id: Record<number, number> = {};
  levelFallbackProvider(floor_id: number, cb: (level_data: CrawlerLevelSerialized) => void): void {
    let floor_level = this.floor_level_for_id[floor_id] || 1;
    let file = './src/client/levels/level2.json';
    assert(fs.existsSync(file));
    let data = fs.readFileSync(file, 'utf8');
    let level_data: CrawlerLevelSerialized = JSON.parse(data);
    level_data.props = level_data.props || {};
    level_data.props.floorlevel = String(floor_level);
    let elements: number[] = [];
    let remap: TSMap<string> = {};
    let done: TSMap<boolean> = {};
    for (let ii = 0; ii < 3; ++ii) {
      let new_value;
      do {
        new_value = floor(random() * 3);
      // eslint-disable-next-line no-unmodified-loop-condition
      } while (ii === 2 && new_value === elements[0] && new_value === elements[1]);
      elements.push(new_value);
      let enemy_id;
      do {
        enemy_id = `enemy-${ELEMENT_NAME[new_value + 1]}-${floor(random() * 6) + 1}`;
      } while (done[enemy_id]);
      done[enemy_id] = true;
      remap[`enemy${ii}`] = enemy_id;
    }
    remap['enemy-boss'] = `enemy-rainbow-${floor(random() * 3) + 1}`;

    level_data.initial_entities?.forEach((ent) => {
      assert(ent.type && typeof ent.type === 'string');
      assert(remap[ent.type]);
      ent.type = remap[ent.type];
    });

    cb(level_data);
  }

  allocateFloor(floor_level: number): number {
    let floor_id = this.data.private.last_floor_id + 1;
    this.setChannelData('private.last_floor_id', floor_id);
    this.floor_level_for_id[floor_id] = floor_level;
    return floor_id;
  }

  initCrawlerState(): void {
    this.entity_manager = createServerEntityManager<Entity,GameWorker>({
      worker: this,
      create_func: serverEntityAlloc,
      load_player_func: ( // note: default from crawler_worker for now?
        sem: ServerEntityManagerInterface,
        src: ClientHandlerSource,
        join_payload: unknown,
        player_uid: string,
        cb: NetErrorCallback<Entity>,
      ) => {
        let payload = join_payload as CrawlerJoinPayload;
        this.game_state.getLevelForFloorAsync(0, (level: CrawlerLevel) => {
          entityServerDefaultLoadPlayerEntity<Entity>({
            type: 'player',
            floor: 0,
            pos: level.special_pos.stairs_in,
          }, sem, src, join_payload, player_uid, function (err: null | string, ent?: Entity) {
            if (ent) {
              if (payload.pos) {
                // This is only for transitioning from offline-play to online-build mode for the first time in a session
                assert(typeof payload.floor_id === 'number');
                v3copy(ent.data.pos, payload.pos);
                ent.data.floor = payload.floor_id;
                ent.finishCreation();
              }
              if (src.display_name) {
                ent.data.display_name = src.display_name;
              }
              if (src.user_id) {
                ent.data.user_id = src.user_id;
              }
            }

            cb(err, ent);
          });
        });
      },
      serialized_ent_version: ENT_VERSION,
    });
    // this.generator = levelGeneratorCreate({
    //   seed: this.data.public.seed,
    //   default_vstyle: 'dcex',
    // });
    this.initCrawlerStateBase();
  }

  exists(): boolean {
    return Boolean(this.getChannelData('public.seed'));
  }

  // initializeNewEntInstanceData(data: GamePlayerInstanceData, next: () => void): void {
  //   this.game_state.getLevelForFloorAsync(data.floor, (level: CrawlerLevel) => {
  //     v3copy(data.pos, level.special_pos.stairs_in);
  //     next();
  //   });
  // }

  // semClientInitialVisibleAreaSees(join_payload: JoinPayload, sem_client: SEMClient): VAID[] {
  //   let ent = this.entity_manager.getEntityForClient(sem_client);
  //   assert(ent);
  //   return ent.visibleAreaSees();
  // }

  // scriptAPICreate(): CrawlerScriptAPIServer {
  //   return gameScriptAPIServerCreate();
  // }

  updateFloorData(): void {
    let { entity_manager, game_state } = this;
    let { entities } = entity_manager;
    let now = msToSS2020(Date.now());
    now = Math.floor(now / 10) * 10;

    // Determine current data
    let players: TSMap<{ floor_id: number }> = {};
    let new_floors: Partial<Record<number, FloorData>> = {};
    for (let ent_id_str in entities) {
      let ent = entities[ent_id_str]!;
      let floor_id = ent.data.floor || 0;
      if (!floor_id) {
        continue;
      }
      let level = game_state.levels[floor_id];
      if (!level || !level.initial_entities) {
        continue;
      }
      let floor_level_str = level.props.floorlevel;
      if (!floor_level_str) {
        continue;
      }
      let floor_level = Number(floor_level_str);
      assert(floor_level >= 1);
      let floor_data = new_floors[floor_level];
      if (!floor_data) {
        floor_data = new_floors[floor_level] = {
          rooms: {},
        };
      }
      let room_data = floor_data.rooms[floor_id];
      if (!room_data) {
        room_data = floor_data.rooms[floor_id] = {
          last_active: 0,
          recent_players: {},
          enemies_left: 0,
          enemies_total: level.initial_entities.length,
        };
      }
      if (ent.isEnemy()) {
        room_data.enemies_left++;
      } else if (ent.isPlayer()) {
        let user_id = ent.data.user_id;
        assert(user_id);
        room_data.last_active = now;
        room_data.recent_players[user_id] = {
          player_level: ent.data.stats.level,
          is_active: true,
          last_active: now,
        };
        players[user_id] = {
          floor_id,
        };
      }
    }

    // Update public data
    this.differ.start();
    let expire_time = now - 30*24*60*60;
    let old_floors: Partial<Record<number, FloorData>> = this.data.public.floors;
    if (!old_floors) {
      old_floors = this.data.public.floors = {};
    }
    let seen_rooms: Partial<Record<number, boolean>> = {};
    for (let floor_level_str in old_floors) {
      let floor_level = Number(floor_level_str);
      let old_floor_data = old_floors[floor_level]!;
      let new_floor_data = new_floors[floor_level] || { rooms: {} };
      for (let floor_id_str in old_floor_data.rooms) {
        let floor_id = Number(floor_id_str);
        let old_room_data = old_floor_data.rooms[floor_id]!;
        let new_room_data = new_floor_data.rooms[floor_id];
        let seen_users: TSMap<boolean> = {};
        if (new_room_data) {
          // merge in
          seen_rooms[floor_id] = true;
          old_room_data.last_active = new_room_data.last_active;
          old_room_data.enemies_left = new_room_data.enemies_left;
          for (let user_id in new_room_data.recent_players) {
            let new_rec = new_room_data.recent_players[user_id]!;
            old_room_data.recent_players[user_id] = new_rec;
            seen_users[user_id] = true;
          }
        }
        for (let user_id in old_room_data.recent_players) {
          let rec = old_room_data.recent_players[user_id]!;
          if (rec.last_active < expire_time) {
            delete old_room_data.recent_players[user_id];
          } else if (!seen_users[user_id] && rec.is_active) {
            delete rec.is_active;
          }
        }
        if (empty(old_room_data.recent_players)) {
          delete old_floor_data.rooms[floor_id];
        }
      }
    }
    // add in new rooms
    for (let floor_level_str in new_floors) {
      let floor_level = Number(floor_level_str);
      let new_floor_data = new_floors[floor_level]!;
      let old_floor_data = old_floors[floor_level];
      if (!old_floor_data) {
        old_floor_data = old_floors[floor_level] = {
          rooms: {},
        };
      }
      for (let floor_id_str in new_floor_data.rooms) {
        let floor_id = Number(floor_id_str);
        if (seen_rooms[floor_id]) {
          continue;
        }
        old_floor_data.rooms[floor_id] = new_floor_data.rooms[floor_id]!;
      }
    }

    this.differ.end();
  }

  tick(dt: number, server_time: number): void {
    this.entity_manager.tick(dt, server_time);
    this.updateFloorData(); // TODO: call after appropriate data changes
  }
}
GameWorker.prototype.user_fields_to_subscribe = ['public.display_name'];
GameWorker.prototype.overrides_constructor = true;

chattableWorkerInit(GameWorker);

// note: identical to the one in crawlerWorkerInit for now?
GameWorker.registerClientHandler('ent_join', function (
  this: GameWorker,
  src: ClientHandlerSource,
  payload: CrawlerJoinPayload,
  resp_func: NetResponseCallback
): void {
  let { user_id } = src;
  assert(user_id);
  this.entity_manager.clientJoin(src, user_id, payload);
  resp_func();
});

GameWorker.registerCmds([{
  cmd: 'give',
  help: 'Gives oneself item',
  prefix_usage_with_help: true,
  usage: '/give hat|book|potion subtype level [count]',
  func: function (this: GameWorker, str: string, resp_func: CmdRespFunc) {
    let ent = this.cmdFindEnt();
    if (!ent) {
      return void resp_func('Could not find relevant entity');
    }
    let tokens = str.split(' ');
    if (tokens.length !== 3 && tokens.length !== 4) {
      return void resp_func('Error parsing arguments');
    }
    let type = tokens[0];
    if (type !== 'hat' && type !== 'book' && type !== 'potion') {
      return void resp_func('Invalid type');
    }
    let subtype = Number(tokens[1]);
    let level = Number(tokens[2]);
    let count = tokens[3] ? Number(tokens[3]) : 1;
    if (!isInteger(subtype) || !isInteger(level) || !isInteger(count)) {
      return void resp_func('Error parsing arguments');
    }
    let item: Item = {
      type,
      subtype,
      level,
      count,
    };

    ent.pickup(item);
    resp_func();
  },
// }, {
//   cmd: 'key_user',
//   help: 'Show or toggle per-game-per-user-scoped keys',
//   func: function (this: GameWorker, str: string, resp_func: CmdRespFunc) {
//     let ent = this.cmdFindEnt();
//     if (!ent) {
//       return void resp_func('Could not find relevant entity');
//     }
//     if (!str) {
//       let keys = Object.keys(ent.data.keys || {});
//       return void resp_func(null, `User keys = ${keys.join()}`);
//     }
//     let old = ent.data.keys && ent.data.keys[str];
//     ent.setDataSub('keys', str, old ? null : true);
//     resp_func(null, `User key "${str}" ${old ? 'cleared' : 'set'}`);
//   },
}]);

export function gameWorkerInit(channel_server: ChannelServer): void {
  channel_server.registerChannelWorker('game', GameWorker, {
    autocreate: true,
    subid_regex: /^.+$/,
  });
  serverEntitiesStartup();
}
