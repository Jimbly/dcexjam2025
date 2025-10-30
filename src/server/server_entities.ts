import assert from 'assert';
import { TraitFactory } from 'glov/common/trait_factory';
import { DataObject } from 'glov/common/types';
import { entityManagerForConstructor } from 'glov/server/entity_manager_server';
import { ELEMENT, ElementName } from '../common/entity_game_common';
import { gameEntityTraitsCommonStartup } from '../common/game_entity_traits_common';
import {
  crawlerEntFactory,
  crawlerEntityAlloc,
  crawlerEntityServerStarupEarly,
  crawlerEntityTraitsServerStartup,
} from './crawler_entity_server';
import { EntityServer } from './entity_game_server';
import { GameWorker } from './game_worker';

const { ceil, floor, random } = Math;

type Entity = EntityServer;

type StatsEnemyData = {
  hp: number;
  attack: number;
  defense: number;
  element?: ElementName;
};

function entityTraitsServerStartup(ent_factory: TraitFactory<Entity, DataObject>): void {
  // Game-specific
  ent_factory.extendTrait<StatsEnemyData, undefined>('stats_enemy', {
    default_opts: {
      hp: 5,
      attack: 3,
      defense: 0,
    },
    alloc_state: function (opts: StatsEnemyData, ent: Entity) {
      // TODO: use a callback that doesn't actually need to allocate any state on the entity?
      if (!ent.data.stats) {
        let floor_id = ent.data.floor;
        assert(floor_id);
        let worker = entityManagerForConstructor<Entity, GameWorker>().worker;
        let game_state = worker.game_state;
        let level = game_state.levels[floor_id];
        assert(level);
        let floor_level_str = level.props.floorlevel;
        if (!floor_level_str) {
          floor_level_str = '1';
        }
        let floor_level = Number(floor_level_str);
        let hp = 17 + (floor_level - 1) + floor(random() * opts.hp);
        ent.data.stats = {
          hp,
          hp_max: hp,
          level: floor_level,
          attack: opts.attack + (floor_level - 1),
          defense: ceil(opts.defense * floor_level),
          // player-only:
          xp: 0,
          mp: 0,
        };
        let stats = ent.data.stats;
        if (opts.element) {
          stats[`r${opts.element}`] = 50;
          stats.element = ELEMENT[opts.element];
        }
      }
      return undefined;
    }
  });

}

export function serverEntityAlloc(data: DataObject): Entity {
  return crawlerEntityAlloc(data) as Entity;
}

export function serverEntitiesStartup(): void {
  crawlerEntityServerStarupEarly();
  let ent_factory = crawlerEntFactory<Entity>();
  gameEntityTraitsCommonStartup(ent_factory);
  entityTraitsServerStartup(ent_factory);

  crawlerEntityTraitsServerStartup({
    name: 'EntityServer',
    Ctor: EntityServer,
    doing_own_net: true,
  });
}
