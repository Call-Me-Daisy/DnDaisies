const { SlashCommandBuilder } = require("discord.js");

const BOT = require("../bot");
//--------------------------------------------------------------------FINALIZE
module.exports = {
	data: new SlashCommandBuilder()
		.setName("flags")
		.setDescription("Collection of commands to manually trigger/delay some automatic features")
		.addSubcommand(subcommand => subcommand
			.setName("display")
			.setDescription("Display the current channel's arena after applying cached updates")
		)
		.addSubcommand(subcommand => subcommand
			.setName("extend")
			.setDescription("Delay the automated arena clean-up (resets timer to one hour)")
		)
		.addSubcommand(subcommand => subcommand
			.setName("update")
			.setDescription("Display the map after updating all layers of a given type")
			.addStringOption(option => option
				.setName("update")
				.setDescription("Which type of layers to update (defaults to all)")
				.addChoices(
					{name: "All", value: "all"},
					{name: "Background", value: "image"},
					{name: "Group", value: "group"},
					{name: "Guide", value: "guide"},
					{name: "Stack", value: "multi"}
				)
			)
		)
	,
	execute: {
		display: async function(_interaction) {
			return new BOT.FlagHandler()
				.setExtend(false)
			;
		},
		extend: async function(_interaction) {
			return new BOT.FlagHandler()
				.setDisplay(false)
			;
		},
		update: async function(_interaction, {mode}) {
			const update = {};
			update[mode || "all"] = true;

			return new BOT.FlagHandler()
				.setUpdate(update)
				.setExtend(false)
			;
		}
	}
};
