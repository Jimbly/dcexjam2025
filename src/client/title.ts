/* eslint-disable @typescript-eslint/no-unused-vars */
import { autoAtlas } from 'glov/client/autoatlas';
import * as engine from 'glov/client/engine';
import { ALIGN, fontStyle, fontStyleColored } from 'glov/client/font';
import { keyDownEdge, KEYS } from 'glov/client/input';
import { netClient, netDisconnected, netSubs } from 'glov/client/net';
import { scoreAlloc, ScoreSystem, scoreUpdatePlayerName } from 'glov/client/score';
import { scoresDraw } from 'glov/client/score_ui';
import {
  buttonText,
  uiButtonHeight,
  uiGetFont,
  uiGetTitleFont,
  uiTextHeight,
} from 'glov/client/ui';
import * as urlhash from 'glov/client/urlhash';
import { plural } from 'glov/common/util';
import { Item } from '../common/entity_game_common';
import { createAccountUI } from './account_ui';
import {
  crawlerCommStart,
  crawlerCommStartup,
  crawlerCommWant,
} from './crawler_comm';
import { game_height, game_width } from './globals';
import * as main from './main';
import { tickMusic } from './music';
import { PAL_BLACK, PAL_BLUE, PAL_WHITE, PAL_YELLOW, palette, palette_font } from './palette';
import { drawHatDude, myEnt, TITLE_FONT_H } from './play';


export type Score = {
  xp: number;
};
let score_system: ScoreSystem<Score>;

function encodeScore(score: Score): number {
  return score.xp;
}

function parseScore(value: number): Score {
  return {
    xp: value,
  };
}

export function setScore(): void {
  // if (data.cheat) {
  //   return;
  // }
  scoreUpdatePlayerName(myEnt().getData('display_name', ''));
  let score: Score = {
    xp: myEnt().getData('stats.xp', 0),
  };
  score_system.setScore(0, score);
}

type AccountUI = ReturnType<typeof createAccountUI>;

let account_ui: AccountUI;

const SCORE_COLUMNS = [
  // widths are just proportional, scaled relative to `width` passed in
  { name: '', width: 12, align: ALIGN.HFIT | ALIGN.HRIGHT | ALIGN.VCENTER },
  { name: 'NAME', width: 60, align: ALIGN.HFIT | ALIGN.VCENTER },
  { name: 'XP', width: 20 },
];
const style_score = fontStyleColored(null, palette_font[PAL_WHITE]);
const style_me = fontStyleColored(null, palette_font[PAL_YELLOW]);
const style_header = fontStyleColored(null, palette_font[PAL_WHITE]);
function myScoreToRow(row: unknown[], score: Score): void {
  row.push(score.xp);
}
const style_title = fontStyle(null, {
  color: palette_font[PAL_BLUE],
  // outline_color: 0xFFFFFFff,
  // outline_width: 0.6,
  glow_color: 0x000000dd,
  glow_inner: 1,
  glow_outer: 1.5,
  glow_xoffs: 0,
  glow_yoffs: 0,
});

const level_idx = 0;
export function stateHighScores(dt: number): void {
  tickMusic('title');
  let W = game_width;
  let H = game_height;
  // camera2d.setAspectFixed(W, H);
  // titleDrawBG(dt);
  let font = uiGetFont();

  let y = 35;
  let pad = 16;
  let text_height = uiTextHeight();
  let button_h = uiButtonHeight();


  uiGetTitleFont().draw({
    x: 0, w: W, y: y - TITLE_FONT_H* 2, align: ALIGN.HCENTER,
    size: TITLE_FONT_H* 4,
    style: style_title,
    text: 'Hall of Fame',
  });

  y += text_height * 2 + 8;

  // let has_score = score_system.getScore(level_idx);

  let button_w = 120;

  // if (buttonText({
  //   x: (W - button_w)/2, y,
  //   w: button_w, h: button_h,
  //   text: 'Return to Title'.toUpperCase(),
  // }) || keyDownEdge(KEYS.ESC)) {
  //   engine.setState(title);
  // }
  // y += button_h + 2;

  // pad = 8;
  // let x = pad;
  // let toggle_y = H - button_h - pad;
  // if (buttonImage({
  //   img: sprite_space,
  //   shrink: 16/button_h,
  //   frame: settings.volume_sound ? FRAME_SOUND_ON : FRAME_SOUND_OFF,
  //   x, y: toggle_y, h: button_h, w: button_h,
  // })) {
  //   settingsSet('volume_sound', settings.volume_sound ? 0 : 1);
  // }
  // x += button_h + pad;
  // if (buttonImage({
  //   img: sprite_space,
  //   shrink: 16/button_h,
  //   frame: settings.volume_music ? FRAME_MUSIC_ON : FRAME_MUSIC_OFF,
  //   x, y: toggle_y, h: button_h, w: button_h,
  // })) {
  //   settingsSet('volume_music', settings.volume_music ? 0 : 1);
  // }

  let hpad = 90;
  pad = 24;
  y = scoresDraw<Score>({
    score_system,
    allow_rename: false,
    x: hpad, width: W - hpad * 2,
    y, height: H - y - 2,
    z: Z.UI,
    size: text_height,
    line_height: text_height+2,
    level_index: level_idx,
    columns: SCORE_COLUMNS,
    scoreToRow: myScoreToRow,
    style_score,
    style_me,
    style_header,
    color_line: [1,1,1,1],
    color_me_background: [0.2,0.2,0.2,1],
    rename_edit_width: (W - hpad*2) / 3,
    rename_button_offset: 0,
  });

  if (buttonText({
    x: W - hpad - 80, y: game_height - button_h - 12,
    w: 120, h: button_h,
    text: 'Return to Title',
  }) || keyDownEdge(KEYS.ESC)) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    engine.setState(title);
  }

  // camera2d.push();
  // camera2d.setNormalized();
  // drawRect(0, 0, 1, 1, Z.UI - 20, [0, 0, 0, 0.5]);
  // camera2d.pop();
}

let hats: Item[] = [];
for (let ii = 0; ii < 7; ++ii) {
  hats.push({
    type: 'hat',
    subtype: Math.floor(Math.random() * 3),
    level: 7 - ii,
    count: 1,
  });
}

type ServerStats = {
  ccu: number;
};
let server_stats: ServerStats = {
  ccu: 0,
};
let server_stats_confident = false;
let server_stats_last_time = 0;
function getStats(): ServerStats {
  if (Date.now() - server_stats_last_time > 10 && !netDisconnected()) {
    server_stats_last_time = Date.now();
    netClient().send('get_stats', null, null, function (err?: unknown, data?: ServerStats) {
      if (!err && data) {
        server_stats_confident = true;
        server_stats = data;
      }
    });
  }
  return server_stats;
}

function title(dt: number): void {
  gl.clearColor(palette[PAL_BLACK][0], palette[PAL_BLACK][1], palette[PAL_BLACK][2], 1);
  main.chat_ui.run({
    hide: true,
  });

  tickMusic('title');

  const scale = 2;
  autoAtlas('title', 'text').draw({
    w: 108*scale,
    h: 24*scale,
    x: (game_width - 108*scale)/2,
    y: 24,
  });

  autoAtlas('title', 'tower').draw({
    w: 48*scale,
    h: 174*scale,
    x: game_width - 12 - 48*scale,
    y: game_height - 12 - 174*scale,
  });

  uiGetFont().draw({
    //color: palette_font[PAL_WHITE + 2],
    color: palette_font[PAL_YELLOW - 1],
    x: game_width * 0.27,
    w: game_width * (1 - 0.27 * 2),
    y: 74,
    align: ALIGN.HCENTER | ALIGN.HWRAP,
    text: 'An online multiplayer, co-op, turn-based dungeon crawler',
  });

  let y = 120;
  let login_w = 120/2+80;
  account_ui.showLogin({
    x: (game_width - login_w)/2,
    y,
    y_logged_in: 240,
    pad: 4,
    text_w: 120,
    label_w: 80,
    style: fontStyleColored(null, palette_font[PAL_WHITE + 2]),
    center: false,
    button_width: login_w,
    font_height_small: uiTextHeight(),
  });

  drawHatDude(20, game_height - 12 - 24, Z.UI, scale, hats, []);

  if (netSubs().loggedIn()) {
    y = 120;
    if (buttonText({
      x: (game_width - login_w)/2,
      y,
      w: login_w,
      text: 'Approach the Tower...',
      hotkeys: [KEYS.RETURN],
    })) {
      urlhash.go('?c=the');
    }
    y += 24;
    if (buttonText({
      x: (game_width - login_w)/2,
      y,
      w: login_w,
      text: 'Hall of Fame',
    })) {
      engine.setState(stateHighScores);
    }
  } else {
    y = 180;
  }

  y += uiButtonHeight() + 2;
  if (crawlerCommWant()) {
    crawlerCommStart();
  }

  y += 8;
  let stats = getStats();
  let ccu = Math.max(1, stats.ccu);
  if (!netDisconnected()) {
    uiGetFont().draw({
      color: palette_font[PAL_WHITE + 2],
      x: game_width * 0.27,
      w: game_width * (1 - 0.27 * 2),
      y,
      align: ALIGN.HCENTER | ALIGN.HWRAP,
      text: `${ccu} ${plural(ccu, 'player')} online`,
    });
  }
  y += uiTextHeight() + 8;
  if (ccu <= 2 && server_stats_confident) {
    uiGetFont().draw({
      color: palette_font[PAL_YELLOW - 1],
      x: game_width * 0.27,
      w: game_width * (1 - 0.27 * 2),
      y,
      align: ALIGN.HCENTER | ALIGN.HWRAP,
      text: 'HINT: It\'s better with friends, invite a friend to play!',
    });
    y += uiTextHeight() + 8;
  }

  uiGetFont().draw({
    color: palette_font[PAL_WHITE + 3],
    x: game_width * 0.27,
    w: game_width * (1 - 0.27 * 2),
    y: 305,
    align: ALIGN.HCENTER | ALIGN.HWRAP,
    text: 'By Jimb Esser for the Dungeon Crawler Limited Asset Jam 2025\nAssets by the DungeonCrawlers.org Discord',
  });
  y += uiTextHeight() + 8;


  main.chat_ui.runLate();
}

export function titleInit(dt: number): void {
  account_ui = account_ui || createAccountUI();
  engine.setState(title);
  title(dt);
}

export function titleStartup(): void {
  crawlerCommStartup({
    channel_type: 'game',
    lobby_state: titleInit,
    title_func: (value: string) => 'Tower of Hats', //  | "${value}"`,
    chat_ui: main.chat_ui,
  });

  const level_def = {
    name: 'the',
  };
  score_system = scoreAlloc({
    score_to_value: encodeScore,
    value_to_score: parseScore,
    level_defs: [level_def],
    score_key: 'DCEXJ25',
    ls_key: 'dcexj25',
    asc: false,
    rel: 24,
    num_names: 3,
    histogram: false,
  });
  // if (engine.DEBUG) { // note: cannot return to title from this
  //   engine.setState(stateHighScores);
  // }
}
