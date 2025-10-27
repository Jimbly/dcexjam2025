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
* OMP AI ticking
  * play sound and display message if trying to do any action and BZ is waiting
  * display message if anyone else has been ready for more than a few seconds
* aiHunt needs to hunt closest player, not BZ leader
* aiHunter should follow a player through a door (or: if they arrive at last know spot, should enter a random door? or doors are open vis for hunter?)

Assets to replace
* scroll bar
* buttons / menu
* panel / status message background
* chat send/receive/join/leave sounds

TODO
* damage floaters in 3D at a distance and/or giant particle effects whenever anyone gets hit
* bug: visibility is different before/after turning camera/moving forward and back if directly facing a wall
  * relatedly: always show monster behind (and diagonals?)
* Deal with more than 4 players in battlezone list (scrollbar, dither, hide?)
* click to move - ensure stop when enter (active?) battlezone
* click to move - stop when threatened (or, always in battlezone?)
* hide cheating commands like entset, stat
* W on map screen is selecting Exit button, not moving player
* Space on map screen after exit button selected is activating Wait, not closing the window

Credits
=======

* Art and Sound - The DungeonCrawlers.org Discord
