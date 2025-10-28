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
* equip UI
* xp and level up
* "floor level"
* respawn / defeat mechanic
* reward for floor mechanic
* shops
* player creation / renaming

Assets to replace
* panel / status message background
* chat send/receive/join/leave sounds
* placeholder sounds in play.ts

TODO
* add compass/coords to UI
* battlezone: option to skip (set other player as ready) if they have not taken an action in 10 seconds; maybe exit to menu if skipped 3 times in a row
* battlezone: tick even if in background
* add critical hits/misses to combat system?
* aiHunt should prefer the previous position if it's a valid pathing option (so, side-stepping will never get around them)
* damage floaters in 3D at a distance and/or giant particle effects whenever anyone gets hit
* animate/grow critters on attack / hit
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

Credits
=======

* Art and Sound - The DungeonCrawlers.org Discord
