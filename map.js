const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')

//--------------------------------------------------------------------CONSTANTS
const TEAM = new Map([
	["b", "#a38b53"],
	["o", "#848b94"],
	["w", "#000"],
	["e", "#f33"],
	["p", "#3f3"],
	["a", "#38f"],
	["n", "#640"]
]);

const MAX_PH = 1080, MAX_PV = 800;
//--------------------------------------------------------------------HELPERS
function parseCoords(coord) {
	return [parseInt(coord.slice(1),10), coord.charCodeAt(0)-64];
}
function lesserOf(a, b) {
	if (b<a) {return b;}
	return a;
}
function parseRangeCoords(rangeCoords) {
	if (rangeCoords === undefined) {rangeCoords = "A1:"+_dims;}
	let out = rangeCoords.split(",");
	out.forEach((range,i) => {
		out[i] = range.split(":");
		if (out[i].length < 2) {out[i].push(out[i][0]);}
		out[i].forEach((corner,j) => {
			out[i][j] = parseCoords(corner);
		});
	});
	return out;
}
//--------------------------------------------------------------------MAIN
//------------------------------------CHAR
class DaisyChar {
	constructor(_team, _pos, _visible = false) {
		this.team = TEAM.get(_team[0].toLowerCase());
		if (this.team === undefined) {throw `Team ${_team} not valid!`;}

		this.pos = parseCoords(_pos);
		this.visible = _visible;
	}

	moveTo(_pos) {
		this.pos = parseCoords(_pos);
	}
}
//------------------------------------MAP
class DaisyMap {
	constructor(_dims, _bg, _obj, _wall, _pH = MAX_PH, _pV = MAX_PV) {
		this.dims = parseCoords(_dims);
		this.pS = lesserOf(Math.floor(_pH/this.dims[0]), Math.floor(_pV/this.dims[1]));
		this.pM = Math.ceil(this.pS/64);
		this.chars = new Map();

		if (_bg === undefined || _bg === null) {_bg = "A1:"+_dims;}
		this.bg = parseRangeCoords(_bg);
		this.obj = (_obj === undefined || _obj === null) ? [] : parseRangeCoords(_obj);
		this.wall = (_wall === undefined || _wall === null) ? [] : parseRangeCoords(_wall);

		this.canvas = createCanvas((1+this.dims[0])*this.pS, (1+this.dims[1])*this.pS);
		this.context = this.canvas.getContext("2d");
	}

	addChar(charName, char) {
		const ls = this.chars.get(charName);
		if (ls !== undefined) {ls.push(char);}
		else {this.chars.set(charName, [char]);}
	}
	addCharCheck(charName, char) {
		if (char.pos[0] >= 0 && char.pos[0] <= this.dims[0] &&
			char.pos[1] >= 0 && char.pos[1] <= this.dims[1] ) {this.addChar(charName, char);}
		else {throw `Char ${charName} not on map!`;}
	}
	getChar(charCode) {
		const charTup = charCode.split("_");
		if (this.chars.get(charTup[0]) === undefined) {throw `Char ${CharCode} not registered!`;}
		return this.chars.get(charTup[0])[parseInt((charTup.length == 1) ? 0 : parseInt(charTup[1],10)-1)];
	}
	addArea(type, rangeCoords) {
		let areaHolder;
		switch (type[0].toLowerCase()) {
			case "b": areaHolder = this.bg; break;
			case "w": areaHolder = this.wall; break;
			case "o": areaHolder = this.obj; break;

			default: throw `Type ${type} not valid!`;
		};
		parseRangeCoords(rangeCoords).forEach((area, i) => {
			areaHolder.push(area);
		});
	}

	fillCell(h, v) {
		this.context.fillRect(h*this.pS+this.pM, v*this.pS+this.pM, this.pS-2*this.pM, this.pS-2*this.pM);
	}
	writeCell(text, h, v) {
		this.context.fillText(text, (2*h+1)*this.pS/2, (2*v+1)*this.pS/2);
	}
	fillArea(area) {
		area.forEach((range, i) => {
			for (let h = range[0][0]; h <= range[1][0]; h++) {
				for (let v = range[0][1]; v <= range[1][1]; v++) {
					this.fillCell(h,v);
				}
			}
		});
	}

	prepMap() {
		this.context.fillStyle = "#000";
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

		this.context.textAlign = "center";
		this.context.textBaseline = "middle";
		this.context.font = (this.pS/2-3*this.pM).toString()+"px Arial";

		this.context.fillStyle = TEAM.get("b");
		this.fillArea(this.bg);
		this.context.fillStyle = TEAM.get("o");
		this.fillArea(this.obj);
		this.context.fillStyle = TEAM.get("w");
		this.fillArea(this.wall);

		this.context.fillStyle = "#fff";
		for (let h = 1; h <= this.dims[0]; h++) {this.writeCell(h.toString(), h, 0);}
		for (let v = 1; v <= this.dims[1]; v++) {this.writeCell(String.fromCharCode(64+v), 0, v);}
	}

	buildMap() {
		this.prepMap();

		for (const [charName, charLs] of this.chars.entries()) {
			let charCode = charName[0] + charName[charName.length-1];
			let many = (charLs.length > 1);

			charLs.forEach((char, i) => {
				if (char.visible) {
					this.context.fillStyle = char.team;
					this.fillCell(char.pos[0], char.pos[1]);
					this.context.fillStyle = "#000";
					this.writeCell((many) ? charCode + (i+1).toString() : charCode, char.pos[0], char.pos[1]);
				}
			});
		}

		return this.canvas.toBuffer("image/png");
	}
}
//--------------------------------------------------------------------FINALIZE
export {
	DaisyMap,
	DaisyChar
}
