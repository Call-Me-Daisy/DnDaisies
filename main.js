require("dotenv").config();

const {Client, Intents, MessageAttachment, ThreadChannel} = require("discord.js");
const {createCanvas, loadImage} = require("canvas");
const {TEAM, DaisyMap, DaisyChar, Arena, PaintStyle} = require("./map");
const {helpSwitch} = require("./help");

//--------------------------------------------------------------------GLOBALS
const bot = new Client({intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
]});

const allArenas = new Map();

const HELPTIMER = 5000;
const PREFIX = "--";

//--------------------------------------------------------------------HELPERS
function fetchChannel(idC) {
	return bot.channels.cache.get(idC);
}
function fetchMessage(idC, idM) {
	return fetchChannel(idC).messages.fetch(idM);
}
function fetchReference(msg) {
	return fetchMessage(msg.reference.channelId, msg.reference.messageId);
}
function deleteFrom(idC, idM) {
	fetchMessage(idC,idM).then((msg) => {
		msg.delete();
	}).catch((error) => {});
}

function buildLinks(message) {
	let inThread = (message.channel instanceof ThreadChannel);
	return {
		g: message.guild,
		c: (inThread) ? fetchChannel(message.channel.parentId) : message.channel,
		t: (inThread) ? message.channel : false,
		m: message
	};
}
function fetchArena(links) {
	return allArenas.get(links.c.id);
}

function sendTo(links) {
	return links.c.send(content);
}
function makeTemp(message, duration = HELPTIMER) {
	message.then((msg) => {
		setTimeout(() => msg.delete(), duration);
	});
}

function clearImg(arena) {
	if (arena.img) {
		deleteFrom(arena.img.parentId, arena.img.id);
		arena.img.delete().catch((error) => {});
		arena.img = false;
	}
}
function clearMap(arena) {
	if (arena.map) {
		arena.map.delete().catch((error) => {});
		arena.map = false;
	}
}
//--------------------------------------------------------------------DECLUTTERING
function doQuit() {//TEMP: For cleaning between updates
	for (const [id, arena] of allArenas) {
		clearMap(arena);
		clearImg(arena);
	}
	setTimeout(function() {bot.destroy();}, HELPTIMER*1.5);
}
function doLog(links, command) {//TEMP: Debug helper
	if (links.m.reference !== null) {
		fetchReference(links.m).then((msg) => {console.log(msg)});
	}
	else if (command.size !== 1) {
		switch (command[1][0].toLowerCase()) {
			case "m": console.log(links.m); break;
			case "c": console.log(links.c); break;
			case "g": console.log(links.g); break;
		}
	}
}
function doHelp(links, command) {
	try {
		makeTemp(sendTo(links, helpSwitch(PREFIX, command)));
	} catch (e) {
		doHelp(links, [""]);
	}
}

function doList(links, command) {
	try {
		let msgMap = new Map();
		for (const [key, teamTup] of TEAM) {
			msgMap.set(teamTup[0], [`__Team: ${teamTup[1]}__`]);
		}
		for (const [key, char] of fetchArena(links).chars) {
			msgMap.get(char[0].team).push(`Token: ${DaisyChar.makeCharCode(key)} => Name: ${key}`);
		}
		let msg = [];
		if (command.length == 1) {
			for (const [team, ls] of msgMap) {
				if (ls.length > 1) {msg.push(ls.join("\n"));}
			}
		}
		else {msg.push(msgMap.get(TEAM.get(command[1][0].toLowerCase())[0]).join("\n"));}
		makeTemp(sendTo(links, msg.join("\n")));
	} catch (e) {
		doHelp(links, ["","list"]);
	}
}
function doNew(links, command) {
	try {
		const [map, img] = Arena.recover(fetchArena(links));
		allArenas.set(links.c.id, new DaisyMap(map, img, command[1], command[2], TsendTemp, links));
	} catch (e) {
		doHelp(links, ["","new"]);
	}
}
function doHide(links, command) {
	try {
		const char = fetchArena(links).getToken(TcapicalCase(command[1]));
		char.visible = !char.visible;
	} catch (e) {
		doHelp(links, ["hide"]);
	}
}

function doAdd(links, command) {
	try {
		fetchArena(links).addChar(DaisyChar.toKeyCase(command[2]), new DaisyChar(command[1], command[3], true));
	} catch (e) {
		doHelp(links, ["","add"]);
	}
}
function doAddGroup(links, command) {
	try {
		const thisMap = fetchArena(links);
		const charName = DaisyChar.toKeyCase(command[2]);
		for (const coord of command[3].split(",")) {
			thisMap.addChar(charName, new DaisyChar(command[1], coord, true));
		}
	} catch (e) {
		doHelp(links.c.id, ["","addgroup"]);
	}
}
function doAddArea(links, command) {
	try {
		fetchArena(links).addArea(command[1], command[2]);
	} catch (e) {
		doHelp(links, ["","addarea"]);
	}
}

function doCopy(links, command) {
	try {
		let charStr = DaisyChar.toKeyCase(command[1]);
		const thisMap = fetchArena(links);
		const parent = thisMap.getChar(charStr);
		charStr = DaisyChar.getCharTup(charStr)[0];
		for (const coord of command[2].split(",")) {
			thisMap.addChar(charStr, parent.copy(coord));
		}
	} catch (e) {
		doHelp(links, ["","copy"]);
	}
}
function doRemove(links, command) {
	try {
		const thisMap = fetchArena(links);
		const charStr = DaisyChar.toKeyCase(command[1]);

		let allRemoved = true;
		thisMap.getChar(charStr).removed = true;
		for (const char of thisMap.getCharLs(charStr)) {
			if (!char.removed) {allRemoved = false;}
		}
		if (allRemoved) {thisMap.removeCharLs(charStr);}
	} catch (e) {
		doHelp(links, ["","remove"]);
	}
}
function doMove(links, command) {
	try {
		fetchArena(links).getChar(DaisyChar.toKeyCase(command[1])).moveTo(command[2]);
	} catch (e) {
		doHelp(links, ["","move"]);
	}
}
function doMoveGroup(links, command) {
	try {
		const charLs = fetchArena(links).getCharLs(DaisyChar.toKeyCase(command[1]));
		let numRemoved = 0;
		for (const [i, coord] of command[2].split(",").entries()) {
			while (i+numRemoved < charLs.length && charLs[i+numRemoved].removed) {numRemoved++;}
			if (i+numRemoved >= charLs.length) {return;}
			charLs[i+numRemoved].moveTo(coord);
		}
	} catch (e) {
		doHelp(links, ["","movegroup"]);
	}
}
function doPing(links) {
	try {
		sendTo(links, `pong\t(${Date.now()-links.m.createdTimestamp} ms)`);
	} catch (e) {
		doHelp(links, ["","ping"]);
	}
}

async function doImage(links) {
	try {
		if (fetchArena(links) === undefined) {doNew(links, ["","A1"]);}
		let arena = fetchArena(links);
		if (!arena.img) {
			let prompt = await sendTo(links, process.env.THREADPROMPT);
			arena.img = await prompt.startThread({
				name: process.env.THREADNAME,
				autoArchiveDuration: 60
			});

			if (links.m.reference !== null) {//TEMP: Quick reset after quit
				let msg = await fetchReference(links.m);
				if (!msg.hasThread) {return;}
				let messages = await bot.channels.cache.get(msg.id).messages.fetch({limit:100});
				for (const [key, msg] of messages) {
					if (msg.attachments.size > 0) {
						arena.img.send({
							content: msg.content,
							files: [msg.attachments.entries().next().value[1]]
						});
					}
				}
			}
		}
		else if (links.t && links.t.id === arena.img.id) {
			clearImg(arena);
		}
		else {
			arena.img.setArchived(false);
			fetchMessage(links.c.id, arena.img.id).then((msg) => {
				makeTemp(msg.reply("bump"));
			});
		}
	} catch (e) {
		doHelp(links, ["","image"]);
	}
}
async function doMap(links) {
	try {
		let arena = fetchArena(links);
		if (arena.map) {clearMap(arena);}
		arena.map = await sendTo(links, {
			files: [new MessageAttachment(await arena.builarena(), links.c.id + "_map.png")]
		});
	} catch (e) {
		doHelp(links, ["","map"]);
	}
}
//--------------------------------------------------------------------TESTING
function TparseNumCoord(_coordSplit) {
	return [parseInt(_coordSplit[1],10), parseInt(_coordSplit[0],10)];
}
function TparseStrCoord(_coord) {
	return [parseInt(_coord.slice(1),10), _coord.charCodeAt(0)-64];
}
function TparseCoord(_coord) {
	let coordSplit = _coord.split("-");
	return (coordSplit.length > 1) ? TparseNumCoord(coordSplit) : TparseStrCoord(_coord);
}

function TsendTemp(_links, _content, _duration = HELPTIMER) {
	makeTemp(sendTo(_links, _content), _duration);
}

function TcapitalCase(_name) {
	return _name[0].toUpperCase() + _name.slice(1).toLowerCase();
}

async function doTest(links) {
	allArenas.set(links.c.id, new Arena(false, false /*await fetchChannel("948183116869173328")*/, [18,18], TsendTemp, links));

	let arena = fetchArena(links);
	let coords;

	arena.newGroup("Background", PaintStyle.GRID, TEAM.get("b")[0], [18,18], TparseCoord("1-1"));

	arena.newGroup("Allen", PaintStyle.FILL, TEAM.get("p")[0], [1,1], TparseCoord("I7"));
	arena.newGroup("Beauregard", PaintStyle.FILL, TEAM.get("p")[0], [1,1], TparseCoord("J9"));
	arena.newGroup("Void", PaintStyle.FILL, TEAM.get("p")[0], [1,1], TparseCoord("J10"));
	arena.newGroup("Dante", PaintStyle.FILL, TEAM.get("p")[0], [1,1], TparseCoord("K11"));
	arena.newGroup("Creida", PaintStyle.FILL, TEAM.get("p")[0], [1,1], TparseCoord("L5"));
	arena.newGroup("Berrow", PaintStyle.FILL, TEAM.get("p")[0], [1,1], TparseCoord("L7"));
	arena.newGroup("Matilda", PaintStyle.FILL, TEAM.get("p")[0], [1,1], TparseCoord("L9"));
	arena.newGroup("Galeti", PaintStyle.FILL, TEAM.get("p")[0], [1,1], TparseCoord("L10"));

	coords = [];
	for (const coord of ["E4","F5"]) {coords.push(TparseCoord(coord));}
	arena.newGroup("Pepper", PaintStyle.IMAGE, TEAM.get("e")[0], [1,1], coords);

	coords = [];
	for (const coord of ["G7","H5","H6","H7","H8","I6"]) {coords.push(TparseCoord(coord));}
	arena.newGroup("Crumpet", PaintStyle.IMAGE, TEAM.get("e")[0], [1,1], coords);

	arena.newGroup("Cheese", PaintStyle.FILL, TEAM.get("e")[0], [2,2], TparseCoord("J6"));

	coords = [];
	for (const coord of ["J8","J11","K12"]) {coords.push(TparseCoord(coord));}
	arena.newGroup("Iron-Chef", PaintStyle.FILL, TEAM.get("e")[0], [1,1], coords);

	arena.newGroup("Fire", PaintStyle.NAMED_GRID, "#ff7733", [3,3], [12,12]);

	TsendTemp(links, {
		files: [new MessageAttachment(await arena.builarena(), links.c.id + "_map.png")]
	});
}
//--------------------------------------------------------------------MAIN
async function mainSwitch(links, command) {
	if (command[0].startsWith(PREFIX)) {
		console.log(command);
		switch (command[0].slice(PREFIX.length).toLowerCase()) {
			case "test": doTest(links, command); break;

			case "quit": doQuit(); break;
			case "log": doLog(links, command); break;
			case "help": doHelp(links, command); break;

			case "tokens":
			case "list": doList(links, command); break;
			case "newmap":
			case "new": doNew(links, command); break;
			case "reveal":
			case "hide": doHide(links, command); break;
			case "newtoken":
			case "add": doAdd(links, command); break;
			case "newgroup":
			case "addmany":
			case "addgroup": doAddGroup(links, command); break;
			case "newarea":
			case "addarea": doAddArea(links, command); break;
			case "reinforce":
			case "duplicate":
			case "copy": doCopy(links, command); break;
			case "kill":
			case "delete":
			case "remove": doRemove(links, command); break;
			case "movetoken":
			case "move": doMove(links, command); break;
			case "movetokens":
			case "movegroup": doMoveGroup(links, command); break;
			case "ping": doPing(links); break;
			case "image": doImage(links); break;
			case "display":
			case "map": doMap(links); break;

			default: makeTemp(sendTo(links, `Unknown command:\n${command.join(" ")}`));
		}
		return true;
	}
	if (command[0].toLowerCase().startsWith("keep")) {return false;}
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
		if (shouldDelete != false) {message.delete().catch((error) => {});}
	}
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.TOKEN);
