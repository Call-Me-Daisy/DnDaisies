const fs = require("fs");

const { Flags: FLAGS } = require("discord.js").PermissionsBitField;

const CONFIG = require("./config");
const BOT = require("./bot");

const { log } = require("./utils");
//--------------------------------------------------------------------GLOBAL
class DataStateJSON {
	constructor(_filePath) {
		this.filePath = _filePath;
		this.data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
	}

	async save() {
		fs.writeFile(this.filePath, JSON.stringify(this.data), "utf8", (err) => {
			if (err) { throw err; }
		});
	}
	async update(_key, _val) {
		if (this.data[_key] !== _val) {
			this.data[_key] = _val;
			this.save();
		}
	}
}
const stateDefaultChannels = new DataStateJSON("./data/default-channels.json");
const stateUpdate = new DataStateJSON("./data/update.json");

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
		log.warn(`The command at ${filePath} is missing a required 'data' and/or 'execute' property`);
		continue;
	}

	command.optionTypes = buildOptionTypes(command.data);
	BOT.commands[command.data.name] = command;
}

//--------------------------------------------------------------------MAIN
BOT.once("ready", async () => {
	log.clear();
	log.info(`Logged in as ${BOT.user.tag}`);
	log.info(`BOT running with ${Object.keys(BOT.commands).length} commands`);

	const {should_announce, announcement} = stateUpdate.data;
	if (should_announce) {
		for (const guild of BOT.guilds.cache.values()) {
			let channel = stateDefaultChannels[guild.id] && guild.channels.cache.get(stateDefaultChannels[guild.id]);
			if (channel === undefined) {
				for (const [id, c] of guild.channels.cache.entries()) {
					if (c.type == 0 && c.permissionsFor(BOT.user).has([FLAGS.ViewChannel, FLAGS.SendMessages, FLAGS.ManageMessages])) {
						channel = c;
						break;
					}
				}
			}
			(channel === undefined)
				? guild.leave().then(g => log.info(`BOT left guild ${g.id} due to lack of permissions.`))
				: channel.send({content: announcement}).then((msg) => msg.pin)
			;
		}
		stateUpdate.update("should_announce", false);
	}
});

BOT.on("threadDelete", async (_thread) => {
	for (const [id, arena] of Object.entries(BOT.arenas)) {
		if (_thread === arena.homeThread) {
			log.info(`HomeThread in #${id} was deleted`);
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
		log.warn(`CommandError: Command ${_interaction.commandName} not found`);
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

		stateDefaultChannels.update(_interaction.guildId, _interaction.channelId);
	} catch (error) {
		log.error(error);

		await _interaction.editReply(`Error while executing ${_interaction.commandName} command!\n${error}`);
		setTimeout(() => { BOT.utils.deleteReply(_interaction); }, CONFIG.reply_duration);
	}
});

//--------------------------------------------------------------------FINALIZE
process.on("SIGINT", () => {
	BOT.commands.dev.execute.quit({});
});

BOT.login(CONFIG.bot_token);
