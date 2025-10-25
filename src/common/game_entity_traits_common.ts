import { TraitFactory } from 'glov/common/trait_factory';
import { DataObject } from 'glov/common/types';
import { clone } from 'glov/common/util';

import type { EntityClient } from '../client/entity_game_client';
import type { EntityServer } from '../server/entity_game_server';
import { StatsData } from './entity_game_common';

type Entity = EntityClient | EntityServer;

export function gameEntityTraitsCommonStartup(
  ent_factory: TraitFactory<EntityClient, DataObject> | TraitFactory<EntityServer, DataObject>
): void {
  ent_factory.registerTrait<StatsData, undefined>('stats_default', {
    default_opts: {
      hp: 10,
      hp_max: 0, // inherit from hp
      level: 1,
    } as StatsData, // moraff hack
    alloc_state: function (opts: StatsData, ent: Entity) {
      // TODO: use a callback that doesn't actually need to allocate any state on the entity?
      if (!ent.data.stats) {
        ent.data.stats = clone(opts);
        if (!ent.data.stats.hp_max) {
          ent.data.stats.hp_max = ent.data.stats.hp;
        }
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
