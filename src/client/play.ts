import assert from 'assert';
import { autoAtlas } from 'glov/client/autoatlas';
import { cmd_parse } from 'glov/client/cmds';
import { editBox } from 'glov/client/edit_box';
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
import { markdownAuto } from 'glov/client/markdown';
import { markdownSetColorStyle } from 'glov/client/markdown_renderables';
import { ClientChannelWorker, netClient, netSubs, netUserId } from 'glov/client/net';
import { ScrollArea, scrollAreaCreate } from 'glov/client/scroll_area';
import { MenuItem } from 'glov/client/selection_box';
import * as settings from 'glov/client/settings';
import {
  settingsRegister,
  settingsSet,
} from 'glov/client/settings';
import { SimpleMenu, simpleMenuCreate } from 'glov/client/simple_menu';
import {
  Sprite,
  spriteClipPop,
  spriteClipPush,
  spriteCreate,
} from 'glov/client/sprites';
import {
  button,
  buttonLastSpotRet,
  ButtonStateString,
  buttonText,
  drawBox,
  drawRect,
  drawRect2,
  menuUp,
  modalDialog,
  playUISound,
  print,
  uiButtonHeight,
  uiButtonWidth,
  uiGetFont,
  uiGetTitleFont,
  uiTextHeight,
} from 'glov/client/ui';
import * as urlhash from 'glov/client/urlhash';
import * as walltime from 'glov/client/walltime';
import { webFSAPI } from 'glov/client/webfs';
import { EntityManagerEvent } from 'glov/common/entity_base_common';
import { DISPLAY_NAME_MAX_VISUAL_SIZE } from 'glov/common/net_common';
import {
  ChannelDataClients,
  EntityID,
  TSMap,
} from 'glov/common/types';
import { capitalize, clamp, clone, easeOut, ridx, secondsToFriendlyString } from 'glov/common/util';
import { unreachable } from 'glov/common/verify';
import {
  JSVec2,
  JSVec3,
  ROVec2,
  v3copy,
  Vec2,
  vec4,
} from 'glov/common/vmath';
import {
  basicAttackDamage,
  hatDetails,
  itemName,
  MAX_LEVEL,
  maxHP,
  maxMP,
  POTION_HEAL_PORTION,
  rewardLevel,
  skillAttackDamage,
  SkillDetails,
  skillDetails,
  xpForDeath,
  xpToLevelUp,
} from '../common/combat';
import { entManhattanDistance } from '../common/crawler_entity_common';
import {
  BLOCK_MOVE,
  crawlerLoadData,
  DirType,
  DX,
  DY,
  WEST,
} from '../common/crawler_state';
import {
  ActionAttackPayload,
  ActionInventoryOp,
  ActionInventoryPayload,
  BroadcastDataDstat,
  ELEMENT_NAME,
  FloorData,
  FloorPlayerData,
  FloorRoomData,
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
  mapViewLastNumEnemies,
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
  crawlerRoom,
  crawlerSaveGame,
  crawlerScriptAPI,
  crawlerTurnBasedClearQueue,
  crawlerTurnBasedMoveFinish,
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
import { dialog, dialogMoveLocked, dialogRun, dialogStartup } from './dialog_system';
import {
  entitiesAt,
  EntityClient,
  EntityDataClient,
  entityManager,
} from './entity_game_client';
import {
  game_height,
  game_width,
  render_height,
  render_width,
  VIEWPORT_X0,
  VIEWPORT_Y0,
} from './globals';
import { levelGenTest } from './level_gen_test';
import { chatUI, tinyFont } from './main';
import { tickMusic } from './music';
import {
  PAL_BLACK,
  PAL_BLUE,
  PAL_CYAN,
  PAL_GREEN,
  PAL_RED,
  PAL_WHITE,
  PAL_YELLOW,
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
const { abs, ceil, cos, floor, max, min, PI, random, round, sin } = Math;

declare module 'glov/client/settings' {
  export let ai_pause: 0 | 1; // TODO: move to ai.ts
  export let show_fps: 0 | 1;
  export let turn_toggle: 0 | 1;
}

// const ATTACK_WINDUP_TIME = 1000;
// const MINIMAP_RADIUS = 3;
const MINIMAP_X = 322;
const MINIMAP_Y = 8;
const MINIMAP_W = 76;
const MINIMAP_H = 76;
const MINIMAP_STEP_SIZE = 12;
const MINIMAP_TILE_SIZE = MINIMAP_STEP_SIZE * 12/12;
const FULLMAP_STEP_SIZE = MINIMAP_STEP_SIZE;
const FULLMAP_TILE_SIZE = FULLMAP_STEP_SIZE * 12/12;
const COMPASS_X = MINIMAP_X;
const COMPASS_Y = MINIMAP_Y + MINIMAP_H;
const BUTTON_W = 20;
const FONT_HEIGHT = 11;
const TINY_FONT_H = 8;
const TITLE_FONT_H = 14;
const QUICKBAR_FRAME_Y = VIEWPORT_Y0 + render_height - 3;
const FRAME_HORIZ_SPLIT = 240;
const FRAME_VERT_SPLIT = 276;
const FRAME_LR_SPLIT = 288;

const BATTLEZONE_RANGE = 3;
const MAX_TICK_RANGE = 12; // if enemies are more steps than this from a player, use Manhattan dist instead
const INVENTORY_GRID_W = 9;
const INVENTORY_GRID_H = 6;
const INVENTORY_MAX_SIZE = INVENTORY_GRID_W * INVENTORY_GRID_H;

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
  min_width: number;
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
let dither128: Sprite;

const outline_width = 2.5;
const style_text = fontStyle(null, {
  color: palette_font[PAL_WHITE],
  outline_width,
  outline_color: palette_font[PAL_BLACK],
});

const style_hotkey = fontStyle(null, {
  color: palette_font[PAL_BLACK],
  outline_width: 3.5,
  outline_color: palette_font[PAL_BLACK - 3],
});
const style_hotkey_disabled = fontStyle(style_hotkey, {
  outline_color: palette_font[PAL_BLACK - 2],
});
const style_item_count = fontStyle(null, {
  color: palette_font[PAL_BLACK],
  outline_width: 3.5,
  outline_color: palette_font[PAL_BLACK - 5],
});
const style_mp_cost_over = fontStyle(null, {
  outline_width: 3.5,
  outline_color: palette_font[PAL_RED - 2],
  color: palette_font[PAL_RED],
});
const style_mp_cost = fontStyle(null, {
  color: palette_font[PAL_CYAN],
  outline_width: 3.5,
  outline_color: palette_font[PAL_CYAN - 2],
});
const style_item_level = fontStyle(null, {
  color: palette_font[PAL_YELLOW],
  outline_width: 3.5,
  outline_color: palette_font[PAL_YELLOW - 5],
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

function errorsToChat(err: unknown): void {
  if (err) {
    getChatUI().addChat(`Error executing action: ${err}`, 'error');
  }
}


abstract class UIAction {
  abstract tick(): void;
  declare name: string;
  declare is_overlay_menu: boolean;
  declare is_fullscreen_ui: boolean;
}
UIAction.prototype.name = 'UnknownAction';
UIAction.prototype.is_overlay_menu = false;
UIAction.prototype.is_fullscreen_ui = false;

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
      name: 'Character Customization...',
      cb: function () {
        uiAction(null);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        uiAction(new SetupMenuAction());
      },
    }, {
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

export function currentFloorLevel(): number {
  let game_state = crawlerGameState();
  let { floor_id } = game_state;
  let level = game_state.levels[floor_id];
  if (!level) {
    return MAX_LEVEL;
  }
  let { floorlevel } = level.props;
  if (!floorlevel) {
    return MAX_LEVEL + 1;
  }
  return Number(floorlevel);
}

function inventoryIconDraw(param: {
  x: number;
  y: number;
  z: number;
  item: Item;
  scale?: number;
}): void {
  let { x, y, z, item, scale } = param;
  let icon_param = {
    x: x + 4 * (scale || 1),
    y: y + 4 * (scale || 1),
    w: 12 * (scale || 1),
    h: 12 * (scale || 1),
    z: z + 1,
  };
  switch (item.type) {
    case 'book': {
      let skill_details = skillDetails(item);
      let icon = `spell-${ELEMENT_NAME[skill_details.element]}`;
      autoAtlas('ui', icon).draw(icon_param);
    } break;
    case 'hat': {
      let icon = `hat-${ELEMENT_NAME[item.subtype + 1]}`;
      autoAtlas('ui', icon).draw(icon_param);
    } break;
    case 'potion':
      autoAtlas('ui', 'potion').draw(icon_param);
      break;
    default:
      unreachable(item.type);
  }
}

type InventoryButtonParam = {
  x: number;
  y: number;
  z: number;
  item: Item;
  show_count: boolean;
  selected: boolean;
  nointeract?: boolean;
};
function inventoryButton(param: InventoryButtonParam): boolean {
  let { x, y, z, item, show_count, selected, nointeract } = param;
  let button_param = {
    x,
    y,
    z,
    w: BUTTON_W,
    h: BUTTON_W,
  };
  let ret = button({
    ...button_param,
    base_name: selected ? 'buttonselected' : nointeract ? 'buttonframe' : undefined,
    disabled: nointeract ? true : undefined,
    text: ' ',
  });
  // show icon
  inventoryIconDraw(param);
  const offs = 1;
  if (item.type !== 'potion') {
    // show level
    tiny_font.draw({
      ...button_param,
      x: button_param.x + 1 + offs,
      y: button_param.y - offs,
      style: style_item_level,
      size: TINY_FONT_H,
      z: z + 3,
      align: ALIGN.HRIGHT,
      text: `L${item.level}`,
    });
  }
  if (item.type === 'book') {
    // show mp cost
    let skill_details = skillDetails(item);
    tiny_font.draw({
      ...button_param,
      x: button_param.x + 1 - offs,
      y: button_param.y + offs,
      style: skill_details.mp_cost > myEnt().maxMP() ? style_mp_cost_over : style_mp_cost,
      size: TINY_FONT_H,
      z: z + 3,
      align: ALIGN.VBOTTOM,
      text: `${skill_details.mp_cost}`,
    });
  }
  if (show_count) {
    // show count
    tiny_font.draw({
      ...button_param,
      x: button_param.x + offs,
      y: button_param.y + offs,
      style: style_item_count,
      size: TINY_FONT_H,
      z: z + 3,
      align: ALIGN.VBOTTOM | ALIGN.HRIGHT,
      text: `${item.count > 99 ? '9+' : item.count}`,
    });
  }

  return Boolean(ret);
}

function inventoryIndexForItemPickup(item: Item): number {
  let my_ent = myEnt();
  let inventory = my_ent.data.inventory;
  let idx = -1;
  if (!inventory) {
    my_ent.data.inventory = inventory = [];
    idx = 0;
  } else {
    let open_slot = inventory.length;
    for (let ii = inventory.length - 1; ii >= 0; --ii) {
      let elem = inventory[ii];
      if (!elem) {
        open_slot = ii;
      } else if (elem.type === item.type && elem.subtype === item.subtype && elem.level === item.level) {
        idx = ii;
        break;
      }
    }
    if (idx === -1) {
      idx = open_slot;
    }
  }

  if (idx >= INVENTORY_MAX_SIZE) {
    return -1;
  }
  return idx;
}

function unequip(loc: 'hats' | 'books', src_idx: number, target_idx: number): void {
  let my_ent = myEnt();
  let inventory = clone(my_ent.getData<(Item|null)[]>('inventory', []));
  assert(target_idx !== -1);
  let src_list = my_ent.getData<Item[]>(loc, []);
  let item = src_list[src_idx];
  assert.equal(item.count, 1);

  let ops: ActionInventoryOp[] = [];
  if (inventory[target_idx]) {
    inventory[target_idx]!.count += item.count;
    ops.push({
      idx: target_idx,
      delta: item.count,
    });
  } else {
    inventory[target_idx] = item;
    ops.push({
      idx: target_idx,
      delta: 1,
      item,
    });
  }
  src_list.splice(src_idx, 1);
  ops.push({
    list: loc,
    idx: src_idx,
    delta: -1,
  });
  let payload: ActionInventoryPayload = {
    ops,
    ready: false,
  };
  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      inventory,
      [loc]: src_list,
    },
  }, errorsToChat);

  my_ent.calcPlayerResist(currentFloorLevel());
}

function equip(idx: number, swap_target_idx: number | null): void {
  let my_ent = myEnt();
  let inventory = clone(my_ent.getData<(Item|null)[]>('inventory', []));
  let item = inventory[idx];
  assert(item);
  assert(item.type === 'hat' || item.type === 'book');
  const loc = `${item.type}s` as const;
  let target_list = my_ent.getData<Item[]>(loc, []);

  let ops: ActionInventoryOp[] = [];
  if (item.count === 1) {
    // remove from inventory
    inventory[idx] = null;
  } else {
    // decrement from inventory
    item.count--;
  }
  ops.push({
    idx,
    delta: -1,
  });
  if (swap_target_idx !== null) {
    // move swap target to inventory
    let swap_target = target_list[swap_target_idx];
    assert(swap_target);
    let inv_idx = inventoryIndexForItemPickup(swap_target);
    assert(inv_idx !== -1);
    if (inventory[inv_idx]) {
      inventory[inv_idx].count++;
      ops.push({
        idx: inv_idx,
        delta: 1,
      });
    } else {
      inventory[inv_idx] = swap_target;
      ops.push({
        idx: inv_idx,
        item: swap_target,
      });
    }
    // remove swap target from equipment
    target_list.splice(swap_target_idx, 1);
    ops.push({
      list: loc,
      idx: swap_target_idx,
      delta: -1,
    });
  }
  // put item in target
  let target_idx = target_list.length;
  for (let ii = 0; ii < target_list.length; ++ii) {
    if (target_list[ii].level < item.level) {
      target_idx = ii;
      break;
    }
  }

  let new_item = {
    ...item,
    count: 1,
  };
  target_list.splice(target_idx, 0, new_item);
  ops.push({
    list: loc,
    idx: target_idx,
    item: new_item,
  });

  let payload: ActionInventoryPayload = {
    ops,
    ready: false,
  };
  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      inventory,
      [loc]: target_list,
    },
  }, errorsToChat);

  my_ent.calcPlayerResist(currentFloorLevel());
}

function doCombine(src_idx: number, target_idx: number): void {
  let my_ent = myEnt();
  let inventory = clone(my_ent.getData<(Item|null)[]>('inventory', []));
  let item = inventory[src_idx];
  assert(item);
  assert(item.type === 'hat' || item.type === 'book');

  let ops: ActionInventoryOp[] = [];
  if (item.count === 2) {
    // remove from inventory
    inventory[src_idx] = null;
  } else {
    // decrement from inventory
    item.count -= 2;
  }
  ops.push({
    idx: src_idx,
    delta: -2,
  });
  if (inventory[target_idx]) {
    inventory[target_idx].count++;
    ops.push({
      idx: target_idx,
      delta: 1,
    });
  } else {
    let new_item = {
      ...item,
      level: item.level + 1,
      count: 1,
    };
    inventory[target_idx] = new_item;
    ops.push({
      idx: target_idx,
      item: new_item,
    });
  }

  let payload: ActionInventoryPayload = {
    ops,
    ready: false,
  };
  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      inventory,
    },
  }, errorsToChat);
}

function doDownvert(src_idx: number, target_idx: number, subtype: number): void {
  let my_ent = myEnt();
  let inventory = clone(my_ent.getData<(Item|null)[]>('inventory', []));
  let item = inventory[src_idx];
  assert(item);
  assert(item.type === 'hat' || item.type === 'book');

  let ops: ActionInventoryOp[] = [];
  if (item.count === 1) {
    // remove from inventory
    inventory[src_idx] = null;
  } else {
    // decrement from inventory
    item.count--;
  }
  ops.push({
    idx: src_idx,
    delta: -1,
  });
  if (inventory[target_idx]) {
    inventory[target_idx].count++;
    ops.push({
      idx: target_idx,
      delta: 1,
    });
  } else {
    let new_item = {
      ...item,
      subtype,
      level: item.level - 1,
      count: 1,
    };
    inventory[target_idx] = new_item;
    ops.push({
      idx: target_idx,
      item: new_item,
    });
  }

  let payload: ActionInventoryPayload = {
    ops,
    ready: false,
  };
  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      inventory,
    },
  }, errorsToChat);
}

function doTradeForPotion(src_idx: number, target_idx: number): void {
  let my_ent = myEnt();
  let inventory = clone(my_ent.getData<(Item|null)[]>('inventory', []));
  let item = inventory[src_idx];
  assert(item);
  assert(item.type === 'hat' || item.type === 'book');

  let ops: ActionInventoryOp[] = [];
  if (item.count === 1) {
    // remove from inventory
    inventory[src_idx] = null;
  } else {
    // decrement from inventory
    item.count--;
  }
  ops.push({
    idx: src_idx,
    delta: -1,
  });
  if (inventory[target_idx]) {
    inventory[target_idx].count++;
    ops.push({
      idx: target_idx,
      delta: 1,
    });
  } else {
    let new_item: Item = {
      type: 'potion',
      subtype: 0,
      level: 1,
      count: 1,
    };
    inventory[target_idx] = new_item;
    ops.push({
      idx: target_idx,
      item: new_item,
    });
  }

  let payload: ActionInventoryPayload = {
    ops,
    ready: false,
  };
  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      inventory,
    },
  }, errorsToChat);
}

const HAT_STACK_OFFS = [
  1,2,1,0,2,1,2,1,0,1,2,0,1
];
export function drawHatDude(x0: number, y0: number, z: number, scale: number, hats: Item[], books: Item[]): void {
  let anim_t = engine.getFrameTimestamp() * 0.001;
  let dir = ((anim_t + PI/2) % (PI * 2)) < PI;
  let book_xoffs = 9 * scale;
  let hat_xoffs = -1 * scale;
  if (!dir) {
    book_xoffs *= -1;
    hat_xoffs *= -1;
  }
  x0 += 8 * scale + round(sin(anim_t) * 8 * scale);
  let y = y0;
  autoAtlas('player', dir ? 'player-right' : 'player-left').draw({
    x: x0,
    y,
    z,
    w: 12 * scale,
    h: 12 * scale,
  });
  y -= 9 * scale;
  for (let ii = 0; ii < hats.length; ++ii) {
    let hat = hats[ii];
    y -= 4 * scale;
    inventoryIconDraw({
      x: x0 - 5 * scale + hat_xoffs + HAT_STACK_OFFS[ii] * scale,
      y, z: z + 1 + ii,
      item: hat,
      scale,
    });
  }
  y = y0;
  y += 3 * scale;
  for (let ii = 0; ii < books.length; ++ii) {
    let book = books[ii];
    let elem = ELEMENT_NAME[1 + (book.subtype % 3)];
    y -= 6 * scale;
    autoAtlas('ui', `spellbook-side-${elem}`).draw({
      x: x0 - scale + book_xoffs + HAT_STACK_OFFS[HAT_STACK_OFFS.length - 1 - ii] * scale,
      y, z: z + 1 + ii + 10,
      w: 12 * scale,
      h: 12 * scale,
    });
  }
}


type ShopType = 'inventory' | 'upgrades' | 'trades';

const INVENTORY_LEFT_COLUMN = 52;
const INVENTORY_PAD = 4;
const INVENTORY_BETWEEN_ITEM_COLUMNS = 12;
const INVENTORY_PAD6 = 6;
const INVENTORY_HATS_XOFFS = INVENTORY_LEFT_COLUMN + INVENTORY_PAD;
const INVENTORY_BOOKS_XOFFS = INVENTORY_HATS_XOFFS + BUTTON_W + INVENTORY_BETWEEN_ITEM_COLUMNS;
const INVENTORY_GRID_XOFFS = INVENTORY_BOOKS_XOFFS + BUTTON_W +
  INVENTORY_BETWEEN_ITEM_COLUMNS + INVENTORY_PAD6;
const INVENTORY_GRID_W_PX = INVENTORY_GRID_W * (BUTTON_W + INVENTORY_PAD) - INVENTORY_PAD;
const INVENTORY_GRID_H_PX = INVENTORY_GRID_H * (BUTTON_W + INVENTORY_PAD) - INVENTORY_PAD;
const INVENTORY_W = INVENTORY_GRID_XOFFS +
  INVENTORY_GRID_W_PX +
  INVENTORY_PAD6 + INVENTORY_PAD6;
const INVENTORY_GRID_YOFFS = INVENTORY_PAD6 * 2;
const INVENTORY_INFO_YOFFS = INVENTORY_GRID_YOFFS +
  INVENTORY_GRID_H_PX +
  INVENTORY_PAD6 * 2;
const INVENTORY_H = 290;
const INVENTORY_SHOP_OPTIONS_YOFFS = INVENTORY_H - 60;
const INVENTORY_X = floor((game_width - INVENTORY_W) / 2);
const INVENTORY_Y = floor((game_height - INVENTORY_H) / 2);
const INVENTORY_ACTION_W = 52;
const TRADE_ACTION_W = 60;
const style_inventory = fontStyleColored(null, palette_font[PAL_BLACK - 1]);
class InventoryMenuAction extends UIAction {
  constructor(public shop_type: ShopType) {
    super();
    myEntOptional()?.calcPlayerResist(currentFloorLevel());
  }
  selected_idx: [string, number] = ['null', 0];
  tick(): void {
    let z = Z.MODAL;

    let { shop_type } = this;

    let my_ent = myEnt();
    let level = my_ent.getData('stats.level', 1);
    let floor_level = currentFloorLevel();
    let inventory = my_ent.getData<(Item|null)[]>('inventory', []);
    let hats = my_ent.getData<Item[]>('hats', []);
    let books = my_ent.getData<Item[]>('books', []);
    let { selected_idx } = this;

    if (engine.DEBUG && selected_idx[0] === 'null' && false) {
      selected_idx = this.selected_idx = ['inv', 2];
    }

    let x0 = INVENTORY_X + INVENTORY_HATS_XOFFS;
    let y0 = INVENTORY_Y + INVENTORY_GRID_YOFFS;

    let level_y = y0 + (BUTTON_W + INVENTORY_PAD) * (MAX_LEVEL - level) - 3;
    autoAtlas('ui', 'inventory-separator').draw({
      x: INVENTORY_X + INVENTORY_BOOKS_XOFFS + BUTTON_W - 83,
      y: level_y,
      z,
      w: 83,
      h: 2,
    });
    font.draw({
      style: style_inventory,
      x: x0 - 2,
      y: level_y + 1,
      z,
      align: ALIGN.HRIGHT,
      text: `Player L${level}`,
    });
    let do_action = false;
    if (floor_level < level) {
      level_y = y0 + (BUTTON_W + INVENTORY_PAD) * (MAX_LEVEL - floor_level) - 3;
      autoAtlas('ui', 'inventory-separator').draw({
        x: INVENTORY_X + INVENTORY_BOOKS_XOFFS + BUTTON_W - 83,
        y: level_y,
        z,
        w: 83,
        h: 2,
      });
      font.draw({
        style: style_inventory,
        x: x0 - 2,
        y: level_y + 1,
        z,
        align: ALIGN.HRIGHT,
        text: `Floor L${floor_level}`,
      });
    }

    for (let ii = 0; ii < MAX_LEVEL; ++ii) {
      let x = x0;
      let y = y0 + (BUTTON_W + INVENTORY_PAD) * ii;
      let idx = MAX_LEVEL - ii - 1;
      let item = hats[idx];
      let param = {
        x, y, z, w: BUTTON_W, h: BUTTON_W,
      };
      if (!item) {
        drawBox(param, autoAtlas('ui', idx < level ? 'inventory-fillable-hat' : 'inventory-locked'));
        if (idx >= level) {
          font.draw({
            color: palette_font[4],
            x: x0 + BUTTON_W,
            y: param.y,
            z,
            w: INVENTORY_BETWEEN_ITEM_COLUMNS,
            h: param.h,
            align: ALIGN.HCENTER | ALIGN.VCENTER,
            text: `L${idx + 1}`
          });
        }
      } else {
        if (inventoryButton({
          x, y, z,
          item,
          show_count: false,
          selected: selected_idx[0] === 'hats' && selected_idx[1] === idx,
        })) {
          this.selected_idx = selected_idx = ['hats', idx];
          if (buttonLastSpotRet().double_click) {
            do_action = true;
          }
        }
      }
    }

    x0 = INVENTORY_X + INVENTORY_BOOKS_XOFFS;
    for (let ii = 0; ii < MAX_LEVEL; ++ii) {
      let x = x0;
      let y = y0 + (BUTTON_W + INVENTORY_PAD) * ii;
      let idx = MAX_LEVEL - ii - 1;
      let item = books[idx];
      let param = {
        x, y, z, w: BUTTON_W, h: BUTTON_W,
      };
      if (!item) {
        drawBox(param, autoAtlas('ui', idx < level ? 'inventory-fillable-book' : 'inventory-locked'));
      } else {
        if (inventoryButton({
          x, y, z,
          item,
          show_count: false,
          selected: selected_idx[0] === 'books' && selected_idx[1] === idx,
        })) {
          this.selected_idx = selected_idx = ['books', idx];
          if (buttonLastSpotRet().double_click) {
            do_action = true;
          }
        }
      }
    }

    let idx = 0;
    x0 = INVENTORY_X + INVENTORY_GRID_XOFFS;
    y0 = INVENTORY_Y + INVENTORY_GRID_YOFFS;
    for (let yy = 0; yy < INVENTORY_GRID_H; ++yy) {
      let y = y0 + yy * (BUTTON_W + INVENTORY_PAD);
      for (let xx = 0; xx < INVENTORY_GRID_W; ++xx, ++idx) {
        let x = x0 + xx * (BUTTON_W + INVENTORY_PAD);
        let item = inventory[idx];
        let param = {
          x, y, z, w: BUTTON_W, h: BUTTON_W,
        };
        if (!item) {
          autoAtlas('ui', 'inventory-empty').draw(param);
        } else {
          if (inventoryButton({
            x, y, z,
            item,
            show_count: true,
            selected: selected_idx[0] === 'inv' && selected_idx[1] === idx,
          })) {
            this.selected_idx = selected_idx = ['inv', idx];
            if (buttonLastSpotRet().double_click) {
              do_action = true;
            }
          }
        }
      }
    }

    drawBox({
      x: x0 - INVENTORY_PAD6,
      y: y0 - INVENTORY_PAD6,
      z: z - 0.5,
      w: INVENTORY_GRID_W_PX + INVENTORY_PAD6 * 2,
      h: INVENTORY_GRID_H_PX + INVENTORY_PAD6 * 2,
    }, autoAtlas('ui', 'panel-overlay'));

    let sel_loc = selected_idx[0];
    let base_array = sel_loc === 'inv' ? inventory :
      sel_loc === 'hats' ? hats :
      sel_loc === 'books' ? books :
      [];
    let item: Item | null = base_array[selected_idx[1]] || null;

    x0 = INVENTORY_X + INVENTORY_GRID_XOFFS;
    y0 = INVENTORY_Y + INVENTORY_INFO_YOFFS;
    if (item) {
      let x = x0;
      let y = y0;
      inventoryIconDraw({
        x, y: y - 2, z,
        item,
      });
      title_font.draw({
        style: style_inventory,
        size: TITLE_FONT_H,
        x: x + BUTTON_W + 2,
        y,
        z,
        text: `${itemName(item)}${sel_loc === 'inv' ? ` (${item.count})` : ''}`,
      });
      y += TITLE_FONT_H + 2;
      let hide_lines = false;
      function line(text: string): void {
        if (hide_lines) {
          return;
        }
        y += markdownAuto({
          font_style: style_inventory,
          x, y, z,
          w: INVENTORY_GRID_W_PX,
          align: ALIGN.HWRAP,
          text,
        }).h + 2;
      }
      if (item.type === 'potion') {
        line(`Heals for ${POTION_HEAL_PORTION*100}% Max HP` +
          ` (${round(POTION_HEAL_PORTION * my_ent.getData('stats.hp_max',1))} HP)` +
          '\nUse with [c=hotkey]H[/c] from the main screen.');
      } else if (item.type === 'book') {
        let skill_details = skillDetails(item);
        let basic_damage = basicAttackDamage(my_ent.data.stats, { defense: 0 } as StatsData);
        let elem_name = ELEMENT_NAME[skill_details.element];
        line(`Cost: [c=mp]${skill_details.mp_cost} MP[/c]\n` +
            `Deals [c=dam${elem_name}]${skill_details.dam + basic_damage.dam} ${elem_name} damage[/c]`);
      } else if (item.type === 'hat') {
        let hat_details = hatDetails(item);
        let elem_name = ELEMENT_NAME[hat_details.element];
        line(`[c=dam${elem_name}]+${hat_details.resist}% ${elem_name}[/c] resistance`);
      } else {
        unreachable(item.type);
      }

      y += 2;

      let x1 = x0 + INVENTORY_GRID_W_PX;
      function action(text: string): boolean {
        return Boolean(button({
          x: x1 - INVENTORY_ACTION_W, y: y0, z,
          w: INVENTORY_ACTION_W,
          text,
        }) || do_action);
      }

      function disabledAction(text: string): void {
        if (hide_lines) {
          return;
        }
        button({
          x, y, z,
          disabled: true,
          text,
        });
      }

      if (shop_type !== 'inventory') {
        hide_lines = true;
      }

      if (item.type === 'hat' || item.type === 'book') {
        // equipable
        if (sel_loc === 'inv') {
          const target_loc = `${item.type}s` as const;
          let target_list = my_ent.getData<Item[]>(target_loc, []);
          let swap_target_idx: number | null = null;
          let swap_target: Item | null = null;
          for (let ii = 0; ii < target_list.length; ++ii) {
            let elem = target_list[ii];
            if (elem.level === item.level) {
              swap_target = elem;
              swap_target_idx = ii;
            }
          }
          let is_at_player_level = target_list.length >= level;
          let is_at_floor_level = target_list.length >= floor_level;

          if (swap_target) {
            if (swap_target.subtype === item.subtype) {
              line('This is currently equipped');
              if (action('Unequip')) {
                unequip(target_loc, swap_target_idx!, selected_idx[1]);
              }
            } else if (item.count > 1 && inventoryIndexForItemPickup(swap_target) === -1) {
              line('CANNOT unequip for swap: inventory full');
              disabledAction('Swap');
            } else {
              if (action('Swap')) {
                equip(selected_idx[1], swap_target_idx);
              }
            }
          } else if (!is_at_player_level) {
            // allow equipping
            if (is_at_floor_level) {
              line('Note: You can equip this, however you will be wielding more' +
                ` ${item.type}s than the current Floor Level, so only the bottom (best) item(s) will be used.`);
            }
            if (action('Equip')) {
              equip(selected_idx[1], null);
            }
          } else {
            line(`CANNOT equip:  You can only wield smaller ${target_loc} on top` +
              ` of larger ${target_loc}, up to your player level, unequip another first.`);
            // disabledAction('Equip');
          }
        } else {
          line('This is currently equipped');
          assert(sel_loc === 'hats' || sel_loc === 'books');
          let target_idx = inventoryIndexForItemPickup(item);
          if (selected_idx[1] >= floor_level) {
            line('Note: You are wielding more' +
              ` ${item.type}s than the current Floor Level, so only the bottom (best) item(s) will be used.`);
          }
          if (target_idx === -1) {
            line('CANNOT unequip: inventory full');
          } else if (action('Unequip')) {
            unequip(sel_loc, selected_idx[1], target_idx);
          }
        }
      }
      hide_lines = false;

      if (shop_type !== 'inventory') {
        y = INVENTORY_Y + INVENTORY_SHOP_OPTIONS_YOFFS;
        if (sel_loc !== 'inv') {
          line(`Select a stack of items in your inventory to see ${shop_type.slice(0,-1)} options.`);
        } else if (shop_type === 'upgrades') {
          // show options
          if (item.level === MAX_LEVEL) {
            line('Maximum level reached.');
          } else if (item.type !== 'hat' && item.type !== 'book') {
            line('Cannot combine potions.');
          } else {
            line(`[c=level]UPGRADE[/c]: Combine 2 [c=level]L${item.level}[/c]s into a [c=level]L${item.level + 1}[/c]`);
            y += 4;

            let target_item: Item = {
              ...item,
              level: item.level + 1,
              count: 0,
            };
            let target_idx = inventoryIndexForItemPickup(target_item);
            if (target_idx === -1) {
              line('Cannot combine: inventory full.');
            } else {
              if (inventory[target_idx]) {
                target_item.count = inventory[target_idx].count;
              }

              let can_do = item.count >= 2;

              x += 36;
              inventoryButton({
                x, y, z,
                item,
                show_count: true,
                selected: false,
                nointeract: true,
              });
              font.draw({
                style: can_do ? style_inventory : style_mp_cost_over,
                x, y: y + 24, z,
                w: 20,
                align: ALIGN.HCENTER,
                text: 'x2',
              });
              x += 24;
              autoAtlas('map', 'playerdir0').draw({
                x: x + 4,
                y: y + 4,
                z,
                w: 12,
                h: 12,
              });
              x += 24;
              inventoryButton({
                x, y, z,
                item: target_item,
                show_count: true,
                selected: false,
                nointeract: true,
              });
              font.draw({
                style: style_inventory,
                x, y: y + 24, z,
                w: 20,
                align: ALIGN.HCENTER,
                text: 'x1',
              });
              x += 24*1.5;
              if (can_do) {
                if (buttonText({
                  x, y, z,
                  w: INVENTORY_ACTION_W,
                  text: 'Combine!',
                })) {
                  doCombine(selected_idx[1], target_idx);
                }
              } else {
                font.draw({
                  x, y: y - 2, z,
                  style: style_mp_cost_over,
                  w: x1 - x,
                  align: ALIGN.HWRAP | ALIGN.HCENTER,
                  text: 'Insufficient\nsource\nitems',
                });
              }
            }
          }
        } else if (shop_type === 'trades') {
          // show options
          if (item.type !== 'hat' && item.type !== 'book') {
            line('Cannot trade potions.');
          } else {
            // line(`[c=level]DOWNGRADE[/c]: Combine 1 [c=level]L${item.level}[/c]s into
            y -= 12;

            inventoryButton({
              x, y, z,
              item,
              show_count: true,
              selected: false,
              nointeract: true,
            });
            font.draw({
              style: style_inventory,
              x, y: y + 22, z,
              w: 20,
              align: ALIGN.HCENTER,
              text: 'x1',
            });
            x += 24;

            for (let dsubtype = 1; dsubtype <= 2; ++dsubtype) {
              let target_item: Item = {
                ...item,
                level: item.level - 1,
                subtype: (item.subtype + dsubtype) % 3,
                count: 0,
              };
              let target_idx = inventoryIndexForItemPickup(target_item);
              if (!target_item.level) {
                font.draw({
                  x, y: y - 2, z,
                  style: style_mp_cost_over,
                  w: TRADE_ACTION_W,
                  align: ALIGN.HWRAP | ALIGN.HCENTER,
                  text: 'Already\nminimum\nlevel',
                });
              } else if (target_idx === -1) {
                font.draw({
                  x, y: y - 2, z,
                  style: style_mp_cost_over,
                  w: TRADE_ACTION_W,
                  align: ALIGN.HWRAP | ALIGN.HCENTER,
                  text: 'Inventory\nfull',
                });
              } else {
                if (inventory[target_idx]) {
                  target_item.count = inventory[target_idx].count;
                }
                autoAtlas('map', 'playerdir0').draw({
                  x: x + 10,
                  y: y + 4,
                  z,
                  w: 12,
                  h: 12,
                });

                inventoryButton({
                  x: x + 26, y, z,
                  item: target_item,
                  show_count: true,
                  selected: false,
                  nointeract: true,
                });
                font.draw({
                  style: style_inventory,
                  x: x + 26, y: y + 22, z,
                  w: 20,
                  align: ALIGN.HCENTER,
                  text: 'x1',
                });
                if (buttonText({
                  x, y: y + 24 + FONT_HEIGHT + 2, z,
                  w: TRADE_ACTION_W,
                  text: 'Downvert',
                })) {
                  doDownvert(selected_idx[1], target_idx, target_item.subtype);
                }
              }
              x += TRADE_ACTION_W + INVENTORY_PAD;
            } // ent for dsubtype
            let target_item: Item = {
              type: 'potion',
              subtype: 0,
              level: 1,
              count: 0,
            };
            let target_idx = inventoryIndexForItemPickup(target_item);
            if (target_idx === -1) {
              font.draw({
                x, y: y - 2, z,
                style: style_mp_cost_over,
                w: TRADE_ACTION_W,
                align: ALIGN.HWRAP | ALIGN.HCENTER,
                text: 'Inventory\nfull',
              });
            } else {
              if (inventory[target_idx]) {
                target_item.count = inventory[target_idx].count;
              }
              autoAtlas('map', 'playerdir0').draw({
                x: x + 10,
                y: y + 4,
                z,
                w: 12,
                h: 12,
              });

              inventoryButton({
                x: x + 26, y, z,
                item: target_item,
                show_count: true,
                selected: false,
                nointeract: true,
              });
              font.draw({
                style: style_inventory,
                x: x + 26, y: y + 22, z,
                w: 20,
                align: ALIGN.HCENTER,
                text: 'x1',
              });
              if (buttonText({
                x, y: y + 24 + FONT_HEIGHT + 2, z,
                w: TRADE_ACTION_W,
                text: 'Trade',
              })) {
                doTradeForPotion(selected_idx[1], target_idx);
              }
              x += TRADE_ACTION_W + INVENTORY_PAD;
            }

          }
        }
      }
    } else if (shop_type !== 'inventory') {
      let y = INVENTORY_Y + INVENTORY_SHOP_OPTIONS_YOFFS - 12;
      markdownAuto({
        font_style: style_inventory,
        x: x0, y, z,
        w: INVENTORY_GRID_W_PX,
        align: ALIGN.HWRAP,
        text: shop_type === 'upgrades' ?
          '[c=level]UPGRADE[/c]: Combine 2 items into a [c=level]higher level[/c] item.' :
          '[c=level]DOWNVERT[/c]: Convert 1 item into a\n  [c=level]lower level[/c] item of a different\n' +
          '  element.\n\n' +
          '[c=level]TRADE[/c]: Trade any 1 item for a healing\n  potion.'
      });
    }

    x0 = INVENTORY_X + INVENTORY_GRID_XOFFS - 80 - INVENTORY_PAD;
    y0 = INVENTORY_Y + INVENTORY_H - FONT_HEIGHT * 4 - INVENTORY_PAD - 4;
    let y = y0;
    title_font.draw({
      style: style_inventory,
      size: TITLE_FONT_H,
      x: x0,
      y,
      z,
      w: 80,
      align: ALIGN.HCENTER,
      text: 'Resistances',
    });
    y += TITLE_FONT_H;
    (['fire', 'earth', 'ice'] as const).forEach(function (elem) {
      markdownAuto({
        x: x0,
        y,
        z,
        w: 40,
        align: ALIGN.HRIGHT,
        text: `[c=dam${elem}]${capitalize(elem)}[/c]:`
      });
      markdownAuto({
        x: x0 + 44,
        y,
        z,
        text: `[c=dam${elem}]${my_ent.getData(`stats.r${elem}`, 0)}%[/c]`
      });
      y += FONT_HEIGHT;
    });

    x0 = INVENTORY_X + INVENTORY_PAD6;
    y0 = INVENTORY_Y + INVENTORY_H - INVENTORY_PAD6 - 6;
    drawHatDude(x0, y0, z, 1, hats, books);

    drawBox({
      x: INVENTORY_X - 4,
      y: INVENTORY_Y - 4,
      w: INVENTORY_W + 8,
      h: INVENTORY_H + 8,
      z: z - 1,
    }, autoAtlas('ui', 'panel-thick'));
    // drawRect(0, 0, game_width, game_height, z - 1, [0, 0, 0, 0.5]);
    menuUp();
  }
}
InventoryMenuAction.prototype.name = 'InventoryMenu';
InventoryMenuAction.prototype.is_overlay_menu = true;
InventoryMenuAction.prototype.is_fullscreen_ui = true;

function setMiscField<T extends keyof EntityDataClient>(field: T, value: EntityDataClient[T]): void {
  crawlerMyApplyBatchUpdate({
    action_id: 'misc',
    field: 'seq_player_move',
    data_assignments: {
      [field]: value,
    },
  }, errorsToChat);
}


const SETUP_W = 300;
const SETUP_H = game_height / 2;
const SETUP_X = floor((game_width - SETUP_W)/2);
const SETUP_Y = floor((game_height - SETUP_H)/2);
const SETUP_EDIT_W = DISPLAY_NAME_MAX_VISUAL_SIZE.width;
class SetupMenuAction extends UIAction {
  display_name: string;
  orig_name: string;
  did_auto_random = false;
  constructor() {
    super();
    this.display_name = myEnt().getData('display_name', '???');
    this.orig_name = this.display_name;
  }
  tick(): void {

    let z = Z.MODAL;

    let x = SETUP_X + floor((SETUP_W - SETUP_EDIT_W)/2);
    let y = SETUP_Y;

    y += 12;
    title_font.draw({
      style: style_inventory,
      size: TITLE_FONT_H,
      x, y, z, w: SETUP_EDIT_W,
      align: ALIGN.HCENTER,
      text: 'Character Customization',
    });

    y += 48;

    font.draw({
      style: style_inventory,
      x, y, z,
      text: 'Name',
    });
    const button_w = 60;
    if (buttonText({
      x: x + SETUP_EDIT_W + 8,
      y: y + 4,
      z,
      w: button_w,
      text: 'Random',
    }) || !this.did_auto_random && this.display_name.startsWith('anon')) {
      this.did_auto_random = true;
      netClient().send<string, null>('random_name', null, null, (ignored?: unknown, data?: string): void => {
        if (data) {
          while (title_font.getStringWidth(null, DISPLAY_NAME_MAX_VISUAL_SIZE.font_height, data) >
            DISPLAY_NAME_MAX_VISUAL_SIZE.width
          ) {
            data = data.slice(0, -1);
          }
          this.display_name = data;
        }
      });
    }
    y += FONT_HEIGHT;
    this.display_name = editBox<string>({
      x, y: y + 2, z,
      w: SETUP_EDIT_W,
      type: 'text',
      max_visual_size_font: title_font,
      max_visual_size: DISPLAY_NAME_MAX_VISUAL_SIZE,
      initial_select: true,
    }, this.display_name).text;
    y += uiButtonHeight() - 4;
    title_font.draw({
      x, y, z,
      style: style_inventory,
      size: TITLE_FONT_H,
      text: this.display_name,
    });


    // Profile picture?
    // Clothing color?
    // Starting spell book / hat?

    if (buttonText({
      x: SETUP_X + SETUP_W - 12 - button_w ,
      y: SETUP_Y + SETUP_H - 12 - uiButtonHeight(),
      w: button_w,
      z,
      text: 'Okay',
    })) {
      uiAction(null);
      if (this.orig_name !== this.display_name) {
        chatUI().cmdParse(`rename ${this.display_name}`);
      }
      if (!myEnt().getData('did_setup')) {
        setMiscField('did_setup', true);
      }
    }


    drawBox({
      x: SETUP_X - 4,
      y: SETUP_Y - 4,
      w: SETUP_W + 8,
      h: SETUP_H + 8,
      z: z - 1,
    }, autoAtlas('ui', 'panel-thick'));

    menuUp();
  }
}
SetupMenuAction.prototype.name = 'SetupMenu';
SetupMenuAction.prototype.is_overlay_menu = true;
SetupMenuAction.prototype.is_fullscreen_ui = true;

function checkForFreeHealingPotion(): void {
  let my_ent = myEnt();
  let inventory = my_ent.getData<(Item|null)[]>('inventory', []);
  for (let ii = 0; ii < inventory.length; ++ii) {
    let item = inventory[ii];
    if (item) {
      if (item.level <= 1) {
        return;
      }
    }
  }
  // no potions, no L1 things to trade
  dialog('sign', 'You seem down on your luck... have a free potion on the house!');
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  pickupOnClient({
    type: 'potion',
    level: 1,
    subtype: 0,
    count: 1,
  });
}

export function showShop(shop_type: ShopType): void {
  if (shop_type === 'trades') {
    checkForFreeHealingPotion();
  }
  uiAction(new InventoryMenuAction(shop_type));
}

function isOnFloorList(): boolean {
  let game_state = crawlerGameState();
  let { floor_id } = game_state;
  let level = game_state.levels[floor_id];
  if (!level) {
    return true;
  }
  let pos = myEnt().getData<JSVec3>('pos')!;
  let cell = level.getCell(pos[0], pos[1]);
  if (!cell) {
    return true;
  }
  return Boolean(cell.events?.[0].param.startsWith('floorlist'));
}

function closeFloorList(): void {
  uiAction(null);
  crawlerScriptAPI().forceMove(WEST);
}

function perc(n: number): string {
  return `${round(n * 100)}%`;
}

function fourdigit(n: number): string {
  let s = String(n).slice(-4);
  while (s[0] === '0' && s.length > 1) {
    s = s.slice(1);
  }
  return s;
}

function displayNameForUser(user_id: string): string {
  let room = crawlerRoom();
  let clients = room.getChannelData<ChannelDataClients>('public.clients', {});
  for (let client_id in clients) {
    let { ids } = clients[client_id]!;
    if (ids.user_id === user_id && ids.display_name) {
      return ids.display_name;
    }
  }
  return netSubs().getChannelImmediate(`user.${user_id}`).getChannelData('public.display_name', user_id);
}

function anyActive(recent_players: TSMap<FloorPlayerData>): boolean {
  for (let user_id in recent_players) {
    if (recent_players[user_id]!.is_active) {
      return true;
    }
  }
  return false;
}

function joinFloor(floor_id: number): void {
  uiAction(null);
  let my_ent = myEnt();
  let my_floor_id = my_ent.data.floor;
  let my_pos = my_ent.getData<JSVec3>('pos')!;
  setMiscField('town_leave_pos', [my_pos[0], my_pos[1], my_pos[2]]);
  crawlerScriptAPI().floorDelta(floor_id - my_floor_id, 'stairs_in', false);
}

const FLOORLIST_W = FRAME_VERT_SPLIT - 12;
const FLOORLIST_H = QUICKBAR_FRAME_Y - 12 - 5;
const FLOORLIST_X = 12;
const FLOORLIST_Y = 12;
class FloorListAction extends UIAction {
  scroll_area: ScrollArea;
  constructor(public base_floor: number) {
    super();
    this.scroll_area = scrollAreaCreate({
      background_color: null,
      auto_hide: true,
    });
  }
  tick(): void {
    let room = crawlerRoom();
    let my_ent = myEnt();
    let my_level = my_ent.getData('stats.level', 1);

    let z = Z.FLOORLIST;
    let x = FLOORLIST_X;
    let y = FLOORLIST_Y;

    this.scroll_area.begin({
      x, y, z,
      h: FLOORLIST_H,
      w: FLOORLIST_W + 13,
    });
    x = 0;
    y = 0;

    y += 4;
    function titleLine(text: string): void {
      title_font.draw({
        style: style_inventory,
        size: TITLE_FONT_H,
        x: 0, y, z, w: FLOORLIST_W,
        align: ALIGN.HCENTER,
        text,
      });
      y += TITLE_FONT_H + 2;
    }

    let now = walltime.seconds();
    let floor_data: Partial<Record<number, FloorData>> = room.getChannelData('public.floors', {});
    // example data
    if (0) {
      floor_data = {
        1: {
          rooms: {
            10: {
              last_active: now,
              enemies_total: 22,
              enemies_left: 7,
              recent_players: {
                anon484576: {
                  player_level: 1,
                  last_active: now,
                  is_active: true,
                },
              },
            },
            11: {
              last_active: now - 300000,
              enemies_total: 22,
              enemies_left: 0,
              recent_players: {
                jimbly: {
                  player_level: 1,
                  last_active: now - 300000,
                },
                jeff: {
                  player_level: 2,
                  last_active: now,
                  is_active: true,
                },
              },
            },
          },
        },
        3: {
          rooms: {
            12: {
              last_active: now,
              enemies_total: 22,
              enemies_left: 22,
              recent_players: {
                anon484576: {
                  player_level: 1,
                  last_active: now,
                  is_active: true,
                },
              },
            },
          },
        },
      };
    }

    type RoomRecord = {
      floor_level: number;
      floor_id: number;
      room_data: FloorRoomData;
    };
    let my_last_room: RoomRecord & {
      last_active: number;
    } | null = null;
    let my_user_id = netUserId()!;
    for (let floor_level_str in floor_data) {
      let floor_level = Number(floor_level_str);
      let by_level = floor_data[floor_level]!;
      for (let floor_id_str in by_level.rooms) {
        let floor_id = Number(floor_id_str);
        let room_data = by_level.rooms[floor_id]!;
        let my_rec = room_data.recent_players[my_user_id];
        if (my_rec) {
          if (!my_last_room || my_rec.last_active > my_last_room.last_active) {
            my_last_room = {
              last_active: my_rec.last_active,
              floor_level,
              floor_id,
              room_data,
            };
          }
        }
      }
    }

    const button_w = 80; // fits 4-digit floor_ids
    const FLOORLIST_PAD = 4;
    const FLOORLIST_BUTTON_H2 = round(uiButtonHeight() * 1.5);
    // const FLOORLIST_BUTTON_H3 = uiButtonHeight() * 2;
    const CARD_W = FLOORLIST_W - 12;
    const CARD_PAD = 6;

    function drawRoomCard(rec: RoomRecord): void {
      x = floor((FLOORLIST_W - CARD_W) / 2);
      let { room_data } = rec;
      let y_start = y;
      y += CARD_PAD;

      let my_rec = room_data.recent_players[my_user_id];

      let button_x = x + CARD_W - button_w - CARD_PAD;
      if (buttonText({
        x: button_x, y, z,
        w: button_w,
        h: FLOORLIST_BUTTON_H2,
        align: ALIGN.HWRAP | ALIGN.HCENTER,
        markdown: true,
        text: `${my_rec ? 'RESUME' : 'JOIN'}\nLevel [c=${rec.floor_level > my_level ? 'red' : 'level'}]` +
          `${rec.floor_level}[/c] #${fourdigit(rec.floor_id)}`,
      })) {
        joinFloor(rec.floor_id);
      }
      let ymax = y + FLOORLIST_BUTTON_H2;

      if (my_rec) {
        font.draw({
          style: style_inventory,
          x: x + CARD_PAD, y, z,
          text: 'Last played ' +
            `${secondsToFriendlyString(now - my_rec.last_active).split(',')[0]} ago`,
        });
        y += FONT_HEIGHT;
      }
      let completion_perc = 1 - room_data.enemies_left/room_data.enemies_total;
      let completion = `${perc(completion_perc)} Complete`;
      font.draw({
        style: style_inventory,
        x: x + CARD_PAD, y, z,
        text: `${completion}`,
      });
      y += FONT_HEIGHT;
      let cur_players = [];
      for (let user_id in room_data.recent_players) {
        if (user_id === my_user_id) {
          continue;
        }
        let player_rec = room_data.recent_players[user_id]!;
        if (player_rec.is_active) {
          cur_players.push(displayNameForUser(user_id));
        }
      }

      if (cur_players.length) {
        y += font.draw({
          style: style_inventory,
          x: x + CARD_PAD, y, z,
          align: ALIGN.HWRAP,
          w: button_x - FLOORLIST_PAD - (x + CARD_PAD),
          text: `Players: ${cur_players.join(', ')}`,
        });
      }
      if (rec.floor_level > my_level) {
        y += font.draw({
          style: style_mp_cost_over,
          x: x + CARD_PAD, y, z,
          align: ALIGN.HWRAP,
          w: button_x - FLOORLIST_PAD - (x + CARD_PAD),
          text: `Warning: floor level (${rec.floor_level}) exceeds player level (${my_level})`,
        });
      }

      y = max(y, ymax);
      y += CARD_PAD;
      drawBox({
        x, y: y_start, z: z - 0.5,
        w: CARD_W,
        h: y - y_start,
      }, autoAtlas('ui', 'panel-overlay'));
      y += 2;
    }

    if (my_last_room) {
      drawRoomCard(my_last_room);
    }

    let options: RoomRecord[] = [];
    let disabled_floors: Record<number, boolean> = {};
    for (let floor_level_str in floor_data) {
      let floor_level = Number(floor_level_str);
      let by_level = floor_data[floor_level]!;
      for (let floor_id_str in by_level.rooms) {
        let floor_id = Number(floor_id_str);
        let room_data = by_level.rooms[floor_id]!;
        let dt = now - room_data.last_active;
        if (dt < 60 && (
          room_data.enemies_left ||
          room_data.recent_players[my_user_id] ||
          anyActive(room_data.recent_players)
        )) {
          options.push({
            floor_level,
            floor_id,
            room_data,
          });
          if (room_data.enemies_left > 0.75 * room_data.enemies_total) {
            disabled_floors[floor_level] = true;
          }
        }
      }
    }

    titleLine('Start Fresh');
    x = floor((FLOORLIST_W - button_w * 3 - FLOORLIST_PAD * 2)/2);
    for (let ii = this.base_floor; ii < this.base_floor + 3; ++ii) {
      if (buttonText({
        x, y, z,
        w: button_w,
        h: FLOORLIST_BUTTON_H2,
        align: ALIGN.HWRAP | ALIGN.HCENTER,
        markdown: true,
        text: `NEW Floor\nLevel [c=${ii > my_level ? 'red' : 'level'}]${ii}[/c]`,
        disabled: disabled_floors[ii],
        disabled_focusable: true,
        tooltip: disabled_floors[ii] ? 'Please join an active level below instead.' : undefined,
      })) {
        // TODO
      }
      x += button_w + FLOORLIST_PAD;
    }
    y += FLOORLIST_BUTTON_H2 + FLOORLIST_PAD;

    titleLine('Join Others');
    if (options.length) {
      y += 1; // that "J"...
      for (let ii = 0; ii < options.length; ++ii) {
        drawRoomCard(options[ii]);
      }
    } else {
      y += 2;
      font.draw({
        color: palette_font[5],
        x: 0, y, z, w: FLOORLIST_W,
        align: ALIGN.HCENTER,
        text: 'No other players currently in The Tower',
      });
      y += FONT_HEIGHT + 2;
    }


    // if (buttonText({
    //   x: 0 + FLOORLIST_W - 12 - button_w * 2 - 4,
    //   y: 0 + FLOORLIST_H - 12 - uiButtonHeight(),
    //   w: button_w,
    //   z,
    //   text: 'Okay',
    // })) {
    //   uiAction(null);
    // }

    y = max(y, FLOORLIST_H - 12 - uiButtonHeight());
    if (buttonText({
      x: FLOORLIST_W - 12 - button_w,
      y,
      w: button_w,
      z,
      text: 'Cancel',
    })) {
      closeFloorList();
    }
    y += uiButtonHeight();

    if (engine.DEBUG && true) {
      y += font.draw({
        color: 0x000000ff,
        x: 6, y, z,
        w: FLOORLIST_W - 12,
        align: ALIGN.HWRAP,
        text: JSON.stringify(floor_data, undefined, 2),
      });
    }

    y += FLOORLIST_PAD;

    this.scroll_area.end(y);

    if (!isOnFloorList() && !(engine.DEBUG && true)) {
      uiAction(null);
    }

    drawBox({
      x: FLOORLIST_X - 4,
      y: FLOORLIST_Y - 4,
      w: FLOORLIST_W + 8,
      h: FLOORLIST_H + 8,
      z: z - 1,
    }, autoAtlas('ui', 'panel-thick'));

    // menuUp();
  }
}
FloorListAction.prototype.name = 'FloorList';
FloorListAction.prototype.is_overlay_menu = false;
FloorListAction.prototype.is_fullscreen_ui = false;

export function showFloorList(base_floor: number): void {
  if (!cur_action) {
    uiAction(new FloorListAction(base_floor));
  }
}

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
    } else /*if (other_ent.isEnemy())*/ {
      // note: doing non-enemies so they still wander and such

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
        if (dist <= BATTLEZONE_RANGE && enemy_ent.isEnemy()) {
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
  if (!my_ent || engine.defines.LEVEL_GEN || cur_action?.is_overlay_menu) {
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
): number {
  p = min(p, 1);
  const MIN_VIS_W = bar.min_width;
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
  return full_w;
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

const HP_BAR_W = 96;
const STATS_BAR_W = 60;
const STATS_X_INDENT = 2;
const STATS_XP_BAR_H = 4;
const style_stats = fontStyleColored(null, palette_font[PAL_WHITE + 1]);
function drawStats(): void {
  let me = myEnt();
  let x = FRAME_VERT_SPLIT + 12 + 3;
  let y0 = FRAME_HORIZ_SPLIT + 12 + 6;
  let y = y0;
  let z = Z.UI;
  // drawRect(332, 80, 411, 243, z - 1, palette[PAL_BLACK]);
  let level = me.getData('stats.level', 1);
  let xp = me.getData('stats.xp', 0);
  let prev_xp = xpToLevelUp(level - 1);
  let next_xp = xpToLevelUp(level);
  if (xp < prev_xp) {
    // just when debugging / poking level stats
    prev_xp = 0;
  }
  if (level === MAX_LEVEL) {
    font.draw({
      style: style_stats,
      x: x + STATS_X_INDENT,
      y,
      text: `Level ${level} (Max)`,
    });
    y += FONT_HEIGHT - 2;
    font.draw({
      style: style_stats,
      x: x + STATS_X_INDENT,
      y,
      text: `XP ${xp}`,
    });
  } else {
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
      text: `XP ${xp - prev_xp}/${next_xp - prev_xp}`,
    });
    y += FONT_HEIGHT;
    drawBar(bar_sprites.xpbar, x, y, z, STATS_BAR_W, STATS_XP_BAR_H, xp/next_xp);
  }

  // gold and floor level
  let x1 = game_width - 12 - 3;
  x += floor((x1 - x) / 2) - 3;
  y = y0;
  let w = x1 - x;
  // font.draw({
  //   style: style_stats,
  //   x: x + STATS_X_INDENT,
  //   y,
  //   w,
  //   align: ALIGN.HCENTER,
  //   text: `${0} GP`,
  // });
  y += floor(FONT_HEIGHT/2);
  if (currentFloorLevel() <= MAX_LEVEL) {
    font.draw({
      style: style_stats,
      x: x + STATS_X_INDENT,
      y,
      w,
      align: ALIGN.HCENTER,
      text: `Floor Level ${currentFloorLevel()}`,
    });
  }
  y += FONT_HEIGHT;

  // enemy count
  let num_enemies = mapViewLastNumEnemies();
  x = FRAME_VERT_SPLIT + 12;
  y = 16;
  if (num_enemies && num_enemies[1] > 5) { // ignore town with a few NPCs
    let num = num_enemies[0];
    w = (MINIMAP_X - 8) - x;
    autoAtlas(num ? 'map' : 'ui', num ? 'enemy' : 'check').draw({
      x: x + floor((w - 12)/2),
      y, z,
      w: 12, h: 12,
    });
    y += 12 + 2;
    font.draw({
      style: style_stats,
      x, y, z,
      w,
      align: ALIGN.HCENTER,
      text: `${num}`,
    });
  }


  z = Z.STATSBARS;
  x = 12*3;
  y = QUICKBAR_FRAME_Y;
  let hp = me.getData('stats.hp', 0);
  let hp_max = me.getData('stats.hp_max', 1);
  let mp = me.getData('stats.mp', 0);
  let mp_max = me.maxMP();
  let hp_param = {
    size: TINY_FONT_H,
    x, y, z: z + 1,
    w: HP_BAR_W,
    h: HP_BAR_H,
    align: ALIGN.HVCENTER,
    text: `HP ${hp}/${hp_max}`,
  };
  tiny_font.draw({
    ...hp_param,
    color: palette_font[PAL_BLACK],
  });
  let full_w = drawBar(bar_sprites.healthbar, x, y, z, HP_BAR_W, HP_BAR_H, hp/hp_max);
  spriteClipPush(z + 2, x + full_w - 2, y, HP_BAR_W, HP_BAR_H);
  tiny_font.draw({
    ...hp_param,
    color: palette_font[PAL_WHITE + 2],
  });
  spriteClipPop();
  x += HP_BAR_W + 12 * 2;

  let mp_param = {
    size: TINY_FONT_H,
    x, y, z: z + 1,
    w: HP_BAR_W,
    h: HP_BAR_H,
    align: ALIGN.HVCENTER,
    text: `MP ${mp}/${mp_max}`,
  };
  tiny_font.draw({
    ...mp_param,
    color: palette_font[PAL_BLACK],
  });
  full_w = drawBar(bar_sprites.mpbar, x, y, z, HP_BAR_W, HP_BAR_H, mp/mp_max);
  spriteClipPush(z + 2, x + full_w - 2, y, HP_BAR_W, HP_BAR_H);
  tiny_font.draw({
    ...mp_param,
    color: palette_font[PAL_WHITE + 2],
  });
  spriteClipPop();
}

let color_temp = vec4();
function drawStatsOverViewport(): void {
  let my_ent = myEnt();
  assert(my_ent.isMe());

  // Draw damage "floaters" on us, but on the UI layer
  let { floaters } = my_ent;
  let blink = 1;
  let blink_good = false;
  for (let ii = floaters.length - 1; ii >= 0; --ii) {
    let floater = floaters[ii];
    let elapsed = engine.frame_timestamp - floater.start;
    const FLOATER_TIME = 750; // not including fade
    const FLOATER_FADE = 250;
    const BLINK_TIME = 250;
    let good = floater.msg[0] === '+';
    let alpha = 1;
    if (elapsed > FLOATER_TIME) {
      alpha = 1 - (elapsed - FLOATER_TIME) / FLOATER_FADE;
      if (alpha <= 0) {
        ridx(floaters, ii);
        continue;
      }
    }
    if (elapsed < BLINK_TIME && elapsed / BLINK_TIME < blink) {
      blink = min(blink, elapsed / BLINK_TIME);
      blink_good = good;
    }
    let float = easeOut(elapsed / (FLOATER_TIME + FLOATER_FADE), 2) * 100;
    if (good) {
      float *= -1;
    }
    let text_height = uiTextHeight() * 2;
    font.drawSizedAligned(fontStyleAlpha(style_text, alpha),
      VIEWPORT_X0 + render_width/2,
      round(VIEWPORT_Y0 + render_height * 0.9 + float), Z.FLOATERS,
      text_height, ALIGN.HCENTER|ALIGN.VBOTTOM,
      0, 0, floater.msg);
  }
  if (blink < 1) {
    blink = easeOut(blink, 2);
    v3copy(color_temp, palette[blink_good ? PAL_GREEN : PAL_RED]);
    color_temp[3] = 0.5 * (1 - blink);
    drawRect(VIEWPORT_X0, VIEWPORT_Y0, VIEWPORT_X0+render_width, VIEWPORT_Y0+render_height,
      Z.UI - 5, color_temp);
  }
}

const BATTLEZONE_HPAD = 2;
const BATTLEZONE_X = FRAME_VERT_SPLIT + 12 + BATTLEZONE_HPAD;
const BATTLEZONE_W = game_width - 12 - BATTLEZONE_X - BATTLEZONE_HPAD;
let battlezone_is_waiting_on_me = false;
let battlezone_is_waiting_on_me_time = 0;
const BATTLEZONE_OTHERS_FADE_TIME = 100;
const BATTLEZONE_OTHERS_W = render_width / 2;
let battlezone_is_waiting_for_others_time = 0;
let battlezone_is_waiting_for_others_last_msg = '';
function drawBattleZone(): void {
  let x = BATTLEZONE_X;
  let y = MINIMAP_Y + MINIMAP_H + 8;
  let z = Z.UI;

  font.draw({
    color: palette_font[PAL_WHITE + 1],
    x: x + 1, y, z,
    text: 'BattleZone',
  });
  y += FONT_HEIGHT + 1;

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
  battlezone_is_waiting_on_me = false;
  let battlezone_is_waiting_for_others = false;
  let wait_others: string[] = [];
  for (let ii = 0; ii < players.length; ++ii) {
    let ent = players[ii];
    if (is_bz && !isInBattleZone(ent)) {
      y += 2;
      is_bz = false;
      font.draw({
        color: palette_font[PAL_WHITE + 1],
        x: x + 1, y, z,
        text: `Nearby (${players.length - ii})`,
      });
      y += FONT_HEIGHT + 1;
    }
    let is_ready = ent.getData('ready', false);
    drawBox({
      x, y, z: z - 1,
      w: BATTLEZONE_W,
      h: 25, // is_bz ? 25: 23,
    }, autoAtlas('ui', 'roundpanel'));
    autoAtlas('ui', 'portraits-4').draw({
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
      if (ent !== me) {
        if (is_ready) {
          battlezone_is_waiting_on_me = true;
        } else {
          battlezone_is_waiting_for_others = true;
          wait_others.push(ent.data.display_name || '???');
        }
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
    let bz_width = icon_x - name_x;
    assert.equal(bz_width, DISPLAY_NAME_MAX_VISUAL_SIZE.width);
    title_font.draw({
      size: TITLE_FONT_H,
      color: palette_font[PAL_WHITE + 1],
      x: name_x,
      y,
      z,
      w: bz_width,
      align: ALIGN.HFIT,
      text: ent.data.display_name || '???',
    });

    if (is_bz) {
      drawBar(bar_sprites.doublehp, x + 5, y + 16, z, 44, 6,
        ent.getData('stats.hp', 0) / ent.getData('stats.hp_max', 1));
      drawBar(bar_sprites.doublemp, x + 5, y + 16, z, 44, 6,
        ent.getData('stats.mp', 0) / ent.maxMP());

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
        ent.getData('stats.mp', 0) / ent.maxMP());
      // drawBar(bar_sprites.tinyhealth, x + 5, y + 16, z, 44, 4,
      //   ent.getData('stats.hp', 0) / ent.getData('stats.hp_max', 1));
    }


    y += 24; // is_bz ? 24 : 22;
  }

  if (is_bz) {
    y += 2;
    is_bz = false;
    font.draw({
      color: palette_font[PAL_WHITE + 1],
      x: x + 1, y, z,
      text: 'Nearby (0)',
    });
    y += FONT_HEIGHT + 1;
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
        y: 180,
        z,
        w: BATTLEZONE_W,
        align: ALIGN.HCENTER | ALIGN.HWRAP,
        text: 'Engage near others to join BattleZones.',
      });
    }
  }

  if (me.getData('ready')) {
    if (battlezone_is_waiting_on_me) {
      battlezone_is_waiting_on_me = false;
    }
  } else {
    battlezone_is_waiting_for_others = false;
  }
  if (battlezone_is_waiting_on_me) {
    battlezone_is_waiting_on_me_time += getScaledFrameDt();
    if (battlezone_is_waiting_on_me_time > 2000) {
      statusSet('bzwait', 'Other players are waiting for you to take your action').fade();
    }
  } else {
    battlezone_is_waiting_on_me_time = 0;
  }

  let alpha = 0;
  if (battlezone_is_waiting_for_others) {
    battlezone_is_waiting_for_others_time += getScaledFrameDt();
    alpha = min(1, battlezone_is_waiting_for_others_time/BATTLEZONE_OTHERS_FADE_TIME);
    if (wait_others.length > 3) {
      wait_others[2] = `${wait_others.length - 2} others...`;
      wait_others.length = 3;
    }
    battlezone_is_waiting_for_others_last_msg = `Waiting for:\n${wait_others.join('\n')}`;
  } else {
    battlezone_is_waiting_for_others_time = min(BATTLEZONE_OTHERS_FADE_TIME, battlezone_is_waiting_for_others_time);
    battlezone_is_waiting_for_others_time -= getScaledFrameDt();
    battlezone_is_waiting_for_others_time = max(0, battlezone_is_waiting_for_others_time);
    alpha = battlezone_is_waiting_for_others_time / BATTLEZONE_OTHERS_FADE_TIME;
  }
  if (battlezone_is_waiting_for_others_last_msg && alpha) {
    y = VIEWPORT_Y0 + floor(render_height * 0.7) + 20 - round(alpha * 20);
    let text_h = font.draw({
      alpha,
      color: palette_font[PAL_BLACK - 1],
      x: VIEWPORT_X0, y, z: Z.UI,
      w: render_width,
      align: ALIGN.HCENTER|ALIGN.HWRAP,
      text: battlezone_is_waiting_for_others_last_msg,
    });
    const pad = 4;
    drawBox({
      x: VIEWPORT_X0 + (render_width - BATTLEZONE_OTHERS_W)/2,
      y: y - pad,
      z: Z.UI - 1,
      w: BATTLEZONE_OTHERS_W,
      h: text_h + pad * 2,
    }, autoAtlas('pixely', 'panel'), 1, [1,1,1,alpha * 0.7]);
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
      ENEMY_HP_BAR_W, bar_h, `${ent.display_name} (L${ent.data.stats.level})`);
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

// old-to-do: move into crawler_play?
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

function giveXP(xp_reward: number): void {
  let chat_ui = getChatUI();
  let my_ent = myEnt();
  let cur_xp = my_ent.getData('stats.xp', 0);
  let cur_level = my_ent.getData('stats.level', 1);
  let new_xp = cur_xp + xp_reward;
  let data_assignments: TSMap<number> = {};
  data_assignments['stats.xp'] = new_xp;
  if (cur_level < MAX_LEVEL) {
    let xp_for_level_up = xpToLevelUp(cur_level);
    if (new_xp >= xp_for_level_up) {
      let new_level = cur_level + 1;
      playUISound('levelup');
      let old_mp = maxMP(cur_level);
      let new_mp = maxMP(new_level);
      let delta_mp = new_mp - old_mp;
      let old_hp = maxHP(cur_level);
      let new_hp = maxHP(new_level);
      let delta_hp = new_hp - old_hp;
      let stat_delta = `+${delta_mp}MP, +${delta_hp}MaxHP`;
      chat_ui.addChat(`You level up to L${new_level}, ${stat_delta}`);
      data_assignments['stats.level'] = new_level;
      data_assignments['stats.hp_max'] = new_hp;
      data_assignments['stats.hp'] = my_ent.getData('stats.hp', 0) + delta_hp;
      statusPush('Level up!');
      statusPush(stat_delta);
    }
  }
  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'give_xp',
    data_assignments,
  }, errorsToChat);
}

let reward_luck = 0;
function giveRewards(target_ent: Entity): void {
  let my_ent = myEnt();
  let my_level = my_ent.getData('stats.level', 1);
  let enemy_level = target_ent.getData('stats.level', 1);
  let highest_hitter = target_ent.getData('stats.highest_hitter', 1);
  let reward_level = rewardLevel(my_level, enemy_level, highest_hitter);
  let entity_manager = entityManager();
  let pos = target_ent.getData<JSVec3>('pos')!;
  let give_reward = random() < (0.5 + reward_luck * 0.1);
  if (!give_reward) {
    reward_luck++;
    return;
  } else {
    reward_luck--;
  }
  let loot: Item[] = [];
  if (random() < 0.05) {
    loot.push({
      type: 'potion',
      subtype: 0,
      level: 1,
      count: 1,
    });
  } else {
    let loot_mod = (reward_level + 1) % 2;
    let loot_level = floor((reward_level + 1) / 2);
    if (loot_mod) {
      if (random() < 0.5) {
        loot_level++;
      }
    }
    loot.push({
      type: random() < 0.5 ? 'book' : 'hat',
      subtype: floor(random() * 3),
      level: loot_level,
      count: 1,
    });
  }
  let existing_ents = entitiesAt(entity_manager, pos, target_ent.data.floor, true);
  existing_ents = existing_ents.filter((ent) => {
    return ent.type_id === 'chest-local';
  });
  if (existing_ents.length) {
    let contents = existing_ents[0].data.contents;
    assert(contents);
    existing_ents[0].data.contents = contents.concat(loot);
  } else {
    let new_ent: Partial<EntityDataClient> = {
      floor: target_ent.data.floor,
      pos,
      type: 'chest-local',
      contents: loot,
    };
    entity_manager.addClientOnlyEntityFromSerialized(new_ent);
  }

  let xp_reward = xpForDeath(reward_level);
  statusPush(`+${xp_reward} XP`);
  let chat_ui = getChatUI();
  if (reward_level < enemy_level) {
    chat_ui.addChat(`You gain ${xp_reward} XP (enemy L${enemy_level} > your L${my_level},` +
      ` assist L${highest_hitter}, reward L${reward_level})`);
  } else {
    chat_ui.addChat(`You gain ${xp_reward} XP (enemy L${enemy_level})`);
  }

  giveXP(xp_reward);
}

function onBroadcast(update: EntityManagerEvent): void {
  let { from, msg, data } = update;
  let chat_ui = getChatUI();
  if (msg === 'dstat') {
    assert(from);
    let target = from;
    let entity_manager = entityManager();
    let target_ent = entity_manager.getEnt(target);
    let { hp, source, action, type, fatal, pred_id, executor, resist } = data as BroadcastDataDstat;
    if (executor === myEntID()) {
      // I did this
      if (target_ent && pred_id) {
        target_ent.predictedClear(pred_id);
      }
    } else {
      // someone else did
      if (hp) {
        addFloater(target, `${hp > 0 ? '+' : ''}${hp}${resist ? '\nRESIST!' : ''}`, 'damage');
        addFloater(source, null, 'attack');
      }
    }

    if (action === 'attack') {
      if (source === myEntID()) {
        chat_ui.addChat(`You ${type} it for ${-hp} damage${resist ? ' (resisted)' : ''}` +
          `${fatal ? ', killing it' : ''}.`);
      } else if (target === myEntID()) {
        if (type === 'opportunity') {
          chat_ui.addChat(`It opportunity attacks you for ${-hp} damage.`);
        } else {
          chat_ui.addChat(`It hits you with ${type} for ${-hp} damage${resist ? ' (resisted)' : ''}.`);
        }
        if (!fatal) {
          // hit me, but didn't kill me
          let source_ent = entity_manager.getEnt(source);
          if (source_ent) {
            source_ent.hit_by_us = true;
          }
        }
      } else {
        chat_ui.addChat(`${source} hits ${target} with ${type} for ${-hp} damage` +
          `${resist ? ' (resisted)' : ''}${fatal ? ', killing it' : ''}.`);
      }
      if (fatal && target_ent && target_ent.isEnemy()) {
        giveRewards(target_ent);
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
  //controller.setFadeOverride(0.75);

  let my_ent = myEnt();
  if (my_ent.isAlive()) {
    return false;
  }

  let y = VIEWPORT_Y0;
  let w = render_width;
  let x = VIEWPORT_X0;
  let h = render_height;
  let z = Z.UI;
  dither128.draw({
    x, y, w, h,
    z: z - 1,
    color: palette[PAL_BLACK],
    uvs: [0, 0, w/128, h/128],
  });

  y += floor(h/3);
  font.drawSizedAligned(style_text,
    x + floor(w/2), y, z,
    uiTextHeight(), ALIGN.HCENTER|ALIGN.VBOTTOM,
    0, 0, 'You have died.');
  y += 20;


  let cur_level = my_ent.getData('stats.level', 1);
  let last_level_xp = xpToLevelUp(cur_level - 1);
  let cur_xp = my_ent.getData('stats.xp', 0);
  let xp_since_level_up = max(0, cur_xp - last_level_xp);
  let xp_loss = ceil(xp_since_level_up/2);
  let new_xp = cur_xp - xp_loss;
  font.drawSizedAlignedWrapped(style_text,
    x, y, z, 0, uiTextHeight(), ALIGN.HCENTER|ALIGN.HWRAP,
    w, 0, `Half of your XP since your last\nlevel up (${xp_loss}) will be lost.`);

  y += 20 * 2;

  if (buttonText({
    x: x + floor(w/2 - uiButtonWidth()/2), y, z,
    text: 'Respawn',
  })) {
    controller.goToFloor(crawlerGameState().floor_id, 'stairs_in', 'respawn');
    my_ent.applyBatchUpdate({
      action_id: 'respawn',
      field: 'seq_inventory',
      data_assignments: {
        'stats.hp': my_ent.getData('stats.hp_max', 1),
        'stats.xp': new_xp,
      },
    }, errorsToChat);
  }

  return true;
}

function markActiveInCombat(): void {
  let my_ent = myEnt();
  let game_state = crawlerGameState();
  let { floor_id } = game_state;
  let pos = my_ent.getData<JSVec3>('pos')!;
  let entity_manager = entityManager();
  let ents = entity_manager.entitiesFind((ent) => {
    return ent.data.floor === floor_id && entManhattanDistance(ent, pos) <= 3;
  }, false);
  for (let ii = 0; ii < ents.length; ++ii) {
    ents[ii].hit_by_us = true;
  }
}

function doAttack(target_ent: Entity, action: Item | 'basic'): void {
  let dam: number;
  let style: string;
  let target_stats = target_ent.data.stats;
  let mp_cost = 0;
  let my_ent = myEnt();
  let resist;
  let attacker_stats = my_ent.data.stats;
  if (action === 'basic') {
    ({ dam, style, resist } = basicAttackDamage(attacker_stats, target_stats));
    mp_cost = -1;
  } else {
    let details = skillDetails(action);
    ({ dam, style, resist } = skillAttackDamage(details, attacker_stats, target_stats));
    ({ mp_cost } = details);
  }

  if (dam > 0) {
    target_ent.hit_by_us = true;
    markActiveInCombat();
  }
  let target_hp = target_ent.getData('stats.hp', 0);
  let new_hp = max(0, target_hp - dam);
  addFloater(target_ent.id, `${style === 'miss' ? 'WHIFF!\n' : ''}\n-${dam}` +
    `${resist ? '\nRESIST!' : ''}`, new_hp ? '' : 'death');
  let pred_ids: EntityPredictionID[] = [];
  target_ent.predictedSet(pred_ids, 'stats.hp', new_hp);
  assert.equal(pred_ids.length, 1);
  let pred_id = pred_ids[0][1];
  let payload: ActionAttackPayload = {
    target_ent_id: target_ent.id,
    type: style,
    resist,
    dam,
    pred_id,
    executor: myEntID(),
  };
  let new_mp = clamp(my_ent.getData('stats.mp', 0) - mp_cost, 0, my_ent.maxMP());
  crawlerMyApplyBatchUpdate({
    action_id: 'attack',
    payload,
    data_assignments: {
      ready: true,
      'stats.mp': new_mp,
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

function numHealingPotions(): number {
  let my_ent = myEnt();
  let inventory = my_ent.getData<(Item|null)[]>('inventory') || [];
  for (let ii = 0; ii < inventory.length; ++ii) {
    let item = inventory[ii];
    if (item && item.type === 'potion') {
      return item.count;
    }
  }
  return 0;
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
  let new_hp = min(hp_max, hp + round(POTION_HEAL_PORTION * hp_max));
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

  addFloater(my_ent.id, `+${new_hp - hp}`, 'heal');
}

const QUICKBAR_X = 14;
const QUICKBAR_Y = 218;
const color_disable_action = vec4(0,0,0,0.75);

function doQuickbar(): void {
  let me = myEnt();
  let books = me.data.books || [];
  let floor_level = currentFloorLevel();

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

  for (let ii = 1; ii <= 10; ++ii) {
    let disabled = all_disabled;
    let action: Item | 'basic' = 'basic';
    let icon: string | undefined;
    let skill_details: SkillDetails | undefined;
    let disable_button = false;
    if (ii === 10) {
      action = 'basic';
      icon = 'spell-basic';
    } else {
      let item_slot = ii - 1;
      if (!books[item_slot]) {
        disabled = true;
      } else {
        action = books[item_slot];
        skill_details = skillDetails(action);
        icon = `spell-${ELEMENT_NAME[skill_details.element]}`;
        if (item_slot >= floor_level) {
          disabled = true;
          disable_button = true;
        }
      }
    }
    let is_attack = true;
    if (is_attack && !can_attack) {
      disabled = true;
    }
    let button_param = {
      x: QUICKBAR_X + (BUTTON_W + 4) * (ii - 1),
      y: QUICKBAR_Y,
      w: BUTTON_W,
      h: BUTTON_W,
      shrink: 12/16,
    };
    let hotkey = `${ii === 10 ? 0 : ii}` as '1' | '2';
    let activate = false;
    if (!icon) {
      button({
        ...button_param,
        text: ' ',
        disabled: true,
      });
    } else {
      activate = Boolean(button({
        ...button_param,
        img: autoAtlas('ui', icon),
        hotkey: KEYS[hotkey],
        // base_name: canIssueAction() ? undefined : 'button_disabled',
        disabled: disable_button,
      }));
      if (!canIssueAction()) {
        drawRect2({
          ...button_param,
          z: Z.UI + 5,
          color: color_disable_action,
        });
      }
    }
    tiny_font.draw({
      ...button_param,
      style: icon ? style_hotkey : style_hotkey_disabled,
      size: TINY_FONT_H,
      z: Z.UI + 2,
      align: ALIGN.HRIGHT,
      text: hotkey,
    });
    if (skill_details && skill_details.mp_cost) {
      tiny_font.draw({
        ...button_param,
        x: button_param.x + 1,
        style: skill_details.mp_cost > myEnt().getData('stats.mp', 0) ? style_mp_cost_over : style_mp_cost,
        size: TINY_FONT_H,
        z: Z.UI + 2,
        align: ALIGN.VBOTTOM,
        text: `${skill_details.mp_cost}`,
      });
    }
    if (activate) {
      if (!disabled) {
        if (is_attack) {
          if (action !== 'basic') {
            let { mp_cost } = skill_details!;
            if (mp_cost > myEnt().getData('stats.mp', 0)) {
              playUISound('msg_out_err');
              statusPush('Insufficient MP').counter = 2500;
              continue;
            }
          }
          assert(target_ent);
          doAttack(target_ent, action);
        }
      } else if (!canIssueAction()) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        onDisabledAction();
      } else if (all_disabled) {
        playUISound('msg_out_err');
        statusSet('onDisabledAction', 'Cannot attack while moving').counter = 2500;
      } else if (!can_attack) {
        playUISound('msg_out_err');
        statusSet('onDisabledAction', 'No target for your attack').counter = 2500;
      } else {
        playUISound('msg_out_err');
        statusSet('onDisabledAction', 'Unknown error');
      }
    }
  }

  let heal_button_param = {
    x: QUICKBAR_X + (BUTTON_W + 4) * 10,
    y: QUICKBAR_Y,
    w: BUTTON_W,
    h: BUTTON_W,
  };
  if (button({
    ...heal_button_param,
    shrink: 12/16,
    hotkey: KEYS.H,
    img: autoAtlas('ui', 'potion'),
  })) {
    if (all_disabled) {
      onDisabledAction(); // eslint-disable-line @typescript-eslint/no-use-before-define
    } else {
      doHeal();
    }
  }
  if (!canIssueAction()) {
    drawRect2({
      ...heal_button_param,
      z: Z.UI + 5,
      color: color_disable_action,
    });
  }
  tiny_font.draw({
    ...heal_button_param,
    style: style_hotkey,
    size: TINY_FONT_H,
    z: Z.UI + 2,
    align: ALIGN.HRIGHT,
    text: 'H',
  });
  let count = numHealingPotions();
  tiny_font.draw({
    ...heal_button_param,
    x: heal_button_param.x,
    style: style_item_count ,
    size: TINY_FONT_H,
    z: Z.UI + 2,
    align: ALIGN.VBOTTOM | ALIGN.HRIGHT,
    text: `${count > 99 ? '9+' : count}`,
  });
}

const MOVE_BUTTONS_Y0 = 302;


function useNoText(): boolean {
  return input.inputTouchMode() || input.inputPadMode() || settings.turn_toggle;
}

let sprite_corner = autoAtlas('ui', 'frame-corner-silver');
function drawFrames(): void {
  let z = Z.FRAMES;

  // full-height bars
  [0, FRAME_HORIZ_SPLIT, game_height - 12].forEach(function (y) {
    if (y !== FRAME_HORIZ_SPLIT) {
      sprite_corner.draw({
        x: 0, y, z: z + 1,
        w: 12, h: 12,
      });
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
  // partial-width bars
  [
    [12, QUICKBAR_FRAME_Y, FRAME_VERT_SPLIT - 12, 1],
    [FRAME_VERT_SPLIT+12, FRAME_LR_SPLIT, (game_width - FRAME_VERT_SPLIT - 24), 0],
    [MINIMAP_X + 2, MINIMAP_Y + MINIMAP_H - 4, MINIMAP_W - 4, 0],
  ].forEach(function (coords) {
    if (coords[3]) {
      sprite_corner.draw({
        x: coords[0] - 12, y: coords[1], z: z + 1,
        w: 12, h: 12,
      });
      sprite_corner.draw({
        x: coords[0] + coords[2], y: coords[1], z: z + 1,
        w: 12, h: 12,
      });
    }
    frame_sprites.horiz.draw({
      x: coords[0],
      y: coords[1],
      z,
      w: coords[2],
      h: 12,
      uvs: [0, 0, (coords[2])/512, 1],
    });
  });
  // partial- and full-height bars
  [
    [0, 12, game_height - 24],
    [FRAME_VERT_SPLIT, 12, game_height - 24],
    [game_width - 12, 12, game_height - 24],
    // [264, 252-6, 96+6, 6/512],
    [MINIMAP_X - 8, MINIMAP_Y + 2, MINIMAP_H - 4],
    [MINIMAP_X + MINIMAP_W - 4, MINIMAP_Y + 2, MINIMAP_H - 4],
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

  // extra solid corners
  [
    [FRAME_VERT_SPLIT,0],
    [FRAME_VERT_SPLIT, game_height - 12],
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
    [MINIMAP_X - 8, 0, 'frame-t-down'],
    [MINIMAP_X + MINIMAP_W - 4, 0, 'frame-t-down'],
    [FRAME_VERT_SPLIT,FRAME_HORIZ_SPLIT,'frame-t-plus'],
    [game_width - 12,FRAME_HORIZ_SPLIT,'frame-t-left'],
    [FRAME_VERT_SPLIT,FRAME_LR_SPLIT,'frame-t-right'],
    [game_width - 12,FRAME_LR_SPLIT,'frame-t-left'],
    [0,FRAME_HORIZ_SPLIT,'frame-t-right'],
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

  let smooth_corners: [number, number, string][] = [
    [MINIMAP_X - 8, MINIMAP_Y + MINIMAP_H - 4, 'frame-ll'],
    [MINIMAP_X + MINIMAP_W - 4, MINIMAP_Y + MINIMAP_H - 4, 'frame-lr'],
  ];
  smooth_corners.forEach(function (coords) {
    autoAtlas('ui', coords[2]).draw({
      x: coords[0],
      y: coords[1],
      z: z + 1,
      w: 12,
      h: 12,
    });
  });


  if (!canIssueAction()) {
    z++;
    [0, QUICKBAR_FRAME_Y].forEach(function (y) {
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
      [FRAME_VERT_SPLIT, 12, render_height],
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

  if (!myEnt().getData('did_setup') && !cur_action) {
    uiAction(new SetupMenuAction());
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
  const is_fullscreen_ui = cur_action?.is_fullscreen_ui;
  let dialog_viewport = {
    x: VIEWPORT_X0 + 8,
    w: render_width - 16,
    y: VIEWPORT_Y0,
    h: render_height - 5,
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
    dialog_viewport.z = Z.MODAL + 100;
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

  function crawlerButton(
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
      } else if (cur_action) {
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
      x: button_x0 + (BUTTON_W + 4) * rx,
      y: button_y0 + (BUTTON_W + 4) * ry,
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
  button_x0 = 409;
  button_y0 = 16;
  let menu_up = frame_map_view || build_mode || overlay_menu_up || cur_action?.name === 'FloorList';
  let menu_keys = [KEYS.ESC];
  let menu_pads = [PAD.START];
  if (menu_up) {
    menu_pads.push(PAD.B, PAD.BACK);
  }
  crawlerButton(0, 0, menu_up ? 10 : 6, 'menu', menu_keys, menu_pads, cur_action?.name === 'PauseMenu');
  button_x0 = 331;
  button_y0 = MOVE_BUTTONS_Y0;
  if (!build_mode && !controller.ignoreGameplay() && cur_action?.name !== 'FloorList') {
    //button(0, 0, 8, 'heal', [KEYS.H], [PAD.X]);
    crawlerButton(0, 0, 11, 'wait', [KEYS.Z, KEYS.SPACE], [PAD.B]);
    crawlerButton(0, 1, 7, 'inv', [KEYS.I], [PAD.Y], cur_action?.name === 'InventoryMenu');
  }

  cur_action?.tick();

  locked_dialog ||= cur_action?.name === 'FloorList';

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

  button_x0 += BUTTON_W + 4;

  // Check for intentional events
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
    button_x0,
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
      uiAction(null);
    }
  }

  if (up_edge.menu) {
    if (cur_action?.name === 'FloorList') {
      closeFloorList();
    } else if (menu_up) {
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
      if (cur_action?.name === 'SetupMenu') {
        uiAction(null);
        uiAction(new PauseMenuAction());
      } else if (cur_action) { //?.name === 'PauseMenu') {
        uiAction(null);
      }
    } else {
      uiAction(new PauseMenuAction());
    }
  } else if (up_edge.inv) {
    if (menu_up) {
      uiAction(null);
    } else {
      uiAction(new InventoryMenuAction('inventory'));
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
      button_disabled: overlay_menu_up || locked_dialog,
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
  if (engine.DEBUG && false) {
    battleZoneDebug();
  }

  let overlay_menu_up = Boolean(cur_action?.is_overlay_menu || dialogMoveLocked() || cur_action?.name === 'FloorList');

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
  if (!buildModeActive()) {
    crawlerMyApplyBatchUpdate({
      action_id: 'ready',
      data_assignments: {
        ready: true,
      },
      field: CrawlerController.PLAYER_MOVE_FIELD,
    }, errorsToChat);
  }
  crawlerTurnBasedMovePreStart();
}

function pickupOnClient(item: Item): boolean {
  let my_ent = myEnt();
  let idx = inventoryIndexForItemPickup(item);
  let inventory = my_ent.data.inventory;
  assert(inventory);

  if (idx === -1) {
    playUISound('msg_out_err');
    statusPush('Cannot pickup: Inventory full');
    return false;
  }

  let ops: ActionInventoryOp[] = [];
  if (inventory[idx]) {
    inventory[idx]!.count += item.count;
    ops.push({
      idx,
      delta: item.count,
    });
  } else {
    inventory[idx] = item;
    ops.push({
      idx,
      delta: 1,
      item,
    });
  }
  let payload: ActionInventoryPayload = {
    ops,
    ready: false,
  };
  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      inventory,
    },
  }, errorsToChat);
  statusPush(`Picked up ${itemName(item)}`);
  return true;
}

function onEnterCell(pos: Vec2): void {
  let entity_manager = entityManager();
  let game_state = crawlerGameState();
  let { floor_id } = game_state;
  let chests = entitiesAt(entity_manager, pos, floor_id, true).filter(function (ent) {
    return ent.type_id === 'chest-local';
  });
  chests.forEach(function (chest) {
    let contents = chest.data.contents;
    assert(contents && contents.length);
    let all_picked_up = true;
    for (let ii = contents.length - 1; ii >= 0; --ii) {
      if (pickupOnClient(contents[ii])) {
        ridx(contents, ii);
      } else {
        all_picked_up = false;
      }
    }
    if (all_picked_up) {
      entity_manager.deleteEntity(chest.id, 'pickup');
    }
  });
  crawlerTurnBasedMoveFinish(pos);
}

function onInitPos(): void {
  // autoAttackCancel();
  myEnt().calcPlayerResist(currentFloorLevel());
}

function playInitShared(online: boolean): void {
  controller = crawlerController();

  controller.setOnPlayerMove(onPlayerMove);
  controller.setOnEnterCell(onEnterCell);
  controller.setOnInitPos(onInitPos);

  uiAction(null);
}


function playOfflineLoading(): void {
  // not offline in DCJAM
}

function playInitOffline(): void {
  playInitShared(false);
}

function playInitEarly(room: ClientChannelWorker): void {
  // let room_public_data = room.getChannelData('public') as { seed: string };
  // game_state.setSeed(room_public_data.seed);

  playInitShared(true);

  if (engine.DEBUG && false) {
    // cur_action = new InventoryMenuAction('trades');
    cur_action = new FloorListAction(1);
  }
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
      y_bottom: 348,
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
    ws: [BUTTON_W, BUTTON_W, BUTTON_W],
    hs: [BUTTON_W, BUTTON_W, BUTTON_W, BUTTON_W],
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
      min_width: 6,
      bg: autoAtlas('ui', 'bar-frame'),
      hp: autoAtlas('ui', 'bar-fill-red'),
    },
    tinyhealth: {
      min_width: 4,
      bg: autoAtlas('ui', 'minibar-frame-lighter'),
      hp: autoAtlas('ui', 'minibar-fill-red'),
    },
    doublehp: {
      min_width: 4,
      bg: autoAtlas('ui', 'minibar-frame-lighter'),
      hp: autoAtlas('ui', 'minibar-fill-red-top'),
    },
    doublemp: {
      min_width: 4,
      bg: autoAtlas('ui', 'minibar-frame-lighter'),
      hp: autoAtlas('ui', 'minibar-fill-blue-bottom'),
    },
    mpbar: {
      min_width: 6,
      bg: autoAtlas('ui', 'bar-frame'),
      hp: autoAtlas('ui', 'bar-fill-blue'),
    },
    xpbar: {
      min_width: 4,
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

  dither128 = spriteCreate({
    name: 'dither128',
  });

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

  markdownSetColorStyle('hotkey', fontStyle(null, {
    color: palette_font[PAL_BLACK],
    outline_width,
    outline_color: palette_font[PAL_BLACK - 4],
  }));
  markdownSetColorStyle('mp', style_mp_cost);
  markdownSetColorStyle('damfire', fontStyle(style_mp_cost, {
    color: palette_font[PAL_RED],
    outline_color: palette_font[PAL_RED - 2],
  }));
  markdownSetColorStyle('damearth', fontStyle(style_mp_cost, {
    color: palette_font[PAL_GREEN],
    outline_color: palette_font[PAL_GREEN + 2],
  }));
  markdownSetColorStyle('damice', fontStyle(style_mp_cost, {
    color: palette_font[PAL_WHITE],
    outline_color: palette_font[PAL_BLUE],
  }));
  markdownSetColorStyle('red', fontStyle(style_mp_cost, {
    color: palette_font[PAL_RED],
    outline_color: palette_font[PAL_RED - 2],
  }));
  markdownSetColorStyle('green', fontStyle(style_mp_cost, {
    color: palette_font[PAL_GREEN],
    outline_color: palette_font[PAL_GREEN + 2],
  }));
  markdownSetColorStyle('white', fontStyle(style_mp_cost, {
    color: palette_font[PAL_WHITE],
    outline_color: palette_font[PAL_BLUE],
  }));
  markdownSetColorStyle('level', style_item_level);
}
