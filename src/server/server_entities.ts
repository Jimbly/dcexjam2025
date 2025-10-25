import { TraitFactory } from 'glov/common/trait_factory';
import { DataObject } from 'glov/common/types';
import { gameEntityTraitsCommonStartup } from '../common/game_entity_traits_common';
import {
  crawlerEntFactory,
  crawlerEntityAlloc,
  crawlerEntityServerStarupEarly,
  crawlerEntityTraitsServerStartup,
} from './crawler_entity_server';
import { EntityServer } from './entity_game_server';

type Entity = EntityServer;

function entityTraitsServerStartup(ent_factory: TraitFactory<Entity, DataObject>): void {
  // Game-specific
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
