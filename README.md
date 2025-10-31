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

**Balance TODO**
* start with 2 equip slots?  makes more sense, but, more than 3 isn't useful currently?
  * relatedly, maybe just the loot drops is a better way to limit # of equipped things? I'm not getting L4s until I'm L4 anyway...
* more than 3 spell slots not currently useful - need other abilities, or should just cap at level 5 for jam game? just hand-craft 5 repeatable floors?
  * also, spells that cost more MP but you don't get MP quicker actually feel worse
* felt like I wasn't getting enough drops at L3, maybe increase the 50% by 10%/level?

TODO
* music - loop for ~3mins each?
* add scrollbar to inventory, remove limit? add sort button
* battlezone: option to skip (set other player as ready) if they have not taken an action in 10 seconds; maybe kick to menu if skipped 3 times in a row
* battlezone: tick even if in background
* battlezone: don't count through attack-blocking doorways (ignore 1-way doors for now)
* add critical hits/misses to combat system?
* damage floaters in 3D at a distance and/or giant particle effects whenever anyone gets hit
* animate/grow critters on attack / hit
* use floaters to show player numbers on floors
* test enforcing single entity
* remove floor names from minimap, only full map?
* death penalty: lose some inventory too? get kicked out of floor (maybe it gets reset?)
* fix two hits on the same frame not showing floaters well
* bug: visibility is different before/after turning camera/moving forward and back if directly facing a wall
  * relatedly: moving backwards through a door and I could see the enemy on the other side
  * relatedly: always show monster behind (and diagonals?)
* Deal with more than 4 players in battlezone list (scrollbar, dither, hide?)
* hide cheating commands like entset, stat
* dither instead of blur for menuUp()
* fix battle log messages, especially in OMP
* player names over heads
* wider hats/books at least in inventory
* spellbooks should be better colors
* hall of fame on main menu (just XP)
* disable inventory access when within 1 unobstructed tile of an enemy (new in-zone rules
* on town level show player levels instead of where waiting/checkmarks are (or, do for all nearby players?)
* golden hat reward for final level (if it shows on players)
* forward + left quickly when in battle zone doesn't do the turn
* make dude's books more clear
* choose player cloak color in customization (just 6 hard-coded?); maybe hat color based on equipped hat?
* fix 2 players or 1 player + 1 NPC on the same square to push in different directions

Bugs:
* simultaneously: B ready'd by moving into battle zone. A attacked and killed entity (didn't think B was in zone at start of attack, showed in-zone by the time attack action was ack'd). now both are not in a battle zone, B still flagged as ready.  both A and B tick (a different set of) the AI and try to un-flag B as being ready

Post-jam? fixes:
* aiHunt should prefer the previous position if it's a valid pathing option (so, side-stepping will never get around them)
* show an un-slotted, but available, quickbar slot as a different color, tooltip info, clicking opens inventory
* click to move - ensure stop when enter (active?) battlezone
* click to move - stop when threatened (or, always in battlezone?)
* W on map screen is selecting Exit button, not moving player
* Space on map screen after exit button selected is activating Wait, not closing the window
* change W icon to basic attack icon when engaged
* show actual item instead of chest graphic when there's a single item

Credits
=======

* Art and Sound - The DungeonCrawlers.org Discord
