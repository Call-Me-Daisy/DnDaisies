const fs = require('fs')
const { createCanvas, loadImage} = require('canvas')

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

const MAX_PH = 1920, MAX_PV = 1080;
//--------------------------------------------------------------------HELPERS
function toCapitalCase(str) {
	return str[0].toUpperCase() + str.slice(1).toLowerCase();
}
function lesserOf(a, b) {
	if (b<a) {return b;}
	return a;
}
function parseCoord(coord) {
	let coordSplit = coord.split("-");
	return (coordSplit.length > 1) ? parseNumCoord(coordSplit) : parseStrCoord(coord);
}
function parseStrCoord(coord) {
	return [parseInt(coord.slice(1), 10), coord.charCodeAt(0)-64];
}
function parseNumCoord(coordSplit) {
	return [parseInt(coordSplit[1],10), parseInt(coordSplit[0],10)];
}
function parseRangeCoords(rangeCoords) {
	let out = rangeCoords.split(",");
	for (const [i, range] of out.entries()) {
		out[i] = range.split(":");
		if (out[i].length < 2) {out[i].push(out[i][0]);}
		for (const [j, corner] of out[i].entries()) {
			out[i][j] = parseCoord(corner);
		}
	}
	return out;
}
function createStrCoord(nums) {
	return String.fromCharCode(64+nums[1]) + nums[0];
}
//--------------------------------------------------------------------MAIN
//------------------------------------CHAR
class DaisyChar {
	static toKeyCase(str) {
		let out = [];
		for (const word of str.split(" ")) {
			out.push(toCapitalCase(word));
		}
		return out.join("-");
	}
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
		this.pos = parseCoord(_pos);
		this.visible = _visible;
		this.removed = false;
	}

	copy(_pos) {
		return new DaisyChar(this.team, _pos, this.visible);
	}
	moveTo(_pos) {
		this.pos = parseCoord(_pos);
	}
}
//------------------------------------MAP
class DaisyMap {
	static recover(dMap) {
		return (dMap === undefined) ? [false, false] : [dMap.map, dMap.img];
	}

	constructor(_map, _img, _dims, _bg, _pH = MAX_PH, _pV = MAX_PV) {
		this.dims = parseCoord(_dims);
		this.pS = lesserOf(Math.floor(_pH/this.dims[0]), Math.floor(_pV/this.dims[1]));
		this.pM = Math.ceil(this.pS/64);
		this.chars = new Map();

		if (_bg === undefined || _bg === null) {_bg = "A1:"+createStrCoord(this.dims);}
		this.bg = parseRangeCoords(_bg);
		this.obj = [];
		this.wall = [];

		this.canvas = createCanvas((2+this.dims[0])*this.pS, (2+this.dims[1])*this.pS);
		this.context = this.canvas.getContext("2d");
		this.context.font = (2*this.pS/3-3*this.pM).toString()+"px Arial";
		this.context.textBaseline = "middle";
		this.context.textAlign = "center";

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
		for (const area of parseRangeCoords(rangeCoords)) {
			areaHolder.push(area);
		}
	}

	fillCell(h, v) {
		this.context.fillRect(h*this.pS+this.pM, v*this.pS+this.pM, this.pS-2*this.pM, this.pS-2*this.pM);
	}
	drawCell(img, h, v) {
		this.context.drawImage(img, h*this.pS+this.pM, v*this.pS+this.pM, this.pS-2*this.pM, this.pS-2*this.pM);
	}
	writeCell(text, h, v) {
		this.context.fillText(text, (2*h+1)*this.pS/2, (2*v+1)*this.pS/2);
	}
	fillArea(area) {
		for (const range of area) {
			for (let h = range[0][0]; h <= range[1][0]; h++) {
				for (let v = range[0][1]; v <= range[1][1]; v++) {
					this.fillCell(h,v);
				}
			}
		}
	}

	async fetchImgUrls() {
		if (!this.img) {return false;}

		let out = new Map();
		for (const [key, msg] of await this.img.messages.fetch({limit:100})) {
			if (msg.attachments.size > 0) {
				out.set(DaisyChar.toKeyCase(msg.content), msg.attachments.entries().next().value[1].url);
			}
		}

		return out;
	}

	prepMap() {
		this.context.fillStyle = "#000";
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

		this.context.fillStyle = "#fff";
		for (const h of [0, this.dims[0]+1]) {
			for (let v = 1; v <= this.dims[1]; v++) {this.writeCell(String.fromCharCode(64+v), h, v);}
		}
		for (const v of [0, this.dims[1]+1]) {
			for (let h = 1; h <= this.dims[0]; h++) {this.writeCell(h.toString(), h, v);}
		}
	}
	async drawBackground(imgUrls) {
		try {
			let bg = imgUrls.get("Background");
			if (bg === undefined) {throw "";}
			this.context.drawImage(
				await loadImage(bg), this.pS, this.pS, this.dims[0]*this.pS, this.dims[1]*this.pS);
		} catch (e) {
			this.context.fillStyle = DaisyChar.getColour("b");
			this.fillArea(this.bg);
			this.context.fillStyle = DaisyChar.getColour("o");
			this.fillArea(this.obj);
			this.context.fillStyle = DaisyChar.getColour("w");
			this.fillArea(this.wall);
		}
	}
	async drawTokens(imgUrls) {
		for (const [charName, charLs] of this.chars) {
			let many = (charLs.length > 1);
			let img, txt;
			try {
				let url = imgUrls.get(charName);
				if (url === undefined) {throw "";}
				img = loadImage(url);
				txt = false;
			} catch (e) {
				txt = DaisyChar.makeCharCode(charName);
				img = false;
			}
			for (const [i, char] of charLs.entries()) {
				if (char.visible && !char.removed) {
					if (txt) {
						this.context.fillStyle = char.team;
						this.fillCell(char.pos[0], char.pos[1]);
						this.context.fillStyle = "#000";
						this.writeCell((many) ? txt + (i+1).toString() : txt, char.pos[0], char.pos[1]);
					}
					else {
						this.drawCell(await img, char.pos[0], char.pos[1]);
						if (many) {
							this.context.fillStyle = char.team;
							this.writeCell((i+1).toString(), char.pos[0], char.pos[1]);
						}
					}
				}
			}
		}
	}
	async buildMap() {
		let imgUrls = await this.fetchImgUrls();

		this.prepMap();
		await this.drawBackground(imgUrls);
		await this.drawTokens(imgUrls);

		return this.canvas.toBuffer("image/png");
	}
}
//--------------------------------------------------------------------FINALIZE
export {
	TEAM,
	DaisyMap,
	DaisyChar
}
