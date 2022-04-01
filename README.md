# DnDaisies

Overview:
Discord bot which utilises Canvas to make and display interactive maps for tabletop games.
While D&D 5E was the main focus of this project, many of the tools will be generically useful for TTGs.
Bot functions are command-like, with space-separated arguments and fixed prefix: --
Utilises a system of combining 'PaintStyles' to create a variety of tokens to display
Includes helptext for each command, PaintStyle, and key concept

Currently in Progress:
  - Map Layering (trunk): Allows for overlays (ie. light/dark or enemy reach)
    - Modular layers allows for update flags to hopefully increase performance
  - Advanced Tokens (TokenTracking): Track stats (ie. HP or initiative) of individual tokens

New this update:

Deprecated this update:

Currently supports (General):
  - Self-deleting messages (where appropriate & not cancelled by KEEP prefix)
  - Instruction lists (many commands in one message, separated by newline)

Currently supports (DnD):
  - Completely independent arenas across channels
  - Automatically displays map (where appropriate & not cancelled by no-map command):
    - multiple interlocking paint-styles to display different type of object (inc. images & painted grids)
	- geometric guide to envision spells / character movement before turn
	- thread for images to prevent clogging channels

Future plans:
  - (Channel/Guild?)-specific customisation of command prefix (Standard = --)
  - DM role with ability to prepare hidden content (private thread ?)
  - Undo command to revert last (major) command

Stretch goals:
  - Add some basic 5e utility (dice rolls, stat tracking, etc.) so sessions can be run entirely from within the channel.

Scrapped plans:
  - Auto-crop background image -- it would still need user input to be general, so just crop it manually?
  - Auto-remove/colour-code backgrounds of character tokens -- ditto
