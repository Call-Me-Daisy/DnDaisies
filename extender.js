const fs = require("fs");

const {Registry} = require("cmdaisy-utils").general;
//--------------------------------------------------------------------CONSTANTS
class ExplainCategory extends Registry.Category {
	static missingExplainText = "No explanation available";
	static build() {return new ExplainCategory(...arguments);}
	constructor(_categoryName, _explainText = ExplainCategory.missingExplainText, _extension = "") {
		super(_categoryName, _extension + "Explain");
		this.explainText = _explainText;
	}

	register(_elementName, _element, _explainText = ExplainCategory.missingExplainText) {
		_element.explainText = _explainText;
		return super.register(_elementName, _element);
	}
}
class ExplainRegistry extends Registry {
	static build() {return new ExplainRegistry(...arguments);}
	constructor(_handle, _explainText = ExplainCategory.missingExplainText, _makeCategory = ExplainCategory.build, _extension = "") {
		super(_handle, _makeCategory, _extension + "Explain");
		this.explainText = _explainText;
	}
}

const REGISTRIES = new ExplainRegistry(
	"REG",
	"__Categories__\nFor more detail about a subject call 'explain [CATEGORY].{subcategory}.{handle}' (case-sensitive), ie.\n> explain COMMANDS\n> explain CONSOLES.newGroup.dnd",
	ExplainRegistry.build
);
REGISTRIES.registerCategory("COMMANDS",
	"Functions called directly by the user; can take any number of (space-separated) arguments"
);
REGISTRIES.registerCategory("CONSOLES",
	"Subcommands called by certain wrapper COMMANDS (ie. arena or guide)"
);
REGISTRIES.registerCategory("STYLES",
	"Functions that actually create the map image from the arena"
);
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
