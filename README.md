# DnDaisies

Overview:
Discord bot which utilises Canvas to make and display interactive maps for tabletop games.
While D&D 5E was the main focus of this project, many of the tools will be generically useful for TTGs.
Bot functions are command-like, with space-separated arguments and fixed prefix: --
Utilises a system of combining 'PaintStyles' to create a variety of tokens to display
Includes helptext for each command, PaintStyle, and key concept

Currently in Progress:
  - Advanced Tokens (TokenTracking): Track stats (ie. HP or initiative) of individual tokens

New this update:
  - Map Layering:
    - Multiple stacked layers that render individually and are then painted onto the same base
	- Added lights overlay
	- New commands: 'light' -> doNewLightGroup & 'editlight' -> doEditGroupLight to manipulate this overlay
	- Split token and name onto separate layer so name is not obscured by light
	- Names are now printed as the inverse of current pixels for improved contrast & thus readability
    - Hard-coded update flags to cut-down on unnecessary image loading
	- Reworked styles interface for better expandability
	- Added 'custom' -> doNewCustomGroup
	- Added support for token.visible tokens that are not drawn to the map (useful for lights)
	- Split token and guide onto separate layer so as to handle multiple simultaneous guides
	- Updated help.json & 'custom' -> doNewCustomGroup to reflect all of these changes
	- Reordered displayMap to reduce downtime where there is no map

Deprecated this update:

Currently supports (General):
  - Self-deleting messages (where appropriate & not cancelled by KEEP prefix)
  - Instruction lists (many commands in one message, separated by newline)
  - Update flags to cut down on needless redrawing

Currently supports (TTG):
  - Completely independent arenas across channels
  - Automatically displays map (where appropriate & not cancelled by no-map command):
    - multiple interlocking paint-styles to display different type of object
	- geometric guide to envision spells / character movement before turn
	- thread for images to prevent clogging channels
  - Layered maps, including layers for lighting and names (to increase readability)

Future plans:
  - Generalization tools so this can easily be re-wrapped for other TTGs and command systems
  - (Channel/Guild?)-specific customisation of command prefix (Standard = --)
  - DM role with ability to prepare hidden content (private thread ?)
  - Undo command to revert last (major) command

Stretch goals:
  - Add some basic 5e utility (dice rolls, stat tracking, etc.) so sessions can be run entirely from within the channel.

Scrapped plans:
  - Auto-crop background image -- it would still need user input to be general, so just crop it manually?
  - Auto-remove/colour-code backgrounds of character tokens -- ditto
