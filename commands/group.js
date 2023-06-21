const { SlashCommandBuilder } = require("discord.js");

const BOT = require("../bot");

const { indexParser, rangeParser } = require("../parsers");
const { tokenChoices, groupChoices } = require("../arena");
//--------------------------------------------------------------------FINALIZE
module.exports = {
	data: new SlashCommandBuilder()
		.setName("group")
		.setDescription("Collection of commands that affect a given token group")
		.addSubcommand(subcommand => subcommand
			.setName("create")
			.setDescription("Create a new token group in the current arena")
			.addStringOption(option => option
				.setName("preset")
				.setDescription("A quick-use template to use for the group")
				.addChoices(...groupChoices)
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("name")
				.setDescription("The name to use when selecting the group being created (case insensitive)")
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("colour")
				.setDescription("Colour of tokens in this group")
				.setRequired(true)
				.addChoices(
					{name: "red", value: "#f00"},
					{name: "green", value: "#0f0"},
					{name: "blue", value: "#00f"},
					{name: "yellow", value: "#ff0"},
					{name: "cyan", value: "#0ff"},
					{name: "magenta", value: "#f0f"},
					{name: "black", value: "#000"},
					{name: "grey", value: "#777"},
					{name: "white", value: "#fff"},
					{name: "other", value: "-"}
				)
			)
			.addStringOption(option => option
				.setName("colour_hex")
				.setDescription("Hexcode to use as colour if colour option is set to 'other'")
			)
			.addIntegerOption(option => option
				.setName("width")
				.setDescription("Default width of tokens in this group; defaults to 1")
			)
			.addIntegerOption(option => option
				.setName("height")
				.setDescription("Default height of tokens in this group; defaults to 1")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("destroy")
			.setDescription("Destroy a token group")
			.addStringOption(option => option
				.setName("name")
				.setDescription("Name of group being altered")
				.setRequired(true)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("hide")
			.setDescription("Hide and/or reveal all tokens in a group")
			.addStringOption(option => option
				.setName("name")
				.setDescription("Name of group being altered")
				.setRequired(true)
			)
			.addIntegerOption(option => option
				.setName("mode")
				.setDescription("How to determine whether to hide or reveal each token; defaults to 'flip'")
				.addChoices(
					{name: "flip", value: -1},
					{name: "reveal", value: 0},
					{name: "hide", value: 1}
				)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("move")
			.setDescription("Move all tokens in a group - will also resize if full range is specified")
			.addStringOption(option => option
				.setName("name")
				.setDescription("Name of group being altered")
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("ranges")
				.setDescription("Comma-separated list of ranges to which the tokens should be moved")
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("skips")
				.setDescription("Comma-separated list of indeces detailing which tokens to leave in place")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("populate")
			.setDescription("Create multiple new tokens in a given group")
			.addStringOption(option => option
				.setName("name")
				.setDescription("Name of group to alter")
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("ranges")
				.setDescription("Comma-separated list of ranges in which the new tokens should be created")
				.setRequired(true)
			)
			.addBooleanOption(option => option
				.setName("hidden")
				.setDescription("If true, tokens will be invisible when initialized; defaults to false")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("reset")
			.setDescription("Set all tokens in a group to have the default dimensions")
			.addStringOption(option => option
				.setName("name")
				.setDescription("Name of group being altered")
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName("origin")
				.setDescription("This point of each token will not move (if possible); defaults to center")
				.addChoices(...tokenChoices)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("resize")
			.setDescription("Change the default size of a token group")
			.addStringOption(option => option
				.setName("name")
				.setDescription("Name of group being altered")
				.setRequired(true)
			)
			.addIntegerOption(option => option
				.setName("width")
				.setDescription("New default width; 0 or blank for no change")
			)
			.addIntegerOption(option => option
				.setName("height")
				.setDescription("New default height; 0 or blank for no change")
			)
			.addBooleanOption(option => option
				.setName("enact")
				.setDescription("If true, also resize all existing tokens; defaults to false")
			)
		)
	,
	execute: {
		create: function(_interaction, {colour, colour_hex, name, preset, width, height, depth}) {
			const arena = BOT.utils.requireArena(_interaction);

			let fill = (colour.startsWith("-")) ? colour_hex : colour;
			if (!fill) { throw "UserError: Selected 'other' colour but didn't specify colour_hex"; }
			fill.startsWith("#") || (fill = "#" + fill);
			if (isNaN(parseInt(fill.slice(1), 16))) { throw `UserError: colour_hex, ${colour_hex}, is not hex-code`; }

			arena.createGroup(
				name.toLowerCase(),
				preset,
				{fill, name: "#fff"},
				[width || 1, height || 1, depth || 1]
			);

			return new BOT.FlagHandler()
				.setDisplay(false)
			;
		},
		destroy: function(_interaction, {name}) {
			const groups = BOT.utils.requireArena(_interaction).groups;
			const group = groups[name.toLowerCase()]

			delete groups[name.toLowerCase()];

			const update = group?.tokens.length > 0;
			return new BOT.FlagHandler()
				.setUpdate({group: update})
				.setDisplay(update)
			;
		},
		hide: function(_interaction, {name, mode}) {
			for (const token of BOT.utils.requireArena(_interaction).requireGroup(name.toLowerCase()).tokens) {
				token.hidden = (!mode || mode < 0) ? !token.hidden : !!mode;
			}

			return new BOT.FlagHandler()
				.setUpdate({group: true})
			;
		},
		move: function(_interaction, {name, ranges, skips}) {
			const tokens = BOT.utils.requireArena(_interaction).requireGroup(name.toLowerCase()).tokens;

			ranges = rangeParser.parseMany(ranges);
			skips = skips && indexParser.parseMany(skips) || [];

			for (let i = 0, j = 0; i < tokens.length && j < ranges.length;) {
				while (skips.includes(i)) { i++; }
				tokens[i++].setFrom(ranges[j++]);
			}

			return new BOT.FlagHandler()
				.setUpdate({group: true})
			;
		},
		populate: function(_interaction, {name, ranges, hidden, origin}) {
			const group = BOT.utils.requireArena(_interaction).requireGroup(name.toLowerCase());

			group.addMany(rangeParser.parseMany(ranges), hidden, origin);

			const update = hidden !== false;
			return new BOT.FlagHandler()
				.setUpdate({group: update})
				.setDisplay(update)
			;
		},
		reset: function(_interaction, {name, origin}) {
			const group = BOT.utils.requireArena(_interaction).requireGroup(name.toLowerCase());

			for (const token of group.tokens) { token.setSpan(...group.span); }

			return new BOT.FlagHandler()
				.setUpdate({group: true})
			;
		},
		resize: function(_interaction, {name, width, height, depth, enact}) {
			const group = BOT.utils.requireArena(_interaction).requireGroup(name.toLowerCase());

			for (const [i, n] of Object.entries([width, height, depth])) {
				Number.isFinite(n) && (group.span[i] = Math.abs(n));
			}

			if (enact) {
				for (const token of group.tokens) { token.setSpan(width, height, depth); }
			}

			return new BOT.FlagHandler()
				.setUpdate({group: enact})
				.setDisplay(enact)
			;
		}
	}
};
