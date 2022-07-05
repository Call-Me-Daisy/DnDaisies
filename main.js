require("dotenv").config();

const fs = require("fs");
const {Intents, TextChannel, ThreadChannel, MessageAttachment, Permissions} = require("discord.js");

const [{sliceArgs}, {DiscordBot, DiscordCleaner, DiceRoller}] = require("cmdaisy-utils").unpack("general", "discord");

const {minorUtils} = require("./utils");
const REG = require("./extender");
const {COMMANDS, CONSOLES} = REG;
//--------------------------------------------------------------------CONSTANTS
const PREFIX = "--";
const instructionDir = "./cache/";

const BOT = new DiscordBot({intents: [
	Intents.FLAGS.GUILDS,
	Intents.FLAGS.GUILD_MESSAGES
]});
//--------------------------------------------------------------------HOLDER
class Holder {
	static collection = new Map();
	static defaultTimer = 1000*60*60*2; //2 hours

	static get(_channelId) {
		return Holder.collection.get(_channelId);
	}
	static fetch(_channel) {
		return Holder.get(((_channel instanceof ThreadChannel) ? BOT.fetchCachedChannel(_channel.parentId) : _channel).id);
	}
	static ensure(_channel) {
		return Holder.fetch(_channel) || new Holder(_channel);
	}
	static require(_channel) {
		const out = Holder.fetch(_channel);
		if (out === undefined) { throw `Required Holder, ${_channel.id}, is undefined`; }
		return out;
	}

	static async clean(_holder, _shouldCache = false) {
		const instructions = _holder.makeInstructionList();
		if (instructions) {
			(_shouldCache)
				? fs.writeFile(instructionDir + `${_holder.channel.id}.txt`, instructions, (err) => {err && console.error(err)})
				: minorUtils.makeTemp(_holder.channel.send("This instruction list is temporary:\n" + instructions))
			;
		}

		clearTimeout(_holder.cleanup);
		await _holder.cleanMap();
		await _holder.revokeThread(!_shouldCache);

		Holder.collection.delete(_holder.channel.id);
	}
	static setCleanTimer(_holder, _timer = Holder.defaultTimer) {
		clearTimeout(_holder.cleanup);
		_holder.cleanup = setTimeout(Holder.clean, _timer, _holder);
	}

	constructor(_channel) {
		this.channel = _channel;

		this.arena = false;
		this.cleanup = false;
		this.map = false;
		this.thread = false;

		Holder.setCleanTimer(this, 2000);
		Holder.collection.set(_channel.id, this);
	}

	makeInstructionList() {
		if (!this.arena) {return false;}
		const commands = this.arena.makeCommandList(...arguments);
		return commands && [""].concat((this.thread) ? [`thread ${this.thread.id}`] : []).concat(commands).join(`\n${PREFIX}`);
	}

	sendMap() {
		this.arena.buildMap(this.thread).then((_map) => {
			this.channel.send({
				files: [new MessageAttachment(_map, this.channel.id + "_map.png")]
			}).then(async (_msg) => {
				await this.cleanMap();
				this.map = _msg;
			});
		});
	}
	cleanMap() {
		return this.map && DiscordCleaner.delete(this.map);
	}

	claimThread(_thread, _notify = true) {
		this.revokeThread();
		this.thread = _thread;
		_notify && minorUtils.makeTemp(
			this.thread.send("This thread has been claimed by DnDaisies\nTo revoke the thread call 'thread' in this thread")
		);
	}
	revokeThread(_notify = true) {
		if (!this.thread) {return false;}
		_notify && minorUtils.makeTemp(
			this.thread.send("This thread is no longer claimed by DnDaisies\nTo claim the thread call 'thread [channelID]' or just 'thread' in the thread to claim")
		);
		this.thread = false;
		return true;
	}
	async createNewThread() {
		this.claimThread(await this.channel.send(
			"A suitable thread could not be found so a new one will be made."
		).then((_anchor) => {
			return _anchor.startThread({name: "DnDaisies_Thread", autoArchiveDuration: 60});
		}));
	}

	setCleanTimer(_timer = Holder.defaultTimer) {
		Holder.setCleanTimer(this, _timer);
	}
}
//--------------------------------------------------------------------COMMANDS
//------------------------------------COMMANDHELPERS
const permissions = {
	isBotAdmin: function(_msg) {return _msg.author.id === process.env.ADMIN_ID;},
	manageMessages: function(_msg) {return _msg.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES);}
};
const fetchRequirement = {
	bot: function(_msg) {return BOT;},
	msg: function(_msg) {return _msg;},
	holder: function(_msg) {return Holder.require(_msg.channel);},
	arena: function(_msg) {
		const out = Holder.fetch(_msg.channel).arena;
		if (!out) { throw `Required Arena, ${_channel.id}, is undefined`; }
		return out;
	},
	thread: function(_msg) {
		const out = Holder.fetch(_msg.channel).thread;
		if (!out) { throw `Required Thread, ${_channel.id}, is undefined`; }
		return out;
	}
};
//------------------------------------MACROS
COMMANDS.registerCategory("Macros",
	"Commands that cannot be used within an instruction list, as they would prevent other commands from operating as intended"
);

COMMANDS.register("Macros", "parse",
	async function(_msg) {
		const ref = await BOT.fetchReference(_msg);
		if (!ref) {return false;}
		DiscordCleaner.delete(_msg);
		return [ref, {delete: ref.author.id === BOT.user.id}];
	},
	"Call this as a reply to a message containing an instruction list to parse that instruction list instead."
);
COMMANDS.register("Macros", "clearmessages",
	async function(_msg, _limit) {
		_msg.channel.messages.fetch({limit: parseInt(_limit, 10) || 50}).then((_fetchMsgs) => {
			const toDelete = _fetchMsgs.filter((message) => !(message.pinned || BOT.fetchCachedChannel(message.id)))
			_msg.channel.bulkDelete(toDelete, true);
		}).catch(err => console.error(err));
		return true;
	},
	"Delete the previous [number] of messages sent to this channel\nRequires MANAGE_MESSAGES permission"
).needPermission = permissions.manageMessages;
COMMANDS.register("Macros", "log",
	function(_msg, _key) {
		if (_key) {
			console.log((function(_lckey){
				switch (_lckey[0]) {
					case "c": return (_lckey[1] === "m") ? _msg.channel.messages : _msg.channel;
					case "g": return (_lckey[1] === "c") ? _msg.guild.channels : _msg.guild;

					default: return _msg;
				}
			})(_key.toLowerCase()));
		}
		else if (_msg.reference !== null) {
			BOT.fetchReference(_msg).then((_ref) => {console.log(_ref);});
		}
		else {
			console.error(`COMMANDS.Macros.log did nothing`);
		}
		return true;
	},
	"Admin Tool; used for debugging"
).needPermission = permissions.isBotAdmin;
COMMANDS.register("Macros", "quit",
	function(_msg) {
		for (const [id, holder] of Holder.collection.entries()) {Holder.clean(holder, true);}
		setTimeout(function() {BOT.destroy();}, 1500);
		return true;
	},
	"Admin Tool; used for updates"
).needPermission = permissions.isBotAdmin;
//------------------------------------FLAGS
COMMANDS.registerCategory("Flags",
	"Commands which only affect the automated Discord interactions (such as displaying the map or deleting the arena) which occur after an instruction list is parsed"
);

COMMANDS.register("Flags", "delete",
	function() {return {force: {delete: true}}},
	"Delete the message containing this command, unless overridden by an error or later call to COMMANDS.Flags.keep"
);
COMMANDS.register("Flags", "keep",
	function() {return {force: {delete: false}}},
	"Do not delete the message containing this command, unless overridden by a later call to COMMANDS.Flags.delete"
);

COMMANDS.register("Flags", "display",
	function() {return {force: {update: true, display: true}}},
	"Do not display the map of this channel's Arena, unless overridden by a later call to COMMANDS.Flags.hidden"
);
COMMANDS.register("Flags", "hidden",
	function() {return {force: {update: false, display: false}}},
	"Display the map of this channel's Arena, unless overridden by an error or later call to COMMANDS.Flags.display"
);

COMMANDS.register("Flags", "clean",
	function() {return {force: {timer: 1000}, suggest: {display: false}}},
	"Trigger the autodeletion of this channel's Arena, unless overridden by an error or later call to COMMANDS.Flags.extend"
);
COMMANDS.register("Flags", "extend",
	function() {return {force: {timer: Holder.defaultTimer}, suggest: {display: false}}},
	"Reset the autodeletion timer of this channel's Arena, unless overridden by an error or later call to COMMANDS.Flags.clean"
);
//------------------------------------TOOLS
COMMANDS.registerCategory("Discord",
	"Commands for which Discord integration is the main purpose"
);

COMMANDS.register("Discord", "explain",
	function(_msg, _key) {
		let toExplain = REG;
		if (_key) {
			for (const keyPart of _key.split(".")) {toExplain = toExplain[keyPart];}
		}
		toExplain.explainText && minorUtils.makeTemp(_msg.channel.send(toExplain.explainText));
		return {display: false};
	},
	"Get helptext and/or a list of subcategories for a given subject.\nNothing to see here you don't already understand :)"
).requires = ["msg"];

COMMANDS.register("Discord", "arena",
	function(_msg, _arenaType) {
		const arenaType = _arenaType.toLowerCase();
		const arenaBuilder = CONSOLES.arena[arenaType];
		if (!arenaBuilder) { throw `Arena type, ${_arenaType}, is undefined`; }

		const holder = Holder.ensure(_msg.channel);
		holder.arena = new arenaBuilder(...sliceArgs(arguments, 2));
		holder.arenaType = arenaType;
	},
	"Create a new arena of a given type.\nArgument options:\n> [arena_type (case-sensitive)] {see CONSOLES.arena.[arena_type] for additional arguments}"
).requires = ["msg"];
COMMANDS.register("Discord", "thread",
	async function(_msg, _channelId) {
		const holder = Holder.ensure(_msg.channel);

		if (!(holder.thread && (holder.thread = await BOT.fetchChannel(holder.thread.id)))) {
			let foo;
			if (_msg.channel instanceof ThreadChannel) {
				holder.claimThread(_msg.channel);
			}
			else if (_channelId && (foo = await BOT.fetchChannel(_channelId)) instanceof ThreadChannel) {
				holder.claimThread(foo);
			}
			else if (_msg.reference !== null && (foo = await BOT.fetchReference(_msg))) {
				holder.claimThread(await BOT.fetchChannel(foo.id));
			}
			else if (foo = await _msg.channel.threads.cache.find(x => x.name = "DnDaisies_Thread")) {
				holder.claimThread(foo);
			}
			else {
				await holder.createNewThread();
				return {suggest: {display: false}};
			}
			holder.arena && holder.arena.updateGroupLayers();
			return;
		}
		if (_msg.channel.id !== holder.thread.id) {
			holder.thread.setArchived(false);
			minorUtils.makeTemp(BOT.fetchMessage(holder.channel.id, holder.thread.id).then((_anchor) => {
				return _anchor && _anchor.reply("bump");
			}));
			return {suggest: {display: false}};
		}

		holder.revokeThread();
		return {suggest: {display: holder.arena && holder.arena.updateGroupLayers()}};
	},
	"A function that handles all the ways to edit and retrieve the thread being used for this channel's arena.\nOptions:"
	+ "\nClaim an existing thread (skipped if there is a current thread):\n> Call 'thread [thread_id]'\n> Call 'thread' in the thread you want to claim\n> Call 'thread' as a reply to the seed message of the thread you want to claim\n> Call 'thread' to claim the most recent thread titled 'DnDaisies_Thread'"
	+ "\nCreate a new thread and claim it (skipped if there is a current thread):\n> Call 'thread' not in a thread and not as a reply to a message that seeds a thread"
	+ "\nBump (and unarchive) the current thread:\n> Call 'thread' in the main channel while there is a current thread"
	+ "\nRevoke current thread:\n> Call 'thread' in the current thread"
).requires = ["msg"];

COMMANDS.register("Discord", "resizearena",
	function(_holder, _arena, _w, _h, _dx, _dy) {
		if (!_arena.canResize) { throw `Arena Type ${_holder.arenaType} cannot be resized`; }
		const w = parseInt(_w, 10);
		const h = parseInt(_h, 10);
		if (isNaN(w) || isNaN(h)) { throw `Invalid new dimensions: [${_w}, ${_h}]`; }

		const instructions = _holder.makeInstructionList(w, h, _dx && parseInt(_dx, 10), _dy && parseInt(_dy, 10));
		if (!instructions) { throw `Cannot generate instructions for arena ${_holder.channel.id} to be resized`; }

		_holder.channel.send(instructions + `\n${PREFIX}display`).then((_msg) => {
			parseMessage(_msg, {delete: true});
		});
		return {force: {update: false, display: false, delete: true}};
	},
	"Create and immediately parse an instruction list where the current arena has been expanded and, optionally, all tokens moved by some offset\nArgument options:\n> [new_width] [new_height] {horizontal_offset} {vertical_offset}\nNotes:> Not all arena_types support this command."
).requires = ["holder", "arena"];
COMMANDS.register("Discord", "instructions",
	function(_holder, _arena) {
		const instructions = _holder.makeInstructionList();
		if (!instructions) {
			console.error(`Call to ${_holder.arenaType}.makeInstructionList returned false`);
			return {suggest: {error: true}};
		}
		_holder.channel.send(instructions);
		return {suggest: {display: false, timer: false}};
	},
	"Create an instruction list that describes all groups and tokens in the current arena.\nNo arguments\nNotes:\n> Not all arena_types support this command."
).requires = ["holder", "arena"];

COMMANDS.register("Discord", "showguide",
	function(_arena) {
		return {suggest: {display: _arena.showGuide(...sliceArgs(arguments, 1)).hasShape()}};
	},
	"Display the previous guide (does not persist across calls to 'arena') on the current map\nArgument options:\n> {additional arguments from CONSOLES.showguide[arena_type]}"
).requires = ["arena"];
COMMANDS.register("Discord", "addguide",
	function(_arena, _guideType) {
		const guideBuilder = CONSOLES.guide[_guideType.toLowerCase()];
		if (guideBuilder === undefined) { throw `GuideType, ${_guideType}, is undefined`; }

		_arena.addGuide(...guideBuilder(_arena, ...sliceArgs(arguments, 2)));
	},
	"Add a shape to the current guide, and display them all\nArgument options:\n> [shape (see CONSOLES.guide for options)] {additional arguments from CONSOLES.guide.[shape]}"
).requires = ["arena"];
COMMANDS.register("Discord", "setguide",
	function(_arena, _guideType) {
		_arena.clearGuide();
		if (_guideType === undefined) {return {suggest: {display: false}};}

		COMMANDS.Discord.addguide(...arguments);
	},
	"Remove all shapes to the current guide, then optionally call addguide.\nArgument options:\n> {arguments to pass to addguide} *=> no arguments just clears current guide*"
).requires = ["arena"];

COMMANDS.register("Discord", "ping",
	function(_bot, _msg) {
		const msgPing = Math.abs(Date.now() - _msg.createdTimestamp);
		const botPing = Math.abs(_bot.ws.ping);

		minorUtils.makeTemp(_msg.channel.send(
			`Pong!\n> Total Ping: ${msgPing + botPing}ms\n> From Message: ${msgPing}ms\n> From Bot: ${botPing}ms`
		));
		return {suggest: {display: false}};
	},
	"Ping the bot.\nNo arguments"
).requires = ["bot", "msg"];
COMMANDS.register("Discord", "roll",
	function(_msg, _pools) {
		minorUtils.makeTemp(_msg.channel.send(DiceRoller.rollStr(_pools).toString()));
		return {suggest: {display: false}};
	},
	"Roll a series of dice pools and add (or subtract) their results together.\nArgument options:\n> [roll_descriptor+/-roll_descriptor+/-...]\n"
	+ "Each roll descriptor can be one of the following:\n> [X]d[Y] = Roll [X] [Y]-sided dice\n> [X]d[Y]kh[Z] = Roll [X] [Y]-sided dice and keep the highest [Z]\n> [X]d[Y]kl[Z] = Roll [X] [Y]-sided dice and keep the lowest [Z]"
).requires = ["msg"];
//------------------------------------ALIAS
COMMANDS.addAliases("Flags", "display", "map");
COMMANDS.addAliases("Flags", "hidden", "nomap");
COMMANDS.addAliases("Flags", "clean", "finished");
COMMANDS.addAliases("Flags", "extend", "continue");

COMMANDS.addAliases("Discord", "explain", "help");
COMMANDS.addAliases("Discord", "arena", "new");

COMMANDS.addAliases("Discord", "resizearena", "expand");
COMMANDS.addAliases("Discord", "instructions", "collapse");
//--------------------------------------------------------------------MAIN
function fetchCommand(_msg, _commandName) {
	const categories = ["Flags", "Discord", "core"];

	const holder = Holder.fetch(_msg.channel);
	holder && holder.arenaType && categories.splice(2, 0, holder.arenaType);

	for (const category of categories) {
		const out = COMMANDS[category][_commandName];
		if (out !== undefined) {return out;}
	}

	throw `Command ${_commandName} not found`;
}
function fetchRequirements(_msg, _command) {
	const out = [];
	for (const req of Object.values(_command.requires || {})) {
		out.push(fetchRequirement[req](_msg));}
	return out;
}
function doCommand(_msg, _commandName, _args = []) {
	const command = fetchCommand(_msg, _commandName.toLowerCase());
	return command(...fetchRequirements(_msg, command), ..._args);
}
async function parseInstructionList(_msg, _flags = {}) {
	_flags.force === undefined && (_flags.force = {});
	_flags.suggest === undefined && (_flags.suggest = {});

	for (const messageLine of _msg.content.split("\n")) {
		if (_flags.error) {break;}
		else if (messageLine.startsWith(PREFIX)) {
			const command = messageLine.slice(PREFIX.length).split(" ");
			console.log(command);
			try {
				for (const [key, val] of Object.entries(await doCommand(_msg, command[0], command.slice(1)) || {})) {
					if (_flags[key] === undefined) {_flags[key] = val;}
					else if (key === "force" || (key === "suggest" && !_flags.didCommand)) {
						for (const [subKey, subVal] of Object.entries(val)) {_flags[subKey] = subVal;}
					}
				}
			} catch (e) {_flags.error = command.join(" "); console.error(e);}
			_flags.didCommand = true;
		}
	}
	return _flags;
}
async function parseMessage(_msg) {
	const macroStr = _msg.content.split("\n")[0].split(" ");
	const macro = macroStr[0].startsWith(PREFIX) && (COMMANDS.Macros[macroStr[0].slice(PREFIX.length).toLowerCase()]);
	const macroFlag = macro && (!macro.needPermission || macro.needPermission(_msg)) && await macro(_msg, macroStr.slice(1));

	if (typeof macroFlag === "boolean") {
		if (macroFlag) {DiscordCleaner.delete(_msg);}
		return;
	}

	console.log(`#${_msg.author.discriminator} @${_msg.channel.id}`);
	let [msg, flags] = macroFlag || [_msg, {}];
	flags = await parseInstructionList(msg, flags);

	if (flags.error) {
		minorUtils.makeTemp(msg.channel.send("Some Error Message"));
	}
	else if (flags.didCommand) {
		const holder = Holder.fetch(msg.channel);
		if (holder) {
			flags.timer !== false && Holder.setCleanTimer(holder, flags.timer);
			if (holder.arena) {
				flags.update && holder.arena.updateAllLayers();
				try {
					flags.display !== false && await holder.sendMap();
				} catch (e) {flags.error = true; console.error(`Problem displaying map in channel @${_msg.channel.id}`);}
			}
		}

		flags.delete === false || flags.error || DiscordCleaner.delete(msg);
	}
}

BOT.on("ready", () => {
	if (!CONSOLES.arena) { throw "No arenas have been registered"; }

	console.log(`Logged in as ${BOT.user.tag}`);
	BOT.user.setActivity(`for ${PREFIX}explain`, {type: "WATCHING"});

	fs.readdir(instructionDir, (dir_e, files) => {
		if (dir_e) { throw dir_e; }

		for (const fileName of files) {
			const filePath = instructionDir + fileName;
			fs.readFile(filePath, (read_e, data) => {
				if (read_e) { throw read_e; }

				try {
					BOT.fetchCachedChannel(fileName.split(".")[0]).send(data.toString()).then((_msg) => {
						parseMessage(_msg, {delete: true});
					});
				} catch (e) {console.error(`Could not find channel ${fileName.split(".")[0]}`);}
				fs.rm(filePath, (rm_e) => {
					if (rm_e) { throw rm_e; }
				});
			});
		}
	});
});
BOT.on("messageCreate", (_msg) => {
	!_msg.author.bot && parseMessage(_msg);
});
BOT.on("guildDelete", (_guild) => {
	_guild.channels.fetch().then((_channels) => {
		for (const [id, textChannel] of _channels.filter((c) => c.type === "GUILD_TEXT").entries()) {
			const holder = Holder.get(id);
			holder && Holder.clean(holder);
		}
	}).catch(err => console.error(err));
});
//--------------------------------------------------------------------FINALIZE
BOT.login(process.env.DEV_TOKEN);

process.on("SIGINT", () => {
	COMMANDS.Macros.quit();
});

module.exports = {};
