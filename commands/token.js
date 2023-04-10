const { SlashCommandBuilder } = require("discord.js");

const BOT = require("../bot");

const { rangeParser } = require("../parsers");
const { originChoices } = require("../arena");
//--------------------------------------------------------------------FINALIZE
module.exports = {
	data: new SlashCommandBuilder()
		.setName("token")
		.setDescription("Collection of commands that affect a given token")
		.addSubcommand(subcommand => subcommand
			.setName("create")
			.setDescription("Initialize a new token to a given group and range")
			.addStringOption(option => option
				.setName("name")
				.setDescription("Name of group to add to")
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("range")
				.setDescription("Range over which to place new token")
				.setRequired(true)
			)
			.addBooleanOption(option => option
				.setName("hidden")
				.setDescription("If true, token will be invisible when initialized; defaults to false")
			)
			.addStringOption(option => option
				.setName("origin")
				.setDescription("The point in the token which will be placed at the coord; defaults to center")
				.addChoices(...originChoices)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("hide")
			.setDescription("Hide or reveal a token")
			.addStringOption(option => option
				.setName("identifier")
				.setDescription("Identifier of token to alter, or just group name in single-token groups")
				.setRequired(true)
			)
			.addIntegerOption(option => option
				.setName("mode")
				.setDescription("How to determine whether to hide or reveal the token; defaults to 'flip'")
				.addChoices(
					{name: "flip", value: -1},
					{name: "reveal", value: 0},
					{name: "hide", value: 1}
				)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("move")
			.setDescription("Move a token")
			.addStringOption(option => option
				.setName("identifier")
				.setDescription("Identifier of token to alter, or just group name in single-token groups")
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("coord")
				.setDescription("The coordinate in which to place of the token - or the corner:corner range")
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("origin")
				.setDescription("The point in the token which will be placed at the coord; defaults to center")
				.addChoices(...originChoices)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("remove")
			.setDescription("Remove/Reinstate a token")
			.addStringOption(option => option
				.setName("identifier")
				.setDescription("Identifier of token to alter, or just group name in single-token groups")
				.setRequired(true)
			)
			.addIntegerOption(option => option
				.setName("mode")
				.setDescription("How to determine whether to remove or reinstate the token; defaults to 'flip'")
				.addChoices(
					{name: "flip", value: -1},
					{name: "reinstate", value: 0},
					{name: "remove", value: 1}
				)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("resize")
			.setDescription("Resize a token")
			.addStringOption(option => option
				.setName("identifier")
				.setDescription("Identifier of token to alter, or just group name in single-token groups")
				.setRequired(true)
			)
			.addIntegerOption(option => option
				.setName("width")
				.setDescription("New token width")
			)
			.addIntegerOption(option => option
				.setName("height")
				.setDescription("New token height")
			)
		)
	,
	execute: {
		create: function(_interaction, {name, range, hidden, origin}) {
			const group = BOT.utils.requireArena(_interaction).requireGroup(name.toLowerCase());

			group.add(rangeParser.parse(range), hidden, origin);

			const update = hidden !== false;
			return new BOT.FlagHandler()
				.setUpdate({group: update})
				.setDisplay(update)
			;
		},
		hide: function(_interaction, {identifier, mode}) {
			const token = BOT.utils.requireArena(_interaction).requireToken(identifier.toLowerCase());

			token.hidden = (mode === undefined || mode < 0) ? !token.hidden : !!mode;

			return new BOT.FlagHandler()
				.setUpdate({group: true})
			;
		},
		move: function(_interaction, {identifier, coord, origin}) {
			const token = BOT.utils.requireArena(_interaction).requireToken(identifier.toLowerCase());

			token.setFrom(rangeParser.parse(coord), origin);

			return new BOT.FlagHandler()
				.setUpdate({group: true})
			;
		},
		remove: function(_interaction, {identifier, mode}) {
			const token = BOT.utils.requireArena(_interaction).requireToken(identifier.toLowerCase());

			token.removed = (mode === undefined || mode < 0) ? !token.removed : !!mode;

			return new BOT.FlagHandler()
				.setUpdate({group: true})
			;
		},
		resize: function(_interaction, {identifier, width, height, depth}) {
			const token = BOT.utils.requireArena(_interaction).requireToken(identifier.toLowerCase());

			token.setSpan(width, height, depth);

			return new BOT.FlagHandler()
				.setUpdate({group: true})
			;
		}
	}
};
