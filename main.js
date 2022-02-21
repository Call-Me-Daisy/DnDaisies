require("dotenv").config();

const {Client, Intents, MessageAttachment, TextChannel} = require("discord.js");
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
function buildLinks(message) {
	return {g: message.guild, c: message.channel, m: message};
}
function fetchMap(links) {
	return allMaps.get(links.c.id);
}

function fetchMessage(idC, idM) {
	return bot.channels.cache.get(idC).messages.fetch(idM);
}
function fetchReference(msg) {
	return fetchMessage(msg.reference.channelId, msg.reference.messageId);
}
function deleteFrom(idC, idM) {
	fetchMessage(idC,idM).then((msg) => {
		msg.delete();
	}).catch((error) => {});
}

function sendTo(links, content) {
	return links.c.send(content);
}
function makeTemp(message, duration = HELPTIMER) {
	message.then((msg) => {
		setTimeout(() => msg.delete(), duration);
	});
}

function clearImg(dMap) {
	if (dMap.img) {
		deleteFrom(dMap.img.parentId, dMap.img.id);
		dMap.img.delete().catch((error) => {});
	}
}
function clearMap(dMap) {
	if (dMap.map) {dMap.map.delete().catch((error) => {});}
}
//--------------------------------------------------------------------DECLUTTERING
function doQuit() {//TEMP: For cleaning between updates
	allMaps.forEach((dMap, id) => {
		clearMap(dMap);
		clearImg(dMap);
	});

	setTimeout(function() {bot.destroy();}, HELPTIMER*1.5);
}
function doLog(links, command) {//TEMP: Debug helper
	if (command.size !== 1) {
		switch (command[1][0].toLowerCase()) {
			case "m": console.log(links.m); break;
			case "c": console.log(links.c); break;
			case "g": console.log(links.g); break;
		}
	}
	else if (links.m.reference !== null) {
		fetchReference(links.m).then((msg) => {console.log(msg)});
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
		TEAM.forEach((teamTup, key) => {
			msgMap.set(teamTup[0], [`__Team: ${teamTup[1]}__`]);
		});
		fetchMap(links).chars.forEach((char, key) => {
			msgMap.get(char[0].team).push(`Token: ${DaisyChar.makeCharCode(key)} => Name: ${key}`);
		});

		let msg = [];
		if (command.length == 1) {
			msgMap.forEach((ls, team) => {
				if (ls.length > 1) {msg.push(ls.join("\n"));}
			});
		}
		else {msg.push(msgMap.get(TEAM.get(command[1][0].toLowerCase())[0]).join("\n"));}
		makeTemp(sendTo(links, msg.join("\n")));
	} catch (e) {
		doHelp(links, ["","list"]);
	}
}
function doNew(links, command) {
	try {
		const [map, img] = DaisyMap.recover(fetchMap(links));
		while(command.length < 5) {command.push(undefined);}
		allMaps.set(links.c.id, new DaisyMap(command[1], command[2], command[3], command[4], map, img));
	} catch (e) {
		doHelp(links, ["","new"]);
	}
}
function doHide(links, command) {
	try {
		const char = fetchMap(links).getChar(command[1])
		char.visible = !char.visible;
	} catch (e) {
		doHelp(links, ["hide"]);
	}
}
function doAdd(links, command) {
	try {
		fetchMap(links).addChar(DaisyChar.toKeyCase(command[2]), new DaisyChar(command[1], command[3], true));
	} catch (e) {
		doHelp(links, ["","add"]);
	}
}
function doCopy(links, command) {
	try {
		let charStr = DaisyChar.toKeyCase(command[1]);
		const thisMap = fetchMap(links);
		const parent = thisMap.getChar(charStr);
		charStr = DaisyChar.getCharTup(charStr)[0];
		command[2].split(",").forEach((coord, i) => {
			thisMap.addChar(charStr, parent.copy(coord));
		});
	} catch (e) {
		doHelp(links, ["","copy"]);
	}
}
function doRemove(links, command) {
	try {
		const thisMap = fetchMap(links);
		const charStr = DaisyChar.toKeyCase(command[1]);

		let allRemoved = true;

		thisMap.getChar(charStr).removed = true;
		thisMap.getCharLs(charStr).forEach((char, i) => {
			if (!char.removed) {allRemoved = false;}
		});
		if (allRemoved) {thisMap.removeCharLs(charStr);}
	} catch (e) {
		doHelp(links, ["","remove"]);
	}
}
function doAddGroup(links, command) {
	try {
		const thisMap = fetchMap(links);
		const charName = DaisyChar.toKeyCase(command[2]);
		command[3].split(",").forEach((coord, i) => {
			thisMap.addChar(charName, new DaisyChar(command[1], coord, true));
		});
	} catch (e) {
		doHelp(links.c.id, ["","addgroup"]);
	}
}
function doAddArea(links, command) {
	try {
		fetchMap(links).addArea(command[1], command[2]);
	} catch (e) {
		doHelp(links, ["","addarea"]);
	}
}
function doMove(links, command) {
	try {
		fetchMap(links).getChar(DaisyChar.toKeyCase(command[1])).moveTo(command[2]);
	} catch (e) {
		doHelp(links, ["","move"]);
	}
}
function doMoveGroup(links, command) {
	try {
		const charLs = fetchMap(links).getCharLs(DaisyChar.toKeyCase(command[1]));
		let numRemoved = 0;
		command[2].split(",").forEach((coord, i) => {
			while (i+numRemoved < charLs.length && charLs[i+numRemoved].removed) {numRemoved++;}
			if (i+numRemoved >= charLs.length) {return;}
			charLs[i+numRemoved].moveTo(coord);
		});
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
function doImage(links) {
	try {
		if (!(links.c instanceof TextChannel)) {doHelp(links, ["","image"]);}
		else {
			if (fetchMap(links) === undefined) {doNew(links,["","A1"]);}
			let dMap = fetchMap(links);
			if (!dMap.img) {
				sendTo(links, process.env.THREADPROMPT).then((message) => {
					message.startThread({
						name: process.env.THREADNAME,
						autoArchiveDuration: 60
					}).then((thread) => {
						dMap.img = thread
						if (links.m.reference !== null) {//TEMP: Quick reset after quit
							fetchReference(links.m).then((msg) => {
								if (!msg.hasThread) {return;}
								bot.channels.cache.get(msg.id).messages.fetch({limit:100}).then((messages) => {
									messages.forEach((msg, i) => {
										if (msg.attachments.size > 0) {
											let entries = [];
											msg.attachments.forEach((attachment, j) => {entries.push(attachment)});
											thread.send({
												content: msg.content,
												files: entries
											});
										}
									});
								});
							});
						}
					});
				});
			}
			else {
				dMap.img.setArchived(false);
				fetchMessage(links.c.id, dMap.img.id).then((msg) => {
					makeTemp(msg.reply("bump"));
				});
			}
		}
	} catch (e) {
		doHelp(links, ["","image"]);
	}
}
async function doMap(links) {
	try {
		let dMap = fetchMap(links);
		if (dMap.map) {clearMap(dMap);}
		sendTo(links, {files: [
			new MessageAttachment(await dMap.buildMap(), links.c.id + "_map.png")
		]}).then((msg) => {
			fetchMap(links).map = msg;
		});
	} catch (e) {
		throw e;
		doHelp(links, ["","map"]);
	}
}
//--------------------------------------------------------------------TESTING
async function test_drawBackground(dMap, imgUrls) {
	try {
		let bg = imgUrls.get("Background");
		if (bg === undefined) {throw "";}
		dMap.context.drawImage(
			await loadImage(imgUrls.get("Background")), dMap.pS, dMap.pS, dMap.dims[0]*dMap.pS, dMap.dims[1]*dMap.pS);
	} catch (e) {
		dMap.context.fillStyle = DaisyChar.getColour("b");
		dMap.fillArea(dMap.bg);
		dMap.context.fillStyle = DaisyChar.getColour("o");
		dMap.fillArea(dMap.obj);
		dMap.context.fillStyle = DaisyChar.getColour("w");
		dMap.fillArea(dMap.wall);
	}
}
async function test_drawTokens(dMap, imgUrls) {
	for (const [charName, charLs] of dMap.chars) {
		let many = (charLs.size > 1);
		let img, txt;
		try {
			let url = imgUrls.get(charName);
			if (url === undefined) {throw "";}
			img = loadImage(imgUrls.get(charName));
			txt = false;
		} catch (e) {
			txt = DaisyChar.makeCharCode(charName);
			img = false;
		}
		console.log(txt, "=>", img);

		for (const [i, char] of charLs.entries()) {
			if (char.visible && !char.removed) {
				if (txt) {
					dMap.context.fillStyle = char.team;
					dMap.fillCell(char.pos[0], char.pos[1]);
					dMap.context.fillStyle = "#000";
					dMap.writeCell((many) ? txt + (i+1).toString() : txt, char.pos[0], char.pos[1]);
				}
				else {
					dMap.drawCell(await img, char.pos[0], char.pos[1]);
					if (many) {
						dMap.context.fillStyle = char.team;
						this.writeCell((i+1).toString(), char.pos[0], char.pos[1]);
					}
				}
			}
		}
	}
}
async function doTest(links, command) {
	let dMap = fetchMap(links);
	let imgUrls = await dMap.fetchImgUrls();

	dMap.prepMap();
	await test_drawBackground(dMap, imgUrls);
	await test_drawTokens(dMap, imgUrls);

	makeTemp(sendTo(links, {
		content: "TESTING",
		files: [new MessageAttachment(await dMap.canvas.toBuffer("image/png"), "test.png")]
	}));
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
			case "ping": doPing(links); break;
			case "image": doImage(links); break;
			case "display":
			case "map": doMap(links); break;

			default: makeTemp(sendTo(links, `Unknown command:\n${command.join(" ")}`));
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
		if (shouldDelete != false) {message.delete();}
	}
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.TOKEN);
