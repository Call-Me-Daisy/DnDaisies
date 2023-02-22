const { SlashCommandBuilder } = require("discord.js");

const CONFIG = require("../config");
const BOT = require("../bot");

const { fetchJSON, fetchText } = require("../utils");
const { rangeParser } = require("../parsers");
const { Arena } = require("../arena");
//--------------------------------------------------------------------MAIN
const parseOption = [
	(_val) => { throw "NotImplementedError: Parse NULL" },					//NULL
	(_val) => { throw "NotImplementedError: Parse SUB_COMMAND" },			//SUB_COMMAND
	(_val) => { throw "NotImplementedError: Parse SUB_COMMAND_GROUP" },	//SUB_COMMAND_GROUP
	(_val) => { return _val; },														//STRING
	(_val) => { return parseInt(_val); },											//INTEGER
	(_val) => { return _val.toLowerCase().startsWith("t"); },				//BOOLEAN
	(_val) => { throw "NotImplementedError: Parse USER" },					//USER
	(_val) => { throw "NotImplementedError: Parse CHANNEL" },				//CHANNEL
	(_val) => { throw "NotImplementedError: Parse ROLE" },					//ROLE
	(_val) => { throw "NotImplementedError: Parse MENTIONABLE" },			//MENTIONABLE
	(_val) => { return parseFloat(_val); },										//NUMBER
	(_val) => { throw "NotImplementedError: Parse ATTACHMENT" }				//ATTACHMENT
];
//--------------------------------------------------------------------FINALIZE
module.exports = {
	data: new SlashCommandBuilder()
		.setName("macro")
		.setDescription("Various QoL commands available to users")
		.addSubcommand(subcommand => subcommand
			.setName("clearchannel")
			.setDescription("Bulk deletes messages in a channel or thread (ignores: pins, messages with child threads)")
			.addStringOption(option => option
				.setName("channel_id")
				.setDescription("ID of channel (or thread) to clear; defaults to current channel")
			)
			.addIntegerOption(option => option
				.setName("number")
				.setDescription("Number of messages to delete; defaults to 100 (max)")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("clearthread")
			.setDescription("Bulk deletes messages this bot has sent to the current HomeThread (ignores: pins)")
			.addIntegerOption(option => option
				.setName("number")
				.setDescription("Number of messages to delete; defaults to 100 (max)")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("collapse")
			.setDescription("Create an instruction list (which can be used in other channels) to describe the current arena")
		)
		.addSubcommand(subcommand => subcommand
			.setName("load")
			.setDescription("Unpack an arena from a DnDaisies-generated JSON file")
			.addStringOption(option => option
				.setName("message_id")
				.setDescription("ID of message (in HomeThread) with desired pack.json attached")
				.setRequired(true)
			)
			.addBooleanOption(option => option
				.setName("save")
				.setDescription("If true, also saves current arena; defaults to true")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("parse")
			.setDescription("Handle a list of commands in one go (advanced)")
			.addAttachmentOption(option => option
				.setName("text_file")
				.setDescription("A file containing the list of commands to execute")
			)
			.addStringOption(option => option
				.setName("message_id")
				.setDescription("ID of message (in HomeThread) with desired instructions.txt attached")
			)
			.addBooleanOption(option => option
				.setName("show_example")
				.setDescription("If true, will send an example file that can be parsed to create a simple arena")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("ping")
			.setDescription("Replies with Pong!")
		)
		.addSubcommand(subcommand => subcommand
			.setName("nukethread")
			.setDescription("Destroy the HomeThread in the current channel")
		)
		.addSubcommand(subcommand => subcommand
			.setName("save")
			.setDescription("Generate a JSON file to save-state the current arena")
		)
	,
	hasSubcommands: true,
	execute: {
		clearchannel: async function(_interaction) {
			const {thread_id, number} = BOT.utils.getOptions(_interaction);

			const channelManager = _interaction.member.guild.channels;
			const channel = await channelManager.fetch(thread_id || _interaction.channelId);
			channel.messages.fetch({limit: number <= 100 && number || 100}).then((messages) => {
				channel.bulkDelete(
					messages.filter(message => !(message.pinned || channelManager.cache.get(message.id))),
					true
				);
			});

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		},
		clearthread: async function(_interaction) {
			const thread = BOT.utils.requireThread(_interaction);

			thread.messages.fetch({limit: _interaction.options._hoistedOptions[0]}).then((messages) => {
				thread.bulkDelete(
					messages.filter(message => !(message.system || message.pinned || message.author.id !== BOT.user.id)),
					true
				);
			});

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		},
		collapse: async function(_interaction) {
			const pack = BOT.utils.requireArena(_interaction).pack();

			const lines = [`arena create width:${pack.w} height:${pack.h}`];
			for (const [name, [preset, colour, span, tokens]] of Object.entries(pack.groups)) {
				lines.push(...[
					`group create preset:${preset} name:${name} colour:${colour.fill} width:${span[0]} height:${span[1]}`,
					`group populate name:${name} ranges:${rangeParser.unparseAry(tokens)}`
				]);
			}
			BOT.utils.sendAsFile(_interaction, lines.join("\r\n"), "instructions.txt");

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		},
		load: async function(_interaction) {
			const {message_id, save} = BOT.utils.getOptions(_interaction);

			const {author, attachments} = await BOT.utils.findInHomeThread(_interaction, message_id);
			if (author.id !== CONFIG.bot_id) { throw "UserError: Can only load arenas generated by this bot"; }

			const {contentType, url} = attachments.values().next().value;
			if (!contentType.startsWith("application/json")) {
				throw `ContentError: Invalid contentType, ${contentType}; only 'application/json' supported`;
			}

			BOT.utils.setArena(
				_interaction,
				Arena.unpack(await fetchJSON(url)),
				save !== false
			);

			return new BOT.FlagHandler()
				.setUpdate({all: true})
			;
		},
		nukethread: async function(_interaction) {
			const thread = await BOT.utils.findOldThread(_interaction);
			if (!thread) {
				throw "UserError: There is no thread to nuke in this channel";
			}
			await thread.delete().catch((err) => { throw err });
		},
		parse: async function(_interaction) {
			const { text_file, message_id, show_example } = BOT.utils.getOptions(_interaction);
			if (!(text_file || message_id || show_example)) { throw "UserError: Called parse with no arguments"; }

			if (show_example) {
				BOT.utils.attachHomeThread(_interaction, "./data/parseable_example.txt", "example.txt");

				return new BOT.FlagHandler()
					.setDisplay(false)
					.setExtend(false)
				;
			}

			const {contentType, url}
				= text_file
				|| (await BOT.utils.findInHomeThread(_interaction, message_id)).attachments.values().next().value
			;
			if (!contentType.startsWith("text/plain")) {
				throw `ContentError: Invalid contentType, ${contentType}; only 'text/plain' supported`;
			}

			for (const lineRaw of (await fetchText(url)).split("\r\n")) {
				if (!lineRaw.length || lineRaw.startsWith("//")) { continue; }
				const line = lineRaw.split(" ");

				const command = BOT.commands[line[0].toLowerCase()];
				const optionTypes = command.optionTypes[line[1].toLowerCase()];

				const options = _interaction.options._hoistedOptions = [];
				for (const argument of line.slice(2)) {
					const index = argument.indexOf(":");
					const name = argument.slice(0, index).toLowerCase();
					options.push({name, value: parseOption[optionTypes[name]](argument.slice(index + 1))});
				}
				await command.execute[line[1].toLowerCase()](_interaction);
			}

			return new BOT.FlagHandler()
				.setUpdate({group: true, multi: true})
			;
		},
		ping: async function(_interaction) {
			_interaction.editReply("Pong!");

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		},
		save: async function(_interaction) {
			BOT.utils.saveArena(_interaction);

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		}
	}
};