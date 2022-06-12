require("dotenv").config();

const fs = require("fs");
const {Intents, MessageAttachment, TextChannel, ThreadChannel} = require("discord.js");

const [{sliceArgs}, {DiscordBot, DiscordCleaner}] = require("cmdaisy-utils").unpack("general", "discord");

const {minorUtils} = require("./utils");
const REG = require("./extender");
const {COMMANDS, CONSOLES} = REG;
//--------------------------------------------------------------------CONSTANTS
const PREFIX = "--";
const instructionDir = "./cache/";

const bot = new DiscordBot({intents: [
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
		return Holder.get(((_channel instanceof ThreadChannel) ? bot.fetchCachedChannel(_channel.parentId) : _channel).id);
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
		_notify && minorUtils.makeTemp(this.thread.send("TO_DO: NOTIFY CLAIM THREAD"));
	}
	revokeThread(_notify = true) {
		if (!this.thread) {return false;}
		_notify && minorUtils.makeTemp(this.thread.send("TO_DO: NOTIFY REVOKE THREAD"));
		this.thread = false;
		return true;
	}
}
//--------------------------------------------------------------------MACROS
function doLog(_msg, _key) {
	let toLog;
	if (_key) {
		console.log((function(_lckey){
			switch (_lckey[0]) {
				case "c": return _msg.channel;
				case "g":
					return (_lckey[1] === "c") ? _msg.guild.channels : _msg.guild;

				default: return _msg;
			}
		})(_key.toLowerCase()));
	}
	else if (_msg.reference !== null) {
		bot.fetchReference(_msg).then((_ref) => {console.log(_ref);});
	}
	else {
		console.error(`log macro did nothing`);
	}
}
function doClearMessages(_msg, _limit = 100) {
	_msg.channel.messages.fetch({limit: _limit}).then((_fetchedMsg) => {
		const notPinned = _fetchedMsg.filter((message) => !(message.pinned || bot.fetchCachedChannel(message.id)));
		_msg.channel.bulkDelete(notPinned, true);
	}).catch(err => console.error(err));
}
function doQuit() {
	for (const [id, holder] of Holder.collection.entries()) {Holder.clean(holder, true);}
	setTimeout(function() {bot.destroy();}, 1500);
}

function doTest(_msg) {

}

const fetchRequirement = {
	bot: function(_msg) {return bot;},
	message: function(_msg) {return _msg;},
	holder: function(_msg) {return Holder.require(_msg.channel);},
	arena: function(_msg) {
		const out = Holder.fetch(_msg.channel).arena;
		if (!out) { throw `Required Arena, ${_channel.id}, is undefined`; }
		return out;
	}
};
//--------------------------------------------------------------------COMMANDS
//------------------------------------FLAGS
COMMANDS.registerCategory("flags");
COMMANDS.register("flags", "delete",
	function() {return {force: {delete: true}}},
	"Delete the message containing this command, unless overridden by an error or later call to COMMANDS.flags.keep"
);
COMMANDS.register("flags", "keep",
	function() {return {force: {delete: false}}},
	"Do not delete the message containing this command, unless overridden by a later call to COMMANDS.flags.delete"
);

COMMANDS.register("flags", "display",
	function() {return {force: {update: true, display: true}}},
	"Do not display the map of this channel's Arena, unless overridden by a later call to COMMANDS.flags.hidden"
);
COMMANDS.register("flags", "hidden",
	function() {return {force: {update: false, display: false}}},
	"Display the map of this channel's Arena, unless overridden by an error or later call to COMMANDS.flags.display"
);

COMMANDS.register("flags", "clean",
	function() {return {force: {timer: 1000}, suggest: {display: false}}},
	"Trigger the autodeletion of this channel's Arena, unless overridden by an error or later call to COMMANDS.flags.extend"
);
COMMANDS.register("flags", "extend",
	function() {return {force: {timer: Holder.defaultTimer}, suggest: {display: false}}},
	"Reset the autodeletion timer of this channel's Arena, unless overridden by an error or later call to COMMANDS.flags.clean"
);
//------------------------------------TOOLS
COMMANDS.register("tools", "explain",
	function(_msg, _key) {
		let toExplain = REG;
		if (_key) {
			for (const keyPart of _key.split(".")) {toExplain = toExplain[keyPart];}
		}
		toExplain.explainText &&	minorUtils.makeTemp(_msg.channel.send(toExplain.explainText));
		return {display: false};
	},
	"Get helptext and/or a list of subcategories for a given subject.\nNothing to see here you don't already understand :)"
).requires = ["message"];

COMMANDS.register("tools", "arena",
	function(_msg, _arenaType) {
		const arenaType = _arenaType.toLowerCase();
		const arenaBuilder = CONSOLES.arena[arenaType];
		if (!arenaBuilder) { throw `Arena type, ${_arenaType}, is undefined`; }

		const holder = Holder.ensure(_msg.channel);
		holder.arena = new arenaBuilder(...sliceArgs(arguments, 2));
		holder.arenaType = arenaType;
	},
	"Create a new arena of a given type.\nArgument options:\n> [arena_type (case-sensitive)] {see CONSOLES.arena.[arena_type] for additional arguments}"
).requires = ["message"];
COMMANDS.register("tools", "thread",
	async function(_msg, _channelId) {
		const holder = Holder.ensure(_msg.channel);

		if (!(holder.thread && (holder.thread = await bot.fetchChannel(holder.thread.id)))) {
			let foo;
			if (_msg.channel instanceof ThreadChannel) {
				holder.claimThread(_msg.channel);
			}
			else if (_channelId && (foo = await bot.fetchChannel(_channelId)) instanceof ThreadChannel) {
				holder.claimThread(foo);
			}
			else if (_msg.reference !== null && (foo = await bot.fetchReference(_msg))) {
				holder.claimThread(await bot.fetchChannel(foo.id));
			}
			else if (foo = await _msg.channel.threads.cache.find(x => x.name = "DnDaisies_Thread")) {
				holder.claimThread(foo);
			}
			else {
				holder.claimThread(await holder.channel.send("TO_DO: New Thread Prompt").then((_anchor) => {
					return _anchor.startThread({name: "DnDaisies_Thread", autoArchiveDuration: 60});
				}));
				return {suggest: {display: false}};
			}
			holder.arena && holder.arena.updateGroupLayers();
			return;
		}
		if (_msg.channel.id !== holder.thread.id) {
			holder.thread.setArchived(false);
			minorUtils.makeTemp(bot.fetchMessage(holder.channel.id, holder.thread.id).then((_anchor) => {
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
).requires = ["message"];

COMMANDS.register("tools", "showguide",
	function(_arena) {
		return {suggest: {display: _arena.showGuide(...sliceArgs(arguments, 1)).hasShape()}};
	},
	"Display the previous guide (does not persist across calls to 'arena') on the current map\nArgument options:\n> {additional arguments from CONSOLES.showguide[arena_type]}"
).requires = ["arena"];
COMMANDS.register("tools", "addguide",
	function(_holder, _arena, _guideType) {
		const guideBuilder = CONSOLES.guide[_guideType.toLowerCase()];
		if (guideBuilder === undefined) { throw `GuideType, ${_guideType}, is undefined`; }

		_arena.addGuide(...guideBuilder(_arena, ...sliceArgs(arguments, 3)));
	},
	"Add a shape to the current guide, and display them all\nArgument options:\n> [shape (see CONSOLES.guide for options)] {additional arguments from CONSOLES.guide.[shape]}"
).requires = ["holder", "arena"];
COMMANDS.register("tools", "setguide",
	function(_holder, _arena, _guideType) {
		_arena.clearGuide();
		if (_guideType === undefined) {return {suggest: {display: false}};}

		COMMANDS.tools.addguide(...arguments);
	},
	"Remove all shapes to the current guide, then optionally call addguide.\nArgument options:\n> {arguments to pass to addguide} *=> no arguments just clears current guide*"
).requires = ["holder", "arena"];

COMMANDS.register("tools", "instructions",
	function(_holder, _arena) {
		const instructions = _holder.makeInstructionList();
		if (!instructions) {
			console.error(`Call to ${holder.arenaType}.makeInstructionList returned false`);
			return {suggest: {error: true}};
		}
		_holder.channel.send(instructions);
		return {suggest: {display: false, timer: false}};
	},
	"Create an instruction list that describes all groups and tokens in the current arena.\nNo arguments\nNotes:\n> Not all arena_types support this command."
).requires = ["holder", "arena"];
COMMANDS.register("tools", "resizearena",
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
//------------------------------------ALIAS
COMMANDS.addAliases("flags", "display", "map");
COMMANDS.addAliases("flags", "hidden", "nomap");
COMMANDS.addAliases("flags", "clean", "finished");
COMMANDS.addAliases("flags", "extend", "continue");

COMMANDS.addAliases("tools", "explain", "help");
COMMANDS.addAliases("tools", "arena", "new");
COMMANDS.addAliases("tools", "resizearena", "expand");
//--------------------------------------------------------------------MAIN
function fetchCommand(_msg, _commandName) {
	for (const typeName of ["flags", "tools", "core"]) {
		const out = COMMANDS[typeName][_commandName];
		if (out !== undefined) {return out;}
	}
	const holder = Holder.fetch(_msg.channel);
	const out = ((holder && holder.arenaType && COMMANDS[holder.arenaType]) || {})[_commandName];
	if (out !== undefined) {return out;}

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
			} catch (e) {_flags.error = true; console.error(e);}
			_flags.didCommand = true;
		}
	}
	return _flags;
}
async function parseMessage(_msg) {
	console.log(`#${_msg.author.discriminator} @${_msg.channel.id}`);

	let [msg, flags] = await (async function(_line0) {
		if (_line0.startsWith(PREFIX)) {
			const macro = _line0.slice(PREFIX.length).split(" ");
			switch (macro[0]) {
				case "parse":
					const ref = await bot.fetchReference(_msg);
					if (ref) {
						DiscordCleaner.delete(_msg);
						return [ref, {delete: ref.author.id === bot.user.id}];
					}
					return;
				case "log":
					doLog(_msg, macro[1]);
					break;
				case "quit":
					_msg.author.id === process.env.ADMIN_ID && doQuit();
					break;
				case "clearmessages":
					_msg.author.id === process.env.ADMIN_ID && doClearMessages(_msg, parseInt(macro[1]) || undefined);
					break;
				case "test":
					_msg.author.id === process.env.ADMIN_ID && doTest(_msg, ...macro.slice(1));
					break;

				default: return;
			}
			DiscordCleaner.delete(_msg);
			return [false, false];
		}
		return;
	})(_msg.content.split("\n")[0].toLowerCase()) || [_msg, {}];

	msg && (flags = await parseInstructionList(msg, flags));

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

bot.on("ready", () => {
	if (!CONSOLES.arena) { throw "No arenas have been registered"; }

	console.log(`Logged in as ${bot.user.tag}`);
	bot.user.setActivity(`for ${PREFIX}explain`, {type: "WATCHING"});

	fs.readdir(instructionDir, (dir_e, files) => {
		if (dir_e) { throw dir_e; }

		for (const fileName of files) {
			const filePath = instructionDir + fileName;
			fs.readFile(filePath, (read_e, data) => {
				if (read_e) { throw read_e; }

				try {
					bot.fetchCachedChannel(fileName.split(".")[0]).send(data.toString()).then((_msg) => {
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
bot.on("messageCreate", (_msg) => {
	!_msg.author.bot && parseMessage(_msg);
});
bot.on("guildDelete", (_guild) => {
	_guild.channels.fetch().then((_channels) => {
		for (const [id, textChannel] of _channels.filter((c) => c.type === "GUILD_TEXT").entries()) {
			const holder = Holder.get(id);
			holder && Holder.clean(holder);
		}
	}).catch(err => console.error(err));
});
//--------------------------------------------------------------------FINALIZE
bot.login(process.env.DEV_TOKEN);

process.on("SIGINT", () => {
	doQuit();
});

module.exports = {};
