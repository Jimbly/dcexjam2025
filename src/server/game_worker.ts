import assert from 'assert';
import {
  ClientHandlerSource,
  DataObject,
  NetErrorCallback,
  NetResponseCallback,
} from 'glov/common/types';
import { v3copy } from 'glov/common/vmath';
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
import { CrawlerLevel } from '../common/crawler_state';
import { CrawlerWorker } from './crawler_worker';
import {
  EntityServer,
} from './entity_game_server';
import {
  serverEntitiesStartup,
  serverEntityAlloc,
} from './server_entities';

const GAME_WORKER_VERSION = 1;
const ENT_VERSION = 1; // Drops all serialized ents when this changes

type Entity = EntityServer;

type GameWorkerPrivateChannelData = {
  version: number;
};
type GameWorkerPublicChannelData = {
  seed: string;
};

export class GameWorker extends CrawlerWorker<Entity, GameWorker> {
  game_id: string;
  declare entity_manager: ServerEntityManager<Entity, GameWorker>;
  declare data: ChannelData<GameWorkerPrivateChannelData, GameWorkerPublicChannelData>;

  constructor(channel_server: ChannelServer, channel_id: string, channel_data: DataObject) {
    super(channel_server, channel_id, channel_data);

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
    this.initCrawlerState();
  }

  // generator?: LevelGenerator;
  // levelFallbackProvider(floor_id: number, cb: (level_data: CrawlerLevelSerialized)=> void): void {
  //   assert(this.generator);
  //   this.generator.provider(floor_id, cb);
  // }

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
            if (ent && payload.pos) {
              // This is only for transitioning from offline-play to online-build mode for the first time in a session
              assert(typeof payload.floor_id === 'number');
              v3copy(ent.data.pos, payload.pos);
              ent.data.floor = payload.floor_id;
              ent.finishCreation();
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
}
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

// GameWorker.registerCmds([{
//   cmd: 'give',
//   help: 'Gives oneself items or refinery inputs',
//   prefix_usage_with_help: true,
//   usage: '/give essence [level [essence amount]]\n' +
//     '/give spell [id [rarity [level]]]',
//   func: function (this: GameWorker, str: string, resp_func: CmdRespFunc) {
//     let ent = this.cmdFindEnt();
//     if (!ent) {
//       return void resp_func('Could not find relevant entity');
//     }
//     let tokens = str.split(' ');
//     let item: Item | undefined;
//     if (tokens[0] === 'essence') {
//       let level = Number(tokens[1]) || (1 + ent.data.floor);
//       if (tokens.length === 4) {
//         item = {
//           type: 'essence',
//           list: [{
//             level,
//             essence: Number(tokens[2]),
//             amount: Number(tokens[3]),
//           }],
//         };
//       } else {
//         item = {
//           type: 'essence',
//           list: [{
//             level,
//             essence: mathFloor(random() * 6),
//             amount: 10 + mathFloor(random() * 100),
//           }, {
//             level,
//             essence: mathFloor(random() * 6),
//             amount: 10 + mathFloor(random() * 100),
//           }],
//         };
//       }
//     } else if (tokens[0] === 'spell') {
//       item = {
//         type: 'spell',
//         spell_id: tokens[1] || 'dummy',
//         rarity: Number(tokens[2]) || 0,
//         level: Number(tokens[3]) || (1 + ent.data.floor),
//       };
//     }
//
//     if (!item) {
//       return void resp_func('Error parsing arguments');
//     }
//     if (ent.pickup(item, true)) {
//       ent.sendClientMessage({
//         msg: 'pickup',
//         data: {
//           contents: [item],
//         },
//       });
//     } else {
//       ent.sendClientMessage({
//         msg: 'pickup_failed',
//       });
//     }
//     resp_func();
//   },
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
// }]);

export function gameWorkerInit(channel_server: ChannelServer): void {
  channel_server.registerChannelWorker('game', GameWorker, {
    autocreate: true,
    subid_regex: /^.+$/,
  });
  serverEntitiesStartup();
}
