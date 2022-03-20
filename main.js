require("dotenv").config();

const {Client, Intents, MessageAttachment, ThreadChannel} = require("discord.js");
const {createCanvas, loadImage} = require("canvas");
const fs = require("fs");

const {Arena, PaintStyle, GuideStyle} = require("./arena");
const {MultiMap, TreeMap} = require("./utils");

//--------------------------------------------------------------------GLOBALS
const bot = new Client({intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
]});

const allMaps = new Map();

const HELPTIMER = 10000;
const PREFIX = "--";

const SHORTCUTS = new Map([
	["p", "party"],
	["a", "allies"],
	["e", "enemies"],
	["n", "neutrals"],
	["o", "objects"],
	["b", "background"],
	["w", "walls"],
	["d", "default"]
]);
const COLOURS = new Map([
	["party", "#3f3"],
	["allies", "#38f"],
	["enemies", "#f33"],
	["neutrals", "#640"],
	["objects", "#848b94"],
	["background", "#a38b53"],
	["walls", "#000"],
	["default", "#777"]
]);
Object.freeze(SHORTCUTS);
Object.freeze(COLOURS);
//--------------------------------------------------------------------HELP
//------------------------------------DISCORD
async function deleteFromDiscord(_obj) {
	(await _obj).delete().catch((e) => {});
}
function makeTemp(_msg, _duration = HELPTIMER) {
	_msg.then((msg) => {
		setTimeout(() => {deleteFromDiscord(msg);}, _duration);
	});
}

function fetchChannel(_idC) {
	return bot.channels.cache.get(_idC);
}
function fetchMessage(_idC, _idM) {
	return fetchChannel(_idC).messages.fetch(_idM);
}
function fetchReference(_msg) {
	return (_msg.reference === null) ? false : fetchMessage(_msg.reference.channelId, _msg.reference.messageId);
}

function sendTo(_links, _content) {
	return _links.c.send(_content);
}
function sendTemp(_links, _content, _duration = HELPTIMER) {
	makeTemp(sendTo(_links, _content), _duration);
}

function buildLinks(_msg) {
	let inThread = (_msg.channel instanceof ThreadChannel);
	return {
		g: _msg.guild,
		c: (inThread) ? fetchChannel(_msg.channel.parentId) : _msg.channel,
		t: (inThread) ? _msg.channel : false,
		m: _msg
	};
}

function cleanMap(_holder) {
	if (_holder.map) {
		deleteFromDiscord(_holder.map);
		_holder.map = false;
	}
}
function cleanImg(_holder) {
	if (_holder.img) {
		deleteFromDiscord(fetchMessage(_holder.img.parentId, _holder.img.id));
		deleteFromDiscord(_holder.img);
		_holder.img = false;
	}
}
//------------------------------------WRAPPERS
function newHolder(_links) {
	allMaps.set(_links.c.id, {arena: false, map: false, img: false});
}
function fetchHolder(_links) {
	return allMaps.get(_links.c.id);
}
function ensureHolder(_links) {
	if (fetchHolder(_links) === undefined) {newHolder(_links);}
	return fetchHolder(_links);
}

function requireGroup(_links, _nameRaw) {
	return fetchHolder(_links).arena.requireGroup(Case.capital(_nameRaw));
}

function getTokens(_arena, _command, _start, _need = 1) {
	let out = [];
	for (let i=_start; i<_command.length && out.length<_need; i++) {
		let group = _arena.getGroup(Case.capital(_command[i]));
		if (group !== undefined) {out.push(group.tokens[(group.tokens.length > 1) ? _command[++i] : 0]);}
	}
	return (_need > 1) ? out : out[0];
}
//------------------------------------MODES
function tokenSwitch(_str, _default = "!") {
	switch ((_str === undefined) ? _default : _str[0].toLowerCase()) {
		case "t": return function(_current){return true;}
		case "f": return function(_current){return false;}
		case "!": return function(_current){return !_current;}
	}
}
//------------------------------------PARSING
class Coord {
	static parse(_coord) {//l#{-#}/#-#{-#}
		let out = [];
		for (const str of _coord.split("-")) {
			let charCode = str.charCodeAt(0);
			(charCode > 64) ?
			out.push(...[charCode - ((charCode > 96) ? 70 : 64), parseInt(str.slice(1), 10)])
			: out.push(parseInt(str, 10));
		}
		return [out[1], out[0], (out.length > 2) ? out[2] : false];
	}
	static unparse(_coord) {//[x,y,z]
		return [_coord[1], _coord[0]].concat((_coord[2] && _coord[2] !== 0) ? [_coord[2]] : []).join("-");
	}

	static parseLs(_coords) {
		let out = [];
		for (const coord of _coords) {
			out.push(Coord.parse(coord));
		}
		return out;
	}
	static parseCSV(_coords) {
		return Coord.parseLs(_coords.split(","));
	}

	static acceptToken(_arena, _command, _start, _need = 1) {
		let out = [];
		for (let i=_start; i<_command.length && out.length<_need; i++) {
			let group = _arena.getGroup(Case.capital(_command[i]));
			out.push((group !== undefined) ?
			group.tokens[(group.tokens.length > 1) ? parseInt(_command[++i], 10) : 0].getCenter()
			: Coord.parse(_command[i]));
		}
		return (_need > 1) ? out : out[0];
	}
}
class Range {
	static parse(_range) {
		let corners = Coord.parseLs(_range.split(":"));
		let out = [corners[0]];
		if (corners.length < 2) {out.push(false);}
		else {
			out.push([]);
			for (const i of [0, 1]) {out[1].push(corners[1][i] - corners[0][i] + 1);}
		}
		return out;
	}
	static unparse(_range) {
		return [
			Coord.unparse(_range[0]),
			Coord.unparse([_range[0][0] + _range[1][0] - 1, _range[0][1] + _range[1][1] - 1])
		].join(":");
	}

	static parseLs(_ranges) {
		let out = [];
		for (let range of _ranges) {
			out.push(Range.parse(range));
		}
		return out;
	}
	static parseCSV(_ranges) {
		return Range.parseLs(_ranges.split(","));
	}
}

class Colour {
	static parseNum(_rgba) {
		let rgba = ["#"];
		for (const int in _rgba) {
			let str = int.toString(16);
			rgba.push((str.length > 1) ? str : "0" + str);
		}
		return rgba.join("");
	}
	static parseStr(_str) {
		let out = (_str.startsWith("#")) ? _str : COLOURS.get(SHORTCUTS.get(_str[0].toLowerCase()));
		return (out === undefined) ? Colour.DEFAULT : out;
	}
	static parse(_colour) {
		return (_colour instanceof Array) ? Colour.parseNum(_colour) : Colour.parseStr(_colour);
	}
}
class Case {
	static capital(_str) {
		return _str[0].toUpperCase() + _str.slice(1).toLowerCase();
	}
}
class Inds {
	static parse(_group, _inds) {
		if (_inds === undefined) {
			if (group.tokens.length === 1) {return [0];}
			throw "This group has multiple tokens; either specify indexes or use group function for all.";
		}
		let out = [];
		for (const str of _inds.split(",")) {out.push(parseInt(str, 10));}
		return out;
	}
}
//--------------------------------------------------------------------DECLUTTERING
//------------------------------------WRAPPED
function doRectGuide(_arena, _command) {//doGuide>RED (2).. [range => {origin, dim}]
	let range = Range.parse(_command[2]);
	_arena.setGuide(GuideStyle.RECT, {origin: range[0], dim: range[1]});
}
function doLineGuide(_arena, _command) {//doGuide>RED (2).. [token/coord => origin] [token/coord => pos]
	let coords = Coord.acceptToken(_arena, _command, 2, 2);
	_arena.setGuide(GuideStyle.LINE, {origin: coords[0], pos: coords[1]});
}
function doEllipseGuide(_arena, _command) {//doGuide>RED (2).. [token/coord => origin] [int/coord => radii]
	_arena.setGuide(GuideStyle.ELLIPSE, {
		origin: Coord.acceptToken(_arena, _command, 2),
		radii: (function(_str){
			let out = parseInt(_str, 10);
			return (isNaN(out)) ? Coord.parse(_str) : [out];
		})(_command[_command.length - 1])
	});
}
function doSundailGuide(_arena, _command) {//doGuide>RED (2).. [token/coord => origin] (v => pos/radii)
	let coords = Coord.acceptToken(_arena, _command, 2, 2);
	_arena.setGuide(GuideStyle.SUNDAIL, {
		origin: coords[0],
		pos: coords[1],
		radii: [parseInt(_command[_command.length - 1], 10)]
	});
}
function doConeGuide(_arena, _command) {//doGuide>RED (2).. [token/coord => origin] [radii] [theta]
	_arena.setGuide(GuideStyle.CONE, {
		origin: Coord.acceptToken(_arena, _command, 2),
		radii: (function(_str){
			let out = parseInt(_str, 10);
			return (isNaN(out)) ? Coord.parse(_str) : [out];
		})(_command[_command.length - 2]),
		theta: parseInt(_command[_command.length - 1], 10) * Math.PI/180
	});
}
function doSpiderGuide(_arena, _command) {//doGuide>RED (2).. [token/coord => origin] [group/posCSV => posLs]
	let posLs = function(_group){
		if (_group === undefined) {return false;}
		let out = [];
		for (const token of _group.tokens) {
			if (token.visible && !token.removed) {out.push([token.x, token.y, token.z]);}
		}
		return out;
	}(_arena.getGroup(Case.capital(_command[_command.length-1])));
	_arena.setGuide(GuideStyle.SPIDER, {
		origin: Coord.acceptToken(_arena, _command, 2),
		posLs: (posLs) ? posLs : Coord.parseCSV(_command[_command.length - 1])
	})
}

function doNewGroup(_links, _command, _styleCodes, _layer) {//(v) [colour] [name] {rangeCSV} {visible}
	try {
		let arena = fetchHolder(_links).arena;
		let name = Case.capital(_command[2]);
		let rangeLs = (_command[3] === undefined) ? false : Range.parseCSV(_command[3]);
		arena.newGroup(
			_styleCodes,
			_layer,
			name,
			Colour.parse(_command[1]),
			(rangeLs && rangeLs[0][1]) ? rangeLs[0][1] : [1,1]
		);
		if (rangeLs) {
			arena.addToGroup(name, rangeLs, (_command[5] === undefined || _command[5][0].toLowerCase() !== "f"));
		}
	} catch (e) { doFeedback(_links, _command, e); }
}

function doFeedback(_links, _command, e) {
	sendTemp(_links, `Operation cancelled due to error: ${_command[0]}`);
}

function makeInstructions(_links, _holder) {
	let instructions = [];
	if (_holder.arena) {
		instructions.push(`${PREFIX}new ${Coord.unparse(_holder.arena.dim)}`)
		for (const [name, group] of _holder.arena.groups) {
			if (group.tokens.length > 0 && name !== "Background") {
				let groupType = function(_code) {
					switch (_code) {
						case PaintStyle.GRID: return "static";
						case -PaintStyle.GRID: return "effect";
						case PaintStyle.IMAGE: return "object";
						case -PaintStyle.IMAGE: return "creature";
						case -PaintStyle.SWARM: return "swarm";

						default: return "newgroup";
					}
				}(group.styleCode);
				let csv = [];
				for (const token of group.tokens) {
					csv.push(`${Range.unparse([[token.x, token.y, token.z], [token.h, token.v]])}`);
				}
				instructions.push(`${PREFIX}${groupType} ${group.colour} ${name} ${csv.join(",")}`);
			}
		}
		instructions.push(`${PREFIX}map`);
	}
	sendTo(_links, instructions.join("\n"));
}
//------------------------------------ADMIN
function doQuit(_links, _command) {//quit
	for (const [id, holder] of allMaps) {
		if (_command[1] && _command[1][0].toLowerCase() !== "f") {makeInstructions(_links, holder);}

		cleanMap(holder);
		cleanImg(holder);
	}
	setTimeout(function() {bot.destroy();}, HELPTIMER*1.5);
}
function doPing(_links, _command) {//ping
	sendTo(_links, `pong: ${Date.now()-_links.m.createdTimestamp} ms`);
}
function doLog(_links, _command) {//log [link code]/(->msg_to_log)--log
	let ref = fetchReference(_links.m);
	if (ref) {
		ref.then((msg) => {console.log(msg);});
	}
	else if (_command.length > 1) {
		switch (_command[1][0].toLowerCase()) {
			case "m": console.log(_links.m); break;
			case "c": console.log(_links.c); break;
			case "g": console.log(_links.g); break;
			case "t": console.log(_links.t); break;
		}
	}
}
//------------------------------------USER
//------------GENERAL
const helpHelper = (function(_json){
	for (const key in _json) {
		if (_json.hasOwnProperty(key)) {
			let el = _json[key];
			el.aliases = [];
			switch (el.type) {
				case "category": _json.categories.msg.push(Case.capital(key)); break;
				case "keyword": _json.keywords.msg.push(Case.capital(key)); break;
				case "command": _json.commands.msg.push(Case.capital(key)); break;
				case "group": _json.groups.msg.push(Case.capital(key)); break;
				case "guide": _json.guides.msg.push(Case.capital(key)); break;
				case "alias":
					el.aliases.push(el.msg);
					for (const alias of _json[el.msg].aliases) {
						el.aliases.push(alias);
						_json[alias].aliases.push(key);
					}
					_json[el.msg].aliases.push(key);
					el.msg = _json[el.msg].msg;
					break;
			}
		}
	}
	for (const key in _json) {
		if (_json.hasOwnProperty(key)) {
			let el = _json[key];
			let front = [`__**${Case.capital(key)}**__`];
			if (el.aliases && el.aliases.length > 0) {front.push(`__Aliases__: ${el.aliases.join(", ")}`);}
			el.msg = front.concat(el.msg).join("\n");
		}
	}
	return _json;
})(JSON.parse(fs.readFileSync("./help.json")));
function doHelp(_links, _command) {//help ()/[command]
	sendTemp(_links, helpHelper[(_command.length > 1) ? _command[1].toLowerCase() : "categories"].msg);
}
async function doImage(_links, _command) {//image ()/(->msg_with_thread)--image
	try {
		let holder = ensureHolder(_links);
		if (!holder.img) {
			if (_links.t) {holder.img = _links.t;}
			else {
				holder.img = await sendTo(_links, process.env.THREADPROMPT).then((_prompt) => {
					return _prompt.startThread({name: process.env.THREADNAME, autoArchiveDuration: 60});
				});

				if (_links.m.reference !== null) {
					let anchor = await fetchReference(_links.m);
					if (!anchor.hasThread) {return;}
					fetchChannel(anchor.id).messages.fetch({limit:100}).then((_messages) => {
						for (const [key, msg] of _messages) {
							if (msg.attachments.size > 0) {
								(holder.img).send({
									content: msg.content,
									files: [msg.attachments.entries().next().value[1]]
								});
							}
						}
					});
				}
			}
		}
		else if (_links.t && _links.t.id === holder.img.id) {
			cleanImg(holder);
		}
		else {
			holder.img.setArchived(false);
			makeTemp(fetchMessage(_links.c.id, holder.img.id).then((_prompt) => {prompt.reply("bump");}));
		}
	} catch (e) { doFeedback(_links, _command, e); }
}
async function doMap(_links, _command) {//map
	try {
		let holder = fetchHolder(_links);
		cleanMap(holder);

		let imgUrls = async function(){
			if (!holder.img) {return false;}
			let out = new Map();
			for (const [key, msg] of await holder.img.messages.fetch({limit:100})) {
				if (msg.attachments.size > 0) {
					out.set(Case.capital(msg.content), msg.attachments.entries().next().value[1].url);
				}
			}
			return out;
		}();

		holder.map = await sendTo(_links, {
			files: [new MessageAttachment(await holder.arena.buildMap(await imgUrls), _links.c.id + "_map.png")]
		})
	} catch (e) { doFeedback(_links, _command, e); }
}
//------------ARENA
function doNewArena(_links, _command) {//new [coord: bottom-right]
	try {
		ensureHolder(_links).arena = new Arena(Coord.parse(_command[1]).slice(0,2), sendTemp, _links);
	} catch (e) { doFeedback(_links, _command, e); }
}

const guideHelper = MultiMap.newMap([
	[["rect", "box", "square"], doRectGuide],
	[["line", "crow"], doLineGuide],
	[["ellipse", "circle"], doEllipseGuide],
	[["sundail", "distance"], doSundailGuide],
	[["cone", "tri"], doConeGuide],
	[["spider", "multiline"], doSpiderGuide]
]);
function doGuide(_links, _command) {//guide ()/[shapeStr] {shapeArgs}
	try {
		let arena = fetchHolder(_links).arena;
		if (_command.length > 1) {
			guideHelper.get(_command[1].toLowerCase())(arena, _command);
		}
		arena.displayGuide();
		doMap(_links, _command);
	} catch (e) { doFeedback(_links, _command, e); }
}
function doList(_links, _command) {//list
	try {
		let msgMap = new Map();
		for (const [key, teamName] of SHORTCUTS) {
			msgMap.set(COLOURS.get(teamName), [`__Team: ${teamName} (${COLOURS.get(teamName)})__`]);
		}
		for (const [name, group] of fetchHolder(_links).arena.groups) {
			if (msgMap.get(group.colour) === undefined) {
				msgMap.set(group.colour, [`__Team: ${group.colour} (No affiliation)__`]);
			}
			msgMap.get(group.colour).push(`Token: ${group.code} => Name: ${name}`);
		}
		let msg = [];
		if (_command.length == 1) {
			for (const [team, ls] of msgMap) {
				if (ls.length > 1) {msg.push(ls.join("\n"));}
			}
		}
		else {msg.push(msgMap.get(COLOURS.get(SHORTCUTS.get(command[1][0].toLowerCase())).join("\n")));}
		sendTemp(_links, msg.join("\n\n"));
	} catch (e) { doFeedback(_links, _command, e); }
}
function doDistance(_links, _command) {//distance ([coord]/[name] {i}) ([coord]/[name] {i})
	try {
		let arena = fetchHolder(_links).arena;
		let coords = Coord.acceptToken(arena, _command, 1, 2);
		let out = 0;
		for (let j = 0; j<3; j++) {
			out += (((coords[1][j]) ? coords[1][j] : 0) - ((coords[0][j]) ? coords[0][j] : 0))**2;
		}
		sendTemp(_links, Math.sqrt(out).toString());
	} catch (e) { doFeedback(_links, _command, e); }
}
function doInstructions(_links, _command) {//instructions
	try {
		makeInstructions(_links, fetchHolder(_links));
	} catch (e) { doFeedback(_links, _command, e); }
}
//------------GROUP
function doNewStaticGroup(_links, _command) {//RED> doNewGroup
	doNewGroup(_links, _command, {main: PaintStyle.GRID, cell: PaintStyle.RECT}, 1);
}
function doNewObjectGroup(_links, _command) {//RED> doNewGroup
	doNewGroup(_links, _command, {main: PaintStyle.IMAGE, cell: PaintStyle.RECT}, 2);
}
function doNewAreaGroup(_links, _command) {//RED> doNewGroup
	doNewGroup(_links, _command, {main: -PaintStyle.GRID, cell: PaintStyle.RECT}, 3);
}
function doNewConcentricGroup(_links, _command) {//RED> doNewGroup
	doNewGroup(_links, _command, {main: -PaintStyle.CONCENTRIC, cell: PaintStyle.ELLIPSE}, 3);
}
function doNewSwarmGroup(_links, _command) {//RED> doNewGroup
	doNewGroup(_links, _command, {main: -PaintStyle.SWARM, cell: PaintStyle.ELLIPSE}, 3);
}
function doNewCreatureGroup(_links, _command) {//RED> doNewGroup
	doNewGroup(_links, _command, {main: -PaintStyle.IMAGE, cell: PaintStyle.ELLIPSE}, -1);
}

function doMoveGroup(_links, _command) {//movegroup [name] [coordCSV] {visible}
	try {
		const tokens = requireGroup(_links, _command[1]).tokens;
		let numRemoved = 0;
		let setVisible = function(_boolStr) {
			if (_boolStr !== undefined) {
				if (_boolStr[0].toLowerCase() === "t") {return true;}
				if (_boolStr[0].toLowerCase() === "f") {return false;}
			}
			return undefined;
		}(_command[3]);
		for (const [i, coord] of Coord.parseCSV(_command[2]).entries()) {
			while (i+numRemoved < tokens.length && tokens[i+numRemoved].removed) {numRemoved++;}
			if (i + numRemoved >= tokens.length) {return;}
			tokens[i+numRemoved].setPos(coord);
			if (setVisible !== undefined) {tokens[i+numRemoved].visible = setVisible;}
		}
	} catch (e) { doFeedback(_links, _command, e); }
}
function doHideGroup(_links, _command) {//hidegroup [name] {mode}
	try {
		let mode = tokenSwitch(_command[2], "!");
		for (const token of requireGroup(_links, _command[1]).tokens) {token.visible = mode(token.visible);}
	} catch (e) { doFeedback(_links, _command, e); }
}
function doRemoveGroup(_links, _command) {//removegroup [name]
	try {
		fetchHolder(_links).arena.removeGroup(Case.capital(_command[1]));
	} catch (e) { doFeedback(_links, _command, e); }
}
function doResizeGroup(_links, _command) {//resizegroup [name] [dims] {andDefault}
	try {
		let group = requireGroup(_links, _command[1]);
		let dim = Coord.parse(_command[2]);
		for (const token of group.tokens) {token.setDim(dim);}
		if (_command[3] === undefined || _command[3][0].toLowerCase() !== "f") {group.dim = dim;}
	} catch (e) { doFeedback(_links, _command, e); }
}
//------------TOKEN
function doNewToken(_links, _command) {//copy [name] [rangeCSV] {visible}
	try {
		fetchHolder(_links).arena.addToGroup(
			Case.capital(_command[1]),
			Range.parseCSV(_command[2]),
			(_command[3] === undefined || _command[3][0].toLowerCase() !== "f")
		);
	} catch (e) { doFeedback(_links, _command, e); }
}
function doMoveToken(_links, _command) {//move [name] {i} [coord] {visible}
	try {
		let token = getTokens(fetchHolder(_links).arena, _command, 1);
		if (token) {
			try {
				let coord = Coord.parse(_command[_command.length - 1]);
				if (coord[0] === undefined) {throw "";}
				token.setPos(coord);
			} catch {
				token.setPos(Coord.parse(_command[_command.length - 2]));
				token.visible = (function(_char){
					switch (_char) {
						case "t": return true;
						case "f": return false;
						case "!": return !token.visible;

						default: return token.visible;
					}
				})(_command[_command.length - 1][0].toLowerCase());
			}
		}
	} catch (e) { doFeedback(_links, _command, e); }
}
function doHideToken(_links, _command) {//hide [name] {iCSV} {mode}
	try {
		let group = requireGroup(_links, _command[1]);
		let mode = tokenSwitch(_command[3], "!");
		for (const i of Inds.parse(group, _command[2])) {group.tokens[i].visible = mode(group.tokens[i].visible);}
	} catch (e) { doFeedback(_links, _command, e); }
}
function doRemoveToken(_links, _command) {//remove [name] {iCSV} {mode} {andGroup}
	try {
		let group = requireGroup(_links, _command[1]);
		let mode = tokenSwitch(_command[3], "t");
		for (const i of Inds.parse(group, _command[2])) {group.tokens[i].removed = mode(group.tokens[i].removed);}

		if (_command[4] && _command[4][0].toLowerCase() === "t" && group.isEmpty()) {
			doRemoveGroup(_command[1]);
		}
	} catch (e) { doFeedback(_links, _command, e); }
}
function doResizeToken(_links, _command) {//resize [name] {iCSV} [dims]
	try {
		let group = requireGroup(_links, _command[1]);
		let inds = Inds.parse(group, _command[2]);
		let dims = Coord.parseCSV(_command[3]);
		if (dims.length > 1) {
			for (const [i, dim] of dims.entries()) {group.tokens[inds[i]].setDim(dim);}
		}
		else {
			dims = dims[0];
			for (const i of inds) {group.tokens[i].setDim(dims);}
		}
	} catch (e) { doFeedback(_links, _command, e); }
}
//--------------------------------------------------------------------TESTING
async function doTest(_links) {

}
//--------------------------------------------------------------------MAIN
const commandHelper = MultiMap.newMap([
	[["test"], doTest],
	[["quit"], doQuit],
	[["ping"], doPing],
	[["log"], doLog],
	[["help", "explain"], doHelp],
	[["image", "thread"], doImage],
	[["map", "display"], doMap],
	[["new", "arena"], doNewArena],
	[["guide", "preview"], doGuide],
	[["list", "tokens"], doList],
	[["distance", "crow"], doDistance],
	[["instructions", "collapse"], doInstructions],
	[["static"], doNewStaticGroup],
	[["object"], doNewObjectGroup],
	[["grid", "area"], doNewAreaGroup],
	[["creature"], doNewCreatureGroup],
	[["swarm"], doNewSwarmGroup],
	[["circle", "concentric"], doNewConcentricGroup],
	[["movegroup"], doMoveGroup],
	[["hidegroup", "revealgroup"], doHideGroup],
	[["removegroup"], doRemoveGroup],
	[["resizegroup"], doResizeGroup],
	[["copy", "newtoken"], doNewToken],
	[["move"], doMoveToken],
	[["hide", "reveal"], doHideToken],
	[["remove"], doRemoveToken],
	[["resize"], doResizeToken]
]);

async function mainSwitch(_links, _command) {
	if (_command[0].startsWith(PREFIX)) {
		_command[0] = _command[0].slice(PREFIX.length).toLowerCase()
		console.log(_command);
		try {
			commandHelper.get(_command[0])(_links, _command);
		} catch (e) { sendTemp(_links, `Unknown command: ${_command[0]}`); }
		return true;
	}
	if (_command[0].toLowerCase().startsWith("keep")) {return false;}
	return undefined;
}

bot.once("ready", () => {
	console.log(`Logged in as ${bot.user.tag}`);
	bot.user.setActivity("Ask me to --explain :D");
});

bot.on("messageCreate", async (message) => {
	if (!message.author.bot) {
		console.log(`#${message.author.discriminator} @${message.channel.id}`);

		let msg, shouldDelete;
		if (message.reference !== null && message.content.toLowerCase() === `${PREFIX}parse`) {
			msg = await fetchReference(message);
			shouldDelete = (msg.author.id === bot.user.id);
			message.delete();
		}
		else {
			msg = message;
			shouldDelete = undefined;
		}

		const links = buildLinks(msg);
		for (const messageLine of msg.content.split("\n")) {
			let temp = await mainSwitch(links, messageLine.split(" "));
			if (temp !== undefined && shouldDelete != !temp) {shouldDelete = temp;}
		};
		if (shouldDelete) {msg.delete().catch((error) => {});}
	}
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.TOKEN);
