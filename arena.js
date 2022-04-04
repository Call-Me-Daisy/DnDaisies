const {createCanvas, loadImage} = require("canvas");
const {Rect} = require("./utils");
const {BaseLayer, TokenLayer, GuideLayer, LightLayer} = require("./map-layer");
//--------------------------------------------------------------------CONSTANTS
const MAX_PH = 1920, MAX_PV = 1080;
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
//--------------------------------------------------------------------MAIN
//------------------------------------STYLES
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

		_brush.alterPos(s,-c);

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
	//------------SWITCH
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
	async lightAll(_brush, _makeShadow, _invert) {
		let shadow = _makeShadow((_invert) ? 1 - this.opacity : this.opacity);
		console.log(`Called: ${this.code} => ` + shadow, this.radius, this.startFade);
		for (const token of this.tokens) {
			_brush.set(token.x, token.y, this.radius, this.radius).alterPos(.5, .5);
			(function(_ctx, _px, _py, _pr, _f) {
				let g = _ctx.createRadialGradient(_px, _py, 0, _px, _py, _pr);
				g.addColorStop(0, shadow);
				if (_f > 0) {g.addColorStop(_f, shadow);}
				g.addColorStop(1, LightLayer.trans);
				_ctx.fillStyle = g;
			})(_brush.ctx, _brush.x, _brush.y, _brush.h, this.startFade);
			_brush.alterPos(-this.radius/2, -this.radius/2);
			_brush.centerStretch(2);
			_brush.fillRect();
		}
	}
}
//------------------------------------ARENA
class Arena {
	constructor(_dim, _feedback = console.log, _feedhelp = "USER_ERROR:", _pH = MAX_PH, _pV = MAX_PV) {
		this.feedhelp = _feedhelp;
		this.feedback = _feedback; //void function(_feedhelp, string) => tells user what they did wrong

		this.groups = new Map();

		this.base = new BaseLayer(_dim, Math.floor(Math.min(_pH/_dim[0], _pV/_dim[1])));
		this.layers = (function(_pS){
			return {
				token: new TokenLayer(_dim, _pS),
				light: new LightLayer(_dim, _pS, 0.5),
				guide: new GuideLayer(_dim, _pS)
			};
		})(this.base.brush.pS)

		this.newGroup({main: PaintStyle.IMAGE, cell: PaintStyle.RECT}, 0, "Background", "#000", _dim);
		this.addToGroupSplit("Background", [1,1,0]);
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
			if (_layer > this.layers.token.topLayer) {this.layers.token.topLayer = _layer;}
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
		this.layers.guide.display = true;
	}
	setGuide(_shapeCode, _shapeArgs) {
		this.layers.guide.shapes.push({
			draw: GuideStyle.getStyle(_shapeCode),
			args: _shapeArgs
		});
		this.layers.guide.display = true;
	}

	async buildMap(_imgUrls) {
		await this.base.paint();

		let ctx = this.base.brush.ctx;
		let paintArea = new Rect().setFrom(this.base.brush.setFrom(this.base));

		for (const [key, layer] of Object.entries(this.layers)) {
			ctx.drawImage(
				await layer.getCanvas(this.groups, _imgUrls),
				paintArea.x, paintArea.y, paintArea.h, paintArea.v,
				paintArea.x, paintArea.y, paintArea.h, paintArea.v
			);
		}

		return ctx.canvas.toBuffer("image/png");
	}
}
//--------------------------------------------------------------------FINALIZE
export {
	Arena,
	PaintStyle,
	GuideStyle
}
