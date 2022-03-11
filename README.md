# DnDaisies
Discord bot for making a DnD map within a channel.

New this update:
  - Removed placeholder names:
    - map.js -> arena.js
    - DaisyMap -> Arena
	- DaisyChar -> Token
  - Large-scale reworking to focus on self-containment of .js files:
    - arena contains all of the actual functionality of token&arena building
	- main focuses on handling user input (discord in this case, but open to other wrapping)
	  ^ .map and .img now exist alongside arena (rather than as children) in main's default object - 'holder'
  - Most Token functionality has been moved to the new TokenGroup class:
    - identical tokens will be drawn identically, so it need only be loaded once
	- tokens still have individual dimensions for cases such as enlarge/reduce
  - Focused effort to remove awkwardness of commands:
    - redirection commands remove unnecessary keywords
	- optional parameters allow splitting commands into multiple lines for more readability
  - Guide function

Deprecated this update:
  - help.js
    ^ Something to this effect will be brought back later, but not in this form

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
  - Generate instruction list from arena so parse function can be utilised by users

Future plans:
  - (Channel/Guild?)-specific customisation of command prefix (Standard = --)
  - DM role with ability to prepare hidden content (private thread ?)

Stretch goals:
  - Add some basic 5e utility (dice rolls, stat tracking, etc.) so sessions can be run entirely from within the channel.

Scrapped plans:
  - Auto-crop background image
  - Auto-remove/colour-code backgrounds of character tokens
