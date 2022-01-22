function helpMain(prefix) {
	return `
For more information on a command, do '${prefix}help [command]'
Arguments shown with an asterisk are optional
**Commands:**
${prefix}ping = Check speed
${prefix}new = Create new map
${prefix}add = Add new character to current map
${prefix}addMany = Add many identical characters to current map
${prefix}addArea = Colour in any number of ranges as static objects
${prefix}hide = Hide a named character
${prefix}move = Move a named character to a new coordinate
${prefix}map = Generate and send map image
**Terms:**
'coordinate/coord' = [Letter][Number], ie. A1, Z7; NOT 7Z
'range/area' = [top-left coord]:[bottom-right coord], ie. B15:H19; NOT B19:H15
'CSV' = A comma-seperated list (NO spaces), ie. A1,B7,G8
**Notes:**
Only co-ordinates&ranges should be case sensitive; any such bugs should be reported
	`;
}
function helpDefault(prefix) {
	return `
Sorry, I can't do that.
For my command list, please use: ${prefix}help
	`;
}
function helpPing(prefix) {
	return `
Check current speed of application.
**No Aliases**
**No arguments**
	`;
}
function helpNew(prefix) {
	return `
Replace current map with empty map of given size; will fill with background if no areas are specified.
**Aliases:** ${prefix}new ${prefix}newmap
**Arguments:**
1* One co-ordinate representing the bottom-right corner pf the map (top-left = 'A1
2. CSV of co-ordinates or ranges to paint as the background
3. As 2 for static objects
4. As 2 for walls (removes background; can be faster depending on map layout
	`;
}
function helpHide(prefix) {
	return `
Hide or Reveal the given creature.
**Aliases:** ${prefix}hide ${prefix}reveal
**Arguments:**
1* Name of creature to hide/reveal
2. Number of creature to hide/reveal; leave blank [for all/if no number]
	`;
}
function helpAdd(prefix) {
	return `
Create single character in the given co-ordinate.
**Aliases:** ${prefix}add ${prefix}newtile
**Arguments:**
1* Team of character being added (party/enemy/neutral/object) - only actually need first letter
2* Name of character being added
3* Coordinate to place character when added
	`;
}
function helpAddMany(prefix) {
	return `
Create multiple identical creatures in the given co-ordinates.
**Aliases:** ${prefix}addmany ${prefix}newgroup ${prefix}newtiles
**Arguments:**
1* Team of creatures being added (party/enemy/neutral/object) - only actually need first letter
2* Name of creatures being added
3* CSV of coordinates (not ranges) to place them
	`;
}
function helpAddArea(prefix) {
	return `
Mark areas of the map as the given type of static objects.
**Aliases:** ${prefix}addarea ${prefix}newarea
**Arguments:**
1* Type of object to add (background/wall/object) - only actually need first letter
2* CSV or coordinates or ranges to add to
	`;
}
function helpMove(prefix) {
	return `
Move a creature to a new co-ordinate.
**No Aliases**
**Arguments:**
1* Name of creature to move
2* Coordinate to move it to
3. Number of creature; leave blank for no number
	`;
}
function helpMap(prefix) {
	return `
Display this channel's map (created with *prior** calls to the other functions).
**Aliases** ${prefix}map ${prefix}display
**No Arguments**
	`;
}

function helpSwitch(prefix, command) {
	if (command.length == 1) {return helpMain(prefix);}
	else {
		switch (command[1].toLowerCase(prefix)) {
			case "ping": return helpPing(prefix);
			case "newmap":
			case "new": return helpNew(prefix)
			case "reveal":
			case "hide": return helpHide(prefix);
			case "newtile":
			case "add": return helpAdd(prefix);
			case "newgroup":
			case "newtiles":
			case "addmany": return helpAddMany(prefix);
			case "newarea":
			case "addarea": return helpAddArea(prefix);
			case "move": return helpMove(prefix);
			case "display":
			case "map": return helpMap(prefix);

			default: return helpDefault(prefix);
		}
	}
}

export {
	helpSwitch
}
