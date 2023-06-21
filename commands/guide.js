const { SlashCommandBuilder } = require("discord.js");

const BOT = require("../bot");
const STYLES = require("../styles");

const { coordParser, rangeParser } = require("../parsers");
const { Rect } = require("../arena");
//--------------------------------------------------------------------FINALIZE
module.exports = {
	data: new SlashCommandBuilder()
		.setName("guide")
		.setDescription("Collection of commands to manage any/all temporary 'guide' shapes on the map")
		.addSubcommandGroup(group => group
			.setName("create")
			.setDescription("Collection of commands to add a new guide to the map")
			.addSubcommand(subcommand => subcommand
				.setName("box")
				.setDescription("Highlight the outline of a rectangle, aligned with the grid")
				.addStringOption(option => option
					.setName("range")
					.setDescription("The range that contains the entire rectangle")
				)
				.addStringOption(option => option
					.setName("origin")
					.setDescription("The coord at the center of the rectangle")
				)
				.addNumberOption(option => option
					.setName("width")
					.setDescription("The horizontal sidelength of the rectangle; defaults to same as height")
				)
				.addNumberOption(option => option
					.setName("height")
					.setDescription("The vertical sidelength of the rectangle; defaults to same as width")
				)
			)
			.addSubcommand(subcommand => subcommand
				.setName("ellipse")
				.setDescription("Highlight the outline of an ellipse, aligned with the grid")
				.addStringOption(option => option
					.setName("range")
					.setDescription("The range that contains the entire ellipse")
				)
				.addStringOption(option => option
					.setName("origin")
					.setDescription("The coord at the center of the ellipse")
				)
				.addNumberOption(option => option
					.setName("width")
					.setDescription("The horizontal diameter of the ellipse; defaults to same as height")
				)
				.addNumberOption(option => option
					.setName("height")
					.setDescription("The vertical diameter of the ellipse; defaults to same as width")
				)
			)
			.addSubcommand(subcommand => subcommand
				.setName("line")
				.setDescription("Highlight a straight line between two points on the grid")
				.addStringOption(option => option
					.setName("origin")
					.setDescription("The coord from which the line begins")
					.setRequired(true)
				)
				.addStringOption(option => option
					.setName("endpoint")
					.setDescription("The coord in which the line ends")
					.setRequired(true)
				)
			)
			.addSubcommand(subcommand => subcommand
				.setName("cone")
				.setDescription("Highlight the outline of an isosceles triangle, at an angle to the grid")
				.addStringOption(option => option
					.setName("origin")
					.setDescription("The coord from which to project the triangle")
					.setRequired(true)
				)
				.addNumberOption(option => option
					.setName("height")
					.setDescription("The length of the triangle's 'height' (distance between 'origin' and 'base' line)")
					.setRequired(true)
				)
				.addNumberOption(option => option
					.setName("base")
					.setDescription("The length of the triangle's 'base'; defaults to same as 'distance'")
				)
				.addStringOption(option => option
					.setName("theta")
					.setDescription("The rotation of the triangle, in degrees from straight up; defaults to 0")
				)
			)
			.addSubcommand(subcommand => subcommand
				.setName("sundail")
				.setDescription("Highlight the outline of an circle, aligned with the grid, and add a radial line")
				.addStringOption(option => option
					.setName("origin")
					.setDescription("The coord at the center of the circle")
					.setRequired(true)
				)
				.addNumberOption(option => option
					.setName("diameter")
					.setDescription("The diameter of the circle")
				)
				.addStringOption(option => option
					.setName("endpoint")
					.setDescription("The coord on the edge of the circle where the radial line connects")
				)
			)
			.addSubcommand(subcommand => subcommand
				.setName("spider")
				.setDescription("Highlight a number of straight lines between points on the grid")
				.addStringOption(option => option
					.setName("origin")
					.setDescription("The coord from which the line(s) begin")
					.setRequired(true)
				)
				.addStringOption(option => option
					.setName("endpoint")
					.setDescription("The coord(s) in which the line(s) end")
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
			box: async function (_interaction, {range, origin, width, height}) {
				const rect = new Rect();
				if (range) { rect.setFrom(rangeParser.parse(range.split(",")[0])); }
				else {
					rect.setFrom(coordParser.parse(origin.split(":")[0].split(",")[0]))
						.alterPos((1 - width)/2, (1 - height)/2)
						.setSpan(width, height)
					;
				}
				return {
					kwargs: {rect: rect.collapse()},
					style: STYLES.guide.rect,
					description: rangeParser.unparse(rect)
				};
			},
			ellipse: async function (_interaction, {range, origin, width, height}) {
				const rect = new Rect();
				if (range) { rect.setFrom(rangeParser.parse(range.split(",")[0])); }
				else {
					rect.setFrom(coordParser.parse(origin.split(":")[0].split(",")[0]))
						.alterPos(-width/2, -height/2)
						.setSpan(width, height)
					;
				}
				return {
					kwargs: {rect: rect.collapse()},
					style: STYLES.guide.ellipse,
					description: rangeParser.unparse(rect)
				};
			},
			line: async function (_interaction, {origin, endpoint}) {
				const points = [];
				origin && points.push(...coordParser.parseMany(origin.split(":")[0].split(",")[0]));
				endpoint && points.push(...coordParser.parseMany(endpoint.split(":")[0].split(",")[0]));
				if (points.length < 2) { throw "UserError: Did not provide enough points to make a line (2)"; }

				return {
					kwargs: {r1: points[0], r2: points[1]},
					style: STYLES.guide.line,
					description: coordParser.unparseAry(points.slice(0, 2)).join(" -> ")
				};
			},
			cone: async function (_interaction, {origin, height, base, theta}) {
				const rect = new Rect()
					.setFrom(coordParser.parse(origin.split(":")[0].split(",")[0]))
					.setSpan(height - 1, (base || height) - 1)
					.collapse()
				;
				return {
					kwargs: {rect, theta: theta*Math.PI/180},
					style: STYLES.guide.cone,
					description: `${coordParser.unparse(rect)} (width: ${rect.width})`
				};
			},
			sundail: async function (_interaction, {origin, diameter, endpoint}) {
				const points = [];
				origin && points.push(...coordParser.parseMany(origin.split(":").join(",")));
				endpoint && points.push(...coordParser.parseMany(endpoint.split(":").join(",")));

				const r1 = points[0];
				const r2 = points[1] || {x: r1.x + diameter/2, y: r1.y}
				if (isNaN(r2.x)) { throw "UserError: Did not supply enough information to create a sundail (2 point/widths)"; }

				const radius = Math.floor(Math.sqrt((r1.x - r2.x)**2 + (r1.y - r2.y)**2)*1e6)/1e6;
				const rect = new Rect()
					.setFrom(r1)
					.alterPos(-radius, -radius)
					.setSpan(2*radius + 1, 2*radius + 1)
					.collapse()
				;
				return {
					kwargs: {r1, r2, rect},
					style: STYLES.guide.sundail,
					description: coordParser.unparseAry([r1, r2]).join(" -> ")
				};
			},
			spider: async function (_interaction, {origin, endpoint}) {
				const points = [];
				origin && points.push(...coordParser.parseMany(origin.split(":").join(",")));
				endpoint && points.push(...coordParser.parseMany(endpoint.split(":").join(",")));
				if (points.length < 2) { throw "UserError: Did not provide enough points to make a spider (2)"; }

				return {
					kwargs: {r1: points[0], rs: points.slice(1)},
					style: STYLES.guide.spider,
					description: coordParser.unparseAry(points.slice(0, 2)).join(" -> ") + ", ..."
				};
			}
		},
		archive: async function(_interaction, _options) {
			const guideLayer = BOT.utils.requireGuide(_interaction);
			const shape = SHAPE_MAKER[_options.preset](_options);
			shape.description = `${_options.preset}\t- ${shape.description}`;

			(_options.index === undefined)
				? guideLayer.shapes.push(shape)
				: guideLayer.shapes.splice(_options.index, 1, shape)
			;
			guideLayer.display === undefined && (guideLayer.display = true);

			return new BOT.FlagHandler()
				.setUpdate({guide: guideLayer.display})
				.setDisplay(guideLayer.display)
			;
		},
		clear: async function(_interaction, {all, index}) {
			const guideLayer = BOT.utils.requireGuide(_interaction);
			if (guideLayer.shapes.length < 1) { return new BOT.FlagHandler().setDisplay(false); }

			if (all) { guideLayer.shapes = []; }
			else {
				guideLayer.shapes.splice((index === undefined) ? -1 : index, 1);
			}

			return new BOT.FlagHandler()
				.setUpdate({guide: guideLayer.display})
				.setDisplay(guideLayer.display)
			;
		},
		list: async function(_interaction) {
			const content = ["Each shape is displayed alongside its __(index)__ for convenience"];
			for (const [i, shape] of BOT.utils.requireGuide(_interaction).shapes.entries()) {
				content.push(`__(${i})__\t${shape.description}`);
			}
			BOT.utils.requireArena(_interaction).homeThread.send("```" + content.join("\n") + "```");

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
