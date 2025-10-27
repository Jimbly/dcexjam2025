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
* draft combat system
  * H to heal, consume a potion
  * Try getting through a floor

Assets to replace
* panel / status message background
* chat send/receive/join/leave sounds
* placeholder sounds in play.ts

TODO
* better effect upon heal, not taking damage!
* aiHunt should prefer the previous position if it's a valid pathing option (so, side-stepping will never get around them)
* damage floaters in 3D at a distance and/or giant particle effects whenever anyone gets hit
* bug: visibility is different before/after turning camera/moving forward and back if directly facing a wall
  * relatedly: always show monster behind (and diagonals?)
* Deal with more than 4 players in battlezone list (scrollbar, dither, hide?)
* click to move - ensure stop when enter (active?) battlezone
* click to move - stop when threatened (or, always in battlezone?)
* hide cheating commands like entset, stat
* W on map screen is selecting Exit button, not moving player
* Space on map screen after exit button selected is activating Wait, not closing the window
* Shadow under ents

Credits
=======

* Art and Sound - The DungeonCrawlers.org Discord
