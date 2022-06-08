const fs = require("fs");

const {Registry} = require("cmdaisy-utils").general;
//--------------------------------------------------------------------CONSTANTS
const REGISTRIES = {
	COMMANDS: new Registry(), //Directly called by user
	CONSOLES: new Registry(), //Sub-commands that are called by functions in COMMANDS
	STYLES: new Registry() //Functions dictating how groups are drawn to the map
};
//--------------------------------------------------------------------MAIN
const dir = "./extensions/";

fs.readdir(dir, (dir_e, files) => {
	if (dir_e) { throw dir_e; }

	const stages = {};
	for (const fileName of files) {
		const [root, ext] = fileName.split(".");
		if (ext === "js") {
			const src = require(dir + fileName);
			const stageNumber = src.registerStage || ((root === "core") ? 0 : 1);
			(stages[stageNumber] || (stages[stageNumber] = [])).push({root, register: src.registerExtension});
		}
	}

	for (const stage of Object.values(stages)) {
		for (const extension of stage) {extension.register(extension.root, REGISTRIES);}
	}
})
//--------------------------------------------------------------------FINALIZE
module.exports = REGISTRIES;
