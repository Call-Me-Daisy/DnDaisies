require("dotenv").config();

const { Client, Intents, MessageAttachment} = require("discord.js");
const {createCanvas, loadImage} = require ("canvas");
const {DaisyMap, DaisyChar} = require("./map");
//const HELP = require("./help");

//--------------------------------------------------------------------CONSTANTS
const bot = new Client({intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS]
});

const PREFIX = "--";
const allMaps = new Map();

//--------------------------------------------------------------------HELPERS
function capitalCase(str) {
	return str[0].toUpperCase() + str.slice(1).toLowerCase();
}
function sendTo(id, message) {
	return bot.channels.cache.get(id).send(message);
}
function sendTemp(id, message, duration = 5000) {
	sendTo(id, message).then(msg => {
		setTimeout(() => msg.delete(), duration);
	});
}
//--------------------------------------------------------------------DECLUTTERING
//------------------------------------DO
function doQuit(id, command) {
	setTimeout(function() {bot.destroy();}, 1500);
}
function doPing(id, command) {
	sendTo(id, "pong\t(" + (Date.now()-message.createdTimestamp).toString() + "ms)");
}
function doNew(id, command) {
	while(command.length < 5) {command.push(undefined);}
	allMaps.set(id, new DaisyMap(command[1], command[2], command[3], command[4]));
}
function doHide(id, command) {
	allMaps.get(id).getChar(command[1]).visible = !allMaps.get(id).getChar(command[1]).visible;
}
function doAdd(id, command) {
	allMaps.get(id).addChar(capitalCase(command[2]), new DaisyChar(command[1], command[3], true));
}
function doAddMany(id, command) {
	const thisMap = allMaps.get(id);
	const charName = capitalCase(command[2]);
	command[3].split(",").forEach((coord, i) => {
		thisMap.addChar(charName, new DaisyChar(command[1], coord, true));
	});
}
function doAddArea(id, command) {
	allMaps.get(id).addArea(command[1], command[2]);
}
function doMove(id, command) {
	const char = allMaps.get(id).getChar(capitalCase(command[1]))[command[2]];
	char.moveTo(command[3]);
	//if (char.visible) {doMap(id, command);}
}
async function doMap(id, command) {
	sendTo(id, {
		files: [new MessageAttachment(await allMaps.get(id).buildMap(), id + "_map.png")]
	})
}
//------------------------------------TRY
function tryNew(id, command) {
	try {doNew(id, command);} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--new [letter][number]")
	}
}
function tryHide(id, command) {
	try {doHide(id, command);} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--hide [name]")
	}
}
function tryAdd(id, command) {
	try {doAdd(id, command);} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--add [party/enemy/neutral/object] [name] [letter][number]")
	}
}
function tryAddMany(id, command) {
	try {doAddMany(id, command);} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--addmany [name] [letter][number],[letter][number],...")
	}
}
function tryAddArea(id, command) {
	try {doAddArea(id, command);} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--addarea [object/background/wall] [r4:ng3],[r4:ng3],...");
	}
}
function tryMove(id, command) {
	try {doMove(id, command);} catch (err) {
		sendTemp(id, "Error. Please format as follows:\n\t--move [name] [letter][number]")
	}
}
//--------------------------------------------------------------------MAIN
bot.once("ready", () => {
	console.log(`Logged in as ${bot.user.tag}`);
	//sendTo(process.env.TEST_CHANNEL, process.env.TEST_COMMAND);
});

bot.on("messageCreate", (message) => {
	if (!message.author.bot) {
		let shouldDelete = false;
		console.log(`#${message.author.discriminator} @${message.channel.id}`);

		message.content.split("\n").forEach( async (messageLine, i) => {
			if (messageLine.startsWith(PREFIX)) {
				shouldDelete = true;
				console.log(messageLine);
				const command = messageLine.slice(PREFIX.length).split(" ");

				switch (command[0].toLowerCase()) {
					case "quit": doQuit(message.channel.id, command); break; //an exception here should never occur
					//case "help": doHelp(message.channel.id, command); break; //an exception here should never occur
					case "ping": doPing(message.channel.id, command); break; //an exception here should never occur
					case "new": tryNew(message.channel.id, command); break;
					case "hide": tryHide(message.channel.id, command); break;
					case "add": tryAdd(message.channel.id, command); break;
					case "addmany": tryAddMany(message.channel.id, command); break;
					case "addarea": tryAddArea(message.channel.id, command); break;
					case "move": tryMove(message.channel.id, command); break;
					case "map": await doMap(message.channel.id, command); break; //an exception here shows a fatal error.

					default: sendTo(message.channel.id, messageLine.slice(PREFIX.length));
				}
			}
		});
		if (shouldDelete) {message.delete();}
	}
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.TOKEN);
