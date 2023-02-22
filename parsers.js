const PARSERS = module.exports = {};

class Parser {
	constructor(_parseFun, _unparseFun) {
		this.parse = _parseFun;
		this.unparse = _unparseFun;
	}

	parseAry(_unparsedAry) {
		const out = [];
		for (const unparsedVal of _unparsedAry) { out.push(this.parse(unparsedVal)); }
		return out;
	}
	unparseAry(_parsedAry) {
		const out = [];
		for (const parsedVal of _parsedAry) { out.push(this.unparse(parsedVal)); }
		return out;
	}

	parseMany(_unparsedCSV) {
		return this.parseAry(_unparsedCSV.split(","));
	}
}

PARSERS.indexParser = new Parser(
	(_indStr) => { return parseInt(_indStr, 10); },
	(_ind) => { return "" + _ind; }
)

PARSERS.coordParser = new Parser(
	(_coordStr) => {
		const xRaw = _coordStr.charCodeAt(0);
		return { x: (xRaw < 97) ? xRaw - 65 : xRaw - 71, y: parseInt(_coordStr.slice(1)) - 1 };
	},
	(_coord) => {
		return String.fromCharCode((_coord.x < 27) ? _coord.x + 65 : _coord.x + 71) + (_coord.y + 1);
	}
);

PARSERS.rangeParser = new Parser(
	(_rangeStr) => {
		const [r1, r2] = PARSERS.coordParser.parseAry(_rangeStr.split(":"));
		return (r2 === undefined)
			? {x: r1.x, y: r1.y}
			: {x: Math.min(r1.x, r2.x), y: Math.min(r1.y, r2.y), w: Math.abs(r1.x - r2.x) + 1, h: Math.abs(r1.y - r2.y) + 1}
		;
	},
	(_range) => {
		return PARSERS.coordParser.unparseAry([
			{x: _range.x, y: _range.y},
			{x: _range.x + _range.w - 1, y: _range.y + _range.h - 1}
		]).join(":");
	}
);
