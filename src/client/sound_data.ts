import { UISoundID } from 'glov/client/ui';

export const SOUND_DATA = {
  // online multiplayer sounds
  user_join: 'downbeat_03_reversed', //'user_join'
  user_leave: 'downbeat_03', //'user_leave',
  msg_in: 'hit_05_short',
  msg_err: 'msg_err', // 'error', // 'msg_err',
  msg_out_err: 'error', // 'msg_out_err',
  msg_out: 'hit_05_short_fithup', // 'footstep2_single',

  // UI sounds
  // button_click: 'press_01',
  button_click: 'button_click',
  button_click2: { file: 'button_click', volume: 0.125 }, // touch movement controls - just hear footsteps
  // menus/general/etc
  rollover: { file: 'ui_move', volume: 0.25 },

  user_error: 'press_01',
  invalid_action: 'error',

  // Game sounds
  potion: 'effect_08',
  footstep: [{
    file: 'footstep-single',
    volume: 0.25,
  }],
  levelup: 'complete2',
  basicattack: { file: 'hit_03', volume: 0.5 },
  spellice: { file: 'hit_01', volume: 1 },
  spellearth: { file: 'hit_07', volume: 1 },
  spellfire: { file: 'hit_09', volume: 1 },

  death_enemy: 'enemy_perish',
  death_me: 'downbeat_02',
  death_otherplayer: 'roar_02',
  pickup: 'mine',
  shop: 'acquire',
  floor_clear: 'acquire',
} satisfies Partial<Record<string, UISoundID | string | string[] | UISoundID[]>>;
