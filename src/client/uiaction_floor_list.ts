import { autoAtlas } from 'glov/client/autoatlas';
import * as engine from 'glov/client/engine';
import {
  ALIGN,
  FontStyle,
} from 'glov/client/font';
import {
  netSubs,
  netUserId,
} from 'glov/client/net';
import {
  ScrollArea,
  scrollAreaCreate,
} from 'glov/client/scroll_area';
import {
  buttonText,
  drawBox,
  uiButtonHeight,
  uiGetFont,
  uiGetTitleFont
} from 'glov/client/ui';
import * as walltime from 'glov/client/walltime';
import {
  ChannelDataClients,
  TSMap,
} from 'glov/common/types';
import { secondsToFriendlyString } from 'glov/common/util';
import {
  DirType,
  JSVec3,
  SOUTH,
  WEST,
} from '../common/crawler_state';
import {
  FloorData,
  FloorPlayerData,
  FloorRoomData,
} from '../common/entity_game_common';
import {
  crawlerGameState,
  crawlerRoom,
  crawlerScriptAPI,
} from './crawler_play';
import { allocateNewFloor } from './dialog_data';
import {
  FONT_HEIGHT,
  QUICKBAR_FRAME_Y,
} from './globals';
import { palette_font } from './palette';
import {
  FRAME_VERT_SPLIT,
  myEnt,
  setMiscField,
  TITLE_FONT_H,
} from './play';
import {
  style_inventory,
  style_mp_cost_over,
} from './styles';
import {
  uiAction,
  UIAction,
  uiActionActive,
  uiActionClear,
  uiActionCurrent,
} from './uiaction';

const { floor, max, round } = Math;

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

export function closeFloorList(): void {
  let dir: DirType = WEST;
  let cur_action = uiActionCurrent();
  if (cur_action && (cur_action as FloorListAction).base_floor === 7) {
    dir = SOUTH;
  }
  uiActionClear();
  crawlerScriptAPI().forceMove(dir);
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

export function joinFloorFromTown(floor_id: number): void {
  uiActionClear();
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
    const title_font = uiGetTitleFont();
    const font = uiGetFont();
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
    function titleLine(text: string, style?: FontStyle): void {
      title_font.draw({
        style: style || style_inventory,
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
    let seen_cards: Partial<Record<number, true>> = {};

    function drawRoomCard(rec: RoomRecord): void {
      seen_cards[rec.floor_id] = true;
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
        joinFloorFromTown(rec.floor_id);
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
          if (room_data.enemies_left > 0.75 * room_data.enemies_total) {
            disabled_floors[floor_level] = true;
          }
          if (seen_cards[floor_id]) {
            continue;
          }
          options.push({
            floor_level,
            floor_id,
            room_data,
          });
        }
      }
    }

    let skip_all = false;
    if (this.base_floor > my_level + 1) {
      titleLine('Please Use a Different Entrance', style_mp_cost_over);

      y += font.draw({
        style: style_inventory,
        x: 0, y, z, w: FLOORLIST_W,
        align: ALIGN.HWRAP | ALIGN.HCENTER,
        text: `Warning: Your player level (${my_level}) is too low for the floor` +
          ` levels accessible from this door (${this.base_floor}+).`,
      });
      y += FONT_HEIGHT;
      titleLine('Start Fresh');
      y += font.draw({
        style: style_inventory,
        x: 0, y, z, w: FLOORLIST_W,
        align: ALIGN.HWRAP | ALIGN.HCENTER,
        text: 'Please use a different entrance to start a fresh floor.',
      });
      y += FONT_HEIGHT;

      if (my_level === 1) {
        skip_all = true;
      }
    }

    if (!skip_all) {
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
          tooltip: disabled_floors[ii] ? 'Please join an active level instead.' : undefined,
        })) {
          allocateNewFloor(ii);
        }
        x += button_w + FLOORLIST_PAD;
      }
      y += FLOORLIST_BUTTON_H2 + FLOORLIST_PAD;
    }

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
    //   uiActionClear();
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

    if (engine.DEBUG && false) {
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

    if (!isOnFloorList() && !(engine.DEBUG && false)) {
      uiActionClear();
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
  if (!uiActionCurrent()) {
    uiAction(new FloorListAction(base_floor));
  }
}

export function floorListActive(): boolean {
  return uiActionActive(FloorListAction);
}
