import {
  fontStyle,
  fontStyleColored,
  vec4ColorFromIntColor,
} from 'glov/client/font';
import { vec4 } from 'glov/common/vmath';
import {
  PAL_BLACK,
  PAL_CYAN,
  PAL_RED,
  PAL_WHITE,
  PAL_YELLOW,
  palette_font,
} from './palette';

export const style_inventory = fontStyleColored(null, palette_font[PAL_BLACK - 1]);

export const style_item_level = fontStyle(null, {
  color: palette_font[PAL_YELLOW],
  outline_width: 3.5,
  outline_color: palette_font[PAL_YELLOW - 5],
});
export const outline_width = 2.5;
export const style_text = fontStyle(null, {
  color: palette_font[PAL_WHITE],
  outline_width,
  outline_color: palette_font[PAL_BLACK],
});

export const style_hotkey = fontStyle(null, {
  color: palette_font[PAL_BLACK],
  outline_width: 3.5,
  outline_color: palette_font[PAL_BLACK - 3],
});
export const style_hotkey_disabled = fontStyle(style_hotkey, {
  outline_color: palette_font[PAL_BLACK - 2],
});
export const style_item_count = fontStyle(null, {
  color: palette_font[PAL_BLACK],
  outline_width: 3.5,
  outline_color: palette_font[PAL_BLACK - 5],
});
export const style_mp_cost_over = fontStyle(null, {
  outline_width: 3.5,
  outline_color: palette_font[PAL_RED - 2],
  color: palette_font[PAL_RED],
});
export const style_mp_cost = fontStyle(null, {
  color: palette_font[PAL_CYAN],
  outline_width: 3.5,
  outline_color: palette_font[PAL_CYAN - 2],
});

export const PLAYER_COLORS = [
  0xe43b44FF, // red
  0xf77622FF, // orange
  0xfee761FF, // yellow
  0x63c74dFF, // green
  0x0099dbFF, // blue
  0xb55088FF, // purple
  0xc0cbdcFF, // white
  0x262b44FF, // black
];
export const PLAYER_COLORS_VEC4 = PLAYER_COLORS.map((rgb) => vec4ColorFromIntColor(vec4(), rgb));
