const { SlashCommandBuilder } = require("discord.js");

const BOT = require("../bot");

const { createArena } = require("../arena");
//--------------------------------------------------------------------FINALIZE
module.exports = {
	data: new SlashCommandBuilder()
		.setName("arena")
		.setDescription("Collection of commands that affect the entire arena")
		.addSubcommand(subcommand => subcommand
			.setName("background")
			.setDescription("Designate an image to use as the arena background; removes current background if neither option used")
			.addAttachmentOption(option => option
				.setName("background")
				.setDescription("The image to use as background")
			)
			.addStringOption(option => option
				.setName("message_id")
				.setDescription("ID of message (in HomeThread) with desired image attached")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("create")
			.setDescription("Create a new arena in the current channel")
			.addIntegerOption(option => option
				.setName("width")
				.setDescription("Desired number of columns")
				.setRequired(true)
			)
			.addIntegerOption(option => option
				.setName("height")
				.setDescription("Desired number of rows")
				.setRequired(true)
			)
			.addBooleanOption(option => option
				.setName("save")
				.setDescription("If true, also saves the current arena; defaults to true")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("destroy")
			.setDescription("Destroy the arena in the current channel")
			.addBooleanOption(option => option
				.setName("save")
				.setDescription("If true, a save-state of the arena will be sent to the HomeThread; defaults to true")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("list")
			.setDescription("Print out the name, code, and colour of each group in the current arena")
		)
		.addSubcommand(subcommand => subcommand
			.setName("resize")
			.setDescription("Resize the arena in the current channel")
			.addIntegerOption(option => option
				.setName("columns")
				.setDescription("Number of columns in the arena should be (set to/increased by/decreased by) this value")
			)
			.addIntegerOption(option => option
				.setName("rows")
				.setDescription("Number of rows in the arena should be (set to/increased by/decreased by) this value")
			)
			.addIntegerOption(option => option
				.setName("mode")
				.setDescription("How to resize; defaults to set")
				.addChoices(
					{name: "set", value: 0},
					{name: "increase", value: 1},
					{name: "decrease", value: -1}
				)
			)
		)
	,
	hasSubcommands: true,
	execute: {
		background: async function(_interaction) {
			const {background, message_id} = BOT.utils.getOptions(_interaction);
			const arena = BOT.utils.requireArena(_interaction);

			if (message_id === undefined && background === undefined) {
				arena.background.setImage(undefined);
				return BOT.utils.buildFlags({display: true});
			}

			const thread = await BOT.utils.ensureHomeThread(_interaction, false);
			const msg = await ((message_id === undefined)
				? BOT.utils.formatMessage(thread.send({files: [background]}))
				: thread.messages.fetch(message_id)
			);
			const {contentType, url} = (message_id === undefined) ? background : msg.attachments.values().next().value;

			if (!contentType.startsWith("image") || !contentType.endsWith("png") && !contentType.endsWith("jpg")) {
				throw `ContentError: Invalid contentType, ${contentType}; only 'image/png' and 'image/jpg' supported`;
			}
			msg.pin();
			arena.background.setImage(url);

			return;
		},
		create: async function(_interaction) {
			const {width, height, save} = BOT.utils.getOptions(_interaction);
			await BOT.utils.setArena(_interaction, createArena(width, height), save !== false);

			return;
		},
		destroy: async function(_interaction) {
			const {save} = BOT.utils.getOptions(_interaction);
			BOT.utils.closeArena(_interaction, save);

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		},
		list: async function(_interaction) {
			const arena = BOT.utils.requireArena(_interaction);

			const teams = {};
			for (const [name, group] of Object.entries(arena.groups)) {
				(teams[group.colour.fill] || (teams[group.colour.fill] = {}))[name] = group.code;
			}

			const content = [];
			for (const [colour, list] of Object.entries(teams)) {
				const teamContent = [`__**Team ${colour}**__`];
				for (const [name, code] of Object.entries(list)) {
					teamContent.push(`**Code:** ${code} <=> **Name:** ${name[0].toUpperCase() + name.slice(1)}`);
				}
				content.push(teamContent.join("\n"));
			}
			BOT.utils.formatMessage(arena.homeThread.send(content.join("\n------------------\n")));

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		},
		resize: async function(_interaction) {
			const {mode, columns, rows} = BOT.utils.getOptions(_interaction);
			const arena = BOT.utils.requireArena(_interaction);

			const [w, h] = (!mode)
				? [columns, rows]
				: [arena.w + mode*columns, arena.h + mode*rows]
			;

			arena.resizeLayer(w, h);

			return new BOT.FlagHandler()
				.setUpdate({all: true})
			;
		}
	}
};
