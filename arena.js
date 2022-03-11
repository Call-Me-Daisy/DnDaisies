const { createCanvas, loadImage} = require('canvas')
//--------------------------------------------------------------------CONSTANTS
const MAX_PH = 1920, MAX_PV = 1080;
const FONT_STR = "px Arial";
//--------------------------------------------------------------------HELPERS
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
	fill() {
		this.ctx.fillRect(this.x, this.y, this.h, this.v);
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
	static GRID = 1;
	static grid(_brush, _token, _args, _named) {
		_brush.ctx.fillStyle = _args.colour;
		_brush.setDim(1, 1);
		for (let y = _token.y; y < _token.y + _token.v; y++) {
			for (let x = _token.x; x < _token.x + _token.h; x++) {
				_brush.setPos(x, y);
				_brush.fill();
			}
		}
		if (_named) {
			_brush.ctx.fillStyle = "#fff";
			_brush.setFrom(_token).write(_args.code + ((_args.many) ? (_args.i).toString() : ""));
		}
	}
	static RECT = 2;
	static rect(_brush, _token, _args, _named) {
		_brush.ctx.fillStyle = _args.colour;
		_brush.setFrom(_token);
		_brush.fill();
		if (_named) {
			_brush.ctx.fillStyle = "#000";
			_brush.write(_args.code + ((_args.many) ? (_args.i).toString() : ""));
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
			PaintStyle.rect(_brush, _token, _args);
		}
	}
	static ELLIPSE = 4;
	static ellipse(_brush, _token, _args, _named) {
		_brush.ctx.fillStyle = _args.colour;
		_brush.setFrom(_token);
		_brush.ctx.beginPath();
		_brush.ctx.ellipse(_brush.x + _brush.h/2, _brush.y + _brush.v/2, _brush.h/2, _brush.v/2, 0, 0, Math.PI*2);
		_brush.ctx.fill();
		if (_named) {
			_brush.ctx.fillStyle = "#000";
			_brush.setPos(_token.x + _token.h, _token.y + _token.v);
			_brush.write(_args.code + ((_args.many) ? (_args.i).toString() : ""));
		}
	}
	static SWARM = 5;
	static swarm(_brush, _token, _args, _named) {
		PaintStyle.grid(_brush, _token, _args, _named);
		if (_named) {
			_brush.ctx.fillStyle = "#000";
			_brush.reset();
			for (const i of [0,1]) {
				for (const j of [0,1]) {
					_brush.setPos(_token.x + i*_brush.h, _token.y + j*_brush.v)
					_brush.write(_args.num);
				}
			}
		}
	}

	static getStyle(_code) {
		switch (Math.abs(_code)) {
			case PaintStyle.RECT: return PaintStyle.rect;
			case PaintStyle.IMAGE: return PaintStyle.image;
			case PaintStyle.GRID: return PaintStyle.grid;
			case PaintStyle.ELLIPSE: return PaintStyle.ellipse;
			case PaintStyle.SWARM: return PaintStyle.swarm;
		}
		throw `Invalid paint code: ${_code}`;
	}
}
class GuideStyle {
	static RECT = 1;
	static rect(_brush, _args) {
		_brush.set(_args.pos1[0], _args.pos1[1], _args.dims[0], _args.dims[1]).adjust();
		_brush.ctx.strokeRect(_brush.x, _brush.y, _brush.h, _brush.v);
	}
	static LINE = 2;
	static line(_brush, _args) {
		_brush.setPos(_args.pos1[0], _args.pos1[1]).adjust();
		_brush.ctx.beginPath();
		_brush.ctx.moveTo(_brush.x, _brush.y);
		_brush.setPos(_args.pos2[0], _args.pos2[1]).adjust();
		_brush.ctx.lineTo(_brush.x, _brush.y);
		_brush.ctx.stroke();
	}
	static ELLIPSE = 3;
	static ellipse(_brush, _args) {
		_brush.setPos(_args.pos1[0], _args.pos1[1]).adjust();
		_brush.setDim(_args.radii[0], (_args.radii[1] === undefined) ? _args.radii[0] : _args.radii[1]);
		_brush.ctx.beginPath();
		_brush.ctx.ellipse(_brush.x, _brush.y, _brush.h, _brush.v, 0, 0, Math.PI*2);
		_brush.ctx.stroke();
	}
	static SUNDAIL = 4;
	static sundail(_brush, _args) {
		try {
			GuideStyle.line(_brush, _args);
			_args.radii = [Math.sqrt((_args.pos2[0] - _args.pos1[0])**2 + (_args.pos2[1] - _args.pos1[1])**2)];
			GuideStyle.ellipse(_brush, _args);
		} catch (e) {
			GuideStyle.ellipse(_brush, _args);
			_args.pos2 = [_args.pos1[0] + _args.radii[0], _args.pos1[1]];
			GuideStyle.line(_brush, _args);
		}
	}
	static CONE = 5;
	static cone(_brush, _args) {
		_brush.setPos(_args.pos1[0], _args.pos1[1]).adjust();
		_brush.setDim(_args.radii-1, (_args.radii[1] === undefined) ? _args.radii[0]-1 : _args.radii[1]-1);

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

	static getStyle(_code) {
		switch(Math.abs(_code)) {
			case GuideStyle.RECT: return GuideStyle.rect;
			case GuideStyle.LINE: return GuideStyle.line;
			case GuideStyle.ELLIPSE: return GuideStyle.ellipse;
			case GuideStyle.SUNDAIL: return GuideStyle.sundail;
			case GuideStyle.CONE: return GuideStyle.cone;
		}
		throw `Invalid guide code: ${_code}`;
	}
}
//------------------------------------TOKEN
class Token extends Rect {
	constructor(_range, _visible = true) {
		super(_range[0], _range[1], _range[2], _range[3]);
		this.visible = _visible;
		this.removed = false;
	}

	setPos(_pos) {
		return super.setPos(_pos[0], _pos[1]);
	}
	setDim(_dims) {
		return super.setDim(_dims[0], _dims[1]);
	}
}
//------------------------------------TOKENGROUP
class TokenGroup {
	static makeCode(_name) {
		return _name[0].toUpperCase()+_name[_name.length-1].toLowerCase();
	}
	constructor(_name, _dims, _styleCode, _colour, _layer) {
		this.dims = _dims;
		this.styleCode = _styleCode;
		this.colour = _colour;
		this.layer = _layer;

		this.code = TokenGroup.makeCode(_name);
		this.style = PaintStyle.getStyle(_styleCode);
		this.tokens = [];
	}

	push(_pos, _dims, _visible) {
		this.tokens.push(new Token(_pos.concat((_dims[0]) ? _dims : this.dims), _visible));
	}
	pushMany(_rangeLs, _visible) {
		for (const range of _rangeLs) {
			this.push(range.slice(0,2), range.slice(2), _visible);
		}
	}

	async paintAll(_brush, _imgUrls, _name) {
		let args = {
			colour: this.colour,
			many: (this.tokens.length > 1),
			code: this.code
		};
		let currentStyle = this.style;
		if (Math.abs(this.styleCode) === PaintStyle.IMAGE) {
			if (_imgUrls && _imgUrls.get(_name) !== undefined) {args.img = loadImage(_imgUrls.get(_name));}
			else {currentStyle = PaintStyle.rect;}
		}
		for (const [i, token] of this.tokens.entries()) {
			if (token.visible && !token.removed) {
				args.i = i;
				await currentStyle(_brush, token, args, (this.styleCode < 0));
			}
		}
	}
}
//------------------------------------ARENA
class Arena {
	constructor(_dims, _feedback = console.log, _feedhelp = "USER_ERROR:", _pH = MAX_PH, _pV = MAX_PV) {
		this.dims = _dims;
		this.feedhelp = _feedhelp;
		this.feedback = _feedback; //void function(_feedhelp, string) => tells user what they did wrong
		let pS = Math.floor(Math.min(_pH/_dims[0], _pV/_dims[1]));
		let pM = Math.ceil(pS/64);

		this.canvas = createCanvas((2+_dims[0])*pS, (2+_dims[1])*pS);
		this.groups = new Map();
		this.topLayer = 0;
		this.newGroup(PaintStyle.IMAGE, 0, "Background", "#000", _dims);
		this.addToGroup("Background", [1,1].concat(_dims));

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

	addToGroup(_name, _ranges, _visible = true) {
		let group = this.requireGroup(_name);
		if (group) {
			if (_ranges instanceof Array) {
				group.pushMany((_ranges[0] instanceof Array) ? _ranges : [_ranges], _visible);
			}
			else {
				this.userFeedback(`Position coords must be in form [x,y].`)
			}
		}
	}
	newGroup(_styleCode, _layer, _name, _colour, _dims = [1,1], _override = false) {
		if (_override || this.groups.get(_name) === undefined) {
			this.groups.set(_name, new TokenGroup(_name, _dims, _styleCode, _colour, _layer));
			if (_layer > this.topLayer) {this.topLayer = _layer;}
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
			group.tokens[_i].removed = true;
			if (_andGroup) {
				for (const token of group.tokens) {
					if (!token.removed) {_andGroup = false; break;}
				}
				if (_andGroup) {this.removeGroup(_name);}
			}
		}
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
		this.brush.fill();

		this.brush.ctx.fillStyle = "#fff";
		this.brush.reset();
		for (const h of [0, this.dims[0]+1]) {
			for (let v = 1; v <= this.dims[1]; v++) {this.brush.setPos(h,v).write(String.fromCharCode(64+v));}
		}
		for (const v of [0, this.dims[1]+1]) {
			for (let h = 1; h <= this.dims[0]; h++) {this.brush.setPos(h,v).write(h.toString());}
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
