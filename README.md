# DnDaisies
Discord bot for making and displaying an interactive DnD map within a channel.

New this update:
  - Bugfixing:
  	- Removed need to specify token 0 when that's the only token in the group
	- Actually added swarm to command list
  - Functionality:
  	- New 'utils.js' file, for functions and objects that are generally useful across projects
	- Altered multimap to be a builder class as its only affect happens at object creation
	- Added treemap class, to reduce necessary checks within instruction lists
	- On-quit instruction lists are now by request
	- Resize tokens/groups
	- Hide/Remove multiple tokens by giving --hide/--remove a CSV of token indexes
	- Hide/Remove now has options (all true/all false/flip current); previous settings are default mode
	- Increased painting options:
	  - Cells can now be elliptical or rectangular as required
	  - Added Concentric PaintStyle (think flaming sphere)
  - Experimentation:
  	- More in-depth error handling (remove feedback from arena entirely?)

Deprecated this update:
  - Helper function 'applyFromBack' broke cone guide (?), and it was lazy to use anyway so it's gone now.

Currently supports (General):
  - Self-deleting messages where appropriate
  - Instruction lists (many commands in one message, separated by newline)

Currently supports (DnD):
  - Completely independent arenas across channels
  - Arena printing with:
    - multiple paint-styles to display different type of object (inc. images & painted grids)
	- geometric guide to envision spells / character movement before turn
	- thread for images to prevent clogging channels

Currently in progress:
  - Generate instruction list from arena so parse function can be utilised by users (still not perfect)

Future plans:
  - (Channel/Guild?)-specific customisation of command prefix (Standard = --)
  - DM role with ability to prepare hidden content (private thread ?)

Stretch goals:
  - Add some basic 5e utility (dice rolls, stat tracking, etc.) so sessions can be run entirely from within the channel.

Scrapped plans:
  - Auto-crop background image -- it would still need user input to be general, so just crop it manually?
  - Auto-remove/colour-code backgrounds of character tokens -- ditto
