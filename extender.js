const fs = require("fs");

const {Registry} = require("cmdaisy-utils").general;
//--------------------------------------------------------------------EXPLAINREGISTRY
class ExplainCategory extends Registry.Category {
	static missingExplainText = "No explanation available / No additional arguments";

	static createElementTitle(_handle, _explainText) {
		return `**${_handle}**\n${_explainText}`;
	}
	static createCategoryTitle(_handle, _explainText, _listUnder) {
		return ExplainCategory.createElementTitle(_handle, _explainText) + `\n\n__${_listUnder}__`;
	}

	static build() {return new ExplainCategory(...arguments);}
	constructor(_categoryName, _explainText = ExplainCategory.missingExplainText, _extension = "") {
		super(_categoryName, _extension + "Explain");
		this.explainText = ExplainCategory.createCategoryTitle(this.handle, _explainText, "Options");
	}

	register(_elementName, _element, _explainText = ExplainCategory.missingExplainText) {
		this.explainText += "\n> " + _elementName;
		_element.explainText = ExplainCategory.createElementTitle(_elementName, _explainText);
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

const KEYWORDS = REG.KEYWORDS;
//--------------------------------------------------------------------KEYWORDS.CATEGORIES
KEYWORDS.registerCategory("Interactions",
	"A suggestion to use some feature of the bot to operate and/or better understand of the current topic"
);
KEYWORDS.registerCategory("CodeObjects",
	"In-code objects that can be manipulated through commands"
);
KEYWORDS.registerCategory("UserInput",
	"Objects used in-code but specified in-command by the user (and how to do so)"
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
});
//--------------------------------------------------------------------KEYWORDS.ENTRIES
KEYWORDS.Interactions.register("SquareBrackets", {},
	"[some_argument] => [some_argument] is necessary for the command or object to work as intended"
);
KEYWORDS.Interactions.register("CurlyBrackets", {},
	"{some_argument} => {some_argument} is an optional addition for the command or object (generally comes with a default value)"
);
KEYWORDS.Interactions.register("Call", {},
	"call '[some_command]' => send '--[some_command]' as a message to this channel"
);
KEYWORDS.Interactions.register("See", {},
	"see [some_topic] => call 'explain [some_topic]' and read the resulting helptext"
);

KEYWORDS.CodeObjects.register("Arena", {},
	"The in-code container housing all of the groups, tokens, styles, etc. used to build the map"
);
KEYWORDS.CodeObjects.register("Map", {},
	"The image generated to represent the arena, and the message it is attached to"
);
KEYWORDS.CodeObjects.register("Group", {},
	"A collection of identical tokens, and how they are actually referenced and drawn to the map (for efficiency and usability reasons)"
);
KEYWORDS.CodeObjects.register("Token", {},
	"A changeable (move/resize/hide/remove) feature of the arena; highly variable due to the system of combining styles"
);

KEYWORDS.UserInput.register("CSV", {},
	"'Comma-Separated Variable' - how this bot accepts lists; [object]CSV represents any number of that object separated by only a comma, ie.\n> 1,2,3 could be an indexCSV\n> A1 could be a coordCSV (of length 1, so no separator is required)\n> B2, C3 is not a coordCSV (due to the space)"
);
KEYWORDS.UserInput.register("TokenTup", {},
	"A string that the arena uses to fetch a particular token or set of tokens (within the same group); specified by...\n> If group contains many tokens: [name of group]**:**[indexCSV]\n> If group contains single token [name of group]{**:**0}"
);
KEYWORDS.UserInput.register("Colour", {},
	"A colour in hex-code (#rgba); can be specified directly or through one of the following presets (case-insensitive; only first letter is required)...\n>Colours: red, green, blue, yellow, magenta, cyan, white\n>Teams: party (dark green), enemy (dark red), ally (dark blue), neutral (brown)\n>Types: dirt (pale brown), stone (pale grey), fire (orange), ice (pale blue), lightning (dark yellow), toxic (dark magenta)"
);
KEYWORDS.UserInput.register("Coord", {},
	"A point in 3D space (displays as 2D, but invisibly tracks height above the arena ground); can be specified numerically or using the in-built coordinate helper...\n> Numerically: [horizontal position, in cells]**-**[vertical position, in cells]{**-**height, in cells (defaults to 0)}\n> Coordinate: [letter (case sensitive)][number]{**-**height, in cells (defaults to 0)}"
);
KEYWORDS.UserInput.register("Range", {},
	"A series of rectangular areas, overlapping the previous area at the corner to create a snake; specified by:\n> [first_corner]**:**[second_corner]{**:**etc.}\nNote that there can be a rangeCSV (ie. B2:B3:C3,E5:G7), but that there will be no overlap across the comma; it just creates a new range for each"
);
KEYWORDS.UserInput.register("Span", {},
	"A range with two corners (enough to fully describe both position and dimensions of a token); specified by:\n> [first_corner]:{second_corner (defaults to first_corner + 1-1-1)}"
);
KEYWORDS.UserInput.register("Seed", {},
	"All of the mandatory fields for a new token - position, dimension, and whether_hidden; specified by:\n> [spanCSV] {whether_hidden (defaults to false)}"
);
//--------------------------------------------------------------------FINALIZE
module.exports = REG;
