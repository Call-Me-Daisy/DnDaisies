const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')

const TEAM = new Map([
	["o", "#222"],
	["e", "#f33"],
	["p", "#3f3"],
	["a", "#38f"],
	["n", "#640"]
]);

class DaisyChar {
	constructor(_team, _pos, _visible = false) {
		this.team = TEAM.get(_team[0].toLowerCase());
		if (this.team === undefined) {throw "Invalid _team for DaisyChar!";}

		this.pos = _pos;
		this.visible = _visible;
	}

	moveTo(_pos) {
		this.pos = _pos;
	}
}

class DaisyMap {
	constructor(_H, _V, _pH, _pV, _pM = NaN) {
		this.dims = [_H, _V];
		this.pS = (_pH/_H < _pV/_V) ? Math.floor(_pH/_H) : Math.floor(_pV/_V);
		this.pM = (isNaN(_pM)) ? Math.ceil(this.pS/64) : _pM;
		this.chars = new Map();

		this.canvas = createCanvas((1+_H)*this.pS, (1+_V)*this.pS);
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
	getChar(charName) {
		if (this.chars.get(charName) === undefined) {throw `Char ${CharName} not registered!`;}
		return this.chars.get(charName)[0];
	}

	fillCell(h, v) {
		this.context.fillRect(h*this.pS+this.pM, v*this.pS+this.pM, this.pS-2*this.pM, this.pS-2*this.pM);
	}
	writeCell(text, h, v) {
		this.context.fillText(text, (2*h+1)*this.pS/2, (2*v+1)*this.pS/2);
	}

	prepMap() {
		this.context.fillStyle = "#000";
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

		this.context.textAlign = "center";
		this.context.textBaseline = "middle";
		this.context.font = (this.pS/2-3*this.pM).toString()+"px Arial";

		this.context.fillStyle = "#fff";
		for (let v = 1; v <= this.dims[1]; v++) {
			for (let h = 1; h <= this.dims[0]; h++) {
				this.fillCell(h, v);
			}
		}
		this.context.fillStyle = "#fff";
		for (let v = 1; v <= this.dims[1]; v++) {this.writeCell(String.fromCharCode(64+v), 0, v);}
		for (let h = 1; h <= this.dims[0]; h++) {this.writeCell(h.toString(), h, 0);}
	}

	buildMap() {
		this.prepMap();

		var charCode, many;
		for (const [charName, charLs] of this.chars.entries()) {
			charCode = charName[0] + charName[charName.length-1];
			many = (charLs.length > 1);

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

export {
	DaisyMap,
	DaisyChar
}
