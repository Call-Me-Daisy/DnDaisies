function helpMain(prefix) {
	return `
For more information on a command, do '${prefix}help [command]'
Arguments shown with an asterisk are optional
**Commands:**
${prefix}ping = Check speed
${prefix}list = Display the computer name of each token on the map
${prefix}new = Create new map
${prefix}add = Add new token to current map
${prefix}addMany = Add many identical tokens to current map
${prefix}addArea = Colour in any number of ranges as static objects
${prefix}hide = Hide a particular token
${prefix}move = Move a particular token to a new coordinate
${prefix}map = Generate and send map image
**Terms:**
'coordinate/coord' = [Letter][Number], ie. A1, Z7; NOT 7Z
'range/area' = [top-left coord]:[bottom-right coord], ie. B15:H19; NOT B19:H15
'CSV' = A comma-seperated list (NO spaces), ie. A1,B7,G8
**Notes:**
Only co-ordinates&ranges should be case sensitive; please report a bug if this is not the case.
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
function helpList(prefix) {
	return `
List the reference name of each token.
**Aliases:** ${prefix}list ${prefix}tokens
**Arguments:**
1. Which team to list (empty => all teams)
	`;
}
function helpNew(prefix) {
	return `
Replace current map with empty map of given size
**Aliases:** ${prefix}new ${prefix}newmap
**Arguments:**
1* One co-ordinate representing the bottom-right corner of the map (top-left = 'A1')
2. CSV of co-ordinates or ranges to paint as the background (empty => entire map)
3. As 2 for static objects (empty => none)
4. As 2 for walls (overrides background; empty => none)
	`;
}
function helpHide(prefix) {
	return `
Hide or Reveal the given token.
**Aliases:** ${prefix}hide ${prefix}reveal
**Arguments:**
1* Name & Number of token to hide/reveal (ie. Jeff, Zombie_4)
	`;
}
function helpAdd(prefix) {
	return `
Create single token in the given co-ordinate.
**Aliases:** ${prefix}add ${prefix}newtile
**Arguments:**
1* Team of token being added (party/enemy/neutral/object) - only actually need first letter
2* Name (without number!) of token being added
3* Coordinate to place token when added
	`;
}
function helpCopy(prefix) {
	return `
Add copies of the given token in the given co-ordinates.
**Aliases:** ${prefix}copy ${prefix}duplicate ${prefix}reinforce
**Arguments:**
1* Name (without number!) of the token being copied
2* CSV of co-ordinates in which to create copies
	`;
}
function helpRemove(prefix) {
	return `
Completely remove a token from the map.
**Aliases:** ${prefix}remove ${prefix}delete ${prefix}kill
**Arguments:**
1* Name & Number of token being removed (ie. Jeff, Zombie_4, Iron-Golem_2)
	`;
}
function helpAddGroup(prefix) {
	return `
Create multiple identical tokens in the given co-ordinates.
**Aliases:** ${prefix}addmany ${prefix}newgroup ${prefix}newtiles
**Arguments:**
1* Team of tokens being added (party/enemy/neutral/object) - only actually need first letter
2* Name (without number!) of tokens being added
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
Move a token to a new co-ordinate.
**No Aliases:** ${prefix}move ${prefix}movetoken
**Arguments:**
1* Name & Number of token to move (ie. Jeff, Zombie_4)
2* Coordinate to move it to
	`;
}
function helpMoveGroup(prefix) {
	return `
Move multiple tokens in a group to new co-ordinates
**Aliases:** ${prefix}movegroup ${prefix}movetokens
**Arguments:**
1* Name (without number!) of tokens to move
2* ORDERED CSV of Coordinates to move them to (first creature -> first co-ord, etc.)
	`;
}
function helpMap(prefix) {
	return `
Display this channel's map (created with *prior* calls to the other functions).
**Aliases** ${prefix}map ${prefix}display
**No Arguments**
	`;
}

function helpSwitch(prefix, command) {
	if (command.length == 1) {return helpMain(prefix);}
	switch (command[1].toLowerCase(prefix)) {
		case "ping": return helpPing(prefix);
		case "tokens":
		case "list": return helpList(prefix);
		case "newmap":
		case "new": return helpNew(prefix);
		case "reveal":
		case "hide": return helpHide(prefix);
		case "newtoken":
		case "add": return helpAdd(prefix);
		case "reinforce":
		case "duplicate":
		case "copy": return helpCopy(prefix);
		case "kill":
		case "delete":
		case "remove": return helpRemove(prefix);
		case "newgroup":
		case "addmany":
		case "addgroup": return helpAddGroup(prefix);
		case "newarea":
		case "addarea": return helpAddArea(prefix);
		case "movetoken":
		case "move": return helpMove(prefix);
		case "movetokens":
		case "movegroup": return helpMoveGroup(prefix);
		case "display":
		case "map": return helpMap(prefix);

		default: return helpDefault(prefix);
	}
}

export {
	helpSwitch
}
