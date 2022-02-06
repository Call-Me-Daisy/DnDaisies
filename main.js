require("dotenv").config();

const {Client, Intents, MessageAttachment} = require("discord.js");
const {createCanvas, loadImage} = require ("canvas");
const {TEAM, DaisyMap, DaisyChar} = require("./map");
const {helpSwitch} = require("./help");

//--------------------------------------------------------------------GLOBALS
const bot = new Client({intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS]
});

const allMaps = new Map();

const HELPTIMER = 5000;
const PREFIX = "--";

//--------------------------------------------------------------------HELPERS
function capitalCase(str) {
	return str[0].toUpperCase() + str.slice(1).toLowerCase();
}
function deleteFrom(id, msgId) {
	bot.channels.cache.get(id).messages.fetch(msgId).then((msg) => {
		msg.delete();
	}).catch((error) => {});
}

function getMap(links) {
	return allMaps.get(links.c.id);
}
function sendTo(links, content) {
	return links.c.send(content);
}
function sendTemp(links, content, duration = HELPTIMER) {
	sendTo(links, content).then((message) => {
		setTimeout(() => message.delete(), HELPTIMER);
	});
}
//--------------------------------------------------------------------DECLUTTERING
function doQuit() {
	allMaps.forEach((dMap, id) => {
		deleteFrom(id, dMap.map);
	});

	setTimeout(function() {bot.destroy();}, HELPTIMER*1.5);
}
function doClean(links) {
	//TO-DO
}
function doHelp(links, command) {
	sendTemp(links, helpSwitch(PREFIX, command));
	try {
	} catch (err) {
		doHelp(links, [""]);
	}
}
function doPing(links) {
	sendTo(links, `pong\t(${Date.now()-links.m.createdTimestamp} ms)`);
	try {
	} catch (err) {
		doHelp(links, ["","ping"]);
	}
}
function doList(links, command) {
	try {
		let msgMap = new Map();
		TEAM.forEach((teamTup, key) => {
			msgMap.set(teamTup[0], [`__Team: ${teamTup[1]}__`]);
		});
		getMap(links).chars.forEach((char, key) => {
			msgMap.get(char[0].team).push(`Token: ${DaisyChar.makeCharCode(key)} => Name: ${key}`);
		});

		let msg = [];
		if (command.length == 1) {
			msgMap.forEach((ls, team) => {
				if (ls.length > 1) {msg.push(ls.join("\n"));}
			});
		}
		else {msg.push(msgMap.get(TEAM.get(command[1][0].toLowerCase())[0]).join("\n"));}
		sendTemp(links, msg.join("\n"));
	} catch (err) {
		doHelp(links, ["","list"]);
	}
}
function doNew(links, command) {
	try {
		const mapId = (getMap(links) === undefined) ? false : getMap(links).map;
		while(command.length < 5) {command.push(undefined);}
		allMaps.set(links.c.id, new DaisyMap(command[1], command[2], command[3], command[4]));
		allMaps.get(links.c.id).map = mapId;
	} catch (err) {
		doHelp(links, ["","new"]);
	}
}
function doHide(links, command) {
	try {
		const char = getMap(links).getChar(command[1])
		char.visible = !char.visible;
	} catch (err) {
		doHelp(links, ["hide"]);
	}
}
function doAdd(links, command) {
	try {
		getMap(links).addChar(capitalCase(command[2]), new DaisyChar(command[1], command[3], true));
	} catch (err) {
		doHelp(links, ["","add"]);
	}
}
function doCopy(links, command) {
	try {
		let charStr = capitalCase(command[1]);
		const thisMap = getMap(links);
		const parent = thisMap.getChar(charStr);
		charStr = DaisyChar.getCharTup(charStr)[0];
		command[2].split(",").forEach((coord, i) => {
			thisMap.addChar(charStr, parent.copy(coord));
		});
	} catch (err) {
		doHelp(links, ["","copy"]);
	}
}
function doRemove(links, command) {
	try {
		const thisMap = getMap(links);
		const charStr = capitalCase(command[1]);

		let allRemoved = true;

		thisMap.getChar(charStr).removed = true;
		thisMap.getCharLs(charStr).forEach((char, i) => {
			if (!char.removed) {allRemoved = false;}
		});
		if (allRemoved) {thisMap.removeCharLs(charStr);}
	} catch (err) {
		doHelp(links, ["","remove"]);
	}
}
function doAddGroup(links, command) {
	try {
		const thisMap = getMap(links);
		const charName = capitalCase(command[2]);
		command[3].split(",").forEach((coord, i) => {
			thisMap.addChar(charName, new DaisyChar(command[1], coord, true));
		});
	} catch (err) {
		doHelp(links.c.id, ["","addgroup"]);
	}
}
function doAddArea(links, command) {
	try {
		getMap(links).addArea(command[1], command[2]);
	} catch (err) {
		doHelp(links, ["","addarea"]);
	}
}
function doMove(links, command) {
	try {
		getMap(links).getChar(capitalCase(command[1])).moveTo(command[2]);
	} catch (err) {
		doHelp(links, ["","move"]);
	}
}
function doMoveGroup(links, command) {
	try {
		const charLs = getMap(links).getCharLs(capitalCase(command[1]));
		let numRemoved = 0;
		command[2].split(",").forEach((coord, i) => {
			while (i+numRemoved < charLs.length && charLs[i+numRemoved].removed) {numRemoved++;}
			if (i+numRemoved >= charLs.length) {return;}
			charLs[i+numRemoved].moveTo(coord);
		});
	} catch (err) {
		doHelp(links, ["","movegroup"]);
	}
}
async function doMap(links) {
	try {
		if (getMap(links).map) {
			deleteFrom(links.c.id, getMap(links).map);
		}
		sendTo(links, {
			files: [new MessageAttachment(await getMap(links).buildMap(), links.c.id + "_map.png")]
		}).then((msg) => {
			getMap(links).map = msg.id;
		});
	} catch (err) {
		doHelp(links.c.id, ["","map"]);
	}
}
//--------------------------------------------------------------------MAIN
function mainSwitch(links, command) {
	if (command[0].startsWith(PREFIX)) {
		console.log(command);

		switch (command[0].slice(PREFIX.length).toLowerCase()) {
			case "quit": doQuit(); break;
			case "clean": doClean(links); break;
			case "ping": doPing(links); break;
			case "help": doHelp(links, command); break;
			case "tokens":
			case "list": doList(links, command); break;
			case "newmap":
			case "new": doNew(links, command); break;
			case "reveal":
			case "hide": doHide(links, command); break;
			case "newtoken":
			case "add": doAdd(links, command); break;
			case "reinforce":
			case "duplicate":
			case "copy": doCopy(links, command); break;
			case "kill":
			case "delete":
			case "remove": doRemove(links, command); break;
			case "newgroup":
			case "addmany":
			case "addgroup": doAddGroup(links, command); break;
			case "newarea":
			case "addarea": doAddArea(links, command); break;
			case "movetoken":
			case "move": doMove(links, command); break;
			case "movetokens":
			case "movegroup": doMoveGroup(links, command); break;
			case "display":
			case "map": doMap(links); break;

			default: sendTemp(links, `Unknown command:\n${command.join(" ")}`);
		}
		return undefined;
	}
	return false;
}

bot.once("ready", () => {
	console.log(`Logged in as ${bot.user.tag}`);
});

bot.on("messageCreate", async (message) => {
	if (!message.author.bot) {
		console.log(`#${message.author.discriminator} @${message.channel.id}`);

		let shouldDelete = undefined;
		const links = {g: message.channel.guild, c: message.channel, m: message};
		message.content.split("\n").forEach( async (messageLine, i) => {
			let temp = mainSwitch(links, messageLine.split(" "));
			if (temp !== undefined && shouldDelete != !temp) {shouldDelete = temp;}
		});
		if (shouldDelete != false) {message.delete();}
	}
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.TOKEN);
