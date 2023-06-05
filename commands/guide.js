const { SlashCommandBuilder } = require("discord.js");

const BOT = require("../bot");
//--------------------------------------------------------------------FINALIZE
module.exports = {
	data: new SlashCommandBuilder()
		.setName("guide")
		.setDescription("Collection of commands to manage any/all temporary 'guide' shapes on the map")
		.addSubcommandGroup(group => group
			.setName("create")
			.setDescription("Collection of commands to add a new guide to the map (optionally replacing one)")
			.addSubcommand(subcommand => subcommand
				.setName("box")
				.setDescription("Create a rectangular guide aligned with the grid")
				.setStringOption(option => option
					.setName("range")
					.setDescription("Range to highlight")
					.setRequired(true)
				)
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("clear")
			.setDescription("Remove any or all guides from the map")
			.addBooleanOption(option => option
				.setName("all")
				.setDescription("Whether to clear all shapes; defaults to false")
			)
			.addIntegerOption(option => option
				.setName("index")
				.setDescription("Index of the guide to remove from the map; defaults to -1 (most recently created)")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("list")
			.setDescription("List all guides on the current map, with their indeces")
		)
		.addSubcommand(subcommand => subcommand
			.setName("remove")
			.setDescription("Remove a shape from the map")
			.addIntegerOption(option => option
				.setName("index")
				.setDescription("Index of the guide to remove from the map - these can be found with /guide list")
			)
		)
		.addSubcommand(subcommand => subcommand
			.setName("toggle")
			.setDescription("Toggle whether to display guides")
		)
	,
	execute: {
		create: {
			rect: async function(_interaction) {}
		},
		clear: async function(_interaction) {
		},
		list: async function(_interaction) {
		},
		toggle: async function(_interaction) {
		}
	}
};
