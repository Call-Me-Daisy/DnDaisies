const fs = require("fs");

const { Flags: FLAGS } = require("discord.js").PermissionsBitField;
const CONFIG = require("./config");
const BOT = require("./bot");
//--------------------------------------------------------------------GLOBAL
function buildOptionTypes(_data) {
	if (_data.constructor.name.slice(-6) === "Option") { return _data.type; }

	const out = {};
	for (const option of _data.options) { out[option.name] = buildOptionTypes(option); }
	return out;
}
for (const file of fs.readdirSync(CONFIG.command_dir).filter(file => file.endsWith(".js"))) {
	const filePath = `${CONFIG.command_dir}/${file}`;
	const command = require(filePath);
	if (!("data" in command && "execute" in command)) {
		BOT.log(`[WARNING] The command at ${filePath} is missing a required 'data' and/or 'execute' property`);
		continue;
	}

	command.optionTypes = buildOptionTypes(command.data);
	BOT.commands[command.data.name] = command;
}

function loadJSON(_filePath) {
	return JSON.parse(fs.readFileSync(_filePath, "utf8"));
}
function updateJSON(_filePath, _key, _value) {
	const data = loadJSON(_filePath);
	data[_key] = _value;

	fs.writeFile(_filePath, JSON.stringify(data), "utf8", (err) => {
		if (err) { throw err; }
	});
}

//--------------------------------------------------------------------MAIN
BOT.once("ready", async () => {
	BOT.log(`Logged in as ${BOT.user.tag}`);
	BOT.log(`BOT running with ${Object.keys(BOT.commands).length} commands`);

	const {should_announce, announcement} = loadJSON("data/update.json");
	if (should_announce) {
		const defaultChannels = loadJSON("./data/default-channels.json");
		for (const [id, guild] of BOT.guilds.cache.entries()) {
			const channel = (defaultChannels[id] !== undefined)
				? guild.channels.cache.get(defaultChannels[id])
				: guild.channels.cache.find(c => c.type == 0 && c.permissionsFor(BOT.user).has([FLAGS.ViewChannel, FLAGS.SendMessages]))
			;
			channel.send({content: announcement}).then((msg) => msg.pin);
		}
		updateJSON("data/update.json", "should_announce", false);
	}
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
	if (!_interaction.isChatInputCommand() || _interaction.applicationId !== CONFIG.bot_id) { return; }
	if (!_interaction.channel.permissionsFor(BOT.user).has([FLAGS.ViewChannel, FLAGS.SendMessages])) {
		_interaction.reply({
			content: "Computer says no...\nMore specifically: **NO_PERMISSIONS**",
			ephemeral: true
		});
		return;
	}
	if (_interaction.channel.isThread()) {
		if (_interaction.channel.ownerId !== CONFIG.bot_id) {
			_interaction.reply({
				content: "I don't always work properly in threads - try sending that to the parent channel",
				ephemeral: true
			});
			return;
		}
		_interaction.channelId = _interaction.channel.parentId;
		delete _interaction.channel;
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

		updateJSON("./data/default-channels.json", _interaction.guildId, _interaction.channelId);
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
