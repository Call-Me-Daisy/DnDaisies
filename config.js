//--------------------------------------------------------------------INPUT

const DEV_MODE = true;

//--------------------------------------------------------------------FINALIZE
module.exports = require("./data/public-config.json");
module.exports.dev_mode = DEV_MODE;

const privateConfig = require("./data/private-config.json");
for (const [key, val] of Object.entries(privateConfig.ALWAYS)) {
	module.exports[key] = val;
}
for (const [key, val] of Object.entries(privateConfig[(DEV_MODE) ? "IF_DEV_MODE" : "IF_USE_MODE"])) {
	module.exports[key] = val;
}
