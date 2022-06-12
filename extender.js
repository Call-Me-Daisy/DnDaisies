const fs = require("fs");

const {Registry} = require("cmdaisy-utils").general;
//--------------------------------------------------------------------EXPLAINREGISTRY
class ExplainCategory extends Registry.Category {
	static missingExplainText = "No explanation available / No additional arguments";
	static createCategoryTitle(_handle, _explainText, _listUnder) {return `**${_handle}**\n${_explainText}\n\n__${_listUnder}__`;}

	static build() {return new ExplainCategory(...arguments);}
	constructor(_categoryName, _explainText = ExplainCategory.missingExplainText, _extension = "") {
		super(_categoryName, _extension + "Explain");
		this.explainText = ExplainCategory.createCategoryTitle(this.handle, _explainText, "Options");
	}

	register(_elementName, _element, _explainText = ExplainCategory.missingExplainText) {
		this.explainText += "\n> " + _elementName;
		_element.explainText = _explainText;
		return super.register(_elementName, _element);
	}
}
class ExplainRegistry extends Registry {
	static build() {return new ExplainRegistry(...arguments);}
	constructor(_handle, _explainText = ExplainCategory.missingExplainText, _makeCategory = ExplainCategory.build) {
		super(_handle, _makeCategory, "Explain");
		this.explainText = ExplainCategory.createCategoryTitle(this.handle, _explainText, "Categories");
	}

	registerCategory(_handle) {
		this.explainText += "\n> " + _handle;
		return super.registerCategory(...arguments);
	}
}
//--------------------------------------------------------------------CONSTANTS
const REG = new ExplainRegistry(
	"__DnDaisies__",
	"For more detail about a subject call 'explain [Category].{Subcategory}.{etc}' (case-sensitive), ie.\n> explain COMMANDS\n> explain CONSOLES.newGroup.dnd",
	ExplainRegistry.build
);
REG.registerCategory("KEYWORDS",
	"Shorthand names that will be used throughout the help text for this bot"
);
REG.registerCategory("COMMANDS",
	"Functions called directly by the user; can take any number of (space-separated) arguments"
);
REG.registerCategory("CONSOLES",
	"Subcommands called by certain wrapper COMMANDS (ie. arena or guide)"
);
REG.registerCategory("STYLES",
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
		for (const extension of stage) {
			REG.COMMANDS.registerCategory(extension.root, `Commands specific to the the '${extension.root}' extension`);
			extension.register(extension.root, REG);
		}
	}
})
//--------------------------------------------------------------------FINALIZE
module.exports = REG;
