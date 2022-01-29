require("dotenv").config();

const { Client, Intents, MessageAttachment} = require("discord.js");
const {createCanvas, loadImage} = require ("canvas");
const {DaisyMap, DaisyChar} = require("./map");
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
const allDisplays = new Map();
const HELPTIMER = 15000;
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
//--------------------------------------------------------------------DECLUTTERING
function doHelp(id, command) {
	try {
		sendTemp(id, helpSwitch(PREFIX, command), HELPTIMER);
	} catch (err) {
		sendTemp("Unknown Error.");
	}
}
function doQuit(id, command) {
	try {
		setTimeout(function() {bot.destroy();}, 2*HELPTIMER);
	} catch (err) {
		sendTemp("Unknown Error.");
	}
}
function doPing(id, command) {
	try {
		sendTo(id, "pong\t(" + (Date.now()-message.createdTimestamp).toString() + "ms)");
	} catch (err) {
		sendTemp("Unknown Error.");
	}
}
function doClean(id, command) {
	try {
		//TO-DO
	} catch (err) {
		sendTemp(id, "Unknown Error.");
	}
}
function doNew(id, command) {
	try {
		while(command.length < 5) {command.push(undefined);}
		allMaps.set(id, new DaisyMap(command[1], command[2], command[3], command[4]));
	} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--new [letter][number]");
	}
}
function doHide(id, command) {
	try {
		const char = allMaps.get(id).getChar(command[1])
		char.visible = !char.visible;
	} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--hide [name]")
	}
}
function doAdd(id, command) {
	try {
		allMaps.get(id).addChar(capitalCase(command[2]), new DaisyChar(command[1], command[3], true));
	} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--add [party/enemy/neutral/object] [name] [letter][number]")
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
		sendTemp(id, "Error. Please format as follows:\n\t--addmany [name] [letter][number],[letter][number],...")
	}
}
function doAddArea(id, command) {
	try {
		allMaps.get(id).addArea(command[1], command[2]);
	} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--addarea [object/background/wall] [r4:ng3],[r4:ng3],...");
	}
}
function doMove(id, command) {
	try {
		allMaps.get(id).getChar(capitalCase(command[1])).moveTo(command[2]);
	} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--move [name] [letter][number]")
	}
}
async function doMap(id) {
	return sendTo(id, {
		files: [new MessageAttachment(await allMaps.get(id).buildMap(), id + "_map.png")]
	});
}
//--------------------------------------------------------------------MAIN
bot.once("ready", () => {
	console.log(`Logged in as ${bot.user.tag}`);
	//sendTemp(process.env.TEST_CHANNEL, process.env.TEST_COMMAND, 2*HELPTIMER);
});

bot.on("messageCreate", async (message) => {
	if (!message.author.bot) {
		let shouldDelete = false;
		let shouldDisplay = false;
		console.log(`#${message.author.discriminator} @${message.channel.id}`);

		message.content.split("\n").forEach( async (messageLine, i) => {
			if (messageLine.startsWith(PREFIX)) {
				shouldDelete = true;
				console.log(messageLine);
				const command = messageLine.slice(PREFIX.length).split(" ");

				switch (command[0].toLowerCase()) {
					case "help": doHelp(message.channel.id, command); break; //an exception here should never occur
					case "quit": doQuit(message.channel.id, command); break; //an exception here should never occur
					case "ping": doPing(message.channel.id, command); break; //an exception here should never occur
					case "clean": doClean(message.channel.id, command); break;
					case "newmap":
					case "new": doNew(message.channel.id, command); break;
					case "reveal":
					case "hide": doHide(message.channel.id, command); break;
					case "newtile":
					case "add": doAdd(message.channel.id, command); break;
					case "addmany":
					case "newgroup":
					case "addgroup": doAddGroup(message.channel.id, command); break;
					case "newarea":
					case "addarea": doAddArea(message.channel.id, command); break;
					case "move": doMove(message.channel.id, command); break;
					case "display":
					case "map":
						if (allDisplays.get(message.channel.id) !== undefined) {
							bot.channels.cache.get(message.channel.id).messages.fetch(allDisplays.get(message.channel.id)).then((msg) => {
								msg.delete();
							});
						}
						await doMap(message.channel.id, command).then((msg) => {
							allDisplays.set(message.channel.id, msg.id);
						});
						break;

					default: sendTo(message.channel.id, messageLine.slice(PREFIX.length));
				}
			}
		});
		if (shouldDisplay) {doMap(id);}
		if (shouldDelete) {message.delete();}
	}
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.TOKEN);
