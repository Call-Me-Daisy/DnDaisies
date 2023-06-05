const { SlashCommandBuilder } = require("discord.js");

const BOT = require("../bot");
const STYLES = require("../styles");

const { rangeParser } = require("../parsers");
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
				.addStringOption(option => option
					.setName("range")
					.setDescription("Range to highlight")
					.setRequired(true)
				)
				.addIntegerOption(option => option
					.setName("index")
					.setDescription("Index of the guide to replace; defaults to none - the new guide is simply added")
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
			box: async function(_interaction, {range, index}) {
				const guideLayer = BOT.utils.requireGuide(_interaction);
				const shape = {
					style: STYLES.guide.rect,
					kwargs: { rect: rangeParser.parse(range) },
					description: `box, ${range.split(",")[0]}`
				};

				(index === undefined) ? guideLayer.shapes.push(shape) : guideLayer.shapes.splice(index, 1, shape);
				guideLayer.display === undefined && (guideLayer.display = true);

				return new BOT.FlagHandler()
					.setUpdate({guide: guideLayer.display})
					.setDisplay(guideLayer.display)
				;
			}
		},
		clear: async function(_interaction) {
			const guideLayer = BOT.utils.requireGuide(_interaction).shapes;
			const update = guideLayer.shapes.length > 0;
			guideLayer.shapes = [];

			return new BOT.FlagHandler()
				.setUpdate({guide: update})
				.setDisplay(update)
			;
		},
		list: async function(_interaction) {
			BOT.utils.formatMessage(arena.homeThread.send(
				BOT.utils.requireGuide(_interaction).shapes.entries().map()
			))
			const content = ["Each shape is displayed alongside its __(index)__ for convenience"];
			for (const [i, shape] of BOT.utils.requireGuide(_interaction).shapes.entries()) {
				content.push(`__(${i})__\t${shape.description}`);
			}
			BOT.utils.formatMessage(arena.homeThread.send(content.join("\n")));

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		},
		toggle: async function(_interaction) {
			const guideLayer = BOT.utils.requireGuide(_interaction);
			guideLayer.display = !guideLayer.display;

			const update = guideLayer.shapes.length > 0;
			return new BOT.FlagHandler()
				.setUpdate({guide: update})
				.setDisplay(update)
			;
		}
	}
};
