const fs = require("fs");

const { Flags: FLAGS } = require("discord.js").PermissionsBitField;

const CONFIG = require("./config");
const BOT = require("./bot");
//--------------------------------------------------------------------GLOBAL
for (const file of fs.readdirSync(CONFIG.command_dir).filter(file => file.endsWith(".js"))) {
	const filePath = `${CONFIG.command_dir}/${file}`;
	const command = require(filePath);

	if (!("data" in command && "execute" in command)) {
		BOT.log(`[WARNING] The command at ${filePath} is missing a required 'data' and/or 'execute' property`);
		continue;
	}

	command.optionTypes = {};
	for (const subcommand of command.data.options) {
		const optionTypes = command.optionTypes[subcommand.name] = {};
		for (const option of subcommand.options) { optionTypes[option.name] = option.type; }
	}
	BOT.commands[command.data.name] = command
}

//--------------------------------------------------------------------MAIN
BOT.once("ready", async () => {
	BOT.log(`Logged in as ${BOT.user.tag}`);
	BOT.log(`BOT running with ${Object.keys(BOT.commands).length} commands`);
});

BOT.on("threadDelete", async (_thread) => {
	for (const [id, arena] of Object.entries(BOT.arenas)) {
		if (_thread === arena.homeThread) {
			BOT.log(`HomeThread in #${id} was deleted`);
			arena.homeThread = undefined;
			return;
		}
	}
});

BOT.on("interactionCreate", async (_interaction) => {
	if (!_interaction.isChatInputCommand()) { return; }
	if (!_interaction.channel.permissionsFor(BOT.user).has([FLAGS.ViewChannel, FLAGS.SendMessages])) {
		_interaction.reply({
			content: "Computer says no...\nMore specifically: **NO_PERMISSIONS**",
			ephemeral: true
		})
		return;
	}

	const command = _interaction.client.commands[_interaction.commandName];
	if (command === undefined) {
		BOT.err(`CommandError: Command ${_interaction.commandName} not found`);
		return;
	}

	await _interaction.reply("On it boss! **salutes**");

	try {
		command.verifyInteraction?.(_interaction);

		if (command.execute === undefined) {
			throw `CommandError: Command ${_interaction.commandName} missing required property, execute`;
		}
		const exe = Object.values(_interaction.options).reduce((exe, subKey) => exe[subKey] || exe, command.execute);

		(await exe(_interaction, BOT.utils.getOptions(_interaction)) || new BOT.FlagHandler()).resolve(_interaction);
	} catch (error) {
		BOT.err(error);
		await _interaction.editReply(`Error while executing ${_interaction.commandName} command!\n${error}`);
		setTimeout(() => { BOT.utils.deleteReply(_interaction); }, CONFIG.reply_duration);
	}
});

//--------------------------------------------------------------------FINALIZE
process.on("SIGINT", () => {
	BOT.commands.dev.execute.quit({});
});

BOT.login(CONFIG.bot_token);
