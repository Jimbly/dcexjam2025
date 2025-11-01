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

Levels!
* procgen tweaks:
  * windows? especially to outer sky?
  * some doors are archways?  don't interp well through them currently...
* then: roll 10 of them and pick from them, or do full dynamic?
* sky color/bg tweaks, some without ceilings

TODO
* deploy to staging and itch
* set "win the game" floor to 6, hide doors to 7+?
* choose player cloak color in customization (just 6 hard-coded? simple 2-color tint?); maybe hat color based on equipped hat?
* golden hat reward for final level (if it shows on players)
* fix 2 players or 1 player + 1 NPC on the same square to push in different directions
* using basic attack on the cat should pet it
* allow "Swap" to swap with lowest level that would be allowed
* make dude's books more clear

Bugs:
* visibility is different before/after turning camera/moving forward and back if directly facing a wall
  * relatedly: moving backwards through a door and I could see the enemy on the other side
  * relatedly: always show monster behind (and diagonals? and when bumping a blocked door?)
* simultaneously: B ready'd by moving into battle zone. A attacked and killed entity (didn't think B was in zone at start of attack, showed in-zone by the time attack action was ack'd). now both are not in a battle zone, B still flagged as ready.  both A and B tick (a different set of) the AI and try to un-flag B as being ready

Post-jam? fixes:
* player names over heads
* use floaters to show player numbers on floors
* wider hats/books at least in inventory
* dither instead of blur for menuUp()
* fix single entity force_kick pingponging
* battlezone: maybe kick to menu if skipped 3 times in a row
* aiHunt should prefer the previous position if it's a valid pathing option (so, side-stepping will never get around them)
* show an un-slotted, but available, quickbar slot as a different color, tooltip info, clicking opens inventory
* click to move - ensure stop when enter (active?) battlezone
* click to move - stop when threatened (or, always in battlezone?)
* W on map screen is selecting Exit button, not moving player
* Space on map screen after exit button selected is activating Wait, not closing the window
* change W icon to basic attack icon when engaged
* show actual item instead of chest graphic when there's a single item
* Nope: battlezone: don't count through attack-blocking doorways - makes "nearest player" weird (someone on the other side of the door and far away) and ticking rules weird

Credits
=======

* Art and Sound - The DungeonCrawlers.org Discord
