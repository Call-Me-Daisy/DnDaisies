const fs = require("fs");

const { Client, GatewayIntentBits } = require("discord.js");

const CONFIG = require("./config");

const { createLoggerFunctionsFromFileNames } = require("./utils");
//--------------------------------------------------------------------MAIN
const BOT = module.exports = new Client({intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages
]});
[BOT.log, BOT.err] = createLoggerFunctionsFromFileNames("logs/log.txt", "logs/err.txt");

BOT.arenas = new class {
	set(_interaction, _arena) { return this[_interaction.channelId] = _arena; }
	fetch(_interaction) { return this[_interaction.channelId]; }
	delete(_interaction) {
		clearTimeout(this.fetch(_interaction)?.timeout);
		delete this[_interaction.channelId];
	}
};
BOT.commands = {};

//--------------------------------------------------------------------UTILS
BOT.utils = {
	//Simple Wrappers
	deleteReply: (_interaction) => {
		_interaction.deleteReply().catch((error) => { BOT.err(`deleteReply failed: ${error}`); });
	},
	getOptions: (_interaction) => {
		const out = {};
		for (const option of _interaction.options._hoistedOptions) {
			out[option.name] = option.attachment || option.value;
		}
		return out;
	},

	formatMessage: (_msgPromise) => {
		_msgPromise.then((msg) => {
			msg.edit(
				`**Session Date: ${new Date(Date.now()).toLocaleDateString()}**\n||message_id: ${msg.id}||` + msg.content
			);
		});
		return _msgPromise;
	},
	findOldThread: (_interaction) => {
		return _interaction.channel.threads.cache.find(x => x.isThread() && x.name === CONFIG.thread_name);
	},
	createNewThread: (_interaction) => {
		return _interaction.member.guild.channels.cache.get(_interaction.channelId).send(CONFIG.thread_anchor)
			.then((anchor) => {
				return anchor.startThread({
					name: CONFIG.thread_name,
					reason: CONFIG.thread_reason,
					autoArchiveDuration: 60
				});
			})
		;
	},

	//Arena Throwers
	requireArena: (_interaction) => {
		const out = BOT.arenas.fetch(_interaction);
		if (!out) { throw "UserError: There is no arena in the current channel"; }
		return out;
	},
	requireThread: (_interaction) => {
		const out = BOT.arenas.fetch(_interaction)?.homeThread || BOT.utils.findOldThread(_interaction);
		if (!out) { throw "UserError: There is no homeThread in the current channel"; }
		return out;
	},

	//Attachments
	ensureHomeThread: async (_interaction, _notify = true) => {
		const arena = BOT.arenas.fetch(_interaction) || {};
		if (arena.homeThread) { return arena.homeThread; }

		const out = (await BOT.utils.findOldThread(_interaction)) || (await BOT.utils.createNewThread(_interaction));
		_notify && out.send(CONFIG.thread_claim);
		return arena.homeThread = out;
	},
	attachHomeThread: async (_interaction, _filePromise, _fileName) => {
		return Promise.all([BOT.utils.ensureHomeThread(_interaction), _filePromise])
			.then(([thread, file]) => {
				return BOT.utils.formatMessage(
					thread.send({files: [{attachment: file, name: _fileName.toLowerCase()}]})
				);
			})
		;
	},
	findInHomeThread: async (_interaction, _messageId) => {
		return BOT.utils.ensureHomeThread(_interaction, false)
			.then((thread) => {
				return thread.messages.fetch(_messageId);
			})
		;
	},

	sendAsFile: async (_interaction, _dataString, _fileName) => {
		const path = `./cache/${_interaction.channelId}_${_fileName}`;
		await fs.writeFile(path, _dataString, "utf8", (err) => {
			if (err) {
				BOT.log(`${path} could not be saved`);
				throw err;
			}
		});
		return BOT.utils.attachHomeThread(_interaction, path, _fileName)
			.then((msg) => {
				fs.unlink(path, (err) => { err && BOT.err(err); });
				msg.pin();
			})
		;
	},
	displayMap: async (_interaction) => {
		return BOT.utils.attachHomeThread(
			_interaction,
			BOT.utils.requireArena(_interaction).fetchMap(),
			`${_interaction.channelId}_map.png`
		)
	},

	//Arena Wrappers
	saveArena: (_interaction) => {
		const pack = BOT.arenas.fetch(_interaction)?.pack();

		if (pack === undefined) { return BOT.err("Warning: saveArena called on empty channel"); }
		if (!Object.values(pack.groups).length) { return BOT.err("Warning: saveArena called on empty arena"); }

		return BOT.utils.sendAsFile(_interaction, JSON.stringify(pack), "pack.json");
	},
	closeArena: (_interaction, _save = true) => {
		_save && BOT.utils.saveArena(_interaction);
		BOT.arenas.delete(_interaction);
	},
	setArena: (_interaction, _arena, _save) => {
		BOT.utils.closeArena(_interaction, _save);
		BOT.arenas.set(_interaction, _arena).homeThread = BOT.utils.findOldThread(_interaction);
	}
};

//--------------------------------------------------------------------FLAGHANDLER
const handlerFunctions = {
	delete: (_interaction, _arena, _flag) => {
		setTimeout(() => { BOT.utils.deleteReply(_interaction); }, CONFIG.reply_duration);
	},
	update: (_interaction, _arena, _flag) => {
		if (!_arena) { return; }
		if (_flag.all) { return _arena.stack.updateAllLayers(); }

		_flag.image && _arena.stack.updateImageLayers();
		_flag.group && _arena.stack.updateGroupLayers();
		_flag.multi && _arena.stack.updateMultiLayers();
	},
	display: (_interaction, _arena, _flag) => {
		if (!_arena) { return; }
		BOT.utils.displayMap(_interaction);
	},
	extend: (_interaction, _arena, _flag) => {
		if (!_arena) { return; }
		clearTimeout(_arena.timeout);
		_arena.timeout = setTimeout(() => {
			_arena.homeThread.send(CONFIG.clean_notification);
			BOT.utils.closeArena(_interaction);
		}, 3600000);
	}
};
BOT.FlagHandler = class {
	constructor() {
		this.delete = true;
		this.update = false;
		this.display = true;
		this.extend = true;
	}
	resolve(_interaction) {
		const arena = BOT.arenas.fetch(_interaction);
		for (const [key, val] of Object.entries(this)) {
			val !== false && handlerFunctions[key]?.(_interaction, arena, val);
		}
	}
}
for (const flag of Object.keys(handlerFunctions)) {
	BOT.FlagHandler.prototype["set" + flag[0].toUpperCase() + flag.slice(1)] = function (_val) {
		this[flag] = _val;
		return this;
	}
}
