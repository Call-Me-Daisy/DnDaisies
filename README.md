# DnDaisies

Overview:
Discord bot which utilises Canvas to make and display interactive maps for tabletop games.
While D&D 5E was the main focus of this project, many of the tools will be generically useful for TTGs.
Bot functions are command-like, with space-separated arguments and fixed prefix: --
Utilises a system of combining 'PaintStyles' to create a variety of tokens to display
Includes helptext for each command, PaintStyle, and key concept

New this update:
  - Bugfixing:
  	- Removed need to specify token 0 when that's the only token in the group - for real this time
  - Functionality:
  	- doMoveToken now accepts indexCSV to move multiple specific tokens
	- move/moveGroup commands will also resize token if given a range rather than a coord
	- resizeGroup now...
		- takes additional argument to specify position within existing tokens to use as origin for scaling
		- by default resizes group default size; will resize existing tokens only if ^^ is also supplied
	- auto-delete system extended to auto-display map with new displayMap function
		- map/display command is now just a wrapper to trigger this system
		- added nomap/hidden command as wrapper to prevent this system
	- added customGroup to give users access to full range of style combinations
  - Experimentation:

Deprecated this update:
  - doResizeToken (AAC) has been merged into doMoveToken
  - doMap refactored into new displayMap function (with some minor changes)

Currently supports (General):
  - Self-deleting messages where appropriate
  - Instruction lists (many commands in one message, separated by newline)

Currently supports (DnD):
  - Completely independent arenas across channels
  - Automatic (where appropriate) arena printing with:
    - multiple interlocking paint-styles to display different type of object (inc. images & painted grids)
	- geometric guide to envision spells / character movement before turn
	- thread for images to prevent clogging channels

Currently in progress:

Future plans:
  - (Channel/Guild?)-specific customisation of command prefix (Standard = --)
  - DM role with ability to prepare hidden content (private thread ?)
  - Undo command to revert last (major) command

Stretch goals:
  - Add some basic 5e utility (dice rolls, stat tracking, etc.) so sessions can be run entirely from within the channel.

Scrapped plans:
  - Auto-crop background image -- it would still need user input to be general, so just crop it manually?
  - Auto-remove/colour-code backgrounds of character tokens -- ditto
