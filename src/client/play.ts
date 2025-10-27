import assert from 'assert';
import { autoAtlas } from 'glov/client/autoatlas';
import { cmd_parse } from 'glov/client/cmds';
import * as engine from 'glov/client/engine';
import { EntityPredictionID } from 'glov/client/entity_base_client';
import {
  ALIGN,
  Font,
  fontStyle,
  fontStyleAlpha,
  fontStyleColored,
} from 'glov/client/font';
import * as input from 'glov/client/input';
import {
  keyDownEdge,
  KEYS,
  keyUpEdge,
  PAD,
  padButtonUpEdge,
} from 'glov/client/input';
import { ClientChannelWorker, netSubs } from 'glov/client/net';
import { MenuItem } from 'glov/client/selection_box';
import * as settings from 'glov/client/settings';
import {
  settingsRegister,
  settingsSet,
} from 'glov/client/settings';
import { SimpleMenu, simpleMenuCreate } from 'glov/client/simple_menu';
import {
  Sprite,
  spriteCreate,
} from 'glov/client/sprites';
import {
  ButtonStateString,
  buttonText,
  drawBox,
  drawRect,
  menuUp,
  modalDialog,
  playUISound,
  print,
  uiButtonWidth,
  uiGetFont,
  uiGetTitleFont,
  uiTextHeight,
} from 'glov/client/ui';
import * as urlhash from 'glov/client/urlhash';
import { webFSAPI } from 'glov/client/webfs';
import { EntityManagerEvent } from 'glov/common/entity_base_common';
import {
  EntityID,
} from 'glov/common/types';
import { clamp, clone, easeOut, ridx } from 'glov/common/util';
import {
  JSVec2,
  JSVec3,
  ROVec2,
  v3copy,
  Vec2,
  vec4,
} from 'glov/common/vmath';
import { damage, POTION_HEAL_AMOUNT, xpToLevelUp } from '../common/combat';
import {
  BLOCK_MOVE,
  crawlerLoadData,
  DirType,
  DX,
  DY,
} from '../common/crawler_state';
import {
  ActionAttackPayload,
  ActionInventoryOp,
  ActionInventoryPayload,
  BroadcastDataDstat,
  Item,
  StatsData,
} from '../common/entity_game_common';
import { gameEntityTraitsCommonStartup } from '../common/game_entity_traits_common';
import {
  aiStepFloor,
  aiTraitsClientStartup,
} from './ai';
// import './client_cmds';
import {
  buildModeActive,
  crawlerBuildModeUI,
} from './crawler_build_mode';
import {
  crawlerCommStart,
  crawlerCommWant,
  getChatUI,
} from './crawler_comm';
import {
  controllerOnBumpEntity,
  CrawlerController,
  crawlerControllerTouchHotzonesAuto,
} from './crawler_controller';
import {
  crawlerEntFactory,
  crawlerEntityClientStartupEarly,
  crawlerEntityManager,
  crawlerEntityTraitsClientStartup,
  crawlerMyApplyBatchUpdate,
  crawlerMyEnt,
  crawlerMyEntOptional,
  isLocal,
  isOnline,
  myEntID,
} from './crawler_entity_client';
import {
  crawlerMapViewDraw,
  crawlerMapViewStartup,
  mapViewActive,
  mapViewSetActive,
  mapViewToggle,
} from './crawler_map_view';
import {
  crawlerBuildModeActivate,
  crawlerController,
  crawlerGameState,
  crawlerPlayBottomOfFrame,
  crawlerPlayInitOffline,
  crawlerPlayStartup,
  crawlerPlayTopOfFrame,
  crawlerPlayWantMode,
  crawlerPrepAndRenderFrame,
  crawlerSaveGame,
  crawlerScriptAPI,
  crawlerTurnBasedClearQueue,
  crawlerTurnBasedMovePreStart,
  crawlerTurnBasedQueued,
  crawlerTurnBasedScheduleStep,
  getScaledFrameDt,
} from './crawler_play';
import {
  crawlerRenderViewportSet,
  renderViewportShear,
} from './crawler_render';
import {
  crawlerEntInFront,
  crawlerRenderEntitiesStartup,
} from './crawler_render_entities';
import { crawlerScriptAPIDummyServer } from './crawler_script_api_client';
import { crawlerOnScreenButton } from './crawler_ui';
import { dialogNameRender } from './dialog_data';
import { dialogMoveLocked, dialogRun, dialogStartup } from './dialog_system';
import { EntityClient, entityManager } from './entity_game_client';
import {
  game_height,
  game_width,
  render_height,
  render_width,
  VIEWPORT_X0,
  VIEWPORT_Y0,
} from './globals';
import { levelGenTest } from './level_gen_test';
import { tinyFont } from './main';
import { tickMusic } from './music';
import {
  PAL_BLACK,
  PAL_RED,
  PAL_WHITE,
  palette,
  palette_font,
} from './palette';
import { renderAppStartup } from './render_app';
import {
  statusPush,
  statusSet,
  statusTick,
} from './status';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { abs, ceil, floor, max, min, round } = Math;

declare module 'glov/client/settings' {
  export let ai_pause: 0 | 1; // TODO: move to ai.ts
  export let show_fps: 0 | 1;
  export let turn_toggle: 0 | 1;
}

// const ATTACK_WINDUP_TIME = 1000;
// const MINIMAP_RADIUS = 3;
const MINIMAP_X = 332;
const MINIMAP_Y = 8;
const MINIMAP_W = 80;
const MINIMAP_H = 68;
const MINIMAP_STEP_SIZE = 12;
const MINIMAP_TILE_SIZE = MINIMAP_STEP_SIZE * 12/12;
const FULLMAP_STEP_SIZE = MINIMAP_STEP_SIZE;
const FULLMAP_TILE_SIZE = FULLMAP_STEP_SIZE * 12/12;
const COMPASS_X = MINIMAP_X;
const COMPASS_Y = MINIMAP_Y + MINIMAP_H;
const BUTTON_W = 18;
const FONT_HEIGHT = 11;
const TINY_FONT_H = 8;
const TITLE_FONT_H = 14;

const BATTLEZONE_RANGE = 3;
const MAX_TICK_RANGE = 12; // if enemies are more steps than this from a player, use Manhattan dist instead

type Entity = EntityClient;

let font: Font;
let title_font: Font;
let tiny_font: Font;

// let loading_level = false;

let controller: CrawlerController;

let button_sprites: Record<ButtonStateString, Sprite>;
let button_sprites_down: Record<ButtonStateString, Sprite>;
let button_sprites_notext: Record<ButtonStateString, Sprite>;
let button_sprites_notext_down: Record<ButtonStateString, Sprite>;
type BarSprite = {
  bg: Sprite;
  hp: Sprite;
  empty?: Sprite;
};
let bar_sprites: {
  healthbar: BarSprite;
  tinyhealth: BarSprite;
  doublehp: BarSprite;
  doublemp: BarSprite;
  mpbar: BarSprite;
  xpbar: BarSprite;
};

let frame_sprites: {
  horiz: Sprite;
  vert: Sprite;
  horiz_red: Sprite;
  vert_red: Sprite;
};

const outline_width = 2.5;
const style_text = fontStyle(null, {
  color: palette_font[PAL_WHITE],
  outline_width,
  outline_color: palette_font[PAL_BLACK],
});

export function myEnt(): Entity {
  return crawlerMyEnt() as Entity;
}

export function myEntOptional(): Entity | undefined {
  return crawlerMyEntOptional() as Entity | undefined;
}

// function entityManager(): ClientEntityManagerInterface<Entity> {
//   return crawlerEntityManager() as ClientEntityManagerInterface<Entity>;
// }

abstract class UIAction {
  abstract tick(): void;
  declare name: string;
  declare is_overlay_menu: boolean;
}
UIAction.prototype.name = 'UnknownAction';
UIAction.prototype.is_overlay_menu = false;

let cur_action: UIAction | null = null;

function uiAction(action: UIAction | null): void {
  if (action) {
    assert(!cur_action);
    cur_action = action;
  } else {
    cur_action = null;
  }
}

const PAUSE_MENU_W = floor(160/346*game_width);
let pause_menu: SimpleMenu;
class PauseMenuAction extends UIAction {
  tick(): void {
    if (!pause_menu) {
      pause_menu = simpleMenuCreate({
        x: floor((game_width - PAUSE_MENU_W)/2),
        y: 50,
        z: Z.MODAL + 2,
        width: PAUSE_MENU_W,
      });
    }
    let items: MenuItem[] = [{
      name: 'Return to game',
      cb: function () {
        uiAction(null);
      },
    }, {
      name: 'SFX Vol',
      slider: true,
      value_inc: 0.05,
      value_min: 0,
      value_max: 1,
    }, {
      name: 'Mus Vol',
      slider: true,
      value_inc: 0.05,
      value_min: 0,
      value_max: 1,
    }, {
      name: `Turn: ${settings.turn_toggle ? 'A/S/4/6/←/→': 'Q/E/7/9/LB/RB'}`,
      cb: () => {
        settingsSet('turn_toggle', 1 - settings.turn_toggle);
      },
    }];
    if (isLocal()) {
      items.push({
        name: 'Save game',
        cb: function () {
          crawlerSaveGame('manual');
          statusPush('Game saved.');
          uiAction(null);
        },
      });
    }
    items.push({
      name: isOnline() ? 'Return to Title' : 'Save and Exit',
      cb: function () {
        if (!isOnline()) {
          crawlerSaveGame('manual');
        }
        urlhash.go('');
      },
    });
    if (isLocal()) {
      items.push({
        name: 'Exit without saving',
        cb: function () {
          urlhash.go('');
        },
      });
    }

    let volume_item = items[1];
    volume_item.value = settings.volume_sound;
    volume_item.name = `SFX Vol: ${(settings.volume_sound * 100).toFixed(0)}`;
    volume_item = items[2];
    volume_item.value = settings.volume_music;
    volume_item.name = `Mus Vol: ${(settings.volume_music * 100).toFixed(0)}`;

    pause_menu.run({
      slider_w: floor(PAUSE_MENU_W/2),
      items,
    });

    settingsSet('volume_sound', pause_menu.getItem(1).value as number);
    settingsSet('volume_music', pause_menu.getItem(2).value as number);

    menuUp();
  }
}
PauseMenuAction.prototype.name = 'PauseMenu';
PauseMenuAction.prototype.is_overlay_menu = true;

function v2manhattan(a: ROVec2, b: ROVec2): number {
  return abs(a[0] - b[0]) + abs(a[1] - b[1]);
}

function closestPlayerToIgnoreWalls(ent: Entity): EntityID {
  let entity_manager = entityManager();
  let game_state = crawlerGameState();
  let entities = entity_manager.entities;
  let { floor_id } = game_state;
  let { last_closest_ent } = ent;
  let best: EntityID = 0;
  let best_dist = Infinity;
  let pos = ent.getData<JSVec3>('pos')!;
  for (let ent_id in entities) {
    let other_ent = entities[ent_id]!;
    if (other_ent.data.floor !== floor_id || other_ent.fading_out) {
      // not on current floor
      continue;
    }
    if (!other_ent.isPlayer()) {
      continue;
    }
    let dist = v2manhattan(pos, other_ent.getData<JSVec3>('pos')!);
    if (
      !best || dist < best_dist ||
      dist === best_dist && other_ent.id === last_closest_ent ||
      dist === best_dist && best !== last_closest_ent && other_ent.id < best
    ) {
      best = other_ent.id;
      best_dist = dist;
    }
  }
  if (best) {
    ent.last_closest_ent = best;
  }
  return best;
}

function cmpNumber(a: number, b: number): number {
  return a - b;
}

function canIssueAction(): boolean {
  let me = myEnt();
  if (me.getData('ready', false) && me.battle_zone) {
    return false;
  }
  return true;
}

let battlezone_map: (boolean|undefined)[] = [];
let battlezone_map_stride = 0;
export function isBattleZone(x: number, y: number): boolean {
  return Boolean(battlezone_map[x + y * battlezone_map_stride]);
}
function battleZonePrep(): void {
  let script_api = crawlerScriptAPI();
  script_api.is_visited = true; // Always visited for AI
  let entity_manager = entityManager();
  let game_state = crawlerGameState();
  let entities = entity_manager.entities;
  let { floor_id } = game_state;
  let level = game_state.levels[floor_id];
  if (!level) {
    return;
  }
  script_api.setLevel(level);
  let stride = battlezone_map_stride = level.w + 100;
  // for each player, claim closest entities
  let players: Entity[] = [];
  let enemy_pos_map: Entity[][] = [];
  for (let ent_id in entities) {
    let other_ent = entities[ent_id]!;
    if (other_ent.data.floor !== floor_id || other_ent.fading_out) {
      // not on current floor
      continue;
    }
    if (other_ent.isPlayer()) {
      players.push(other_ent);
    } else if (other_ent.isEnemy()) {

      let pos = other_ent.getData<JSVec3>('pos')!;
      let idx = pos[0] + pos[1] * stride;
      let cell = enemy_pos_map[idx];
      if (!cell) {
        cell = enemy_pos_map[idx] = [];
      }
      cell.push(other_ent);
      other_ent.closest_ent_dist = Infinity;
      other_ent.closest_ent = 0;
      other_ent.in_zone_ents.length = 0;
    }
  }
  let todo: JSVec3[] = []; // x, y, dist
  let done: Partial<Record<number, true>>;
  let player_ent_id: EntityID;
  function push(pos: JSVec3): void {
    let idx = pos[0] + pos[1] * stride;
    let dist = pos[2];
    let cell = enemy_pos_map[idx];
    if (cell) {
      for (let ii = 0; ii < cell.length; ++ii) {
        let enemy_ent = cell[ii];
        if (
          !enemy_ent.closest_ent || dist < enemy_ent.closest_ent_dist ||
          dist === enemy_ent.closest_ent_dist && (
            player_ent_id === enemy_ent.last_closest_ent ||
            enemy_ent.closest_ent !== enemy_ent.last_closest_ent && player_ent_id < enemy_ent.closest_ent
          )
        ) {
          enemy_ent.closest_ent = player_ent_id;
          enemy_ent.closest_ent_dist = dist;
        }
        if (dist <= BATTLEZONE_RANGE) {
          enemy_ent.in_zone_ents.push(player_ent_id);
        }
      }
    }
    todo.push(pos);
    done[idx] = true;
    assert(todo.length < level.w * level.h * 2);
  }
  for (let ii = 0; ii < players.length; ++ii) {
    let player = players[ii];
    player_ent_id = player.id;
    todo.length = 0;
    let todo_idx = 0;
    done = {};
    let player_pos = player.getData<JSVec2>('pos')!;
    push([player_pos[0], player_pos[1], 0]);

    while (todo_idx < todo.length) {
      let pos = todo[todo_idx++];
      if (pos[2] > MAX_TICK_RANGE) {
        break;
      }
      for (let dir = 0 as DirType; dir < 4; ++dir) {
        let target: JSVec3 = [pos[0] - DX[dir], pos[1] - DY[dir], pos[2] + 1];
        if (target[0] < 0 || target[0] >= level.w || target[1] < 0 || target[1] >= level.h) {
          continue;
        }
        let target_idx = target[0] + target[1] * stride;
        if (done[target_idx]) {
          continue;
        }
        // check _from_ target to us, only want paths a monster could follow to get to us
        if (level.wallsBlock(target, dir, script_api) & BLOCK_MOVE) {
          continue;
        }
        push(target);
      }
    }
  }

  // store best on entities, calculate battle zones
  let battle_zones: Record<EntityID, EntityID> = {};
  let battle_zone_is_multiplayer: Record<EntityID, boolean> = {};
  for (let ii = 0; ii < players.length; ++ii) {
    let player = players[ii];
    battle_zones[player.id] = player.id;
    battle_zone_is_multiplayer[player.id] = false;
  }
  function joinZones(lower: EntityID, higher: EntityID): void {
    battle_zones[higher] = battle_zones[lower];
    battle_zone_is_multiplayer[lower] = true;
  }
  for (let key in enemy_pos_map) {
    let cell = enemy_pos_map[key];
    if (cell) {
      for (let ii = 0; ii < cell.length; ++ii) {
        let enemy_ent = cell[ii];
        if (enemy_ent.closest_ent !== 0) {
          enemy_ent.last_closest_ent = enemy_ent.closest_ent;
        } else {
          // *no* player can be walked to from this entity (but it may be visible), take absolute distance
          closestPlayerToIgnoreWalls(enemy_ent);
        }
        if (enemy_ent.in_zone_ents.length > 1) {
          enemy_ent.in_zone_ents.sort(cmpNumber);
          for (let jj = 1; jj < enemy_ent.in_zone_ents.length; ++jj) {
            joinZones(enemy_ent.in_zone_ents[0], enemy_ent.in_zone_ents[jj]);
          }
        }
      }
    }
  }
  // paint battle zones on map, proceeding out from enemes
  battlezone_map.length = 0;
  function push2(pos: JSVec3): void {
    let idx = pos[0] + pos[1] * stride;
    let dist = pos[2];
    battlezone_map[idx] = true;
    if (dist < BATTLEZONE_RANGE) {
      todo.push(pos);
    }
    done[idx] = true;
    assert(todo.length < level.w * level.h * 2);
  }
  let my_eff_zone = battle_zones[myEnt().id];
  for (let key in enemy_pos_map) {
    let cell = enemy_pos_map[key];
    if (!cell) {
      continue;
    }
    let enemy_ent = cell[0];
    if (!enemy_ent.in_zone_ents.length) {
      continue;
    }
    let eff_zone = battle_zones[enemy_ent.in_zone_ents[0]];
    if (eff_zone === my_eff_zone) {
      // Don't paint the zone we're in
      continue;
    }

    // paint out from the entity position
    todo.length = 0;
    let todo_idx = 0;
    done = {};
    let enemy_pos = enemy_ent.getData<JSVec2>('pos')!;
    push2([enemy_pos[0], enemy_pos[1], 0]);

    while (todo_idx < todo.length) {
      let pos = todo[todo_idx++];
      for (let dir = 0 as DirType; dir < 4; ++dir) {
        let target: JSVec3 = [pos[0] + DX[dir], pos[1] + DY[dir], pos[2] + 1];
        if (target[0] < 0 || target[0] >= level.w || target[1] < 0 || target[1] >= level.h) {
          continue;
        }
        let target_idx = target[0] + target[1] * stride;
        if (done[target_idx]) {
          continue;
        }
        if (level.wallsBlock(pos, dir, script_api) & BLOCK_MOVE) {
          continue;
        }
        push2(target);
      }
    }

  }
  // store effective battle zones on players
  for (let ii = 0; ii < players.length; ++ii) {
    let player = players[ii];
    let eff_zone = battle_zones[player.id];
    if (battle_zone_is_multiplayer[eff_zone] || engine.defines.ALWAYS_BATTLEZONE) {
      player.battle_zone = eff_zone;
    } else {
      player.battle_zone = 0;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  if (!crawlerTurnBasedQueued() && myEnt().getData('ready') && aiStepAllowed()) {
    // no step is queued, but everyone's ready and I'm the leader, or no longer in a battle zone
    crawlerTurnBasedScheduleStep(250);
  }
  if (crawlerTurnBasedQueued() && !myEnt().getData('ready')) {
    // a tick is queued, but I'm not ready, presumably not the leader, someone else
    // cleared my ready state, also cancel the tick
    crawlerTurnBasedClearQueue();
  }
}

function battleZoneDebug(): void {
  let x = 12;
  let y = 40;
  let z = Z.DEBUG;
  let my_ent = myEntOptional();
  if (!my_ent || engine.defines.LEVEL_GEN) {
    return;
  }
  const text_height = uiTextHeight();
  print(style_text, x, y, z, `BattleZone: ${my_ent.battle_zone} (me=${my_ent.id})`);
  y += text_height;
  print(style_text, x, y, z, `Tick queued: ${crawlerTurnBasedQueued()}`);
  y += text_height;
  // print(style_text, x, y, z, `CanIssueAction: ${canIssueAction()}`);
  // y += text_height;

}

function errorsToChat(err: unknown): void {
  if (err) {
    getChatUI().addChat(`Error executing action: ${err}`, 'error');
  }
}

function aiStepAllowed(): boolean {
  let me = myEnt();
  if (!me.battle_zone) {
    return true;
  }

  if (me.battle_zone !== me.id) {
    // Someone else's in charge of it
    return false;
  }

  // if anyone in the battlezone is not ready, we cannot step yet
  let entity_manager = entityManager();
  let entities = entity_manager.entities;
  let game_state = crawlerGameState();
  let { floor_id } = game_state;
  for (let ent_id in entities) {
    let other_ent = entities[ent_id]!;
    if (other_ent.data.floor !== floor_id || other_ent.fading_out ||
      !other_ent.isPlayer()
    ) {
      // not on current floor
      continue;
    }
    if (other_ent.battle_zone === me.battle_zone) {
      if (!other_ent.getData('ready')) {
        return false;
      }
    }
  }
  return true;
}

function aiStep(): void {
  if (buildModeActive() || settings.ai_pause || engine.defines.LEVEL_GEN) {
    return;
  }
  playUISound('rollover');
  let entity_manager = entityManager();
  let entities = entity_manager.entities;
  let game_state = crawlerGameState();
  let script_api = crawlerScriptAPI();
  script_api.is_visited = true; // Always visited for AI
  let { floor_id } = game_state;
  let level = game_state.levels[floor_id];
  assert(level);
  script_api.setLevel(level);

  let my_ent_id = myEntID();
  let my_ent = myEnt();
  let the_battle_zone = my_ent.battle_zone;
  function entityFilter(ent: Entity): boolean {
    return Boolean(ent.last_closest_ent === my_ent_id ||
      the_battle_zone && ent.last_closest_ent && entities[ent.last_closest_ent]!.battle_zone === the_battle_zone);
  }

  aiStepFloor(game_state.floor_id, game_state, entityManager(), engine.defines,
    script_api,
    entityFilter);

  // for each player, unflag as ready
  for (let ent_id in entities) {
    let other_ent = entities[ent_id]!;
    if (other_ent.data.floor !== floor_id || other_ent.fading_out ||
      !other_ent.isPlayer() ||
      !other_ent.getData('ready')
    ) {
      continue;
    }
    if (other_ent === my_ent || the_battle_zone && other_ent.battle_zone === the_battle_zone) {
      other_ent.applyBatchUpdate({
        action_id: 'unready',
        field: 'seq_unready',
        data_assignments: {
          ready: false,
        },
      }, errorsToChat);
    }
  }
}

function drawBar(
  bar: BarSprite,
  x: number, y: number, z: number,
  w: number, h: number,
  p: number,
): void {
  p = min(p, 1);
  const MIN_VIS_W = 4;
  let full_w = round(p * w);
  if (p > 0 && p < 1) {
    full_w = clamp(full_w, MIN_VIS_W, w - MIN_VIS_W/2);
  }
  let empty_w = w - full_w;
  drawBox({
    x, y, z,
    w, h,
  }, bar.bg, 1);
  if (full_w) {
    drawBox({
      x, y,
      w: full_w, h,
      z: z + 1,
    }, bar.hp, 1);
  }
  if (empty_w && bar.empty) {
    let temp_x = x + full_w;
    if (full_w) {
      temp_x -= 2;
      empty_w += 2;
    }
    drawBox({
      x: temp_x, y,
      w: empty_w, h,
      z: z + 1,
    }, bar.empty, 1);
  }
}

export function drawHealthBar(
  x: number, y: number, z: number,
  w: number, h: number,
  hp: number, hp_max: number,
  show_text: boolean
): void {
  drawBar(bar_sprites.healthbar, x, y, z, w, h, hp / hp_max);
  if (show_text) {
    font.drawSizedAligned(style_text, x, y + (settings.pixely > 1 ? 0.5 : 0), z+2,
      8, ALIGN.HVCENTERFIT,
      w, h, `${hp}`);
  }
}

const HP_BAR_H = 12;

const STATS_BAR_W = BUTTON_W * 3 + 4;
const STATS_X_INDENT = 2;
const STATS_Y_PAD = 4;
const STATS_XP_BAR_H = 4;
const STATS_BAR_H = 12;
const style_stats = fontStyleColored(null, palette_font[PAL_WHITE + 1]);
function drawStats(): void {
  let me = myEnt();
  let x = VIEWPORT_X0 + render_width + 16;
  let y = 86;
  let z = Z.UI;
  drawRect(332, 80, 411, 243, z - 1, palette[PAL_BLACK]);
  let level = me.getData('stats.level', 0);
  let xp = me.getData('stats.xp', 0);
  let next_xp = xpToLevelUp(level);
  let hp = me.getData('stats.hp', 0);
  let hp_max = me.getData('stats.hp_max', 1);
  let mp = me.getData('stats.mp', 0);
  let mp_max = me.getData('stats.mp_max', 1);
  font.draw({
    style: style_stats,
    x: x + STATS_X_INDENT,
    y,
    text: `Level ${level}`,
  });
  y += FONT_HEIGHT - 2;
  font.draw({
    style: style_stats,
    x: x + STATS_X_INDENT,
    y,
    text: `XP ${xp}/${next_xp}`,
  });
  y += FONT_HEIGHT;
  drawBar(bar_sprites.xpbar, x, y, z, STATS_BAR_W, STATS_XP_BAR_H, xp/next_xp);
  y += STATS_XP_BAR_H;
  y += STATS_Y_PAD;

  font.draw({
    style: style_stats,
    x: x + STATS_X_INDENT,
    y,
    text: `HP ${hp}/${hp_max}`,
  });
  y += FONT_HEIGHT;
  drawBar(bar_sprites.healthbar, x, y, z, STATS_BAR_W, STATS_BAR_H, hp/hp_max);
  y += STATS_BAR_H;
  y += STATS_Y_PAD;

  font.draw({
    style: style_stats,
    x: x + STATS_X_INDENT,
    y,
    text: `MP ${mp}/${mp_max}`,
  });
  y += FONT_HEIGHT;
  drawBar(bar_sprites.mpbar, x, y, z, STATS_BAR_W, STATS_BAR_H, mp/mp_max);
  y += STATS_BAR_H;
  y += STATS_Y_PAD;

}

let color_temp = vec4();
function drawStatsOverViewport(): void {
  let my_ent = myEnt();
  assert(my_ent.isMe());

  // Draw damage "floaters" on us, but on the UI layer
  let { floaters } = my_ent;
  let blink = 1;
  for (let ii = floaters.length - 1; ii >= 0; --ii) {
    let floater = floaters[ii];
    let elapsed = engine.frame_timestamp - floater.start;
    const FLOATER_TIME = 750; // not including fade
    const FLOATER_FADE = 250;
    const BLINK_TIME = 250;
    let alpha = 1;
    if (elapsed > FLOATER_TIME) {
      alpha = 1 - (elapsed - FLOATER_TIME) / FLOATER_FADE;
      if (alpha <= 0) {
        ridx(floaters, ii);
        continue;
      }
    }
    if (elapsed < BLINK_TIME) {
      blink = min(blink, elapsed / BLINK_TIME);
    }
    let float = easeOut(elapsed / (FLOATER_TIME + FLOATER_FADE), 2) * 100;
    let text_height = uiTextHeight() * 2;
    font.drawSizedAligned(fontStyleAlpha(style_text, alpha),
      VIEWPORT_X0 + render_width/2,
      round(VIEWPORT_Y0 + render_height * 0.9 + float), Z.FLOATERS,
      text_height, ALIGN.HCENTER|ALIGN.VBOTTOM,
      0, 0, floater.msg);
  }
  if (blink < 1) {
    blink = easeOut(blink, 2);
    v3copy(color_temp, palette[PAL_RED]);
    color_temp[3] = 0.5 * (1 - blink);
    drawRect(VIEWPORT_X0, VIEWPORT_Y0, VIEWPORT_X0+render_width, VIEWPORT_Y0+render_height,
      Z.UI - 5, color_temp);
  }
}

const BATTLEZONE_W = 134;
let battlezone_is_waiting = false;
let battlezone_is_waiting_time = 0;
function drawBattleZone(): void {
  let x = 275;
  let y = 252;
  let z = Z.UI;

  tiny_font.draw({
    color: palette_font[PAL_WHITE + 1],
    x: x + 1, y, z,
    size: TINY_FONT_H,
    text: 'BattleZone',
  });
  y += TINY_FONT_H + 1;

  let entity_manager = entityManager();
  let game_state = crawlerGameState();
  let entities = entity_manager.entities;
  let { floor_id } = game_state;
  let players: Entity[] = [];
  for (let ent_id in entities) {
    let other_ent = entities[ent_id]!;
    if (other_ent.data.floor !== floor_id || other_ent.fading_out) {
      // not on current floor
      continue;
    }
    if (other_ent.isPlayer()) {
      players.push(other_ent);
    }
  }
  let me = myEnt();
  function isInBattleZone(ent: Entity): boolean {
    return Boolean(ent === me || me.battle_zone && me.battle_zone === ent.battle_zone);
  }
  let my_pos = me.getData<JSVec3>('pos')!;
  players.sort(function (a, b) {
    if (a === me) {
      return -1;
    } else if (b === me) {
      return 1;
    }
    let bza = isInBattleZone(a);
    let bzb = isInBattleZone(a);
    if (bza && !bzb) {
      return -1;
    }
    if (bzb && !bza) {
      return 1;
    }
    let d1 = v2manhattan(a.data.pos, my_pos);
    let d2 = v2manhattan(b.data.pos, my_pos);
    if (d1 === d2) {
      return a.id - b.id;
    }
    return d1 - d2;
  });

  let is_bz = true;
  let my_angle = crawlerController().getEffRot();
  battlezone_is_waiting = false;
  for (let ii = 0; ii < players.length; ++ii) {
    let ent = players[ii];
    if (is_bz && !isInBattleZone(ent)) {
      y += 2;
      is_bz = false;
      tiny_font.draw({
        color: palette_font[PAL_WHITE + 1],
        x: x + 1, y, z,
        size: TINY_FONT_H,
        text: `Nearby (${players.length - ii})`,
      });
      y += TINY_FONT_H + 1;
    }
    let is_ready = ent.getData('ready', false);
    drawBox({
      x, y, z: z - 1,
      w: BATTLEZONE_W,
      h: 25, // is_bz ? 25: 23,
    }, autoAtlas('ui', 'roundpanel'));
    autoAtlas('ui', 'portraits-0').draw({
      x: x + 5,
      y: y + 3, z,
      w: 12,
      h: 12,
    });
    let sprite = 'star';
    if (ent !== me) {
      let dx = ent.data.pos[0] - my_pos[0];
      let dy = ent.data.pos[1] - my_pos[1];
      if (my_angle === 0) { // looking east
        let t = dx;
        dx = -dy;
        dy = t;
      } else if (my_angle === 3) { // looking south
        dx = -dx;
        dy = -dy;
      } else if (my_angle === 2) { // looking west
        let t = dx;
        dx = dy;
        dy = -t;
      }
      if (!dx && !dy) {
        sprite = 'arrow-here';
      } else if (abs(dx) > abs(dy)) {
        sprite = dx > 0 ? 'arrow-right' : 'arrow-left';
      } else {
        sprite = dy > 0 ? 'arrow-up' : 'arrow-down';
      }
    }
    autoAtlas('ui', sprite).draw({
      x: x + 5 + 12,
      y: y + 2,
      z,
      w: 12,
      h: 12,
    });
    let icon_x = x + BATTLEZONE_W - 12 - 3;
    if (is_bz && me.battle_zone) {
      if (ent !== me && is_ready) {
        battlezone_is_waiting = true;
      }
      autoAtlas('ui', is_ready ? 'check': 'hourglass').draw({
        x: icon_x,
        y: y + 2,
        z,
        w: 12,
        h: 12,
      });
    }
    let name_x = x + 32;
    title_font.draw({
      size: TITLE_FONT_H,
      color: palette_font[PAL_WHITE + 1],
      x: name_x,
      y,
      z,
      w: icon_x - name_x,
      align: ALIGN.HFIT,
      text: ent.data.display_name || '???',
    });

    if (is_bz) {
      drawBar(bar_sprites.doublehp, x + 5, y + 16, z, 44, 6,
        ent.getData('stats.hp', 0) / ent.getData('stats.hp_max', 1));
      drawBar(bar_sprites.doublemp, x + 5, y + 16, z, 44, 6,
        ent.getData('stats.mp', 0) / ent.getData('stats.mp_max', 1));

      if (me.battle_zone) {
        tiny_font.draw({
          color: palette_font[PAL_WHITE + 1],
          x, y, z,
          size: TINY_FONT_H,
          w: BATTLEZONE_W - 3,
          h: 22,
          align: ALIGN.HRIGHT | ALIGN.VBOTTOM,
          text: is_ready ? 'Ready!' : 'Waiting...',
        });
      }
    } else {
      drawBar(bar_sprites.doublehp, x + 5, y + 16, z, 44, 6,
        ent.getData('stats.hp', 0) / ent.getData('stats.hp_max', 1));
      drawBar(bar_sprites.doublemp, x + 5, y + 16, z, 44, 6,
        ent.getData('stats.mp', 0) / ent.getData('stats.mp_max', 1));
      // drawBar(bar_sprites.tinyhealth, x + 5, y + 16, z, 44, 4,
      //   ent.getData('stats.hp', 0) / ent.getData('stats.hp_max', 1));
    }


    y += 24; // is_bz ? 24 : 22;
  }

  if (is_bz) {
    y += 2;
    is_bz = false;
    tiny_font.draw({
      color: palette_font[PAL_WHITE + 1],
      x: x + 1, y, z,
      size: TINY_FONT_H,
      text: 'Nearby (0)',
    });
    y += TINY_FONT_H + 1;
    if (players.length <= 1) {
      y += 12;
      font.draw({
        color: palette_font[PAL_WHITE + 1],
        x, y, z,
        w: BATTLEZONE_W,
        align: ALIGN.HCENTER | ALIGN.HWRAP,
        text: 'Nearby players will\nappear here.',
      });
    }
  } else {
    if (players.length <= 2) {
      font.draw({
        color: palette_font[PAL_WHITE + 2],
        x,
        y: 324,
        z,
        w: BATTLEZONE_W,
        align: ALIGN.HCENTER | ALIGN.HWRAP,
        text: 'Engage near others to join BattleZones.',
      });
    }
  }

  if (battlezone_is_waiting && me.getData('ready')) {
    battlezone_is_waiting = false;
  }
  if (battlezone_is_waiting) {
    battlezone_is_waiting_time += getScaledFrameDt();
    if (battlezone_is_waiting_time > 2000) {
      statusSet('bzwait', 'Other players are waiting for you to take your action').fade();
    }
  } else {
    battlezone_is_waiting_time = 0;
  }

}

const ENEMY_HP_BAR_W = 100;
const ENEMY_HP_BAR_X = VIEWPORT_X0 + (render_width - ENEMY_HP_BAR_W)/2;
const ENEMY_HP_BAR_Y = VIEWPORT_Y0 + 8;
const ENEMY_HP_BAR_H = HP_BAR_H;
function drawEnemyStats(ent: Entity): void {
  let stats = ent.data.stats;
  if (!stats) {
    return;
  }
  let hp = ent.getData('stats.hp', 0);
  let hp_max = ent.getData('stats.hp_max', 0);
  let bar_h = ENEMY_HP_BAR_H;
  let show_text = false;
  drawHealthBar(ENEMY_HP_BAR_X, ENEMY_HP_BAR_Y, Z.UI, ENEMY_HP_BAR_W, bar_h, hp, hp_max, show_text);
  if (ent.display_name) {
    font.drawSizedAligned(style_text, ENEMY_HP_BAR_X, ENEMY_HP_BAR_Y + bar_h, Z.UI,
      uiTextHeight(), ALIGN.HVCENTERFIT,
      ENEMY_HP_BAR_W, bar_h, ent.display_name);
  }
}

function doEngagedEnemy(): void {
  let game_state = crawlerGameState();
  let level = game_state.level;
  if (!level || crawlerController().controllerIsAnimating(0.75)) {
    return;
  }
  let entities = entityManager().entities;
  let ent_in_front = crawlerEntInFront();
  if (ent_in_front && myEnt().isAlive()) {
    let target_ent = entities[ent_in_front]!;
    if (target_ent) {
      drawEnemyStats(target_ent);
    }
  }
}

function moveBlocked(): boolean {
  return false;
}

// TODO: move into crawler_play?
export function addFloater(ent_id: EntityID, message: string | null, anim?: string): void {
  let ent = crawlerEntityManager().getEnt(ent_id);
  if (ent) {
    if (message) {
      if (!ent.floaters) {
        ent.floaters = [];
      }
      ent.floaters.push({
        start: engine.frame_timestamp,
        msg: message,
      });
    }
    if (ent.triggerAnimation && anim) {
      ent.triggerAnimation(anim);
    }
  }
}

function onBroadcast(update: EntityManagerEvent): void {
  let { from, msg, data } = update;
  let chat_ui = getChatUI();
  if (msg === 'dstat') {
    assert(from);
    let target = from;
    let { hp, source, action, type, fatal, pred_id, executor } = data as BroadcastDataDstat;
    if (executor === myEntID()) {
      // I did this
      let target_ent = crawlerEntityManager().getEnt(target);
      if (target_ent && pred_id) {
        target_ent.predictedClear(pred_id);
      }
    } else {
      // someone else did
      if (hp) {
        addFloater(target, `${hp}`, 'damage');
        addFloater(source, null, 'attack');
      }
    }

    if (action === 'attack') {
      if (source === myEntID()) {
        chat_ui.addChat(`You ${type} it for ${-hp} damage${fatal ? ', killing it' : ''}.`);
      } else if (target === myEntID()) {
        if (type === 'opportunity') {
          chat_ui.addChat(`It opportunity attacks you for ${-hp} damage.`);
        } else {
          chat_ui.addChat(`It hits you with ${type} for ${-hp} damage.`);
        }
      } else {
        chat_ui.addChat(`${source} hits ${target} with ${type} for ${-hp} damage${fatal ? ', killing it' : ''}.`);
      }
    }
  // } else if (msg === 'pickup') {
  //   let { contents } = data as BroadcastDataPickup;
  //   for (let ii = 0; ii < contents.length; ++ii) {
  //     let item = contents[ii];
  //     if (item.type === 'essence') {
  //       chat_ui.addChat('You add some essence to your refinery\'s input funnel.');
  //     } else if (itemIsAllowedInInventory(item)) {
  //       chat_ui.addChat(`Picked up a new ${item.type}`);
  //     } else {
  //       assert(false, `Unknown item type "${item.type}"`);
  //     }
  //   }
  // } else if (msg === 'pickup_failed') {
  //   statusPush('Could not pick up essence, refinery inputs full!');
  } else {
    assert(false, `Unknown broadcast type "${msg}"`);
  }
}

function moveBlockDead(): boolean {
  controller.setFadeOverride(0.75);

  let y = VIEWPORT_Y0;
  let w = render_width;
  let x = VIEWPORT_X0;
  let h = render_height;
  let z = Z.UI;

  font.drawSizedAligned(null,
    x + floor(w/2), y + floor(h/2) - 16, z,
    uiTextHeight(), ALIGN.HCENTER|ALIGN.VBOTTOM,
    0, 0, 'You have died.');

  if (buttonText({
    x: x + floor(w/2 - uiButtonWidth()/2), y: y + floor(h/2), z,
    text: 'Respawn',
  })) {
    controller.goToFloor(0, 'stairs_in', 'respawn');
  }

  return true;
}

function doAttack(target_ent: Entity, action: Item | 'basic'): void {
  let dam: number;
  let style: string;
  if (action === 'basic') {
    let attacker_stats = myEnt().data.stats;
    let target_stats = target_ent.data.stats;
    ({ dam, style } = damage(attacker_stats, target_stats));
  } else {
    dam = 5;
    style = 'magic';
  }

  let target_hp = target_ent.getData('stats.hp', 0);
  let new_hp = max(0, target_hp - dam);
  addFloater(target_ent.id, `${style === 'miss' ? 'WHIFF!\n' : ''}\n-${dam}`, new_hp ? '' : 'death');
  let pred_ids: EntityPredictionID[] = [];
  target_ent.predictedSet(pred_ids, 'stats.hp', new_hp);
  assert.equal(pred_ids.length, 1);
  let pred_id = pred_ids[0][1];
  let payload: ActionAttackPayload = {
    target_ent_id: target_ent.id,
    type: style,
    dam,
    pred_id,
    executor: myEntID(),
  };
  crawlerMyApplyBatchUpdate({
    action_id: 'attack',
    payload,
    data_assignments: {
      ready: true,
    },
    field: CrawlerController.PLAYER_MOVE_FIELD,
  }, function (err, resp) {
    if (err) {
      target_ent.predictedClear(pred_id);
      if (err === 'ERR_INVALID_ENT_ID') {
        // already dead, silently ignore
      } else {
        getChatUI().addChat(`Error attacking: ${err}`, 'error');
      }
    }
  });
  crawlerTurnBasedScheduleStep(250);
}

function bumpEntityCallback(target_ent_id: EntityID): void {
  if (!canIssueAction()) {
    playUISound('msg_out_err');
    return;
  }
  let me = myEnt();
  let all_entities = entityManager().entities;
  let target_ent = all_entities[target_ent_id]!;
  if (!target_ent || !target_ent.isAlive() || !me.isAlive()) {
    return;
  }
  doAttack(target_ent, 'basic');
}

function doHeal(): void {
  let my_ent = myEnt();
  let inventory = my_ent.getData<(Item|null)[]>('inventory') || [];
  let inv_idx = -1;
  for (let ii = 0; ii < inventory.length; ++ii) {
    let item = inventory[ii];
    if (item && item.type === 'potion') {
      inv_idx = ii;
      break;
    }
  }
  if (inv_idx === -1) {
    playUISound('msg_out_err');
    statusSet('heal', 'Oh no!  Out of potions.').counter = 2500;
    return;
  }

  let hp = my_ent.getData('stats.hp', 0);
  let hp_max = my_ent.getData('stats.hp_max', 1);
  if (hp >= hp_max) {
    playUISound('msg_out_err');
    statusSet('heal', 'Already fully healed.').counter = 2500;
    return;
  }

  let dstats: Partial<StatsData> = {};
  let new_hp = min(hp_max, hp + POTION_HEAL_AMOUNT);
  dstats.hp = new_hp;
  let ops: ActionInventoryOp[] = [];
  ops.push({
    idx: inv_idx,
    delta: -1,
  });

  let new_inventory = clone(inventory);
  let item = new_inventory[inv_idx];
  assert(item);
  item.count--;
  if (!item.count) {
    new_inventory[inv_idx] = null;
  }

  let payload: ActionInventoryPayload = {
    dstats,
    ops,
    ready: true,
  };
  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      ready: true,
      'stats.hp': new_hp,
      inventory,
    },
  }, errorsToChat);
}

function doQuickbar(): void {
  let me = myEnt();
  let books = me.data.books || [];
  let floor_level = 10;

  let game_state = crawlerGameState();
  let level = game_state.level;
  let all_disabled = false;
  if (!level || crawlerController().controllerIsAnimating(0.75)) {
    all_disabled = true;
  }
  let can_attack = false;
  let ent_in_front = crawlerEntInFront();
  let target_ent: Entity | null = null;
  if (ent_in_front && me.isAlive()) {
    let entities = entityManager().entities;
    target_ent = entities[ent_in_front] || null;
    if (target_ent && target_ent.isAlive()) {
      can_attack = true;
    }
  }

  if (!canIssueAction()) {
    all_disabled = true;
  }

  for (let ii = 0; ii < 10; ++ii) {
    let disabled = all_disabled;
    let action: Item | 'basic' = 'basic';
    if (ii === 0) {
      action = 'basic';
    } else {
      let item_slot = ii - 1;
      if (item_slot >= floor_level) {
        disabled = true;
      } else if (!books[item_slot]) {
        disabled = true;
      } else {
        action = books[item_slot];
      }
    }
    let is_attack = true;
    if (is_attack && !can_attack) {
      disabled = true;
    }
    if (!disabled) {
      if (keyDownEdge(KEYS[ii === 9 ? '0' : `${ii + 1}` as '1'])) {
        // activate!
        if (is_attack) {
          assert(target_ent);
          doAttack(target_ent, action);
        }
      }
    }
  }

  if (keyDownEdge(KEYS.H)) {
    if (all_disabled) {
      onDisabledAction(); // eslint-disable-line @typescript-eslint/no-use-before-define
    } else {
      doHeal();
    }
  }
}

const MOVE_BUTTONS_X0 = 343;
const MOVE_BUTTONS_Y0 = 197;


function useNoText(): boolean {
  return input.inputTouchMode() || input.inputPadMode() || settings.turn_toggle;
}

let sprite_corner = autoAtlas('ui', 'frame-corner-silver');
function drawFrames(): void {
  let z = Z.FRAMES;

  [0, 240, game_height - 12].forEach(function (y) {
    sprite_corner.draw({
      x: 0, y, z: z + 1,
      w: 12, h: 12,
    });
    if (y !== 240) {
      sprite_corner.draw({
        x: game_width - 12, y, z: z + 1,
        w: 12, h: 12,
      });
    }
    frame_sprites.horiz.draw({
      x: 12,
      y,
      z,
      w: game_width - 24,
      h: 12,
      uvs: [0, 0, (game_width - 24)/512, 1],
    });
  });
  frame_sprites.horiz.draw({
    x: 324+12,
    y: 72,
    z,
    w: game_width - 324 - 24,
    h: 12,
    uvs: [0, 0, (game_width - 324 - 24)/512, 1],
  });
  [
    [0, 12, game_height - 24],
    [324, 12, 228],
    [game_width - 12, 12, game_height - 24],
    [264, 252-6, 96+6, 6/512],
  ].forEach(function (coords) {
    frame_sprites.vert.draw({
      x: coords[0],
      y: coords[1],
      z,
      w: 12,
      h: coords[2],
      uvs: [0, coords[3] || 0, 1, coords[2]/512],
    });
  });

  [
    [324,0],
    [264, game_height - 12],
  ].forEach(function (coords) {
    sprite_corner.draw({
      x: coords[0],
      y: coords[1],
      z: z + 1,
      w: 12,
      h: 12,
    });
  });

  let gems: [number, number, string][] = [
    [324,72,'frame-t-right'],
    [game_width - 12,72,'frame-t-left'],
    [324,240,'frame-t-up'],
    [game_width - 12,240,'frame-t-left'],
  ];
  gems.forEach(function (coords) {
    autoAtlas('ui', coords[2]).draw({
      x: coords[0],
      y: coords[1],
      z: z + 1,
      w: 12,
      h: 12,
    });
    let dist = coords[0] + coords[1];
    const ANIM_DIST_PER_MS = 0.5;
    let anim = engine.getFrameTimestamp() * ANIM_DIST_PER_MS % 6000; // 12 second period
    anim = clamp((anim - dist)/100, 0, 1);
    if (anim === 1) {
      anim = 0;
    } else {
      anim = floor(anim * 4);
    }

    autoAtlas('ui', `frame-gem-${anim}`).draw({
      x: coords[0],
      y: coords[1],
      z: z + 2,
      w: 12,
      h: 12,
    });
  });

  if (battlezone_is_waiting) {
    z++;
    [0, 240].forEach(function (y) {
      frame_sprites.horiz_red.draw({
        x: 12,
        y,
        z,
        w: render_width,
        h: 12,
        uvs: [0, 0, (render_width)/512, 1],
      });
    });

    [
      [0, 12, render_height],
      [324, 12, render_height],
    ].forEach(function (coords) {
      frame_sprites.vert_red.draw({
        x: coords[0],
        y: coords[1],
        z,
        w: 12,
        h: coords[2],
        uvs: [0, coords[3] || 0, 1, coords[2]/512],
      });
    });

  }
}

function onDisabledAction(): void {
  playUISound('msg_out_err');
  statusSet('onDisabledAction', 'Please wait for other players to take their turn').counter = 2500;
}

function playCrawl(): void {
  profilerStartFunc();

  if (!controller.canRun()) {
    return profilerStopFunc();
  }

  if (!controller.hasMoveBlocker() && !myEnt().isAlive()) {
    controller.setMoveBlocker(moveBlockDead);
  }

  let down = {
    menu: 0,
    inv: 0,
    heal: 0,
    wait: 0,
  };
  type ValidKeys = keyof typeof down;
  let up_edge = {
    menu: 0,
    inv: 0,
    heal: 0,
    wait: 0,
  } as Record<ValidKeys, number>;

  let dt = getScaledFrameDt();

  const frame_map_view = mapViewActive();
  const is_fullscreen_ui = false; // any game-mode fullscreen UIs up?
  let dialog_viewport = {
    x: VIEWPORT_X0 + 8,
    w: render_width - 16,
    y: VIEWPORT_Y0,
    h: render_height + 4,
    z: Z.STATUS,
    pad_top: 2,
    pad_bottom: 4,
    pad_bottom_with_buttons: 4,
    pad_lr: 4,
  };
  if (is_fullscreen_ui || frame_map_view) {
    dialog_viewport.x = 0;
    dialog_viewport.w = game_width;
    dialog_viewport.y = 0;
    dialog_viewport.h = game_height - 3;
  }
  dialogRun(dt, dialog_viewport, false);

  const build_mode = buildModeActive();
  let locked_dialog = dialogMoveLocked();
  const overlay_menu_up = cur_action?.is_overlay_menu || false;
  let minimap_display_h = build_mode ? BUTTON_W : MINIMAP_H;
  let show_compass = !build_mode && false;
  let compass_h = show_compass ? 11 : 0;

  if (build_mode && !controller.ignoreGameplay()) {
    let build_y = MINIMAP_Y + minimap_display_h + 2;
    crawlerBuildModeUI({
      x: MINIMAP_X,
      y: build_y,
      w: game_width - MINIMAP_X - 2,
      h: MOVE_BUTTONS_Y0 - build_y - 2,
      map_view: frame_map_view,
    });
  }


  let button_x0: number;
  let button_y0: number;

  let disabled = controller.hasMoveBlocker();
  let disabled_action = !canIssueAction();

  function button(
    rx: number, ry: number,
    frame: number,
    key: ValidKeys,
    keys: number[],
    pads: number[],
    toggled_down?: boolean,
  ): void {
    let z;
    let no_visible_ui = frame_map_view;
    let my_disabled = disabled;
    if (key === 'menu') {
      no_visible_ui = false;
      if (frame_map_view) {
        z = Z.MAP + 1;
      } else if (cur_action?.name === 'PauseMenu') {
        z = Z.MODAL + 1;
      } else {
        z = Z.MENUBUTTON;
      }
    } else {
      if (overlay_menu_up && toggled_down) {
        no_visible_ui = true;
      } else {
        my_disabled = my_disabled || overlay_menu_up;
      }
    }
    let ret = crawlerOnScreenButton({
      x: button_x0 + (BUTTON_W + 2) * rx,
      y: button_y0 + (BUTTON_W + 2) * ry,
      z,
      w: BUTTON_W, h: BUTTON_W,
      frame,
      keys,
      pads,
      no_visible_ui,
      do_up_edge: true,
      disabled: my_disabled,
      button_sprites: useNoText() ?
        toggled_down ? button_sprites_notext_down : button_sprites_notext :
        toggled_down ? button_sprites_down : button_sprites,
      is_movement: false,
      show_hotkeys: false,
    });
    // down_edge[key] += ret.down_edge;
    down[key] += ret.down;
    up_edge[key] += ret.up_edge;
  }


  // Escape / open/close menu button - *before* pauseMenu()
  button_x0 = 343;
  button_y0 = 172;
  let menu_up = frame_map_view || build_mode || overlay_menu_up;
  let menu_keys = [KEYS.ESC];
  let menu_pads = [PAD.START];
  if (menu_up) {
    menu_pads.push(PAD.B, PAD.BACK);
  }
  button(2, 0, menu_up ? 10 : 6, 'menu', menu_keys, menu_pads, cur_action?.name === 'PauseMenu');
  if (!build_mode) {
    //button(0, 0, 8, 'heal', [KEYS.H], [PAD.X]);
    button(0, 0, 11, 'wait', [KEYS.Z, KEYS.SPACE], [PAD.B]);
    button(1, 0, 7, 'inv', [KEYS.I], [PAD.Y]); // , inventory_up);
    // if (up_edge.inv) {
    //   inventory_up = !inventory_up;
    // }
  }

  cur_action?.tick();

  // Note from #moraff: moved earlier so player motion doesn't interrupt it
  if (!frame_map_view) {
    if (!build_mode) {
      // Do game UI/stats here
      drawStats();
      drawStatsOverViewport();
      drawBattleZone();

      doQuickbar();

      doEngagedEnemy();
    }
    // Do modal UIs here
  } else {
    if (input.click({ button: 2 })) {
      mapViewToggle();
    }
  }

  button_x0 = MOVE_BUTTONS_X0;
  button_y0 = MOVE_BUTTONS_Y0;

  // Check for intentional events
  // if (!build_mode) {
  //   button(2, -3, 7, 'inventory', [KEYS.I], [PAD.X], inventory_up);
  // }
  //
  // if (up_edge.inventory) {
  //   inventory_up = !inventory_up;
  // }
  if (up_edge.wait) {
    if (disabled_action) {
      onDisabledAction();
    } else {
      crawlerMyApplyBatchUpdate({
        action_id: 'ready',
        data_assignments: {
          ready: true,
        },
        field: CrawlerController.PLAYER_MOVE_FIELD,
      }, errorsToChat);
      crawlerTurnBasedScheduleStep(1);
    }
  }

  controller.doPlayerMotion({
    dt,
    button_x0: MOVE_BUTTONS_X0,
    button_y0: build_mode ? game_height - 16 : MOVE_BUTTONS_Y0,
    no_visible_ui: frame_map_view || build_mode,
    button_w: build_mode ? 6 : BUTTON_W,
    button_sprites: useNoText() ? button_sprites_notext : button_sprites,
    disable_move: moveBlocked() || overlay_menu_up || !canIssueAction(),
    but_allow_rotate: true,
    on_disabled_action: onDisabledAction,
    disable_player_impulse: Boolean(locked_dialog),
    show_buttons: !locked_dialog,
    do_debug_move: engine.defines.LEVEL_GEN || build_mode,
    show_debug: settings.show_fps ? { x: VIEWPORT_X0, y: VIEWPORT_Y0 + (build_mode ? 3 : 0) } : null,
    show_hotkeys: false,
  });

  button_x0 = MOVE_BUTTONS_X0;
  button_y0 = MOVE_BUTTONS_Y0;

  if (keyUpEdge(KEYS.B)) {
    if (!netSubs().loggedIn()) {
      modalDialog({
        text: 'Cannot enter build mode - not logged in',
        buttons: { ok: null },
      });
    } else {
      crawlerBuildModeActivate(!build_mode);
      if (crawlerCommWant()) {
        return profilerStopFunc();
      }
      // inventory_up = false;
    }
  }

  if (up_edge.menu) {
    if (menu_up) {
      if (build_mode && mapViewActive()) {
        mapViewSetActive(false);
        // but stay in build mode
      } else if (build_mode) {
        crawlerBuildModeActivate(false);
      } else {
        // close everything
        mapViewSetActive(false);
        // inventory_up = false;
      }
      if (cur_action?.name === 'PauseMenu') {
        uiAction(null);
      }
    } else {
      uiAction(new PauseMenuAction());
    }
  }

  if (!overlay_menu_up && (keyDownEdge(KEYS.M) || padButtonUpEdge(PAD.BACK))) {
    playUISound('button_click');
    mapViewToggle();
  }
  // inventoryMenu();
  let game_state = crawlerGameState();
  let script_api = crawlerScriptAPI();
  if (frame_map_view) {
    if (engine.defines.LEVEL_GEN) {
      if (levelGenTest(game_state)) {
        controller.initPosFromLevelDebug();
      }
    }
    crawlerMapViewDraw({
      game_state,
      x: 0,
      y: 0,
      w: game_width,
      h: game_height,
      step_size: FULLMAP_STEP_SIZE,
      tile_size: FULLMAP_TILE_SIZE,
      compass_x: floor((game_width - MINIMAP_W)/2),
      compass_y: 2,
      compass_w: 0,
      compass_h: 0, // note: compass ignored, compass_h = 0
      z: Z.MAP,
      level_gen_test: engine.defines.LEVEL_GEN,
      script_api,
      button_disabled: overlay_menu_up,
    });
  } else {
    crawlerMapViewDraw({
      game_state,
      x: MINIMAP_X,
      y: MINIMAP_Y,
      w: MINIMAP_W,
      h: minimap_display_h,
      step_size: MINIMAP_STEP_SIZE,
      tile_size: MINIMAP_TILE_SIZE,
      compass_x: COMPASS_X,
      compass_y: COMPASS_Y,
      compass_w: 0,
      compass_h,
      z: Z.MAP,
      level_gen_test: false,
      script_api,
      button_disabled: overlay_menu_up,
    });
  }

  if (!build_mode && !frame_map_view) {
    drawFrames();
  }

  statusTick(dialog_viewport);

  profilerStopFunc();
}

export function play(dt: number): void {
  let game_state = crawlerGameState();
  if (crawlerCommWant()) {
    // Must have been disconnected?
    crawlerCommStart();
    return;
  }

  battleZonePrep(); // before crawlerPlayTopOfFrame
  battleZoneDebug();

  let overlay_menu_up = Boolean(cur_action?.is_overlay_menu || dialogMoveLocked());

  tickMusic(game_state.level?.props.music as string || null); // || 'default_music'
  crawlerPlayTopOfFrame(overlay_menu_up);

  if (keyDownEdge(KEYS.F3)) {
    settingsSet('show_fps', 1 - settings.show_fps);
  }
  // if (keyDownEdge(KEYS.F)) {
  //   settingsSet('filter', 1 - settings.filter);
  // }
  // if (keyDownEdge(KEYS.G)) {
  //   const types = ['instant', 'instantblend', 'queued', 'queued2'];
  //   let type_idx = types.indexOf(controller.getControllerType());
  //   type_idx = (type_idx + (keyDown(KEYS.SHIFT) ? -1 : 1) + types.length) % types.length;
  //   controller.setControllerType(types[type_idx]);
  //   statusPush(`Controller: ${types[type_idx]}`);
  // }

  playCrawl();

  if (0) {
    let shear = clamp(input.mousePos()[0]/game_width* 2 - 1, -1, 1);
    renderViewportShear(shear);
  } else {
    renderViewportShear(-0.2); // Game preference
  }
  crawlerPrepAndRenderFrame();

  // TODO
  // if (!loading_level && !buildModeActive()) {
  //   let script_api = crawlerScriptAPI();
  //   script_api.is_visited = true; // Always visited for AI
  //   aiDoFloor(game_state.floor_id, game_state, entityManager(), engine.defines,
  //     settings.ai_pause || engine.defines.LEVEL_GEN || overlay_menu_up, script_api);
  // }

  crawlerPlayBottomOfFrame();
}

function onPlayerMove(old_pos: Vec2, new_pos: Vec2): void {
  crawlerMyApplyBatchUpdate({
    action_id: 'ready',
    data_assignments: {
      ready: true,
    },
    field: CrawlerController.PLAYER_MOVE_FIELD,
  }, errorsToChat);
  crawlerTurnBasedMovePreStart();
}

function onInitPos(): void {
  // autoAttackCancel();
}

function playInitShared(online: boolean): void {
  controller = crawlerController();

  controller.setOnPlayerMove(onPlayerMove);
  controller.setOnInitPos(onInitPos);

  uiAction(null);
}


function playOfflineLoading(): void {
  // TODO
}

function playInitOffline(): void {
  playInitShared(false);
}

function playInitEarly(room: ClientChannelWorker): void {

  // let room_public_data = room.getChannelData('public') as { seed: string };
  // game_state.setSeed(room_public_data.seed);

  playInitShared(true);
}

export function autosave(): void {
  crawlerSaveGame('auto');
  statusPush('Auto-saved.');
}

export function restartFromLastSave(): void {
  crawlerPlayWantMode('recent');
  crawlerPlayInitOffline();
}

settingsRegister({
  ai_pause: {
    default_value: 0,
    type: cmd_parse.TYPE_INT,
    range: [0, 1],
  },
  turn_toggle: {
    default_value: 0,
    type: cmd_parse.TYPE_INT,
    range: [0, 1],
  },
});

export function playStartup(): void {
  font = uiGetFont();
  title_font = uiGetTitleFont();
  tiny_font = tinyFont();
  crawlerScriptAPIDummyServer(true); // No script API running on server
  crawlerPlayStartup({
    on_broadcast: onBroadcast,
    play_init_online: playInitEarly,
    play_init_offline: playInitOffline,
    turn_based_step: aiStep,
    turn_based_allowed: aiStepAllowed,
    offline_data: {
      new_player_data: {
        type: 'player',
        pos: [0, 0, 0],
        floor: 0,
        stats: { hp: 10, hp_max: 10 },
      },
      loading_state: playOfflineLoading,
    },
    play_state: play,
    // on_init_level_offline: initLevel,
    default_vstyle: 'dcex',
    allow_offline_console: engine.DEBUG,
    chat_ui_param: {
      x: 12,
      y_bottom: 347,
      border: 2,
      scroll_grow: 2,
      cuddly_scroll: true,
    },
  });
  crawlerEntityClientStartupEarly();
  aiTraitsClientStartup();
  let ent_factory = crawlerEntFactory<Entity>();
  gameEntityTraitsCommonStartup(ent_factory);
  // appTraitsStartup();
  crawlerEntityTraitsClientStartup({
    name: 'EntityClient',
    Ctor: EntityClient,
    channel_type: 'game',
  });
  crawlerRenderEntitiesStartup(font);
  crawlerRenderViewportSet({
    x: VIEWPORT_X0,
    y: VIEWPORT_Y0,
    w: render_width,
    h: render_height,
  });
  crawlerControllerTouchHotzonesAuto();
  // crawlerRenderSetUIClearColor(dawnbringer.colors[14]);

  let button_param = {
    filter_min: gl.NEAREST,
    filter_mag: gl.NEAREST,
    ws: [18, 18, 18],
    hs: [18, 18, 18, 18],
  };
  button_sprites = {
    regular: spriteCreate({
      name: 'crawler_buttons/buttons',
      ...button_param,
    }),
    down: spriteCreate({
      name: 'crawler_buttons/buttons_down',
      ...button_param,
    }),
    rollover: spriteCreate({
      name: 'crawler_buttons/buttons_rollover',
      ...button_param,
    }),
    disabled: spriteCreate({
      name: 'crawler_buttons/buttons_disabled',
      ...button_param,
    }),
  };
  button_sprites_down = {
    regular: button_sprites.down,
    down: button_sprites.regular,
    rollover: button_sprites.rollover,
    disabled: button_sprites.disabled,
  };
  button_sprites_notext = {
    regular: spriteCreate({
      name: 'crawler_buttons/buttons_notext',
      ...button_param,
    }),
    down: spriteCreate({
      name: 'crawler_buttons/buttons_notext_down',
      ...button_param,
    }),
    rollover: spriteCreate({
      name: 'crawler_buttons/buttons_notext_rollover',
      ...button_param,
    }),
    disabled: spriteCreate({
      name: 'crawler_buttons/buttons_notext_disabled',
      ...button_param,
    }),
  };
  button_sprites_notext_down = {
    regular: button_sprites_notext.down,
    down: button_sprites_notext.regular,
    rollover: button_sprites_notext.rollover,
    disabled: button_sprites_notext.disabled,
  };

  bar_sprites = {
    healthbar: {
      bg: autoAtlas('ui', 'bar-frame'),
      hp: autoAtlas('ui', 'bar-fill-red'),
    },
    tinyhealth: {
      bg: autoAtlas('ui', 'minibar-frame-lighter'),
      hp: autoAtlas('ui', 'minibar-fill-red'),
    },
    doublehp: {
      bg: autoAtlas('ui', 'minibar-frame-lighter'),
      hp: autoAtlas('ui', 'minibar-fill-red-top'),
    },
    doublemp: {
      bg: autoAtlas('ui', 'minibar-frame-lighter'),
      hp: autoAtlas('ui', 'minibar-fill-blue-bottom'),
    },
    mpbar: {
      bg: autoAtlas('ui', 'bar-frame'),
      hp: autoAtlas('ui', 'bar-fill-blue'),
    },
    xpbar: {
      bg: autoAtlas('ui', 'minibar-frame'),
      hp: autoAtlas('ui', 'minibar-fill-yellow'),
    },
  };

  let frame_param = {
    filter_min: gl.NEAREST,
    filter_mag: gl.NEAREST,
    wrap_s: gl.CLAMP_TO_EDGE,
    wrap_t: gl.CLAMP_TO_EDGE,
    force_mipmaps: false,
  };
  frame_sprites = {
    horiz: spriteCreate({
      ...frame_param,
      name: 'frame-h',
    }),
    vert: spriteCreate({
      ...frame_param,
      name: 'frame-v',
    }),
    horiz_red: spriteCreate({
      ...frame_param,
      name: 'frame-h-red',
    }),
    vert_red: spriteCreate({
      ...frame_param,
      name: 'frame-v-red',
    }),
  };

  controllerOnBumpEntity(bumpEntityCallback);

  renderAppStartup();
  dialogStartup({
    font,
    // text_style_cb: dialogTextStyle,
    name_render_cb: dialogNameRender,
  });
  crawlerLoadData(webFSAPI());
  crawlerMapViewStartup({
    allow_pathfind: true,
    // color_rollover: dawnbringer.colors[8],
    build_mode_entity_icons: {},
    // style_map_name: fontStyle(...)
    compass_border_w: 6,
  });
}
