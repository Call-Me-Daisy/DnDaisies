# DnDaisies

## Overview:
  - Discord bot which utilises Canvas to make and display interactive maps for tabletop games.
  - Focused on 5e D&D, but is extensible for any TTG.
  - Bot functions are command-like, with space-separated arguments and fixed prefix (--).
  - Contains multiple in-built display styles which can be combined to create a variety of tokens.

## General Features
  - Help system to explain each concept, command, and style involved in operating the bot (!DEPRECATED!)
  - Can parse multiple (newline-separated) commands in one message.
  - Instances are completely independent across different channels.
  - Automatically deletes most commands (unless cancelled) and bot messages.

## Map Features
  - Supports other TTGs through an automatic extension system (ie. extensions/dnd.js). 
  - Multiple interlocking layers, including light mask, high-contrast names, and geometric guide.
  - Tokens can be colour-coded or display images (contained in dedicated thread to prevent clogging channel proper).
  - Automatically rebuilds and displays the map (unless cancelled) whenever it changes.

## Future Features
  - Track token stats.
  - Dice rolling widgets.
  - Ability for DM to prepare hidden content.
  - Undo command to revert last (major) command.

## Links
  - GitHub repo: https://github.com/TDCalverley99/DnDaisies
  - My Discord Server: Under construction.
