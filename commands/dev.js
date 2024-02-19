const { SlashCommandBuilder } = require("discord.js");

const CONFIG = require("../config");
const BOT = require("../bot");

const { log } = require("../utils");
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
	execute: {
		test: async function(_interaction, _options) {
			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		},
		quit: async function(_interaction, _options) {
			const promises = [];

			for (const guild of BOT.guilds.cache.values()) {
				for (const [channelId, arena] of Object.entries(BOT.arenas)) {
					const channel = await guild.channels.fetch(channelId);
					channel !== undefined && promises.push(BOT.utils.closeArena({channel, channelId}, !CONFIG.dev_mode));
				}
			}

			Promise.all(promises).then((resolutions) => {
				setTimeout(() => { log.info("BOT quitting successfully."); BOT.destroy(); }, 2000);
			});

			return new BOT.FlagHandler()
				.setDisplay(false)
				.setExtend(false)
			;
		}
	}
};
