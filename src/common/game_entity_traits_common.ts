import { TraitFactory } from 'glov/common/trait_factory';
import { DataObject } from 'glov/common/types';

import type { EntityClient } from '../client/entity_game_client';
import type { EntityServer } from '../server/entity_game_server';
import { ElementName } from './entity_game_common';

// type Entity = EntityClient | EntityServer;

type StatsEnemyData = {
  hp: number;
  attack: number;
  defense: number;
  element?: ElementName;
};

export function gameEntityTraitsCommonStartup(
  ent_factory: TraitFactory<EntityClient, DataObject> | TraitFactory<EntityServer, DataObject>
): void {
  ent_factory.registerTrait<StatsEnemyData, undefined>('stats_enemy', {
    // server-only
    // default_opts: {
    //   hp: 5,
    //   attack: 3,
    //   defense: 0,
    // },
    // alloc_state: function (opts: StatsEnemyData, ent: Entity) {
    //   // TODO: use a callback that doesn't actually need to allocate any state on the entity?
    //   if (!ent.data.stats) {
    //     let level = 2; // TODO: implicit from ent.data.floor
    //     let hp = 17 + (level - 1) + floor(random() * opts.hp);
    //     ent.data.stats = {
    //       hp,
    //       hp_max: hp,
    //       level,
    //       attack: opts.attack + (level - 1),
    //       defense: ceil(opts.defense * level),
    //       // player-only:
    //       xp: 0,
    //       mp: 0,
    //     };
    //     let stats = ent.data.stats;
    //     if (opts.element) {
    //       stats[`r${opts.element}`] = 50;
    //       stats.element = ELEMENT[opts.element];
    //     }
    //   }
    //   return undefined;
    // }
  });
  ent_factory.extendTrait('enemy', {
    properties: {
      blocks_player: true,
    },
  });
}
