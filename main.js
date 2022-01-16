const {Client, Intents} = require("discord.js");
require("dotenv").config();

const bot = new Client({intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS]
});

const PREFIX = "--";

bot.once("ready", () => {
    console.log(`Logged in as ${bot.user.tag}`);
});

bot.on("messageCreate", message => {
    if (!message.content.startsWith(PREFIX)) {console.log("PREFIX");}
    else if (message.author.bot) {console.log("BOT");}
    else {
        console.log(message.content);
        
        const command = message.content.slice(PREFIX.length).toLowerCase();
        message.reply(command);
    }
});

//KEEP NEXT LINE AT END!
bot.login(process.env.TOKEN);
