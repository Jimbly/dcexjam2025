import assert from 'assert';
import { autoAtlas } from 'glov/client/autoatlas';
import * as engine from 'glov/client/engine';
import { ALIGN } from 'glov/client/font';
import { markdownAuto } from 'glov/client/markdown';
import {
  ScrollArea,
  scrollAreaCreate,
} from 'glov/client/scroll_area';
import {
  button,
  buttonLastSpotRet,
  buttonText,
  drawBox,
  drawHBox,
  menuUp,
  uiGetFont,
  uiGetTitleFont,
} from 'glov/client/ui';
import { capitalize, clone } from 'glov/common/util';
import { unreachable } from 'glov/common/verify';
import {
  itemName,
  MAX_LEVEL,
  skillDetails,
} from '../common/combat';
import {
  ActionInventoryOp,
  ActionInventoryPayload,
  ELEMENT_NAME,
  Item,
} from '../common/entity_game_common';
import { dialog } from './dialog_system';
import {
  FONT_HEIGHT,
  game_height,
  game_width,
  MOVE_BUTTON_W,
  TINY_FONT_H,
} from './globals';
import { tinyFont } from './main';
import { palette_font } from './palette';
import {
  currentFloorLevel,
  drawHatDude,
  errorsToChat,
  itemInfo,
  myEnt,
  myEntOptional,
  pickupOnClient,
  TITLE_FONT_H,
} from './play';
import {
  PLAYER_COLORS_VEC4,
  style_inventory,
  style_item_count,
  style_item_level,
  style_mp_cost,
  style_mp_cost_over,
} from './styles';
import {
  UIAction,
  uiAction,
  uiActionActive,
} from './uiaction';

const { floor } = Math;

const INVENTORY_MAX_SIZE = Infinity; // INVENTORY_GRID_W * INVENTORY_GRID_H;

export type ShopType = 'inventory' | 'upgrades' | 'trades';

export function inventoryIcon(item: Item): string {
  switch (item.type) {
    case 'book': {
      let skill_details = skillDetails(item);
      return skill_details.icon;
      // let bg_sprite = autoAtlas('ui', skill_details.bg);
    }
    case 'hat':
      return `hat-${ELEMENT_NAME[item.subtype + 1]}`;
    case 'potion':
      return 'potion';
    default:
      unreachable(item.type);
  }
  return 'unknown';
}

export function inventoryIconDraw(param: {
  x: number;
  y: number;
  z: number;
  item: Item;
  scale?: number;
  double_brim: boolean;
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
      autoAtlas('ui', skill_details.icon).draw(icon_param);
      icon_param.z -= 0.1;
      let bg_sprite = autoAtlas('ui', skill_details.bg);
      if (item.level > 1) {
        let extra = item.level - 1;
        let left_extra = floor(extra / 2);
        // let right_extra = extra - left_extra;
        icon_param.x -= left_extra;
        icon_param.w += extra;
        drawHBox(icon_param, bg_sprite);
      } else {
        bg_sprite.draw(icon_param);
      }
    } break;
    case 'hat':
      if (0) {
        let icon = `hat-${ELEMENT_NAME[item.subtype + 1]}`;
        autoAtlas('ui', icon).draw(icon_param);
      } else {
        let extra = param.double_brim ? item.level * 2 - 4 : item.level - 3;
        let left_extra = floor(extra / 2);
        icon_param.x -= left_extra * (scale || 1);
        icon_param.w += extra * (scale || 1);
        let icon = `hat-${ELEMENT_NAME[item.subtype + 1]}`;
        drawBox(icon_param, autoAtlas('ui', icon));
      }
      break;
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
    w: MOVE_BUTTON_W,
    h: MOVE_BUTTON_W,
  };
  let ret = button({
    ...button_param,
    base_name: selected ? 'buttonselected' : nointeract ? 'buttonframe' : undefined,
    disabled: nointeract ? true : undefined,
    text: ' ',
  });
  // show icon
  inventoryIconDraw({
    ...param,
    double_brim: false,
  });
  const offs = 1;
  if (item.type !== 'potion') {
    // show level
    tinyFont().draw({
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
  if (item.type === 'book' && !show_count) {
    // show mp cost
    let skill_details = skillDetails(item);
    tinyFont().draw({
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
    tinyFont().draw({
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

export function inventoryIndexForItemPickup(item: Item): number {
  let my_ent = myEnt();
  let inventory = my_ent.getData<(Item|null)[]>('inventory', []);
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

export function curHat(list: Item[]): number | null {
  if (!list.length) {
    return null;
  }
  let item = list[0];
  return [0,3,4][item.subtype];
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
  let new_hat: number | null = null;
  if (loc === 'hats') {
    new_hat = curHat(src_list);
    if (new_hat !== null) {
      payload.costume1 = new_hat;
    }
  }
  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      inventory,
      costume1: new_hat === null ? undefined : new_hat,
      [loc]: src_list,
    },
  }, errorsToChat);

  my_ent.calcPlayerResist(currentFloorLevel());
}

function equip(idx: number, swap_target_idx: number | null): number {
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

  let new_hat: number | null = null;
  if (loc === 'hats') {
    new_hat = curHat(target_list);
    if (new_hat !== null) {
      payload.costume1 = new_hat;
    }
  }

  my_ent.applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      inventory,
      costume1: new_hat === null ? undefined : new_hat,
      [loc]: target_list,
    },
  }, errorsToChat);

  my_ent.calcPlayerResist(currentFloorLevel());

  return target_idx;
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

const TYPE_SORT = {
  potion: 0,
  hat: 1,
  book: 2,
};

function cmpItem(a: Item | null, b: Item | null): number {
  if (!a) {
    if (!b) {
      return 0;
    }
    return 1;
  } else if (!b) {
    return -1;
  }
  if (a.type !== b.type) {
    return TYPE_SORT[a.type] - TYPE_SORT[b.type];
  }
  let d = a.level - b.level;
  if (d) {
    return d;
  }
  return a.subtype - b.subtype;
}

function sortInventory(): void {
  let inventory_old = myEnt().getData<(Item|null)[]>('inventory', []);
  let inventory_new = clone(inventory_old);
  inventory_new.sort(cmpItem);
  while (inventory_new.length && !inventory_new[inventory_new.length - 1]) {
    inventory_new.pop();
  }

  let ops: ActionInventoryOp[] = [];

  for (let ii = 0; ii < inventory_old.length; ++ii) {
    let new_elem = inventory_new[ii];
    let old_elem = inventory_old[ii];
    if (cmpItem(new_elem, old_elem) === 0) {
      continue;
    }
    if (old_elem) {
      ops.push({
        idx: ii,
        delta: -old_elem.count,
      });
    }
    if (new_elem) {
      ops.push({
        idx: ii,
        item: new_elem,
      });
    }
  }

  let payload: ActionInventoryPayload = {
    ops,
    ready: false,
  };
  myEnt().applyBatchUpdate({
    field: 'seq_inventory',
    action_id: 'inv',
    payload,
    data_assignments: {
      client_only: true,
      inventory: inventory_new,
    },
  }, errorsToChat);
}

const INVENTORY_GRID_W = 8;
const INVENTORY_GRID_H = 5;
const INVENTORY_LEFT_COLUMN = 52;
const INVENTORY_PAD = 4;
const INVENTORY_BETWEEN_ITEM_COLUMNS = 12;
const INVENTORY_PAD6 = 6;
const INVENTORY_HATS_XOFFS = INVENTORY_LEFT_COLUMN + INVENTORY_PAD;
const INVENTORY_BOOKS_XOFFS = INVENTORY_HATS_XOFFS + MOVE_BUTTON_W + INVENTORY_BETWEEN_ITEM_COLUMNS;
const INVENTORY_GRID_XOFFS = INVENTORY_BOOKS_XOFFS + MOVE_BUTTON_W +
  INVENTORY_BETWEEN_ITEM_COLUMNS + INVENTORY_PAD6;
const INVENTORY_GRID_W_PX = INVENTORY_GRID_W * (MOVE_BUTTON_W + INVENTORY_PAD) - INVENTORY_PAD;
const INVENTORY_GRID_WITHSCROLL_W = INVENTORY_GRID_W_PX +
  INVENTORY_PAD + MOVE_BUTTON_W;
const INVENTORY_GRID_H_PX = INVENTORY_GRID_H * (MOVE_BUTTON_W + INVENTORY_PAD) - INVENTORY_PAD;
const INVENTORY_W = INVENTORY_GRID_XOFFS +
  INVENTORY_GRID_WITHSCROLL_W +
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
class InventoryMenuAction extends UIAction {
  scroll_area: ScrollArea;
  constructor(public shop_type: ShopType) {
    super();
    myEntOptional()?.calcPlayerResist(currentFloorLevel());
    this.scroll_area = scrollAreaCreate({
      background_color: null,
      auto_hide: true,
    });
  }
  selected_idx: [string, number] = ['null', 0];
  tick(): void {
    const font = uiGetFont();
    const title_font = uiGetTitleFont();
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

    let level_y = y0 + (MOVE_BUTTON_W + INVENTORY_PAD) * (MAX_LEVEL - level) - 3;
    autoAtlas('ui', 'inventory-separator').draw({
      x: INVENTORY_X + INVENTORY_BOOKS_XOFFS + MOVE_BUTTON_W - 83,
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
      level_y = y0 + (MOVE_BUTTON_W + INVENTORY_PAD) * (MAX_LEVEL - floor_level) - 3;
      autoAtlas('ui', 'inventory-separator').draw({
        x: INVENTORY_X + INVENTORY_BOOKS_XOFFS + MOVE_BUTTON_W - 83,
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
      let y = y0 + (MOVE_BUTTON_W + INVENTORY_PAD) * ii;
      let idx = MAX_LEVEL - ii - 1;
      let item = hats[idx];
      let param = {
        x, y, z, w: MOVE_BUTTON_W, h: MOVE_BUTTON_W,
      };
      if (!item) {
        drawBox(param, autoAtlas('ui', idx < level ? 'inventory-fillable-hat' : 'inventory-locked'));
        if (idx >= level) {
          font.draw({
            color: palette_font[4],
            x: x0 + MOVE_BUTTON_W,
            y: param.y,
            z,
            w: INVENTORY_BETWEEN_ITEM_COLUMNS,
            h: param.h,
            align: ALIGN.HCENTER | ALIGN.VCENTER,
            text: `L${idx + 1}`
          });
          font.draw({
            color: palette_font[4],
            x: x0 + 3,
            y: param.y,
            z,
            h: param.h,
            align: ALIGN.HRIGHT | ALIGN.VCENTER,
            text: 'Unlocks at'
          });
        }
      } else {
        let is_selected = selected_idx[0] === 'hats' && selected_idx[1] === idx;
        if (inventoryButton({
          x, y, z,
          item,
          show_count: false,
          selected: is_selected,
        })) {
          this.selected_idx = selected_idx = ['hats', idx];
          if (buttonLastSpotRet().double_click) {
            do_action = true;
          } else if (is_selected) {
            this.selected_idx = selected_idx = ['null', 0];
          }
        }
      }
    }

    x0 = INVENTORY_X + INVENTORY_BOOKS_XOFFS;
    for (let ii = 0; ii < MAX_LEVEL; ++ii) {
      let x = x0;
      let y = y0 + (MOVE_BUTTON_W + INVENTORY_PAD) * ii;
      let idx = MAX_LEVEL - ii - 1;
      let item = books[idx];
      let param = {
        x, y, z, w: MOVE_BUTTON_W, h: MOVE_BUTTON_W,
      };
      if (!item) {
        drawBox(param, autoAtlas('ui', idx < level ? 'inventory-fillable-book' : 'inventory-locked'));
      } else {
        let is_selected = selected_idx[0] === 'books' && selected_idx[1] === idx;
        if (inventoryButton({
          x, y, z,
          item,
          show_count: false,
          selected: is_selected,
        })) {
          this.selected_idx = selected_idx = ['books', idx];
          if (buttonLastSpotRet().double_click) {
            do_action = true;
          } else if (is_selected) {
            this.selected_idx = selected_idx = ['null', 0];
          }
        }
      }
    }

    let idx = 0;
    x0 = INVENTORY_X + INVENTORY_GRID_XOFFS;
    y0 = INVENTORY_Y + INVENTORY_GRID_YOFFS;

    this.scroll_area.begin({
      x: x0, y: y0 - 4, z,
      h: INVENTORY_GRID_H_PX + 8,
      w: INVENTORY_GRID_W_PX + 16,
    });
    x0 = 0;
    y0 = 4;

    let ymax = 0;
    for (let yy = 0; yy < (INVENTORY_GRID_H - 1) || idx < inventory.length; ++yy) {
      let y = y0 + yy * (MOVE_BUTTON_W + INVENTORY_PAD);
      ymax = y + MOVE_BUTTON_W + INVENTORY_PAD;
      for (let xx = 0; xx < INVENTORY_GRID_W; ++xx, ++idx) {
        let x = x0 + xx * (MOVE_BUTTON_W + INVENTORY_PAD);
        let item = inventory[idx];
        let param = {
          x, y, z, w: MOVE_BUTTON_W, h: MOVE_BUTTON_W,
        };
        if (!item) {
          autoAtlas('ui', 'inventory-empty').draw(param);
        } else {
          let is_selected = selected_idx[0] === 'inv' && selected_idx[1] === idx;
          if (inventoryButton({
            x, y, z,
            item,
            show_count: true,
            selected: is_selected,
          })) {
            this.selected_idx = selected_idx = ['inv', idx];
            if (buttonLastSpotRet().double_click) {
              do_action = true;
            } else if (is_selected) {
              this.selected_idx = selected_idx = ['null', 0];
            }
          }
        }
      }
    }
    let sort_button_w = MOVE_BUTTON_W * 4;
    if (buttonText({
      x: floor((INVENTORY_GRID_W_PX - sort_button_w) / 2),
      y: ymax, z,
      w: sort_button_w, h: MOVE_BUTTON_W,
      text: 'Sort',
    })) {
      sortInventory();
    }
    ymax += MOVE_BUTTON_W;
    this.scroll_area.end(ymax);
    x0 = INVENTORY_X + INVENTORY_GRID_XOFFS;
    y0 = INVENTORY_Y + INVENTORY_GRID_YOFFS;

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
        double_brim: false,
      });
      title_font.draw({
        style: style_inventory,
        size: TITLE_FONT_H,
        x: x + MOVE_BUTTON_W + 2,
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
          w: INVENTORY_GRID_WITHSCROLL_W,
          align: ALIGN.HWRAP,
          text,
        }).h + 2;
      }
      itemInfo(item, line);

      y += 2;

      let x1 = x0 + INVENTORY_GRID_WITHSCROLL_W;
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
            if (
              elem.level === item.level ||
              !swap_target ||
              swap_target.level !== item.level && elem.level < swap_target.level
            ) {
              swap_target = elem;
              swap_target_idx = ii;
            }
          }
          let is_at_player_level = target_list.length >= level;
          let is_at_floor_level = target_list.length >= floor_level;

          if (!is_at_player_level && swap_target && swap_target.level !== item.level) {
            swap_target = null;
          }

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
                let new_idx = equip(selected_idx[1], swap_target_idx);
                this.selected_idx = selected_idx = [target_loc, new_idx];
              }
            }
          } else if (!is_at_player_level) {
            // allow equipping
            if (is_at_floor_level) {
              line('Note: You can equip this, however you will be wielding more' +
                ` ${item.type}s than the current Floor Level, so only the bottom (best) item(s) will be used.`);
            }
            if (action('Equip')) {
              let new_idx = equip(selected_idx[1], null);
              this.selected_idx = selected_idx = [target_loc, new_idx];
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
            this.selected_idx = selected_idx = ['inv', target_idx];
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
                  sound_button: 'shop',
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

            for (let dsub = 0; dsub < 2; ++dsub) {
              let subtype;
              if (item.type === 'book') {
                if (dsub) {
                  // next element, same style
                  subtype = ((item.subtype + 1) % 3) + (item.subtype >= 3 ? 3 : 0);
                } else {
                  // same element, different style
                  subtype = (item.subtype + 3) % 6;
                }
              } else {
                subtype = (item.subtype + 1 + dsub) % 3;
              }
              let target_item: Item = {
                ...item,
                level: item.level - 1,
                subtype,
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
                  sound_button: 'shop',
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
                sound_button: 'shop',
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
        w: INVENTORY_GRID_WITHSCROLL_W,
        align: ALIGN.HWRAP,
        text: shop_type === 'upgrades' ?
          '[c=level]UPGRADE[/c]: Combine 2 items into a [c=level]higher level[/c] item.' :
          '[c=level]DOWNVERT[/c]: Convert 1 item into a\n  [c=level]lower level[/c] item of a different\n' +
          '  element.\n\n' +
          '[c=level]TRADE[/c]: Trade any 1 item for a healing\n  potion.'
      });
    }

    if (shop_type === 'inventory') {
      let headsize = 24;
      let colors = {
        color: PLAYER_COLORS_VEC4[myEnt().getData('costume0', 0)],
        color1: PLAYER_COLORS_VEC4[myEnt().getData('costume1', 0)],
      };
      autoAtlas('player', 'portrait0').drawDualTint({
        x: INVENTORY_X + INVENTORY_W - INVENTORY_PAD6 - headsize,
        y: INVENTORY_Y + INVENTORY_H - INVENTORY_PAD6 - headsize,
        z,
        w: headsize,
        h: headsize,
        ...colors,
      });

      if (selected_idx[0] === 'null') {
        let y = INVENTORY_Y + INVENTORY_SHOP_OPTIONS_YOFFS - 12;
        markdownAuto({
          font_style: style_inventory,
          x: x0, y, z,
          w: INVENTORY_GRID_WITHSCROLL_W - 12,
          align: ALIGN.HWRAP,
          text:
            'You can equip 1 Hat and 1 Book per [c=level]Player Level[/c].\n' +
            'Each equipped item must be smaller (lower level) than the item' +
            ' beneath it.  So, each equipped book (or hat) must be a unique level.',
        });
      }
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
    drawHatDude(x0, y0, z, 1, hats, books, myEnt().getData('costume0', 0));

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

export function inventoryMenuActive(): boolean {
  return uiActionActive(InventoryMenuAction);
}
