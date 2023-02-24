const fs = require("fs");

const { REST, Routes } = require("discord.js");

const CONFIG = require("./config");

const [log2, err2] = require("./utils").createLoggerFunctionsFromFileNames("logs/dep_log.txt", "logs/dep_err.txt");
//--------------------------------------------------------------------MAIN
const commands = [];
for (const file of fs.readdirSync("./commands").filter(file => file.endsWith(".js"))) {
	commands.push(require(`./commands/${file}`).data.toJSON());
}

//--------------------------------------------------------------------FINALIZE
log2(`Reloading ${commands.length} guild slash-commands`);
const rest = new REST({version: "10"}).setToken(CONFIG.bot_token);

rest.put(
	Routes.applicationCommands(CONFIG.bot_id),
	{body: []}
);
rest.put(
	Routes.applicationCommands(CONFIG.bot_id),
	{body: commands}
);
