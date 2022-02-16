# DnDaisies
Discord bot for making a DnD map within a channel.

Currently supports:
  General:
    - Help command to explain (hopefully?) everything else (Standard = --help)
    - Self-deleting messages where appropriate
    - Instruction lists (many commands in one message, separated by newline)
  DnD:
    - Completely independant maps across channels
    - Map printing with colour-coded ally/enemy tokens and pained background/object/walls

Currently in progress:
  - Optionally replace coloured tokens with character images
  - Optionally replace painted background/objects/walls with background image

Future plans:
  - (Channel/Guild?)-specific customisation of command prefix (Standard = --)
  - DM role with ability to prepare hidden content (private thread)
  - Hotswap functionality to quickly parse old instruction lists (would also need to generate instruction list from current map)
  - Auto-crop background image (research needed)
  - Auto-remove/colour-code backgrounds of character tokens (research needed)

Stretch goals:
  - Add some basic 5e utility (dice rolls, stat tracking, etc.) so sessions can be run entirely from within the channel.
