import { TraitFactory } from 'glov/common/trait_factory';
import { DataObject } from 'glov/common/types';

import type { EntityClient } from '../client/entity_game_client';
import type { EntityServer } from '../server/entity_game_server';

const { floor, random } = Math;

type Entity = EntityClient | EntityServer;

type StatsEnemyData = {
  hp: number;
  attack: number;
  defense: number;
};

export function gameEntityTraitsCommonStartup(
  ent_factory: TraitFactory<EntityClient, DataObject> | TraitFactory<EntityServer, DataObject>
): void {
  ent_factory.registerTrait<StatsEnemyData, undefined>('stats_enemy', {
    default_opts: {
      hp: 5,
      attack: 3,
      defense: 0,
    },
    alloc_state: function (opts: StatsEnemyData, ent: Entity) {
      // TODO: use a callback that doesn't actually need to allocate any state on the entity?
      if (!ent.data.stats) {
        let level = 1; // TODO: implicit from ent.data.floor
        let hp = 17 + (level - 1) * 5 + floor(random() * opts.hp);
        ent.data.stats = {
          hp,
          hp_max: hp,
          level,
          attack: opts.attack + (level - 1),
          defense: opts.defense + (level - 1),
          // player-only:
          xp: 0,
          mp: 0,
          mp_max: 0,
        };
      }
      return undefined;
    }
  });
  ent_factory.extendTrait('enemy', {
    properties: {
      blocks_player: true,
    },
  });
}
