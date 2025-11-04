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

Bugs:
* visibility is different before/after turning camera/moving forward and back if directly facing a wall
  * relatedly: moving backwards through a door and I could see the enemy on the other side
  * relatedly: always show monster behind (and diagonals? and when bumping a blocked door?)
* simultaneously: B ready'd by moving into battle zone. A attacked and killed entity (didn't think B was in zone at start of attack, showed in-zone by the time attack action was ack'd). now both are not in a battle zone, B still flagged as ready.  both A and B tick (a different set of) the AI and try to un-flag B as being ready

Post-jam? fixes:

* clicking mid-screen to unfocus chat should not trigger movement
* clicking on viewport to move into tower and releasing activates button
* player names over heads
* fix single entity force_kick pingponging
* battlezone: maybe kick to menu if skipped 3 times in a row
* aiHunt should prefer the previous position if it's a valid pathing option (so, side-stepping will never get around them)
* click to move - ensure stop when enter (active?) battlezone
* click to move - stop when threatened (or, always in battlezone?)
* change W icon to basic attack icon when engaged
* show actual item instead of chest graphic when there's a single item
* Nope: battlezone: don't count through attack-blocking doorways - makes "nearest player" weird (someone on the other side of the door and far away) and ticking rules weird

Credits
=======

* Art and Sound - The DungeonCrawlers.org Discord
