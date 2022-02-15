const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')

//--------------------------------------------------------------------CONSTANTS
const TEAM = new Map([
	["p", ["#3f3", "Party"]],
	["a", ["#38f", "Allies"]],
	["e", ["#f33", "Enemies"]],
	["n", ["#640", "Neutrals"]],
	["o", ["#848b94", "Objects"]],
	["b", ["#a38b53", "Background"]],
	["w", ["#000", "Walls"]]
]);

const MAX_PH = 1080, MAX_PV = 800;
//--------------------------------------------------------------------HELPERS
function lesserOf(a, b) {
	if (b<a) {return b;}
	return a;
}
function parseCoords(coord) {
	return [parseInt(coord.slice(1),10), coord.charCodeAt(0)-64];
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
	static getCharTup(charStr) {
		return charStr.split("_");
	}
	static makeCharCode(charName) {
		return charName[0] + charName[charName.length-1];
	}
	static getColour(teamChar) {
		return TEAM.get(teamChar)[0];
	}

	constructor(_team, _pos, _visible = false) {
		this.team = (_team[0] == "#") ? _team : DaisyChar.getColour(_team[0].toLowerCase())
		this.pos = parseCoords(_pos);
		this.visible = _visible;
		this.removed = false;
	}

	copy(_pos) {
		return new DaisyChar(this.team, _pos, this.visible);
	}

	moveTo(_pos) {
		this.pos = parseCoords(_pos);
	}
}
//------------------------------------MAP
class DaisyMap {
	static recover(dMap) {
		return (dMap === undefined) ? [false, false] : [dMap.map, dMap.img];
	}

	constructor(_dims, _bg, _obj, _wall, _map, _img, _pH = MAX_PH, _pV = MAX_PV) {
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

		this.map = _map;
		this.img = _img;
	}

	addChar(charName, char) {
		const ls = this.chars.get(charName);
		if (ls !== undefined) {ls.push(char);}
		else {this.chars.set(charName, [char]);}
	}
	getChar(charStr) {
		const charTup = DaisyChar.getCharTup(charStr);
		if (this.chars.get(charTup[0]) === undefined) {throw `Char ${charTup[0]} not registered!`;}
		return this.chars.get(charTup[0])[parseInt((charTup.length == 1) ? 0 : parseInt(charTup[1],10)-1)];
	}
	getCharLs(charStr) {
		return this.chars.get(DaisyChar.getCharTup(charStr)[0]);
	}
	removeCharLs(charStr) {
		this.chars.delete(DaisyChar.getCharTup(charStr)[0]);
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

		this.context.fillStyle = DaisyChar.getColour("b");
		this.fillArea(this.bg);
		this.context.fillStyle = DaisyChar.getColour("o");
		this.fillArea(this.obj);
		this.context.fillStyle = DaisyChar.getColour("w");
		this.fillArea(this.wall);

		this.context.fillStyle = "#fff";
		for (let h = 1; h <= this.dims[0]; h++) {this.writeCell(h.toString(), h, 0);}
		for (let v = 1; v <= this.dims[1]; v++) {this.writeCell(String.fromCharCode(64+v), 0, v);}
	}

	buildMap() {
		this.prepMap();

		for (const [charName, charLs] of this.chars.entries()) {
			let charCode = DaisyChar.makeCharCode(charName);
			let many = (charLs.length > 1);

			charLs.forEach((char, i) => {
				if (char.visible && !char.removed) {
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
	TEAM,
	DaisyMap,
	DaisyChar
}
