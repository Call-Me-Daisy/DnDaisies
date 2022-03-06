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
Object.freeze(TEAM);

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

function scaleColour(_colour, _scale) {
	let out = ["#"];
	let di = (_colour.length < 6) ? 1 : 2;

	for (let i = 0; i < 3; i++) {
		let el = _colour.slice(i*di+1, (i+1)*di+1);
		el = parseInt((di == 1) ? el+el : el, 16)*_scale;
		el = ((el > 255) ? 255 : (el < 0) ? 0 : Math.floor(el)).toString(16)
		out.push((el.length < 2) ? "0"+el : el);
	}

	return out.join("");
}
//--------------------------------------------------------------------TESTING
//------------------------------------RECT
class Rect {
	constructor(_x, _y, _h, _v) {
		this.setAbs(_x, _y, _h, _v);
	}

	setAbs(_x, _y, _h, _v) {
		this.x = (_x > 0) ? _x : 0;
		this.y = (_y > 0) ? _y : 0;
		this.h = (_h > 0) ? _h : 1;
		this.v = (_v > 0) ? _v : 1;
	}
	setPos(_x, _y) {
		this.x = _x;
		this.y = _y;
		return this;
	}
	setDim(_h, _v) {
		this.h = _h;
		this.v = _v;
		return this;
	}
	set(_x, _y, _h, _v) {
		return this.setPos(_x, _y).setDim(_h, _v);
	}
	setFrom(_r) {
		return this.set(_r.x, _r.y, _r.h, _r.v);
	}

	shunt(_x, _y) {
		return this.setPos(_x+this.x, _y+this.y);
	}
	stretch(_h, _v) {
		return this.setDim(_h+this.h, _v+this.v);
	}

	centerStretch(_h, _v) {
		return this.setAbs(this.x + (this.h-_h)/2, this.y + (this.v-_v)/2, _h, _v);
	}
}
//------------------------------------BRUSH
class Brush extends Rect {
	constructor(_ctx, _pS, _pM) {
		super(_pM, _pM, _pS-2*_pM, _pS-2*_pM);
		this.ctx = _ctx;
		this.pS = _pS;
		this.pM = _pM;
	}

	setPos(_x, _y) {
		return super.setPos(_x*this.pS + this.pM, _y*this.pS + this.pM);
	}
	setDim(_h, _v) {
		return super.setDim(_h*this.pS - 2*this.pM, _v*this.pS - 2*this.pM);
	}

	shunt(_x, _y) {
		return super.shunt(_x*this.pS, _y*this.pS);
	}
	stretch(_h, _v) {
		return super.stretch(_h*this.pS, _v*this.pS);
	}

	fill() {
		this.ctx.fillRect(this.x, this.y, this.h, this.v);
	}
	write(_txt) {
		this.ctx.fillText(_txt, this.x + this.h/2, this.y + this.v/2);
	}
	draw(_img) {
		this.ctx.drawImage(_img, this.x, this.y, this.h, this.v);
	}

	reset() {
		return this.setAbs(this.pM, this.pM, this.pS-2*this.pM, this.pS-2*this.pM);
	}
}

class PaintStyle {
	static GRID = -1;
	static grid(_brush, _token, _args) {
		_brush.ctx.fillStyle = _args.colour;
		_brush.setDim(1, 1);
		for (let y = _token.y; y < _token.y + _token.v; y++) {
			for (let x = _token.x; x < _token.x + _token.h; x++) {
				_brush.setPos(x, y);
				_brush.fill();
			}
		}
	}
	static FILL = 1;
	static fill(_brush, _token, _args) {
		_brush.ctx.fillStyle = _args.colour;
		_brush.setFrom(_token);
		_brush.fill();
		_brush.ctx.fillStyle = "#000";
		_brush.write(_args.code + ((_args.many) ? (_args.i+1).toString() : ""));
	}
	static IMAGE = 0;
	static async image(_brush, _token, _args) {
		_brush.setFrom(_token);
		try {
			_brush.draw(await _args.img);
			if (_args.many) {
				_brush.ctx.fillStyle = _args.colour;
				_brush.write((_args.i+1).toString());
			}
		} catch (e) {
			PaintStyle.fill(_brush, _token, _args);
		}
	}
	static NAMED_GRID = -2;
	static namedGrid(_brush, _token, _args) {
		PaintStyle.grid(_brush, _token, _args);
		_args.colour = scaleColour(_args.colour, 0.75);
		PaintStyle.fill(_brush,
			new Rect(Math.floor(_token.x+_token.h/2), Math.floor(_token.y+_token.v/2), 1, 1),
			_args
		);
	}

	static getStyle(_code) {
		switch (_code) {
			case PaintStyle.FILL: return PaintStyle.fill;
			case PaintStyle.IMAGE: return PaintStyle.image;
			case PaintStyle.GRID: return PaintStyle.grid;
			case PaintStyle.NAMED_GRID: return PaintStyle.namedGrid;

			default: return PaintStyle.getStyle(0);
		}
	}
}
//------------------------------------TOKEN
class Token extends Rect {
	constructor(_dims, _pos, _visible = true) {
		super(_pos[0], _pos[1], _dims[0], _dims[1]);
		this.visible = _visible;
		this.removed = false;
	}
}
//------------------------------------TOKENGROUP
class TokenGroup {
	static makeCode(_name) {
		return _name[0].toUpperCase()+_name[_name.length-1].toLowerCase();
	}
	constructor(_name, _styleCode, _dims, _colour) {
		this.code = TokenGroup.makeCode(_name);
		this.dims = _dims;
		this.colour = _colour

		this.styleCode = _styleCode;
		this.style = PaintStyle.getStyle(_styleCode);

		this.tokens = [];
	}

	push(_pos) {
		this.tokens.push(new Token(this.dims, _pos));
	}
	pushMany(_posLs) {
		for (const pos of _posLs) {this.push(pos);}
	}

	async paintAll(_brush, _imgUrls, _name) {
		let args = {
			colour: this.colour,
			many: (this.tokens.length > 1),
			code: this.code
		};
		if (this.styleCode === PaintStyle.IMAGE) {
			let url = _imgUrls.get(_name);
			if (url !== undefined) {args.img = loadImage(url);}
			else {this.style = PaintStyle.fill;}
		}
		for (const [i, token] of this.tokens.entries()) {
			if (token.visible && !token.removed) {
				args.i = i;
				await this.style(_brush, token, args);
			}
		}
	}
}
//------------------------------------ARENA
class Arena {
	static recover(_arena) {
		return (_arena === undefined) ? [false, false] : [_arena.map, _arena.img];
	}
	static toKeyCase(_str) {
		return _str[0].toUpperCase() + _str.slice(1).toLowerCase();
	}

	constructor(_map, _img, _dims, _feedback = console.log, _feedhelp = "", _pH = MAX_PH, _pV = MAX_PV) {
		this.dims = _dims;
		this.feedhelp = _feedhelp;
		this.feedback = _feedback; //void function(_feedhelp, string) => tells user what they did wrong
		let pS = Math.floor(Math.min(_pH/_dims[0], _pV/_dims[1]));
		let pM = Math.ceil(pS/64);

		this.canvas = createCanvas((2+_dims[0])*pS, (2+_dims[1])*pS);
		this.groups = new Map();

		this.brush = new Brush(this.canvas.getContext("2d"), pS, pM);
		this.brush.ctx.font = Math.floor(2*pS/3-4*pM) + "px Arial";
		this.brush.ctx.textAlign = "center";
		this.brush.ctx.textBaseline = "middle";

		this.map = _map;
		this.img = _img;
	}

	userFeedback(_str) {
		return this.feedback(this.feedhelp, _str);
	}

	getGroup(_name) {
		return this.groups.get(_name);
	}
	requireGroup(_name) {
		let group = this.getGroup(_name);
		if (group === undefined) {
			this.userFeedback(`Group ${_name} does not exist.`);
			return false;
		}
		return group;
	}
	getToken(_name, _i) {
		let group = this.requireGroup(_name);
		return (group) ? group.tokens[_i] : false;
	}

	addToGroup(_name, _pos) {
		let group = this.requireGroup(_name);
		if (group) {
			if (_pos instanceof Array) {
				(_pos[0] instanceof Array) ? group.pushMany(_pos) : group.push(_pos);
			}
			else {
				this.userFeedback(`Position coords must be in form [x,y].`)
			}
		}
	}
	newGroup(_name, _styleCode, _colour, _dims = [1,1], _pos = false, _override = false) {
		if (_override || this.groups.get(_name) === undefined) {
			this.groups.set(_name, new TokenGroup(_name, _styleCode, _dims, _colour));
			if (_pos) {this.addToGroup(_name, _pos);}
		}
		else {
			this.userFeedback(`Group ${_name} already exists; allow override or use alternate name.`);
		}
	}

	removeGroup(_name) {
		this.groups.delete(_name);
	}
	removeToken(_name, _i, _andGroup = false) {
		let group = this.requireGroup(_name);
		if (group) {
			group.tokens[i].removed = true;
			if (_andGroup) {
				for (const token of group.tokens) {
					if (!token.removed) {_andGroup = false; break;}
				}
				if (_andGroup) {this.removeGroup(_name);}
			}
		}
	}

	async fetchImageUrls() {
		if (!this.img) {return false;}
		let out = new Map();
		for (const [key, msg] of await this.img.messages.fetch({limit:100})) {
			if (msg.attachments.size > 0) {
				out.set(DaisyChar.toKeyCase(msg.content), msg.attachments.entries().next().value[1].url);
			}
		}
		return out;
	}
	async prepMap() {
		this.brush.ctx.fillStyle = "#000";
		this.brush.setAbs(0, 0, this.canvas.width, this.canvas.height)
		this.brush.fill();

		this.brush.ctx.fillStyle = "#fff";
		this.brush.reset();
		for (const h of [0, this.dims[0]+1]) {
			for (let v = 1; v <= this.dims[1]; v++) {this.brush.setPos(h,v).write(String.fromCharCode(64+v));}
		}
		for (const v of [0, this.dims[1]+1]) {
			for (let h = 1; h <= this.dims[0]; h++) {this.brush.setPos(h,v).write(h.toString());}
		}
	}
	async buildMap() {
		let imgUrls = await this.fetchImageUrls();

		this.prepMap();

		for (const [name, group] of this.groups) {
			await group.paintAll(this.brush, imgUrls, name);
		}

		return this.canvas.toBuffer("image/png");
	}
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
	DaisyChar,
	Arena,
	PaintStyle
}
