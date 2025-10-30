DCEXJam2025 - Theme: (Pagoda Mushroom Image)
============================

Dungeon Crawler Limited Asset Jam 2025 Entry by Jimbly - "Tower of Hats"

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
* level entrances from town
* audio pass
* show enemy HP for more interesting combat choices?

Assets to replace
* chat send/receive/join/leave sounds
* placeholder sounds in play.ts

TODO
* add scrollbar to inventory, remove limit? add sort button
* reward for floor mechanic? - boss with level + 1 and/or hp x2 that drops regular level + 1
* death animation should always switch to a blood particle within a few hundred ms (in sprite animation)
* hunter/wander never move onto square outside of stairs_in
* add compass/coords to UI
* show an un-slotted, but available, quickbar slot as a different color
* battlezone: option to skip (set other player as ready) if they have not taken an action in 10 seconds; maybe kick to menu if skipped 3 times in a row
* battlezone: tick even if in background
* add critical hits/misses to combat system?
* aiHunt should prefer the previous position if it's a valid pathing option (so, side-stepping will never get around them)
* damage floaters in 3D at a distance and/or giant particle effects whenever anyone gets hit
* animate/grow critters on attack / hit
* remove floor names from minimp, only full map?
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
* wider hats/books at least in inventory
* hall of fame on main menu (just XP)
* disable inventory access when within 1 unobstructed tile of an enemy
* play sound and display message when all monsters have been cleared

Bugs:
* simultaneously: B ready'd by moving into battle zone. A attacked and killed entity (didn't think B was in zone at start of attack, showed in-zone by the time attack action was ack'd). now both are not in a battle zone, B still flagged as ready.  both A and B tick (a different set of) the AI and try to un-flag B as being ready

Credits
=======

* Art and Sound - The DungeonCrawlers.org Discord
