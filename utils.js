const {DiscordCleaner} = require("cmdaisy-utils").discord;
//--------------------------------------------------------------------MAIN
//------------------------------------PARSER
class Parser {
	static makeTokenTup(_tupStr) {
		const [name, iCSV] = _tupStr.split(":");
		let iAry;
		if (iCSV) {
			iAry = [];
			for (const iStr of iCSV.split(",")) {iAry.push(parseInt(iStr, 10));}
		}
		return [name.toLowerCase(), iAry];
	}

	init() {}
	constructor(_extraEntries) {
		for (const [key, val] of Object.entries(_extraEntries)) {this[key] = val;}
		this.init();
	}

	fromCSV(_typeCSV) {
		const out = [];
		for (const typeStr of _typeCSV.split(",")) {out.push(this.fromStr(typeStr));}
		return out;
	}
	fromTokenTupStr(_arena, _tokenTupStr) {
		return this.fromToken(_arena.fetchTokens(...Parser.makeTokenTup(_tokenTupStr))[0]);
	}
	fromUnknown(_arena, _typeStrOrTokenTupStr) {
		const fromStr = this.fromStr(_typeStrOrTokenTupStr);
		return (this.verify(fromStr)) ? fromStr : this.fromTokenTupStr(_arena, _typeStrOrTokenTupStr);
	}
}
//------------------------------------BOOL_MODES
const BoolMode = {
	TRUE() {return true;},
	FALSE() {return false;},
	FLIP(_bool) {return !_bool;},

	SWITCH(_mode, _default = "u") {
		if (_mode) {
			switch (_mode[0].toLowerCase()) {
				case "u": return false;
				case "t": return this.TRUE;
				case "f": return this.FALSE;
				case "!": return this.FLIP;
			}
		}
		return this.SWITCH(_default);
	}
}
//--------------------------------------------------------------------HELPERS
const minorUtils = {
	STANDARD_DURATION: 1000*5,
	async makeTemp(_obj, _r = 1) {
		DiscordCleaner.deleteAfter(await _obj, _r*this.STANDARD_DURATION);
	}
}
//--------------------------------------------------------------------FINALIZE
module.exports = {
	Parser,
	BoolMode,
	minorUtils
};
