require("dotenv").config();

const { Client, Intents, MessageAttachment} = require("discord.js");
const {createCanvas, loadImage} = require ("canvas");
const {DaisyMap, DaisyChar} = require("./map");

//--------------------------------------------------------------------
const bot = new Client({intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS]
});

const PREFIX = "--";
const MAX_PW = 1080, MAX_PH = 800;
const allMaps = new Map();
//--------------------------------------------------------------------
function capitalCase(str) {
	return str[0].toUpperCase() + str.slice(1).toLowerCase();
}
function parseCoords(coord) {
	return [parseInt(coord.slice(1),10), coord.charCodeAt(0)-64];
}
//--------------------------------------------------------------------
function doQuit(id, command) {
	setTimeout(function() {bot.destroy();}, 1500);
}
function doPing(id, command) {
	bot.channels.cache.get(id).send("pong\t(" + (Date.now()-message.createdTimestamp).toString() + "ms)");
}
function doNew(id, command) {
	allMaps.set(id, new DaisyMap(parseInt(command[1],10), parseInt(command[2],10), MAX_PW, MAX_PH));
}
function doHide(id, command) {
	allMaps.get(id).getChar(command[1]).visible = !allMaps.get(id).getChar(command[1]).visible;
}
function doAdd(id, command) {
	allMaps.get(id).addChar(capitalCase(command[2]), new DaisyChar(command[1], parseCoords(command[3]), true));
}
function doAddMany(id, command) {
	command[3].split(",").forEach((coord, i) => {
		allMaps.get(id).addChar(capitalCase(command[2]), new DaisyChar(command[1], parseCoords(coord), true));
	});
}
function doMove(id, command) {
	allMaps.get(id).getChar(command[1]).moveTo(parseCoords(command[2]));
	if (allMaps.get(id).getChar(command[1]).visible) {doMap(id, command);}
}
async function doMap(id, command) {
	bot.channels.cache.get(id).send({
		files: [new MessageAttachment(await allMaps.get(id).buildMap(), id + "_map.png")]
	})
}

//--------------------------------------------------------------------
bot.once("ready", () => {
	console.log(`Logged in as ${bot.user.tag}`);
	//bot.channels.cache.get(process.env.TEST_CHANNEL).send(process.env.TEST_COMMAND);
});

bot.on("messageCreate", (message) => {
	if (!message.author.bot) {
		console.log(`#${message.author.discriminator} @${message.channel.id}`);

		message.content.split("\n").forEach( async (messageLine, i) => {
			if (messageLine.startsWith(PREFIX)) {
				console.log(messageLine);
				const command = messageLine.slice(PREFIX.length).split(" ");

				switch (command[0].toLowerCase()) {
					case "quit": doQuit(message.channel.id, command); break;
					case "ping": doPping(message.channel.id, command); break;
					case "new": doNew(message.channel.id, command); break;
					case "hide": doHide(message.channel.id, command); break;
					case "add": doAdd(message.channel.id, command); break;
					case "addmany": doAddMany(message.channel.id, command); break;
					case "move": doMove(message.channel.id, command); break;
					case "map": await doMap(message.channel.id, command); break;

					default: bot.channels.cache.get(message.channel.id).send(messageLine.slice(PREFIX.length));
				}
			}
		});
		message.delete();
	}
});

//--------------------------------------------------------------------
bot.login(process.env.TOKEN);
