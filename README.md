DCEXJam2025 - Theme: (Pagoda Mushroom Image)
============================

Dungeon Crawler Limited Asset Jam 2025 Entry by Jimbly - "Title TBD"

**BattleZone Rules**
* After an action flag as ready
* If all players in zone are ready for 250ms, and I'm the lowest ID in the zone, execute a tick and unflag ready
* Actions are blocked if:
  * a tick is required
  * and I am in a BZ
* If attempting to move/attack
  * if there are any other players in the zone, block the action (line above will handle it)
  * if I am the only player, execute a tick before allowing the action

**TODO**
* town functional layout
  * shops / merging
    * trades:
      * upgrades: 2 L1R -> 1 L2R
      * shop: 1 L2R -> 1L1G/B (or, functionally similar: 2 L1R -> 1L1R/G/B)
      * shop: 1 Lxy -> 1 HealPot (higher level heals more?)
      * maybe later: refinement: 2L2R -> 1L1R +1
    * other shops:
      * somewhere: free healpot if you have no L1 spells and have no healpots
* drops: on 50% of kills, drop avg(monster level / 2) level items (so, floor(floor/2)+0/1), 1:8 potions
* player creation / renaming

Assets to replace
* panel / status message background
* chat send/receive/join/leave sounds
* placeholder sounds in play.ts

TODO
* add scrollbar to inventory, remove limit; add sort button
* reward for floor mechanic?
* death animation should always switch to a blood particle within a few hundred ms (in sprite animation)
* hunter/wander never move onto square outside of stairs_in
* add compass/coords to UI
* show an un-slotted, but available, quickbar slot as a different color
* battlezone: option to skip (set other player as ready) if they have not taken an action in 10 seconds; maybe exit to menu if skipped 3 times in a row
* battlezone: tick even if in background
* add critical hits/misses to combat system?
* aiHunt should prefer the previous position if it's a valid pathing option (so, side-stepping will never get around them)
* damage floaters in 3D at a distance and/or giant particle effects whenever anyone gets hit
* animate/grow critters on attack / hit
* death penalty: lose some inventory too? get kicked out of floor (maybe it gets reset?)
* fix two hits on the same frame not showing floaters well
* bug: visibility is different before/after turning camera/moving forward and back if directly facing a wall
  * relatedly: moving backwards through a door and I could see the enemy on the other side
  * relatedly: always show monster behind (and diagonals?)
* Deal with more than 4 players in battlezone list (scrollbar, dither, hide?)
* click to move - ensure stop when enter (active?) battlezone
* click to move - stop when threatened (or, always in battlezone?)
* hide cheating commands like entset, stat
* W on map screen is selecting Exit button, not moving player
* Space on map screen after exit button selected is activating Wait, not closing the window
* change W icon to basic attack icon when engaged
* show actual item instead of chest graphic when there's a single item
* dither instead of blur for menuUp()
* fix battle log messages, especially in OMP
* player names over heads
* add ability to drop items?
* wider hats/books at least in inventory

Bugs:
* simultaneously: B ready'd by moving into battle zone. A attacked and killed entity (didn't think B was in zone at start of attack, showed in-zone by the time attack action was ack'd). now both are not in a battle zone, B still flagged as ready.  both A and B tick (a different set of) the AI and try to un-flag B as being ready

Credits
=======

* Art and Sound - The DungeonCrawlers.org Discord
