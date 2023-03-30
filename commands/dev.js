const { SlashCommandBuilder } = require("discord.js");

const CONFIG = require("../config");
const BOT = require("../bot");

const { rangeParser } = require("../parsers");
//--------------------------------------------------------------------MAIN
function setOptions(_interaction, _options) {
	const hoist = [];
	for (const [name, value] of Object.entries(_options)) { hoist.push({name, value}); }
	_interaction.options._hoistedOptions = hoist;
}
function testCommand(_interaction, _commandName, _subcommandName) {
	return BOT.commands[_commandName].execute[_subcommandName](_interaction);
}

//--------------------------------------------------------------------FINALIZE
module.exports = {
	data: new SlashCommandBuilder()
		.setName("dev")
		.setDescription("Various QoL commands only available to dev(s)")
		.addSubcommand(subcommand => subcommand
			.setName("test")
			.setDescription("GENERAL_TESTING")
		)
		.addSubcommand(subcommand => subcommand
			.setName("quit")
			.setDescription("Causes BOT to logout")
		)
	,
	verifyInteraction: function(_interaction) {
		if (_interaction.user.id !== CONFIG.dev_id) { throw "PermissionsError: User is not dev"; }
	},
	hasSubcommands: true,
	execute: {
		test: async function(_interaction) {
			/* SAVE
			setOptions(_interaction, {width: 15, height: 10});
			testCommand(_interaction, "arena", "create");

			setOptions(_interaction, {preset: "static", name: "Floor", colour: "#777"});
			testCommand(_interaction, "group", "create");
			setOptions(_interaction, {preset: "creature", name: "Void", colour: "#00f"});
			testCommand(_interaction, "group", "create");
			setOptions(_interaction, {preset: "creature", name: "Mook", colour: "#f00", width: 3, height: 3});
			testCommand(_interaction, "group", "create");

			setOptions(_interaction, {name: "floor", column: 2, row: 2, width: 6, height: 6});
			testCommand(_interaction, "token", "create");
			setOptions(_interaction, {name: "void", column: 3, row: 3});
			testCommand(_interaction, "token", "create");
			setOptions(_interaction, {name: "mook", column: 5, row: 1});
			testCommand(_interaction, "token", "create");
			setOptions(_interaction, {name: "mook", column: 5, row: 5});
			testCommand(_interaction, "token", "create");

			testCommand(_interaction, "macro", "save");
			*/
			/* BACKGROUND
			setOptions(_interaction, {message_id: "1070005073230430339"});
			await testCommand(_interaction, "macro", "load");

			setOptions(_interaction, {message_id: "1070013409703252088"});
			await testCommand(_interaction, "arena", "background");

			await testCommand(_interaction, "macro", "clearchannel");
			await testCommand(_interaction, "macro", "clearthread");

			return BOT.utils.buildFlags({update: {all: true}, display: true});
			*/

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		},
		quit: async function(_interaction) {
			const promises = [];

			for (const guild of BOT.guilds.cache.values()) {
				for (const [channelId, arena] of Object.entries(BOT.arenas)) {
					const channel = await guild.channels.fetch(channelId);
					channel !== undefined && promises.push(BOT.utils.closeArena({channel, channelId}, !CONFIG.dev_mode));
				}
			}

			Promise.all(promises).then((resolutions) => { setTimeout(() => { BOT.destroy(); }, 2000); });

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		}
	}
};
