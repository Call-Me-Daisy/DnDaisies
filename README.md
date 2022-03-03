# DnDaisies
Discord bot for making a DnD map within a channel.

New this update:
  - Parse function to use on previous instruction lists without deleting them
  - Optionally replace coloured tokens with character images
  - Optionally replace painted background/objects/walls with (user-cropped) background image

Currently supports (General):
  - Help command to explain (hopefully?) everything else (Standard = --help)
  - Self-deleting messages where appropriate
  - Instruction lists (many commands in one message, separated by newline)

Currently supports (DnD):
  - Completely independent maps across channels
  - Map printing with colour-coded ally/enemy tokens and pained background/object/walls

Currently in progress:

Future plans:
  - (Channel/Guild?)-specific customisation of command prefix (Standard = --)
  - DM role with ability to prepare hidden content (private thread)
  - Generate instruction list from map so parse function has a point for users
  - Auto-crop background image (research needed)
  - Auto-remove/colour-code backgrounds of character tokens (research needed)

Stretch goals:
  - Add some basic 5e utility (dice rolls, stat tracking, etc.) so sessions can be run entirely from within the channel.
