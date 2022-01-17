const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')

const TEAM = new Map([
	["p", "#0f0"],
	["a", "#00f"],
	["e", "#f00"],
	["n", "#000"]
]);

class DaisyChar {
	constructor(_team, _posH = 1, _posV = 1, _visible = false) {
		this.team = TEAM.get(_team.charAt(0).toLowerCase());
		if (this.team === undefined) {throw "Invalid _team for DaisyChar!";}

		this.pos = Array.of(_posH, _posV);
		this.visible = _visible;
	}

	copy(_pos = undefined, _visible = undefined) {
		if (_pos = undefined) {_pos = this.pos;}
		if (_visible = undefined) {_visible = this.visible;}
		return DaisyChar(this.team, _pos[0], _pos[1], _visible);
	}

	moveTo(_pos) {
		this.pos = _pos;
	}
	moveBy(_dir) {
		this.pos[0] += _dir[0];
		this.pos[1] += _dir[1];
	}
}

class DaisyMap {
	constructor(_H, _V, _pS, _pM) {
		this.dims = [_H, _V];
		this.pS = _pS;
		this.pM = _pM;
		this.chars = new Map();
		this.assets = [];

		this.canvas = createCanvas((1+_H)*_pS, (1+_V)*_pS);
		this.context = this.canvas.getContext("2d");
	}

	addChar(charName, char) {
		this.chars.set(charName, char);
	}
	addCharCheck(charName, char) {
		if (char.pos[0] >= 0 && char.pos[0] <= this.dims[0] &&
			char.pos[1] >= 0 && char.pos[1] <= this.dims[1] ) {this.addChar(charName, char);}
		else {throw "Index out of range!"}
	}
	getChar(charName) {
		return this.chars.get(charName);
	}
	getCharCheck(charName) {
		if (this.getChar(charName) === undefined) {throw "Char by that name is not registered!";}
		return this.getChar(charName);
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

	newMap(_H, _V) {

	}

	buildMap() {
		this.prepMap();

		for (const [charName, char] of this.chars.entries()) {
			if (char.visible) {
				this.context.fillStyle = char.team;
				this.fillCell(char.pos[0], char.pos[1]);
				this.context.fillStyle = "#000";
				this.writeCell(charName.substring(0,2), char.pos[0], char.pos[1]);
			}
		}

		fs.writeFileSync("./map.png", this.canvas.toBuffer("image/png"));
	}

	async fetchBuffer() {
		const canvas = createCanvas(this.canvas.width, this.canvas.height);
		canvas.getContext("2d").drawImage(await loadImage("./map.png"), 0, 0, this.canvas.width, this.canvas.height)
		return canvas.toBuffer("image/png");
	}
}

export {
	DaisyMap,
	DaisyChar
}
