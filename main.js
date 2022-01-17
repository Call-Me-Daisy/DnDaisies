require("dotenv").config();
const {Client, Intents, MessageAttachment} = require("discord.js");
const {DaisyMap, DaisyChar} = require("./map");

const {createCanvas, loadImage} = require("canvas");

const bot = new Client({intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS]
});

const PREFIX = "--";
const CELL_PIXELS = 72, MARGIN_PIXELS = 2;
const test0 = new DaisyMap(6, 5, CELL_PIXELS, MARGIN_PIXELS);

bot.once("ready", async () => {
    console.log(`Logged in as ${bot.user.tag}`);
});

bot.on("messageCreate", async (message) => {
    if (!message.author.bot && message.content.startsWith(PREFIX)) {
        console.log(message.author.discriminator, message.content);
		//console.log(message);

        const command = message.content.slice(PREFIX.length).toLowerCase();
		switch (command) {
			case "quit": bot.destroy(); break;
			case "add": test0.addCharCheck("Void", new DaisyChar("party",6,4,true)); break;
			case "map": test0.buildMap();
			case "show":
				bot.channels.cache.get(process.env.TEST_CHANNEL).send({
					files: [new MessageAttachment(await test0.fetchBuffer(), "test.png")]
				});
				break;

			default: bot.channels.cache.get(process.env.TEST_CHANNEL).send(command);
		}
    }
});

//KEEP NEXT LINE AT END!
bot.login(process.env.TOKEN);
