import assert from 'assert';
import { getFrameDt, isInBackground, onEnterBackground } from 'glov/client/engine';
import * as settings from 'glov/client/settings';
import { GlovSoundSetUp, soundLoad, soundPlay, soundResumed } from 'glov/client/sound';
import type { TSMap } from 'glov/common/types';

const { floor, random } = Math;

let tracks: TSMap<string[]> = {
  title: [ // must be subset of `town`
    'town/Bach - Moog and a Jupiter - OPL - Brass',
  ],
  town: [
    'town/Bach - Moog and a Jupiter - OPL - Brass',
    'town/Music Box Cute 1 - OPL Loop',
    'town/Music Box Cute 2 - OPL Loop',
    'town/Music Box Cute 3 - OPL Loop',
    'town/Music Box Happy 1 - OPL Loop',
    'town/Music Box Happy 3 - OPL Loop',
  ],
  tower: [
    'tower/Arbeau - Belle - OPL - LOOP',
    'tower/Bach - Moog and a Jupiter - OPL - Strings',
    'tower/Bach - Moog and a Jupiter -OPL - Woodwinds',
    'tower/Bach Prelude and Fugue in C minor - OPL - LOOP',
    'tower/Battle Music 2 - LOOP',
    'tower/battle2',
    'tower/Boss Battle 10 - OPL - LOOP',
    'tower/Brahms Val3 OPL - LOOP',
    'tower/caves',
    'tower/Chopin - Prelude in E Minor',
    'tower/Death Waltz - OPL Loop',
    'tower/drum_beat_01',
    'tower/drum_fast_01',
    'tower/drum_half_01',
    'tower/getting_started',
    'tower/moving_along',
    'tower/Music Box Sad 1 - OPL Loop',
    'tower/Music Box Sad 3 - OPL Loop',
    'tower/Music Box Spooky 1 - OPL Loop',
    'tower/Music Box Spooky 2 - OPL Loop',
    'tower/Patapan-OPL LOOP',
    'tower/volcano',
    'tower/You Can\'t Beat the Machine - OPL Loop',
  ],
};

const MUSIC_VOLUME = 0.1;

const SILENT_TIME = 30*1000;
const LOOP_TIME = 2*60*1000;
const LOOP_TIME_DRUMS = 20*1000;
let last_key: string | null;
let cycle_counter = 0;
let cycle_idx = -1;
let last_played_track = '';
export function musicCurTrack(): string | null {
  return last_key && tracks[last_key]?.[cycle_idx] || null;
}
function musicCycle(key: string | null): string | null {
  if (!key) {
    return null;
  }
  let list = tracks[key];
  if (!list) {
    return key;
  }
  if (key === 'title') {
    key = 'town';
  }
  if (last_key !== key) {
    last_key = key;
    cycle_counter = Infinity;
    cycle_idx = -1;
  }
  cycle_counter += getFrameDt();
  let end_time = (cycle_idx === -1 ? SILENT_TIME : LOOP_TIME);
  if (list[cycle_idx] && list[cycle_idx].includes('drum_')) {
    end_time = LOOP_TIME_DRUMS;
  }
  if (cycle_counter > end_time) {
    cycle_counter = 0;
    if (cycle_idx === -1) {
      do {
        cycle_idx = floor(random() * list.length);
      } while (list[cycle_idx] === last_played_track);
      last_played_track = list[cycle_idx];
      console.log(`Playing new track "${list[cycle_idx]}"`);
    } else {
      cycle_idx = -1;
    }
  }
  return list[cycle_idx] || null;
}

let last_music_ref: GlovSoundSetUp | null;
let last_music_name: string | null = null;
let last_music_fading_out = false;
let playing_music_name: string | null = null;
let loading_music: TSMap<true> = {};
let loaded_music: TSMap<true> = {};
const FADE_OUT_CHANGE = 500/MUSIC_VOLUME;
const FADE_OUT_SILENCE = 5000/MUSIC_VOLUME;
const FADE_UP = 2500/MUSIC_VOLUME;
export function tickMusic(music_name: string | null): void {
  // if (!music_name && optionsMenuVisible()) {
  //   music_name = 'music_menu';
  // }
  if (!settings.volume || !settings.volume_music || isInBackground()) {
    music_name = null;
  }

  music_name = musicCycle(music_name);

  if (music_name) {
    music_name = `music/${music_name}`;
  }
  if (music_name && !loading_music[music_name]) {
    loading_music[music_name] = true;
    soundLoad(music_name, { loop: true }, function () {
      loaded_music[music_name!] = true;
    });
  }
  if (!soundResumed()) {
    return;
  }
  if (playing_music_name !== music_name) {
    if (last_music_ref) {
      if (last_music_ref.playing() && last_music_name === music_name) {
        assert(playing_music_name === null);
        assert(last_music_fading_out);
        // already playing the right music, it's just fading out
        last_music_ref.fade(MUSIC_VOLUME, FADE_UP);
        playing_music_name = last_music_name;
        last_music_fading_out = false;
      } else {
        if (!last_music_fading_out) {
          last_music_fading_out = true;
          last_music_ref.fade(0, music_name ? FADE_OUT_CHANGE : FADE_OUT_SILENCE);
          playing_music_name = null;
        }
        if (!last_music_ref.playing()) {
          last_music_ref = null;
          last_music_name = null;
        }
      }
    }
    if (!last_music_ref) { // finished fading out, can start something new
      if (music_name && loaded_music[music_name]) {
        last_music_ref = soundPlay(music_name, {
          volume: 0.001,
          as_music: true,
        });
        last_music_fading_out = false;
        if (last_music_ref) {
          last_music_ref.fade(MUSIC_VOLUME, FADE_UP);
          last_music_name = music_name;
          playing_music_name = music_name;
        }
      }
    }
  }
}

onEnterBackground(function () {
  tickMusic(null);
});
