# Changelog

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
