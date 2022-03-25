const { createCanvas, loadImage} = require("canvas");
//--------------------------------------------------------------------CONSTANTS
const MAX_PH = 1920, MAX_PV = 1080;
const FONT_STR = "px Arial";
//--------------------------------------------------------------------HELP
function scaleAlpha(_colStr, _r = 0.5) {
	return (function(_len){
		switch (_len % 4) {
			case 3: return _colStr + (255*_r).toString(16)[0];
			case 2: return _colStr + (255*_r).toString(16);
			case 0: return (function(){
				let n = Math.floor(_len / 3) - 1;
				let a = parseInt(_colStr.slice(_len - n), 16);
				return _colStr.slice(0, _len - n) + (a*_r).toString(16);
			})();
		}
	})(_colStr.length - 1);
}
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
	setFrom(_that) {
		return this.set(_that.x, _that.y, _that.h, _that.v);
	}

	shunt(_x, _y) {
		this.x += _x;
		this.y += _y;
		return this;
	}
	stretch(_h, _v) {
		this.h += _h;
		this.v += _v;
		return this;
	}

	centerStretch(_h, _v) {
		return this.setAbs(this.x + (this.h-_h)/2, this.y + (this.v-_v)/2, _h, _v);
	}
}
//--------------------------------------------------------------------MAIN
//------------------------------------BRUSH
class Brush extends Rect {
	constructor(_ctx, _pS, _pM) {
		super(_pM, _pM, _pS-2*_pM, _pS-2*_pM);
		this.ctx = _ctx;
		this.pS = _pS;
		this.pM = _pM;
		this.maxFont = 2*(_pS/3-2*_pM);
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

	clear() {
		this.ctx.clearRect(this.x, this.y, this.h, this.v);
	}
	fillRect() {
		this.ctx.fillRect(this.x, this.y, this.h, this.v);
	}
	fillEllipse() {
		this.ctx.beginPath();
		this.ctx.ellipse(this.x + this.h/2, this.y + this.v/2, this.h/2, this.v/2, 0, 0, Math.PI*2);
		this.ctx.fill();
	}

	write(_txt) {
		this.ctx.fillText(_txt, this.x + this.h/2, this.y + this.v/2);
	}
	draw(_img) {
		this.ctx.drawImage(_img, this.x, this.y, this.h, this.v);
	}

	scaleFont(_r) {
		this.ctx.font = ((_r > 1) ? 1 : ((_r < 0) ? 0 : _r)*this.maxFont) + FONT_STR;
	}
	centerStretch(_r) {
		super.centerStretch(_r*this.h, _r*this.v);
	}
	adjust() {
		let lw = this.ctx.lineWidth;
		super.shunt(lw/2, lw/2);
		return super.stretch(-lw, -lw);
	}
	reset() {
		return this.setAbs(this.pM, this.pM, this.pS-2*this.pM, this.pS-2*this.pM);
	}
}
class PaintStyle {
	//------------CELL
	static RECT = 1;
	static rect(_brush) {
		_brush.fillRect();
	}
	static ELLIPSE = 2;
	static ellipse(_brush) {
		_brush.fillEllipse();
	}
	//------------MAIN
	static FILL = 1;
	static fill(_brush, _token, _args, _named) {
		_brush.ctx.fillStyle = _args.colour;
		_brush.setFrom(_token);
		_args.cell(_brush);
		if (_named) {
			_brush.ctx.fillStyle = "#000";
			_brush.write(_args.code + ((_args.many) ? (_args.i).toString() : ""));
		}
	}
	static GRID = 2;
	static grid(_brush, _token, _args, _named) {
		_brush.ctx.fillStyle = _args.colour;
		_brush.setDim(1, 1);
		for (let y = _token.y; y < _token.y + _token.v; y++) {
			for (let x = _token.x; x < _token.x + _token.h; x++) {
				_brush.setPos(x, y);
				_args.cell(_brush);
			}
		}
		if (_named) {
			_brush.ctx.fillStyle = "#fff";
			_brush.setFrom(_token).write(_args.code + ((_args.many) ? (_args.i).toString() : ""));
		}
	}
	static IMAGE = 3;
	static async image(_brush, _token, _args, _named) {
		_brush.setFrom(_token);
		try {
			_brush.draw(await _args.img);
			if (_named && _args.many) {
				_brush.ctx.fillStyle = _args.colour;
				_brush.write((_args.i).toString());
			}
		} catch (e) {
			PaintStyle.fill(_brush, _token, _args);
		}
	}
	static SWARM = 4;
	static swarm(_brush, _token, _args, _named) {
		PaintStyle.grid(_brush, _token, _args, false);
		if (_named) {
			_brush.ctx.fillStyle = "#000";
			let code = _args.code + ((_args.many) ? (_args.i).toString() : "");
			_brush.reset();
			for (const i of [0,1]) {
				for (const j of [0,1]) {
					_brush.setPos(_token.x + i*(_token.h-1), _token.y + j*(_token.v-1));
					_brush.write(code);
				}
			}
		}
	}
	static CONCENTRIC = 5;
	static concentric(_brush, _token, _args, _named) {
		PaintStyle.fill(_brush, _token, _args, false);
		_brush.ctx.fillStyle = scaleAlpha(_args.colour);
		_brush.centerStretch(3);
		_args.cell(_brush);
		if (_named) {
			_brush.ctx.fillStyle = "#fff";
			_brush.write(_args.code + ((_args.many) ? (_args.i).toString() : ""));
		}
	}
	//------------SWITCH
	static getStyle(_styleCodes) {
		return {
			main: (function(_code){
				switch (Math.abs(_code)) {
					case PaintStyle.FILL: return PaintStyle.fill;
					case PaintStyle.IMAGE: return PaintStyle.image;
					case PaintStyle.GRID: return PaintStyle.grid;
					case PaintStyle.SWARM: return PaintStyle.swarm;
					case PaintStyle.CONCENTRIC: return PaintStyle.concentric;
				}
			})(_styleCodes.main),
			cell: (function(_code){
				switch(Math.abs(_code)) {
					case PaintStyle.RECT: return PaintStyle.rect;
					case PaintStyle.ELLIPSE: return PaintStyle.ellipse;
				}
			})(_styleCodes.cell)
		};
	}
}
class GuideStyle {
	static RECT = 1;
	static rect(_brush, _args) {
		_brush.set(_args.origin[0], _args.origin[1], _args.dim[0], _args.dim[1]).adjust();
		_brush.ctx.strokeRect(_brush.x, _brush.y, _brush.h, _brush.v);
	}
	static LINE = 2;
	static line(_brush, _args) {
		_brush.setPos(_args.origin[0], _args.origin[1]).adjust();
		_brush.ctx.beginPath();
		_brush.ctx.moveTo(_brush.x, _brush.y);
		_brush.setPos(_args.pos[0], _args.pos[1]).adjust();
		_brush.ctx.lineTo(_brush.x, _brush.y);
		_brush.ctx.stroke();
	}
	static ELLIPSE = 3;
	static ellipse(_brush, _args) {
		_brush.setPos(_args.origin[0], _args.origin[1]).adjust();
		_brush.setDim(_args.radii[0], (_args.radii[1] === undefined) ? _args.radii[0] : _args.radii[1]);
		_brush.ctx.beginPath();
		_brush.ctx.ellipse(_brush.x, _brush.y, _brush.h, _brush.v, 0, 0, Math.PI*2);
		_brush.ctx.stroke();
	}
	static SUNDAIL = 4;
	static sundail(_brush, _args) {
		if (_args.pos[0] === undefined) {
			GuideStyle.ellipse(_brush, _args);
			_args.pos = [_args.origin[0] + _args.radii[0], _args.origin[1]];
			GuideStyle.line(_brush, _args);
		}
		else {
			GuideStyle.line(_brush, _args);
			_args.radii = [Math.sqrt((_args.pos[0] - _args.origin[0])**2 + (_args.pos[1] - _args.origin[1])**2)];
			GuideStyle.ellipse(_brush, _args);
		}
	}
	static CONE = 5;
	static cone(_brush, _args) {
		_brush.setPos(_args.origin[0], _args.origin[1]).adjust();
		_brush.setDim(_args.radii[0]-1, (_args.radii[1] === undefined) ? _args.radii[0]-1 : _args.radii[1]-1);

		let c = Math.cos(_args.theta), s = Math.sin(_args.theta);
		let dr0 = [_brush.h*s, _brush.h*-c];
		let dr1 = [(_brush.v - _brush.ctx.lineWidth/2)*c/2, (_brush.v - _brush.ctx.lineWidth/2)*s/2];

		_brush.shunt(s,-c);

		_brush.ctx.beginPath();
		_brush.ctx.moveTo(_brush.x, _brush.y);
		_brush.ctx.lineTo(_brush.x + dr0[0] - dr1[0], _brush.y + dr0[1] - dr1[1]);
		_brush.ctx.lineTo(_brush.x + dr0[0] + dr1[0], _brush.y + dr0[1] + dr1[1]);
		_brush.ctx.closePath();
		_brush.ctx.stroke();

		_brush.reset();
	}
	static SPIDER = 6;
	static spider(_brush, _args) {
		for (const pos of _args.posLs) {
			_args.pos = pos;
			GuideStyle.line(_brush, _args);
		}
	}

	static getStyle(_code) {
		switch(Math.abs(_code)) {
			case GuideStyle.RECT: return GuideStyle.rect;
			case GuideStyle.LINE: return GuideStyle.line;
			case GuideStyle.ELLIPSE: return GuideStyle.ellipse;
			case GuideStyle.SUNDAIL: return GuideStyle.sundail;
			case GuideStyle.CONE: return GuideStyle.cone;
			case GuideStyle.SPIDER: return GuideStyle.spider;
		}
		throw `Invalid guide code: ${_code}`;
	}
}
//------------------------------------TOKEN
class Token extends Rect {
	constructor(_pos, _dim, _visible = true) {
		super(_pos[0], _pos[1], _dim[0], _dim[1]);
		this.visible = _visible;
		this.removed = false;
		this.z = (_pos.length > 2 && _pos[2]) ? _pos[2] : 0;
	}

	setPos(_pos) {
		if (_pos.length > 2 && (_pos[2] || _pos[2] === 0)) {this.z = Math.floor(_pos[2]);}
		return super.setPos(Math.floor(_pos[0]), Math.floor(_pos[1]));
	}
	setDim(_dim) {
		return super.setDim(Math.ceil(_dim[0]), Math.ceil(_dim[1]));
	}

	getPos() {
		return [this.x, this.y, this.z];
	}
	getCenter() {
		return [this.x + (this.h - 1)/2, this.y + (this.v - 1)/2, this.z];
	}
}
//------------------------------------TOKENGROUP
class TokenGroup {
	static makeCode(_name) {
		return _name[0].toUpperCase()+_name[_name.length-1].toLowerCase();
	}
	constructor(_name, _dim, _styleCodes, _colour, _layer) {
		this.dim = _dim;
		this.styleCode = _styleCodes;
		this.colour = _colour;
		this.layer = _layer;

		this.code = TokenGroup.makeCode(_name);
		this.style = PaintStyle.getStyle(_styleCodes);
		this.tokens = [];
	}

	push(_pos, _dim, _visible) {
		this.tokens.push(new Token(_pos, (_dim) ? _dim : this.dim, _visible));
	}
	pushMany(_posLs, _dim, _visible) {
		let parseDim = (_dim && _dim instanceof Array) ?
			((_dim[0] instanceof Array) ?
				function(_i) {return _dim[_i];}
				: function(_i) {return _dim;}
			) : function(_i) {return [false];}
		for (const [i, pos] of _posLs.entries()) {
			this.push(pos, parseDim(i), _visible);
		}
	}

	isEmpty() {
		for (const token of this.tokens) {
			if (!token.removed) {return false;}
		}
		return true;
	}

	async paintAll(_brush, _imgUrls, _name) {
		if (this.tokens.length > 0) {
			let args = {
				colour: this.colour,
				many: (this.tokens.length > 1),
				code: this.code,
				cell: this.style.cell
			};
			let currentStyle = this.style.main;
			switch (Math.abs(this.styleCode.main)) {
				case PaintStyle.IMAGE:
					if (_imgUrls && _imgUrls.get(_name) !== undefined) {args.img = loadImage(_imgUrls.get(_name));}
					else {currentStyle = PaintStyle.fill;}
					break;
			}
			for (const [i, token] of this.tokens.entries()) {
				if (token.visible && !token.removed) {
					args.i = i;
					await currentStyle(_brush, token, args, (this.styleCode.main < 0));
				}
			}
		}
	}
}
//------------------------------------ARENA
class Arena {
	constructor(_dim, _feedback = console.log, _feedhelp = "USER_ERROR:", _pH = MAX_PH, _pV = MAX_PV) {
		this.dim = _dim;
		this.feedhelp = _feedhelp;
		this.feedback = _feedback; //void function(_feedhelp, string) => tells user what they did wrong
		let pS = Math.floor(Math.min(_pH/_dim[0], _pV/_dim[1]));
		let pM = Math.ceil(pS/64);

		this.canvas = createCanvas((2+_dim[0])*pS, (2+_dim[1])*pS);
		this.groups = new Map();
		this.topLayer = 0;
		this.newGroup({main: PaintStyle.IMAGE, cell: PaintStyle.RECT}, 0, "Background", "#000", _dim);
		this.addToGroupSplit("Background", [1,1,0]);

		this.brush = new Brush(this.canvas.getContext("2d"), pS, pM);
		this.brush.ctx.textAlign = "center";
		this.brush.ctx.textBaseline = "middle";
		this.brush.ctx.strokeStyle = "#3579";
		this.brush.ctx.lineWidth = pS;

		this.guide = {display: false};
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

	addToGroup(_name, _range, _visible = true) {
		let group = this.requireGroup(_name);
		if (group) {
			if (_range instanceof Array) {
				if (_range[0] instanceof Array) {
					for (const range of _range) {
						group.push(range[0], range[1], _visible)
					}
				}
				else {group.push(_range[0], _range[1], _visible);}
			}
			else {
				this.userFeedback(`Position coords must be in form [x,y,{z}].`)
			}
		}
	}
	addToGroupSplit(_name, _pos, _dim = false, _visible = true) {
		let group = this.requireGroup(_name);
		if (group) {
			if (_pos instanceof Array) {
				(_pos[0] instanceof Array) ? group.pushMany(_pos, _dim, _visible) : group.push(_pos, _dim, _visible);
			}
			else {
				this.userFeedback(`Position coords must be in form [x,y,{z}].`)
			}
		}
	}
	newGroup(_styleCodes, _layer, _name, _colour, _dim = [1,1], _override = false) {
		if (_override || this.groups.get(_name) === undefined) {
			this.groups.set(_name, new TokenGroup(_name, _dim, _styleCodes, _colour, _layer));
			if (_layer > this.topLayer) {this.topLayer = _layer;}
		}
		else {
			this.userFeedback(`Group ${_name} already exists; allow override or use alternate name.`);
		}
	}

	removeGroup(_name) {
		return this.groups.delete(_name);
	}
	removeToken(_name, _i, _andGroup = false) {
		let group = this.requireGroup(_name);
		if (group) {
			group.tokens[_i].removed = true;
			if (_andGroup && group.isEmpty()) {this.removeGroup(_name);}
			return true;
		}
		return false;
	}

	displayGuide() {
		this.guide.display = true;
	}
	setGuide(_shapeCode, _shapeArgs) {
		this.guide.shape = GuideStyle.getStyle(_shapeCode);
		this.guide.args = _shapeArgs;
	}

	async prepMap() {
		this.brush.scaleFont(1);
		this.brush.ctx.fillStyle = "#000";
		this.brush.setAbs(0, 0, this.canvas.width, this.canvas.height)
		this.brush.fillRect();

		this.brush.ctx.fillStyle = "#fff";
		this.brush.reset();
		for (const h of [0, this.dim[0]+1]) {
			for (let v = 1; v <= this.dim[1]; v++) {
				this.brush.setPos(h,v).write(String.fromCharCode(v + ((v > 26) ? 70 : 64)));
			}
		}
		for (const v of [0, this.dim[1]+1]) {
			for (let h = 1; h <= this.dim[0]; h++) {this.brush.setPos(h,v).write(h.toString());}
		}
		this.brush.scaleFont(0.75);
	}
	async drawGuide() {
		if (this.guide.display) {
			this.guide.shape(this.brush, this.guide.args);
			this.guide.display = false;
		}
	}
	async buildMap(_imgUrls) {
		this.prepMap();

		let layers = [];
		for (let i=0; i<=this.topLayer+1; i++) {layers.push(new Map());}
		for (const [name, group] of this.groups) {
			layers[(group.layer !== -1) ? group.layer : this.topLayer+1].set(name, group);
		}
		for (const layer of layers) {
			for (const [name, group] of layer) {
				await group.paintAll(this.brush, await _imgUrls, name);
			}
		}

		await this.drawGuide();
		return this.canvas.toBuffer("image/png");
	}
}
//--------------------------------------------------------------------FINALIZE
export {
	Arena,
	PaintStyle,
	GuideStyle
}
