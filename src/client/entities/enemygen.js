/* eslint @stylistic/max-len:off */

const assert = require('assert');
const fs = require('fs');

const HP_LOW = 2; // normal = 5
const HP_HIGH = 8;
const HP_BOSS = -2; // scalar
const DEF_LOW = 0.3334;
const DEF_BOSS = 0.75;
const ATTACK_HIGH = 4; // normal == 3

let data = {
  'enemy-fire-1': {
    name: 'Molten Blob',
    hp: HP_LOW,
    attack: 0,
    defense: 0,
  },
  'enemy-fire-2': {
    name: 'Fire Skull',
    hp: 0,
    attack: ATTACK_HIGH,
    defense: 0,
    flying: true,
  },
  'enemy-fire-3': {
    name: 'Flame',
    hp: HP_LOW,
    attack: 0,
    defense: 0,
    flying: true,
  },
  'enemy-fire-4': {
    name: 'Balrog',
    hp: 0,
    attack: 0,
    defense: DEF_LOW,
  },
  'enemy-fire-5': {
    name: 'Igneous Cube',
    hp: 0,
    attack: ATTACK_HIGH,
    defense: 0,
  },
  'enemy-fire-6': {
    name: 'Flame Licks',
    hp: HP_HIGH,
    attack: 0,
    defense: 0,
  },
  'enemy-earth-1': {
    name: 'Boring Old Slime',
    hp: HP_LOW,
    attack: 0,
    defense: 0,
  },
  'enemy-earth-2': {
    name: 'Earth Skull',
    hp: 0,
    attack: ATTACK_HIGH,
    defense: 0,
    flying: true,
  },
  'enemy-earth-3': {
    name: 'Life Flame',
    hp: HP_LOW,
    attack: 0,
    defense: 0,
    flying: true,
  },
  'enemy-earth-4': {
    name: 'Wood Orc',
    hp: 0,
    attack: 0,
    defense: DEF_LOW,
  },
  'enemy-earth-5': {
    name: 'Sarcastic Snake',
    hp: 0,
    attack: ATTACK_HIGH,
    defense: 0,
  },
  'enemy-earth-6': {
    name: 'Watcher',
    hp: HP_HIGH,
    attack: 0,
    defense: 0,
  },
  'enemy-ice-1': {
    name: 'Cold Slime',
    hp: HP_LOW,
    attack: 0,
    defense: 0,
  },
  'enemy-ice-2': {
    name: 'Damp Skull',
    hp: 0,
    attack: ATTACK_HIGH,
    defense: 0,
    flying: true,
  },
  'enemy-ice-3': {
    name: 'Wet Fire',
    hp: HP_LOW,
    attack: 0,
    defense: 0,
    flying: true,
  },
  'enemy-ice-4': {
    name: 'Squirter',
    hp: 0,
    attack: 0,
    defense: DEF_LOW,
  },
  'enemy-ice-5': {
    name: 'Frozen Cube',
    hp: 0,
    attack: ATTACK_HIGH,
    defense: 0,
  },
  'enemy-ice-6': {
    name: 'Ice Spirit',
    hp: HP_HIGH,
    attack: 0,
    defense: 0,
  },
  'enemy-rainbow-1': {
    name: 'Rainbow Blob',
    hp: HP_BOSS,
    attack: 0,
    defense: DEF_BOSS,
  },
  'enemy-rainbow-2': {
    name: 'Stone Golem',
    hp: HP_BOSS,
    attack: 0,
    defense: DEF_BOSS,
  },
  'enemy-rainbow-3': {
    name: 'Etherial',
    hp: HP_BOSS,
    attack: 0,
    defense: DEF_BOSS,
    flying: true,
  },
};

['fire', 'earth', 'ice', 'rainbow'].forEach((color) => {
  for (let idx = 1; idx <= (color === 'rainbow' ? 3 : 6); ++idx) {
    let name = `enemy-${color}-${idx}`;
    let entry = data[name];
    assert(entry);

    let output = `---
properties:
  display_name: ${entry.name}
  is_boss: ${entry.hp < 0}
traits:
- id: blocks_player
- id: enemy
- id: stats_enemy
  hp: ${entry.hp || 5}
  attack: ${entry.attack || 3}
  defense: ${entry.defense || 0}
`;
    if (color !== 'rainbow') {
      output += `  element: ${color}\n`;
    }
    output += `- id: hunter
- id: wander
- id: drawable
- id: drawable_sprite
  anim_data:
    idle:
      frames: [${name}-1, ${name}-2]
      times: 400
      times_random: 100
    attack:
      frames: [${name}-3]
      loop: false
      transition_to: idle
      times: 500
      times_random: 100
    death:
      frames: [${name}-4, ${name}-4, ${name}-4, deathanim1, deathanim2, deathanim3, deathanim4, deathanim5, deathanim6, deathanim7, deathanim8, deathanim7, deathanim8, deathanim7, deathanim8]
      loop: false
      times: 100
  sprite_data:
    atlas: dcex
    filter_min: LINEAR_MIPMAP_LINEAR
    filter_mag: LINEAR
    origin: [0.5, ${entry.flying ? '1.25' : '1'}]
  scale: 0.75
  do_alpha: false
  simple_anim:
    - period: 5000
      scale: [1, 0.95]
  shadow:
    atlas: dcex
    name: shadow
`;
    fs.writeFileSync(`${name}.entdef`, output);
  }
});
