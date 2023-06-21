# Changelog

## v3.3.0-Alpha
### Usable changes:
	- Added /guide {create, clear, list, toggle}
	- /guide create has six subcommands: box, ellipse, line, cone, sundail, spider
### Noticeable changes:
	- /arena destroy; save now defaults to false
### Hidden changes:
	- Collapsed all update...Layers() into updateLayerType(_layerType) for simpler extension
	- Simplified /flag update
### Bugfix:
	- /macro parse now works for SubcommandGroups

## v3.2.0-Alpha
### Usable changes:
	- Added /macro splitscreen
### Noticeable changes:
	- Minor format change to bot messages with attachments
### Hidden changes:
	- Added support for commands with subcommands
	- Call getOptions in index.js to reduce duplicate code
	- /macro is now correctly alphabetised
### Bugfix:
	- findOldThread no longer causes crash on /dev quit
	- /macro parse now fetches options for the commands it calls
	- /macro load now displays the loaded arena

## v3.1.0-Alpha
### Usable changes:
	- Added /macro roll
### Noticeable changes:
	- /macro nukethread no longer pollutes parent channel
### Hidden changes:
	- Altered .gitignore to ignore server-files
### Bugfix:
	- findOldThread now only searches current channel
	- findOldThread no longer causes crash if channel has no threads

## v3.0.0-Alpha
### Useable changes:
	- Now supports slash commands
	- Added macros to bulk delete messages
### Noticeable changes:
	- Added actual explanation text for many common errors
	- Added personality to most placeholder texts
### Hidden changes:
	- Redefined useful features of cmd-utils to remove unnecessary dependency
	- Collated many arena-defining files into one arena.js
### Bugfix:
	- N/A
### Deprecated:
	- v2 command syntax & explain system
	- Commands aliases
	- Custom token groups
	- Layers & Styles for Lights & Guides (temporary?)
	- Dice roller widget (temporary?)
