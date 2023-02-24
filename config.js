//--------------------------------------------------------------------INPUT

const DEV_STAGE = "RELEASE";

//--------------------------------------------------------------------FINALIZE
const DEV_MODE_SWITCH = {
	"DEV": true,
	"ALPHA": false,
	"RELEASE": false
};

module.exports = require("./data/public-config.json");
module.exports.dev_mode = DEV_MODE_SWITCH[DEV_STAGE];

const privateConfig = require("./data/private-config.json");
for (const [key, val] of Object.entries(privateConfig.ALWAYS)) {
	module.exports[key] = val;
}
for (const [key, val] of Object.entries(privateConfig[DEV_STAGE])) {
	module.exports[key] = val;
}
