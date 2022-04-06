require("dotenv").config();

const {Client, Intents, MessageAttachment, ThreadChannel} = require("discord.js");
const {createCanvas, loadImage} = require("canvas");
const fs = require("fs");

const {MultiMap, TreeMap} = require("./utils");
const {Arena} = require("./arena");
const {LightLayer} = require("./map-layer");
const {STYLES} = require("./styles");
//--------------------------------------------------------------------GLOBALS
const bot = new Client({intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
]});

const allArenas = new Map();

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
	allArenas.set(_links.c.id, {arena: false, map: false, img: false});
}
function fetchHolder(_links) {
	return allArenas.get(_links.c.id);
}
function ensureHolder(_links) {
	if (fetchHolder(_links) === undefined) {newHolder(_links);}
	return fetchHolder(_links);
}

function fetchArena(_links, _update = false) {
	const arena = fetchHolder(_links).arena;
	if (_update) {arena.shouldUpdate = true;}
	return arena;
}
function requireGroup(_links, _nameRaw, _update) {
	return fetchArena(_links, _update).requireGroup(Case.capital(_nameRaw));
}
function fetchTokens(_group, _iCSV) {
	if (_group.tokens.length === 1) {return [_group.tokens[0]];}
	let out = [];
	for (const i of _iCSV.split(",")) {
		if (isNaN(i)) {throw `Index ${i} is not a number.`;}
		out.push(_group.tokens[parseInt(i, 10)]);
	}
	return out;
}

async function displayMap(_links, _holder) {
	cleanMap(_holder);

	let imgUrls = (async function(){
		if (!_holder.img) {return false;}
		let out = new Map();
		for (const [key, msg] of await _holder.img.messages.fetch({limit:100})) {
			if (msg.attachments.size > 0) {
				out.set(Case.capital(msg.content), msg.attachments.entries().next().value[1].url);
			}
		}
		return out;
	})();

	_holder.map = await sendTo(_links, {
		files: [new MessageAttachment(await _holder.arena.buildMap(await imgUrls), _links.c.id + "_map.png")]
	});
}
//------------------------------------MODES
function boolSwitch(_str, _default = "u") {
	switch ((typeof(_str) === "string") ? _str[0].toLowerCase() : _default) {
		case "t": return function(_current){return true;};
		case "f": return function(_current){return false;};
		case "u": return function(_current){return _current;};
		case "!": return function(_current){return !_current;};

		default: return boolSwitch(_default);
	}
}
function getDoResize(_str, _default = "c") {
	let origin = (function(_strSplit){
		if (_strSplit.length > 1) {
			return [
				(function(_x){
					switch (_x[0]) {
						case "l": return 0;
						case "r": return 1;
						default: return 0.5;
					}
				})(_strSplit[1]),
				(function(_y){
					switch (_y[0]) {
						case "t": return 0;
						case "b": return 1;
						default: return 0.5;
					}
				})(_strSplit[0])
			];
		}
		return [0.5, 0.5];
	})(((typeof(_str) === "string" || _str instanceof String) ? _str.toLowerCase() : _default).split("-"));

	return function(_token, _dim) {
		_token.setPos([_token.x + origin[0]*(_token.h-_dim[0]), _token.y + origin[1]*(_token.v-_dim[1])]);
		_token.setDim(_dim);
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
//--------------------------------------------------------------------DECLUTTERING
//------------------------------------WRAPPED
function doRectGuide(_arena, _command) {//doGuide>RED (2).. [range => {origin, dim}]
	let range = Range.parse(_command[2]);
	_arena.setGuide(STYLES.guide.rect, {origin: range[0], dim: range[1]});
}
function doLineGuide(_arena, _command) {//doGuide>RED (2).. [token/coord => origin] [token/coord => pos]
	let coords = Coord.acceptToken(_arena, _command, 2, 2);
	_arena.setGuide(STYLES.guide.line, {origin: coords[0], pos: coords[1]});
}
function doEllipseGuide(_arena, _command) {//doGuide>RED (2).. [token/coord => origin] [int/coord => radii]
	_arena.setGuide(STYLES.guide.ellipse, {
		origin: Coord.acceptToken(_arena, _command, 2),
		radii: (function(_str){
			let out = parseInt(_str, 10);
			return (isNaN(out)) ? Coord.parse(_str) : [out];
		})(_command[_command.length - 1])
	});
}
function doSundailGuide(_arena, _command) {//doGuide>RED (2).. [token/coord => origin] (v => pos/radii)
	let coords = Coord.acceptToken(_arena, _command, 2, 2);
	_arena.setGuide(STYLES.guide.sundail, {
		origin: coords[0],
		pos: coords[1],
		radii: [parseInt(_command[_command.length - 1], 10)]
	});
}
function doConeGuide(_arena, _command) {//doGuide>RED (2).. [token/coord => origin] [radii] [theta]
	_arena.setGuide(STYLES.guide.cone, {
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
	_arena.setGuide(STYLES.guide.spider, {
		origin: Coord.acceptToken(_arena, _command, 2),
		posLs: (posLs) ? posLs : Coord.parseCSV(_command[_command.length - 1])
	})
}

function doNewGroup(_links, _command, _layer, _styles) {//(v) [colour] [name] {rangeCSV} {visible}
	try {
		let arena = fetchArena(_links);
		let name = Case.capital(_command[2]);
		let rangeLs = (_command[3] === undefined) ? false : Range.parseCSV(_command[3]);
		arena.newGroup(
			_styles,
			_layer,
			name,
			Colour.parse(_command[1]),
			(rangeLs && rangeLs[0][1]) ? rangeLs[0][1] : [1,1]
		);
		if (rangeLs) {
			arena.addToGroup(name, rangeLs, (_command[5] === undefined || _command[5][0].toLowerCase() !== "f"));
			arena.shouldUpdate = true;
			return true;
		}
		return undefined;
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
				let groupType = "newGroup"; //DEPRECATED
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
	for (const [id, holder] of allArenas) {
		if (_command[1] && _command[1][0].toLowerCase() !== "f") {makeInstructions(_links, holder);}

		cleanMap(holder);
		cleanImg(holder);
	}
	setTimeout(function() {bot.destroy();}, HELPTIMER*1.5);
	return false;
}
function doPing(_links, _command) {//ping
	sendTo(_links, `pong: ${Date.now()-_links.m.createdTimestamp} ms`);
	return false;
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
	return false;
}
//------------------------------------USER
//------------GENERAL
const helpHelper = (function(_json){
	let currentCategory;
	for (const key in _json) {
		if (_json.hasOwnProperty(key)) {
			let el = _json[key];
			el.aliases = [];
			switch (el.type) {
				case "category":
					_json.categories.msg.push(Case.capital(key));
					currentCategory = key;
					break;
				case currentCategory: _json[currentCategory].msg.push(Case.capital(key)); break;
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
	return false;
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
		if (holder.arena) {holder.arena.shouldUpdate = true;}
		return false;
	} catch (e) { doFeedback(_links, _command, e); }
}
//------------ARENA
function doNewArena(_links, _command) {//new [coord: bottom-right]
	try {
		ensureHolder(_links).arena = new Arena(Coord.parse(_command[1]).slice(0,2), sendTemp, _links);
		return true;
	} catch (e) { throw e; doFeedback(_links, _command, e); }
}

const guideHelper = MultiMap.newMap([
	[["rect", "box", "square"], doRectGuide],
	[["line", "straight"], doLineGuide],
	[["ellipse", "circle"], doEllipseGuide],
	[["sundail", "equidistant"], doSundailGuide],
	[["cone", "triangle"], doConeGuide],
	[["spider", "multiline"], doSpiderGuide]
]);
function doGuide(_links, _command) {//guide ()/[shapeStr] {shapeArgs}
	try {
		let arena = fetchArena(_links);
		if (_command.length > 1) {
			guideHelper.get(_command[1].toLowerCase())(arena, _command);
			arena.shouldUpdate = true;
		}
		arena.displayGuide();
		return true;
	} catch (e) { doFeedback(_links, _command, e); }
}
function doList(_links, _command) {//list
	try {
		let msgMap = new Map();
		for (const [key, teamName] of SHORTCUTS) {
			msgMap.set(COLOURS.get(teamName), [`__Team: ${teamName} (${COLOURS.get(teamName)})__`]);
		}
		for (const [name, group] of fetchArena(_links).groups) {
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
		else {msg.push(msgMap.get(Colour.parse(_command[1])).join("\n"));}
		sendTemp(_links, msg.join("\n\n"));
		return undefined;
	} catch (e) { doFeedback(_links, _command, e); }
}
function doDistance(_links, _command) {//distance ([coord]/[name] {i}) ([coord]/[name] {i})
	try {
		let arena = fetchArena(_links);
		let coords = Coord.acceptToken(arena, _command, 1, 2);
		let out = 0;
		for (let j = 0; j<3; j++) {
			out += (((coords[1][j]) ? coords[1][j] : 0) - ((coords[0][j]) ? coords[0][j] : 0))**2;
		}
		sendTemp(_links, Math.sqrt(out).toString());
		return undefined;
	} catch (e) { doFeedback(_links, _command, e); }
}
function doInstructions(_links, _command) {//instructions
	try {
		makeInstructions(_links, fetchHolder(_links));
		return undefined;
	} catch (e) { doFeedback(_links, _command, e); }
}
//------------GROUP
function doNewStaticGroup(_links, _command) {//RED> doNewGroup
	return doNewGroup(_links, _command, 1, {
		token: STYLES.token.grid,
		cell: STYLES.cell.rect,
		name: STYLES.name.none
	});
}
function doNewObjectGroup(_links, _command) {//RED> doNewGroup
	return doNewGroup(_links, _command, 2, {
		token: STYLES.token.image,
		cell: STYLES.cell.rect,
		name: STYLES.name.none
	});
}
function doNewAreaGroup(_links, _command) {//RED> doNewGroup
	return doNewGroup(_links, _command, 4, {
		token: STYLES.token.grid,
		cell: STYLES.cell.rect,
		name: STYLES.name.centerFull
	});
}
function doNewConcentricGroup(_links, _command) {//RED> doNewGroup
	return doNewGroup(_links, _command, 4, {
		token: STYLES.token.layer,
		cell: STYLES.cell.ellipse,
		name: STYLES.name.centerFull
	});
}
function doNewSwarmGroup(_links, _command) {//RED> doNewGroup
	return doNewGroup(_links, _command, 3, {
		token: STYLES.token.grid,
		cell: STYLES.cell.ellipse,
		name: STYLES.name.cornerFull
	});
}
function doNewCreatureGroup(_links, _command) {//RED> doNewGroup
	return doNewGroup(_links, _command, -1, {
		token: STYLES.token.image,
		cell: STYLES.cell.ellipse,
		name: STYLES.name.centerPartial
	});
}
function doNewCustomGroup(_links, _command) {//RED> doNewGroup
	let styles = (function(_token){
		return {
			name: (_token.length > 1) ? STYLES.name.default : STYLES.name.none,
			token: (function getTokenStyle(_i){
				if (_token[_i][0] === undefined) { return false; }
				switch(_token[i][0].toLowerCase()) {
					case "f": return STYLES.token.fill;
					case "g": return STYLES.token.grid;
					case "l": return STYLES.token.layer;
					case "i": return STYLES.token.image;
				}
				return getTokenStyle(_i + 1);
			})(0)
		};
	})(_command[2].split("-"));
	if (!styles) {throw `Invalid token style: ${_command[2]}`;}
	let cell = (function(_cell){
		switch(_cell) {
			case "r": return STYLES.cell.rect;
			case "e": return STYLES.cell.ellipse;
		}
	})(_command[3]);
	if (cell === undefined) {throw `Invalid cell style: ${_command[3]}`;}
	return doNewGroup(_links, _command.slice(4), {token: styles, cell: cell}, parseInt(_command[1], 10));
}

function doMoveGroup(_links, _command) {//movegroup [name] [rangeCSV] {visible}
	try {
		const tokens = requireGroup(_links, _command[1], true).tokens;
		let mode = (_command[3] === undefined) ? false : boolSwitch(_command[3], "u");

		let tokenInd = 0;
		for (const range of Range.parseCSV(_command[2])) {
			if (tokenInd >= tokens.length) {return;}
			while (tokens[tokenInd].removed) {
				if (++tokenInd >= tokens.length) {return;}
			}
			(function(_token){
				_token.setPos(range[0]);
				if (range[1]) {_token.setDim(range[1]);}
				if (mode) {_token.visible = mode(_token.visible);}
			})(tokens[tokenInd++]);
		}
		return true;
	} catch (e) { doFeedback(_links, _command, e); }
}
function doHideGroup(_links, _command) {//hidegroup [name] {mode}
	try {
		let mode = boolSwitch(_command[2], "!");
		for (const token of requireGroup(_links, _command[1], true).tokens) {token.visible = mode(token.visible);}
		return true;
	} catch (e) { doFeedback(_links, _command, e); }
}
function doRemoveGroup(_links, _command) {//removegroup [name]
	try {
		let arena = fetchArena(_links);
		return (function(_groupExisted){
			if (_groupExisted) {
				arena.shouldUpdate = true;
				return true;
			}
			return undefined;
		})(arena.removeGroup(Case.capital(_command[1])));
	} catch (e) { doFeedback(_links, _command, e); }
}
function doResizeGroup(_links, _command) {//resizegroup [name] [dims] {origin}
	try {
		let group = requireGroup(_links, _command[1], true);
		group.dim = (function(_range){
			return (_range[1]) ? _range[1] : _range[0].slice(0,2);
		})(Range.parse(_command[2]));

		if (_command[3] && _command[3][0].toLowerCase() !== "f") {
			let doResize = getDoResize(_command[3]);
			for (const token of group.tokens) {doResize(token, group.dim);}
		}
		return true;
	} catch (e) { doFeedback(_links, _command, e); }
}
//------------TOKEN
function doNewToken(_links, _command) {//copy [name] [rangeCSV] {visible}
	try {
		fetchArena(_links, true).addToGroup(
			Case.capital(_command[1]),
			Range.parseCSV(_command[2]),
			(_command[3] === undefined || _command[3][0].toLowerCase() !== "f")
		);
		return true;
	} catch (e) { doFeedback(_links, _command, e); }
}
function doMoveToken(_links, _command) {//move [name] {iCSV} [rangeCSV] {visible}
	try {
		let group = requireGroup(_links, _command[1], true);
		let [ranges, mode] = (function(_cmd){
			let out = Range.parseCSV(_cmd);
			if (out[0][0][0] === undefined) {return [false, boolSwitch(_cmd, "u")];}
			return [out, false];
		})(_command[_command.length - 1]);
		if (!ranges) {ranges = Range.parseCSV(_command[_command.length - 2]);}

		for (const [i, token] of fetchTokens(group, _command[2]).entries()) {
			let range = ranges[i];
			token.setPos(range[0]);
			if (range[1]) {token.setDim(range[1]);}
			if (mode) {token.visible = mode(token.visible);}
		}
		return true;
	} catch (e) { doFeedback(_links, _command, e); }
}
function doHideToken(_links, _command) {//hide [name] {iCSV} {mode}
	try {
		let group = requireGroup(_links, _command[1], true);
		let mode = boolSwitch(_command[_command.length - 1], "!");
		for (const token of fetchTokens(group, _command[2])) {token.visible = mode(token.visible);}
		return true;
	} catch (e) { doFeedback(_links, _command, e); }
}
function doRemoveToken(_links, _command) {//remove [name] {iCSV} {mode} {andGroup}
	try {
		let group = requireGroup(_links, _command[1], true);
		let mode = boolSwitch(_command[_command.length - 1], "t");
		for (const token of fetchTokens(group, _command[2])) {token.removed = mode(token.removed);}

		if (_command[4] && _command[4][0].toLowerCase() === "t" && group.isEmpty()) {doRemoveGroup(_command[1]);}
		return true;
	} catch (e) { doFeedback(_links, _command, e); }
}
//--------------------------------------------------------------------TESTING
function doEditGroupLight(_links, _command) {
	try {
		let group = requireGroup(_links, _command[1], true);

		group.radius = parseFloat(_command[2], 10);
		group.opacity = parseFloat(_command[3], 10);
		group.startFade = parseFloat(_command[4], 10);

		return true;
	} catch (e) {throw e; doFeedback(_links, _command, e); }
}
function doEditAmbientLight(_links, _command) {
	try {
		let layer = fetchArena(_links, true).layers.light;
		let rgba = [];
		for (const cmd of _command.slice(1)) {
			rgba.push(...(function(_cmdSplit){
				let out = [];
				for (const val of _cmdSplit) {out.push(parseFloat(val, 10).toFixed(2));}
				return out;
			})(cmd.split(",")));
		}
		switch (rgba.length) {
			case 1: layer.ambientOpacity = rgba[0]; break;
			case 3: layer.makeShadow = LightLayer.makeShadowMaker(rgba); break;
			case 4:
				layer.makeShadow = LightLayer.makeShadowMaker(rgba.slice(0,3));
				layer.ambientOpacity = rgba[4];
				break;

			default: throw `doEditAmbientLight cannot take ${rgba.length} arguments.`
		}
		return true;
	} catch (e) {throw e; doFeedback(_links, _command, e); }
}
async function doTest(_links, _command) {

}
//--------------------------------------------------------------------MAIN
const commandHelper = MultiMap.newMap([
	[["test"], doTest],
	[["quit"], doQuit],
	[["ping"], doPing],
	[["log"], doLog],
	[["help", "explain"], doHelp],
	[["image", "thread"], doImage],
	[["map", "display"], function(_l, _c){return true;}],
	[["nomap", "hidden"], function(_l, _c){return false;}],
	[["new", "arena"], doNewArena],
	[["guide", "preview"], doGuide],
	[["list", "tokens"], doList],
	[["distance", "separation"], doDistance],
	[["instructions", "collapse"], doInstructions],
	[["static"], doNewStaticGroup],
	[["object"], doNewObjectGroup],
	[["swarm"], doNewSwarmGroup],
	[["grid", "area"], doNewAreaGroup],
	[["circular", "concentric"], doNewConcentricGroup],
	[["creature"], doNewCreatureGroup],
	[["custom", "tailor"], doNewCustomGroup],
	[["movegroup"], doMoveGroup],
	[["hidegroup", "revealgroup"], doHideGroup],
	[["removegroup"], doRemoveGroup],
	[["resizegroup"], doResizeGroup],
	[["copy", "newtoken"], doNewToken],
	[["move"], doMoveToken],
	[["hide", "reveal"], doHideToken],
	[["remove"], doRemoveToken],
	[["light", "dark"], doEditGroupLight],
	[["ambient"], doEditAmbientLight]
]);

async function mainSwitch(_links, _command, _flags) {
	if (_command[0].startsWith(PREFIX)) {
		_command[0] = _command[0].slice(PREFIX.length).toLowerCase()
		console.log(_command);
		try {
			(function(_shouldDisplay){
				if (_flags.display === undefined) {_flags.display = _shouldDisplay;}
			})(await commandHelper.get(_command[0])(_links, _command));
		} catch (e) { throw e; sendTemp(_links, `Unknown command: ${_command[0]}`); }
		if (_flags.delete === undefined) {_flags.delete = true;}
	}
	if (_command[0].toLowerCase().startsWith("keep")) {_flags.delete = false;}
}

bot.once("ready", () => {
	console.log(`Logged in as ${bot.user.tag}`);
	bot.user.setActivity("Ask me to --explain :D");
});

bot.on("messageCreate", async (_message) => {
	if (!_message.author.bot) {
		console.log(`#${_message.author.discriminator} @${_message.channel.id}`);

		let flags = {};
		const links = buildLinks(await (function(){
			if (_message.reference !== null && _message.content.toLowerCase() === `${PREFIX}parse`) {
				let msg = fetchReference(_message);
				msg.then((_msg) => { flags.delete = (_msg.author.id === bot.user.id); });
				_message.delete();
				return msg;
			}
			return _message;
		})());

		for (const messageLine of links.m.content.split("\n")) {
			await mainSwitch(links, messageLine.split(" "), flags);
		};
		if (flags.display) {
			(function(_holder){
				if (_holder && _holder.arena) {displayMap(links, _holder);}
			})(fetchHolder(links));
		}
		if (flags.delete) {links.m.delete().catch((error) => {});}
	}
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.TOKEN);
