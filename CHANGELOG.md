# Changelog

## v2.0.0
### Major changes
  - Added much-needed error-catching and -prevention methods, so it doesn't crash all the time
  - Implemented extender.js to support extending the bot for other ttgs:
  	- Extensions can define any number of...
		parsers - objects which convert user inputs into a form the machine can understand
		layers - sections of the map specialised to display some particular aspect(s)
  	- Extensions can register any number of...
		COMMANDS - functions called directly by the user; names of these functions must be **entirely** lowercase
		CONSOLES - specialised function automatically called by a core function for some known task
		STYLES - ways tokens/guides/etc can be displayed upon the map
	- Extensions should register **one** builder function for their Arena under CONSOLES.arena
	- Extensions should register **one** function to add group(s) to their Arena under CONSOLES.newGroup
	- Significantly improved versatility of flags in parseMessage
	- Added wider support for macros like parse and (now) quit
	- Holders are automatically reclaimed when a guild is left/deleted
### Minor changes
  - Holder has become a class to reduce repeated code
  - Rotated coordinate system
  - Pushed more of the actual computation to Arena.js for better extensibility
  - Added (arena-dependant) command to resize current arena
  - map-layer.js refactored to arena-layer.js
  - styles from styles.js have been split between the core and dnd extensions
### Deprecated (Y/N/? => will be re-implemented)
  - ?: guide.spider
  - Y: Help/explain system & commands
  - Y: Command feedback
### Bugfix
  - N/A

## v1.0.2
### Major changes
  - None
### Minor changes
  - A display error will now stop the instruction list and previous map from being deleted (so you don't need to retype the whole thing for one tiny change)
  - Note, however, that the instruction list has been applied to the arena - it just won't display the new arena until it is valid.
### Deprecated
  - None
### Bugfix
  - None

## v1.0.1
### Major changes
  - Added catch on call to arena.buildMap so that incorrect arena dimensions are not fatal.
### Minor changes
  - None
### Deprecated
  - displayMap. Code has been inserted into parseContent to better facilitate changes to _flags on display error
### Bugfix
  - None

## v1.0.0
### Major changes
  - Release! Woo!
  - Integration for server hosting.
  - Added clean flag (and command) for when a channel is done with the current arena.
  - Arenas that have not been used for a long time will be cleaned automatically.
  - Instruction lists generated on --quit are cached on server instead of being sent as a message.
  - Cached instruction lists are automatically parsed when the bot logs in.
  - Image thread overhaul:
    - Thread is no longer deleted on --quit
	- Threads can now be given to --image either as a reply or as a channelID
	- Threads given to --image will now be adopted instead of replicated
	- Slight rewrite of prompt
### Minor changes
  - Admin commands are only available to admins.
  - Ping is no longer an admin command.
### Deprecated
  - None
### Bugfix
  - Added missing space after styles in makeInstructions.
