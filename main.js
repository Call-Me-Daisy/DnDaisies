const {Client, Intents} = require("discord.js");
require("dotenv").config();

const helper = require("./helper");

const bot = new Client({intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS]
});

const PREFIX = "--";

bot.once("ready", async () => {
	console.log(helper.t1());
	console.log(await helper.t2());
    console.log(`Logged in as ${bot.user.tag}`);
});

bot.on("messageCreate", (message) => {
    if (!message.author.bot && message.content.startsWith(PREFIX)) {
        console.log(message.author.discriminator, message.content);

        const command = message.content.slice(PREFIX.length).toLowerCase();

		if (command == "quit") {bot.destroy();}
		else {
        	bot.channels.cache.get(process.env.TEST_CHANNEL).send(command);
		}
    }
});

//KEEP NEXT LINE AT END!
bot.login(process.env.TOKEN);
