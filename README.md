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
* This means: remove the existing 250ms schedule tick logic; kind of - still need to flag the tick as needed before the next action though

**TODO**
* OMP AI ticking
  * plan: clients run steps; do it scheduled/delayed as well as pre-emptively before a move
  * next:
    * battlezone system
  * deal with race conditions:
    * battlezone leader leaves/changes
    * non-ready person leaves
    * ready person leaves
  * allow rotating while battlezone-locked
  * hide waiting/ready icons if we're the only one in the battle zone
* aiHunter should follow a player through a door (or: if they arrive at last know spot, should enter a random door? or doors are open vis for hunter?)

Assets to replace
* scroll bar
* buttons / menu
* panel / status message background
* chat send/receive/join/leave sounds

TODO
* damage floaters in 3D at a distance
* bug: visibility is different before/after turning camera/moving forward and back
  * relatedly: always show monster behind (and diagonals?)
* Deal with more than 4 players in battlezone list (scrollbar, dither, hide?)
* click to move - ensure stop when enter (active?) battlezone
* click to move - stop when threatened (or, always in battlezone?)
* hide cheating commands like entset, stat

Credits
=======

* Art and Sound - The DungeonCrawlers.org Discord
