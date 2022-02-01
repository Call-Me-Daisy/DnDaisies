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
function sendTo(id, message) {
	return bot.channels.cache.get(id).send(message);
}
function sendTemp(id, message, duration = HELPTIMER) {
	sendTo(id, message).then(msg => {
		setTimeout(() => msg.delete(), duration);
	});
}
function deleteFrom(id, msgId) {
	bot.channels.cache.get(id).messages.fetch(msgId).then((msg) => {
		msg.delete();
	}).catch((error) => {});
}
//--------------------------------------------------------------------DECLUTTERING
function doQuit(id, command) {
	allMaps.forEach((dMap, id) => {
		deleteFrom(id, dMap.map);
	});

	setTimeout(function() {bot.destroy();}, HELPTIMER*1.5);
}
function doClean(id, command) {
	//TO-DO
}

function doHelp(id, command) {
	try {
		sendTemp(id, helpSwitch(PREFIX, command), HELPTIMER);
	} catch (err) {
		doHelp(id, [""]);
	}
}
function doPing(id, command) {
	try {
		sendTo(id, "pong\t(" + (Date.now()-message.createdTimestamp).toString() + "ms)");
	} catch (err) {
		doHelp(id, ["","ping"]);
	}
}
function doList(id, command) {
	try {let msgMap = new Map();
		TEAM.forEach((teamTup, key) => {
			msgMap.set(teamTup[0], [`__Team: ${teamTup[1]}__`]);
		});

		allMaps.get(id).chars.forEach((char, key) => {
			msgMap.get(char[0].team).push(`Token: ${DaisyChar.makeCharCode(key)} => Name: ${key}`);
		});

		let msg = [];
		if (command.length == 1) {
			msgMap.forEach((ls, team) => {
				if (ls.length > 1) {msg.push(ls.join("\n"));}
			});
		}
		else {
			msg.push(msgMap.get(TEAM.get(command[1][0].toLowerCase())[0]).join("\n"));
		}
		sendTemp(id, msg.join("\n"));
	} catch (err) {
		doHelp(id, ["","list"]);
	}
}
function doNew(id, command) {
	try {
		const mapId = (allMaps.get(id) === undefined) ? false : allMaps.get(id).map;
		while(command.length < 5) {command.push(undefined);}
		allMaps.set(id, new DaisyMap(command[1], command[2], command[3], command[4]));
		allMaps.get(id).map = mapId;
	} catch (err) {
		doHelp(id, ["","new"]);
	}
}
function doHide(id, command) {
	try {
		const char = allMaps.get(id).getChar(command[1])
		char.visible = !char.visible;
	} catch (err) {
		doHelp(id, ["hide"]);
	}
}
function doAdd(id, command) {
	try {
		allMaps.get(id).addChar(capitalCase(command[2]), new DaisyChar(command[1], command[3], true));
	} catch (err) {
		doHelp(id, ["","add"]);
	}
}
function doCopy(id, command) {
	try {
		let charStr = capitalCase(command[1]);
		const thisMap = allMaps.get(id);
		const parent = thisMap.getChar(charStr);
		charStr = DaisyChar.getCharTup(charStr)[0];
		command[2].split(",").forEach((coord, i) => {
			thisMap.addChar(charStr, parent.copy(coord));
		});
	} catch (err) {
		doHelp(id, ["","copy"]);
	}
}
function doRemove(id, command) {
	try {
		const thisMap = allMaps.get(id);
		const charStr = capitalCase(command[1]);

		let allRemoved = true;

		thisMap.getChar(charStr).removed = true;
		thisMap.getCharLs(charStr).forEach((char, i) => {
			if (!char.removed) {allRemoved = false;}
		});
		if (allRemoved) {thisMap.removeCharLs(charStr);}
	} catch (err) {
		doHelp(id, ["","remove"]);
	}
}
function doAddGroup(id, command) {
	try {
		const thisMap = allMaps.get(id);
		const charName = capitalCase(command[2]);
		command[3].split(",").forEach((coord, i) => {
			thisMap.addChar(charName, new DaisyChar(command[1], coord, true));
		});
	} catch (err) {
		doHelp(id, ["","addgroup"]);
	}
}
function doAddArea(id, command) {
	try {
		allMaps.get(id).addArea(command[1], command[2]);
	} catch (err) {
		doHelp(id, ["","addarea"]);
	}
}
function doMove(id, command) {
	try {
		allMaps.get(id).getChar(capitalCase(command[1])).moveTo(command[2]);
	} catch (err) {
		doHelp(id, ["","move"]);
	}
}
function doMoveGroup(id, command) {
	try {
		const charLs = allMaps.get(id).getCharLs(capitalCase(command[1]));
		let numRemoved = 0;
		command[2].split(",").forEach((coord, i) => {
			while (i+numRemoved < charLs.length && charLs[i+numRemoved].removed) {numRemoved++;}
			if (i+numRemoved >= charLs.length) {return;}
			charLs[i+numRemoved].moveTo(coord);
		});
	} catch (err) {
		doHelp(id, ["","movegroup"]);
	}
}
async function doMap(id) {
	try {
		if (allMaps.get(id).map) {
			deleteFrom(id, allMaps.get(id).map);
		}
		sendTo(id, {
			files: [new MessageAttachment(await allMaps.get(id).buildMap(), id + "_map.png")]
		}).then((msg) => {
			allMaps.get(id).map = msg.id;
		});
	} catch (err) {
		doHelp(id, ["","map"]);
	}
}
//--------------------------------------------------------------------MAIN
function mainSwitch(id, messageStr) {
	let shouldDelete = false;
	messageStr.split("\n").forEach( async (messageLine, i) => {
		if (messageLine.startsWith(PREFIX)) {
			shouldDelete = true;
			console.log(messageLine);
			const command = messageLine.slice(PREFIX.length).split(" ");

			switch (command[0].toLowerCase()) {
				case "quit": doQuit(id); break;
				case "clean": doClean(id); break;
				case "help": doHelp(id, command); break;
				case "ping": doPing(id, command); break;
				case "tokens":
				case "list": doList(id, command); break;
				case "newmap":
				case "new": doNew(id, command); break;
				case "reveal":
				case "hide": doHide(id, command); break;
				case "newtoken":
				case "add": doAdd(id, command); break;
				case "reinforce":
				case "duplicate":
				case "copy": doCopy(id, command); break;
				case "kill":
				case "delete":
				case "remove": doRemove(id, command); break;
				case "newgroup":
				case "addmany":
				case "addgroup": doAddGroup(id, command); break;
				case "newarea":
				case "addarea": doAddArea(id, command); break;
				case "movetoken":
				case "move": doMove(id, command); break;
				case "movetokens":
				case "movegroup": doMoveGroup(id, command); break;
				case "display":
				case "map": doMap(id); break;

				default: sendTemp(id, `Unknown command:\n${messageLine.slice}`);
			}
		}
	});
	return shouldDelete;
}

bot.once("ready", () => {
	console.log(`Logged in as ${bot.user.tag}`);
	//sendTemp(process.env.TEST_CHANNEL, process.env.TEST_COMMAND, 2*HELPTIMER);
});

bot.on("messageCreate", async (message) => {
	if (!message.author.bot) {
		console.log(`#${message.author.discriminator} @${message.channel.id}`);

		if (mainSwitch(message.channel.id, message.content)) {message.delete();}
	}
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.TOKEN);
