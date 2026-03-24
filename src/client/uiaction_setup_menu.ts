import { autoAtlas } from 'glov/client/autoatlas';
import { editBox } from 'glov/client/edit_box';
import { getFrameTimestamp } from 'glov/client/engine';
import {
  ALIGN,
  fontStyleColored,
} from 'glov/client/font';
import { netClient } from 'glov/client/net';
import {
  buttonText,
  drawBox,
  drawRect,
  menuUp,
  uiButtonHeight,
  uiGetFont,
  uiGetTitleFont,
} from 'glov/client/ui';
import { DISPLAY_NAME_MAX_VISUAL_SIZE } from 'glov/common/net_common';
import {
  FONT_HEIGHT,
  game_height,
  game_width,
} from './globals';
import { chatUI } from './main';
import {
  PAL_WHITE,
  palette_font,
} from './palette';
import {
  myEnt,
  setMiscField,
  TITLE_FONT_H,
} from './play';
import {
  PLAYER_COLORS,
  PLAYER_COLORS_VEC4,
  style_inventory,
} from './styles';
import {
  uiAction,
  UIAction,
  uiActionActive,
  uiActionClear,
} from './uiaction';

const { floor } = Math;

const SETUP_W = 300;
const SETUP_H = 210;
const SETUP_X = floor((game_width - SETUP_W)/2);
const SETUP_Y = floor((game_height - SETUP_H)/2);
const SETUP_EDIT_W = DISPLAY_NAME_MAX_VISUAL_SIZE.width;

function setCloakColor(new_color: number): void {
  setMiscField('costume0', new_color);
}

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
    const font = uiGetFont();
    const title_font = uiGetTitleFont();
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

    let headsize = 24;
    let colors = {
      color: PLAYER_COLORS_VEC4[myEnt().getData('costume0', 0)],
      color1: PLAYER_COLORS_VEC4[myEnt().getData('costume1', 0)],
    };
    autoAtlas('player', 'portrait0').drawDualTint({
      x: x - 8 - headsize,
      y: y, z,
      w: headsize,
      h: headsize,
      ...colors,
    });


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
    y += TITLE_FONT_H + 20;

    let cloak = myEnt().getData('costume0', 0);
    font.draw({
      style: cloak === 7 ? fontStyleColored(null, palette_font[PAL_WHITE + 1]) : style_inventory,
      x, y, z,
      h: uiButtonHeight(),
      w: SETUP_EDIT_W,
      align: ALIGN.HVCENTER,
      text: 'Cloak Color',
    });
    drawRect(x, y, x + SETUP_EDIT_W, y + uiButtonHeight(), z - 0.1, PLAYER_COLORS_VEC4[cloak]);

    if (buttonText({
      x: x - 8 - button_w,
      y: y,
      z,
      w: button_w,
      text: '<<',
    })) {
      setCloakColor((cloak + PLAYER_COLORS.length - 1) % PLAYER_COLORS.length);
    }

    if (buttonText({
      x: x + SETUP_EDIT_W + 8,
      y: y,
      z,
      w: button_w,
      text: '>>',
    })) {
      setCloakColor((cloak + 1) % PLAYER_COLORS.length);
    }

    y += uiButtonHeight() + 8;

    // draw avatar
    const charsize = 28 * 2;
    autoAtlas('player', getFrameTimestamp() % 2000 > 1500 ? 'right-attack' : 'right').drawDualTint({
      x: x - 8 - charsize, y, z, w: charsize, h: charsize,
      ...colors,
    });


    font.draw({
      color: palette_font[4],
      x, y, z,
      align: ALIGN.HWRAP,
      w: 1000,
      text: 'Note: Hat color determined\nby your largest\nequipped hat.',
    });


    if (buttonText({
      x: SETUP_X + SETUP_W - 12 - button_w ,
      y: SETUP_Y + SETUP_H - 12 - uiButtonHeight(),
      w: button_w,
      z,
      text: 'Okay',
    })) {
      uiActionClear();
      let new_name = this.display_name.trim();
      if (this.orig_name !== new_name) {
        chatUI().cmdParse(`rename ${new_name}`);
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

export function setupMenuOpen(): void {
  uiAction(new SetupMenuAction());
}

export function setupMenuActive(): boolean {
  return uiActionActive(SetupMenuAction);
}
