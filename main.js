require("dotenv").config();

const {Client, Intents, MessageAttachment, ThreadChannel} = require("discord.js");
const {createCanvas, loadImage} = require("canvas");
const {Arena, PaintStyle, GuideStyle} = require("./arena");

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
	["default", "#7777"]
]);
Object.freeze(SHORTCUTS);
Object.freeze(COLOURS);
//--------------------------------------------------------------------HELPERS
class Multimap extends Map {
	constructor(_entries) {
		super();
		for (const [keyLs, val] of _entries) {
			for (const key of keyLs) {this.set(key, val);}
		}
	}
}
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
//------------------------------------PARSING
class Coord {
	static parseNum(_coordSplit) {
		return [parseInt(_coordSplit[1],10), parseInt(_coordSplit[0],10)];
	}
	static parseStr(_coord) {
		return [parseInt(_coord.slice(1),10), _coord.charCodeAt(0)-64];
	}
	static parse(_coord) {
		let coordSplit = _coord.split("-");
		return (coordSplit.length > 1) ? Coord.parseNum(coordSplit) : Coord.parseStr(_coord);
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
}
class Range {
	static parseSingle(_range) {
		let corners = Coord.parseLs(_range.split(":"));
		let out = corners[0];
		if (corners.length < 2) {out.push(false);}
		else {
			for (const i of [0, 1]) {out.push(corners[1][i] - out[i] + 1);}
		}
		return out;
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
//--------------------------------------------------------------------DECLUTTERING
//------------------------------------WRAPPED
function doRectGuide(_arena, _command) {//doGuide>REDIRECT (2).. [range] => {pos1, dims}
	let range = Range.parse(_command[2]);
	_arena.setGuide(GuideStyle.RECT, {pos1: range.slice(0,2), dims: range.slice(2)});
}
function doLineGuide(_arena, _command) {//doGuide>REDIRECT (2).. [coord] [coord] => {pos1, pos2}
	_arena.setGuide(GuideStyle.LINE, {pos1: Coord.parse(_command[2]), pos2: Coord.parse(_command[3])});
}
function doEllipseGuide(_arena, _command) {//doGuide>REDIRECT (2).. [coord] ([int] OR [coord]) => {pos1, radii}
	let radii = [parseInt(_command[3], 10)];
	if (isNaN(radii[0])) {radii = Coord.parse(_command[3]);}
	_arena.setGuide(GuideStyle.ELLIPSE, {pos1: Coord.parse(_command[2]), radii: radii});
}
function doSundailGuide(_arena, _command) {//doGuide>REDIRECT (2).. [coord] ([int] OR [coord]) => {pos1, pos2}
	let args = {pos1: Coord.parse(_command[2])};
	let arg2 = parseInt(_command[3], 10);
	(isNaN(arg2)) ? args.pos2 = Coord.parse(_command[3]) : args.radii = [arg2];
	_arena.setGuide(GuideStyle.SUNDAIL, args);
}
function doConeGuide(_arena, _command) {//doGuide>REDIRECT (2).. [coord] [length] [angle]
	_arena.setGuide(GuideStyle.CONE, {
		pos1: Coord.parse(_command[2]),
		radii: [parseInt(_command[3], 10)],
		theta: parseInt(_command[4], 10) * Math.PI/180});
}

function doNewGroup(_links, _command, _styleCode, _layer) {//(v) [colour] [name] {dimsCoord OR rangeCSV} {visible}
	try {
		let arena = fetchHolder(_links).arena;
		let name = Case.capital(_command[2]);
		let ranges = (_command[3] === undefined) ? false : Range.parseCSV(_command[3]);
		arena.newGroup(
			_styleCode,
			_layer,
			name,
			Colour.parse(_command[1]),
			(ranges && ranges[0][2]) ? ranges[0].slice(2) : ((ranges && !ranges[1]) ? ranges[0].slice(0,2) : [1,1])
		);
		if (ranges && (ranges[0][2] || ranges[1])) {
			arena.addToGroup(name, ranges, (_command[4] === undefined || _command[4][0].toLowerCase() !== "f"));
		}
	} catch (e) { doFeedback(_links, _command); }
}

function doFeedback(_links, _command) {
	sendTemp(_links, `Operation cancelled due to error: ${_command[0]}`);
}

function makeInstructions(_links, _holder) {
	let instructions = [];
	if (holder.img) {instructions.push("--image");}

	for (const [name, group] of holder.arena.groups) {
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
			csv.push(`${token.x}-${token.y}:${token.x + token.h}-${token.y + token.v}`);
		}
		instructions.push(`${PREFIX}${groupType} ${group.colour} ${name} csv.join(",")`);
	}

	sendTo(_links, instructions.join("\n"));
}
//------------------------------------ADMIN
function doQuit(_links, _command) {//quit
	for (const [id, holder] of allMaps) {
		makeInstructions(_links, holder);

		cleanMap(holder);
		cleanImg(holder);
	}
	setTimeout(function() {bot.destroy();}, HELPTIMER*1.5);
}
function doPing(_links, _command) {//ping
	sendTo(_links, `pong\t(${Date.now()-_links.m.createdTimestamp} ms`);
}
function doLog(_links, _command) {//log [link code] OR (->msg_to_log)--log
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
<<<<<<< HEAD
	} catch (e) {
		doHelp(links, ["","addgroup"]);
=======
>>>>>>> 530a80e703940d7f1c653ffa2cdeafc04aeba4a8
	}
}
//------------------------------------USER
//------------GENERAL
function doHelp(_links, _command) {//help () OR [command]

}
async function doImage(_links, _command) {//image OR (->msg_with_thread)image
	try {
		let holder = ensureHolder(_links);
		if (!holder.img) {
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
		else if (_links.t && _links.t.id === holder.img.id) {
			cleanImg(holder);
		}
		else {
			holder.img.setArchived(false);
			makeTemp(fetchMessage(_links.c.id, holder.img.id).then((_prompt) => {prompt.reply("bump");}));
		}
	} catch (e) { doFeedback(_links, _command); }
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
	} catch (e) { doFeedback(_links, _command); }
}
//------------ARENA
function doNewArena(_links, _command) {//new [coord: bottom-right]
	try {
		ensureHolder(_links).arena = new Arena(Coord.parse(_command[1]), sendTemp, _links);
	} catch (e) { doFeedback(_links, _command); }
}

const guideHelper = new Multimap([
	[["rect", "box", "square"], doRectGuide],
	[["line", "crow"], doLineGuide],
	[["ellipse", "circle"], doEllipseGuide],
	[["sundail", "distance"], doSundailGuide],
	[["cone", "tri"], doConeGuide]
]);
function doGuide(_links, _command) {//guide () OR [shapeStr] {shapeArgs}
	try {
		let arena = fetchHolder(_links).arena;
		if (_command.length > 1) {
			guideHelper.get(_command[1].toLowerCase())(arena, _command);
		}
		arena.displayGuide();
		doMap(_links, _command);
	} catch (e) { doFeedback(_links, _command); }
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
	} catch (e) { doFeedback(_links, _command); }
}
function doInstructions(_links, _command) {//instructions
	makeInstructions(_links, fetchHolder(_links));
}
//------------GROUP
function doNewStaticGroup(_links, _command) {//REDIRECT> doNewGroup
	doNewGroup(_links, _command, PaintStyle.GRID, 1);
}
function doNewObjectGroup(_links, _command) {//REDIRECT> doNewGroup
	doNewGroup(_links, _command, PaintStyle.IMAGE, 2);
}
function doNewEffectGroup(_links, _command) {//REDIRECT> doNewGroup
	doNewGroup(_links, _command, -PaintStyle.GRID, 3);
}
function doNewSwarmGroup(_links, _command) {//REDIRECT> doNewGroup
	doNewGroup(_links, _command, -PainstStyle.SWARM, 3);
}
function doNewCreatureGroup(_links, _command) {//REDIRECT> doNewGroup
	doNewGroup(_links, _command, -PaintStyle.IMAGE, -1);
}

function doMoveGroup(_links, _command) {//movegroup [name] [coordCSV] {visible}
	try {
		const tokens = fetchHolder(_links).arena.requireGroup(Case.capital(_command[1])).tokens;
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
	} catch (e) { doFeedback(_links, _command); }
}
function doHideGroup(_links, _command) {//hidegroup [name]
	try {
		for (const token of fetchHolder(_links).arena.requireGroup(Case.capital(_command[1])).tokens) {
			token.visible = !token.visible;
		}
	} catch (e) { doFeedback(_links, _command); }
}
function doRemoveGroup(_links, _command) {//removegroup [name]
	try {
		fetchHolder(_links).arena.removeGroup(Case.capital(_command[1]));
	} catch (e) { doFeedback(_links, _command); }
}
//------------TOKEN
function doNewToken(_links, _command) {//copy [name] [rangeCSV] {visible}
	try {
		fetchHolder(_links).arena.addToGroup(
			Case.capital(_command[1]),
			Range.parseCSV(_command[2]),
			(_command[3] === undefined || _command[3][0].toLowerCase() !== "f")
		);
	} catch (e) { doFeedback(_links, _command); }
}
function doMoveToken(_links, _command) {//move [name] [i] [coord] {visible}
	try {
		let token = fetchHolder(_links).arena.getToken(Case.capital(_command[1]), parseInt(_command[2], 10));
		if (token) {
			token.setPos(Coord.parse(_command[3]));
			if (_command[4] !== undefined) {
				if (_command[4][0].toLowerCase() === "t") {token.visible = true;}
				else if (_command[4][0].toLowerCase() === "f") {token.visible = false;}
			}
		}
	} catch (e) { doFeedback(_links, _command); }
}
function doHideToken(_links, _command) {//hide [name] [i]
	try {
		let token = fetchHolder(_links).arena.getToken(Case.capital(_command[1]), parseInt(_command[2], 10));
		if (token) {
			token.visible = !token.visible;
		}
	} catch (e) { doFeedback(_links, _command); }
}
function doRemoveToken(_links, _command) {//remove [name] [i] {andGroup}
	try {
		fetchHolder(_links).arena.removeToken(Case.capital(
			_command[1]),
			parseInt(_command[2], 10),
			(_command[3] !== undefined && _command[3][0].toLowerCase() === "t")
		);
	} catch (e) { doFeedback(_links, _command); }
}
//--------------------------------------------------------------------TESTING
async function doTest(_links) {

}
//--------------------------------------------------------------------MAIN
const commandHelper = new Multimap([
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
	[["instructions", "collapse"], doInstructions],
	[["static"], doNewStaticGroup],
	[["object"], doNewObjectGroup],
	[["effect"], doNewEffectGroup],
	[["creature"], doNewCreatureGroup],
	[["movegroup"], doMoveGroup],
	[["hidegroup", "revealgroup"], doHideGroup],
	[["removegroup"], doRemoveGroup],
	[["copy", "newtoken"], doNewToken],
	[["move"], doMoveToken],
	[["hide", "reveal"], doHideToken],
	[["remove"], doRemoveToken]
]);

async function mainSwitch(_links, _command) {
	if (_command[0].startsWith(PREFIX)) {
		_command[0] = _command[0].slice(PREFIX.length).toLowerCase()
		console.log(_command);
		try {
			commandHelper.get(_command[0])(_links, _command);
		} catch (e) { throw e; sendTemp(_links, `Unknown command: ${_command[0]}`); }
		return true;
	}
	if (_command[0].toLowerCase().startsWith("keep")) {return false;}
	return undefined;
}

bot.once("ready", () => {
	console.log(`Logged in as ${bot.user.tag}`);
});

bot.on("messageCreate", async (message) => {
	if (!message.author.bot) {
		console.log(`#${message.author.discriminator} @${message.channel.id}`);

		let msg, shouldDelete;
		if (message.reference !== null && message.content.toLowerCase() === `${PREFIX}parse`) {
			shouldDelete = false;
			msg = await fetchReference(message);
			message.delete();
		}
		else {
			shouldDelete = undefined;
			msg = message;
		}

		const links = buildLinks(msg);
		for (const messageLine of msg.content.split("\n")) {
			let temp = await mainSwitch(links, messageLine.split(" "));
			if (temp !== undefined && shouldDelete != !temp) {shouldDelete = temp;}
		};
		if (shouldDelete) {message.delete().catch((error) => {});}
	}
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.TOKEN);
