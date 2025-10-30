
import { autoAtlas } from 'glov/client/autoatlas';
import * as engine from 'glov/client/engine';
import { fontStyleColored } from 'glov/client/font';
import { localStorageGetJSON } from 'glov/client/local_storage';
import { netSubs } from 'glov/client/net';
import {
  buttonText,
  modalDialog,
  print,
  uiButtonHeight,
  uiButtonWidth,
  uiTextHeight,
} from 'glov/client/ui';
import * as urlhash from 'glov/client/urlhash';
import { Item } from '../common/entity_game_common';
import { createAccountUI } from './account_ui';
import {
  crawlerCommStart,
  crawlerCommStartup,
  crawlerCommWant,
} from './crawler_comm';
import {
  crawlerPlayWantMode,
  crawlerPlayWantNewGame,
  SavedGameData,
} from './crawler_play';
import { game_height, game_width } from './globals';
import * as main from './main';
import { tickMusic } from './music';
import { PAL_BLACK, PAL_WHITE, palette, palette_font } from './palette';
import { drawHatDude } from './play';


type AccountUI = ReturnType<typeof createAccountUI>;

let account_ui: AccountUI;

let hats: Item[] = [];
for (let ii = 0; ii < 7; ++ii) {
  hats.push({
    type: 'hat',
    subtype: Math.floor(Math.random() * 3),
    level: 7 - ii,
    count: 1,
  });
}

function title(dt: number): void {
  gl.clearColor(palette[PAL_BLACK][0], palette[PAL_BLACK][1], palette[PAL_BLACK][2], 1);
  main.chat_ui.run({
    hide: true,
  });

  tickMusic(null);

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

  let y = 120;
  let login_w = 120/2+80;
  account_ui.showLogin({
    x: (game_width - login_w)/2,
    y,
    y_logged_in: 300,
    pad: 4,
    text_w: 120,
    label_w: 80,
    style: fontStyleColored(null, palette_font[PAL_WHITE + 2]),
    center: false,
    button_width: login_w,
    font_height_small: uiTextHeight(),
  });

  drawHatDude(20, game_height - 12 - 24, Z.UI, scale, hats, []);

  let x = 10;
  x += 10;
  y = 150;
  // @ts-expect-error truthy
  for (let ii = 0; ii < 3 && !'onlinedemo'; ++ii) {
    let slot = ii + 1;
    let manual_data = localStorageGetJSON<SavedGameData>(`savedgame_${slot}.manual`, { timestamp: 0 });
    print(null, x, y, Z.UI, `Slot ${slot}`);
    if (buttonText({
      x, y: y + uiButtonHeight(), text: 'Load Game',
      disabled: !manual_data.timestamp
    })) {
      crawlerPlayWantMode('manual');
      urlhash.go(`?c=local&slot=${slot}`);
    }
    if (buttonText({
      x, y: y + uiButtonHeight() * 2 + 2, text: 'New Game',
    })) {
      if (manual_data.timestamp) {
        modalDialog({
          text: 'This will overwrite your existing game when you next save.  Continue?',
          buttons: {
            yes: function () {
              crawlerPlayWantNewGame();
              urlhash.go(`?c=local&slot=${slot}`);
            },
            no: null,
          }
        });
      } else {
        crawlerPlayWantNewGame();
        urlhash.go(`?c=local&slot=${slot}`);
      }
    }
    x += uiButtonWidth() + 2;
  }
  x = 10;
  // @ts-expect-error truthy
  if (!'onlinedemo') {
    y += uiButtonHeight() * 3 + 6;
  }
  if (netSubs().loggedIn()) {
    if (buttonText({
      x: (game_width - login_w)/2,
      y,
      w: login_w,
      text: 'Approach the Tower...',
    })) {
      urlhash.go('?c=the');
    }
    y += uiButtonHeight() + 2;
  }
  if (crawlerCommWant()) {
    crawlerCommStart();
  }

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
}
