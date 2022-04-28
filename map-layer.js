const {createCanvas, loadImage} = require("canvas");
const {Rect} = require("./utils");
const {STYLES} = require("./styles");
//--------------------------------------------------------------------CONSTANTS
const FONT_STR = "px Arial";
//--------------------------------------------------------------------HELP
function sliceArgs(_args, _start, _stop) {
	if (_start === undefined || _start < 0) {return _args;}
	if (_start >= _args.length) {return [];}
	const stop = (_stop === undefined || _stop > _args.length) ? _args.length : _stop;

	let out = [];
	for (let i=_start; i<stop; i++) {out.push(_args[i]);}
	return out;
}

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
	alterPos(_x, _y) {
		return super.alterPos(_x*this.pS, _y*this.pS);
	}
	alterDim(_h, _v) {
		return super.alterDim(_h*this.pS, _v*this.pS);
	}

	centerStretch(_r) {
		return super.centerStretch(_r*this.h, _r*this.v);
	}
	adjust() {
		let lw = this.ctx.lineWidth;
		super.alterPos(lw/2, lw/2);
		return super.alterDim(-lw, -lw);
	}
	reset() {
		return this.setAbs(this.pM, this.pM, this.pS-2*this.pM, this.pS-2*this.pM);
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
}
//--------------------------------------------------------------------MAIN
class MapLayer extends Rect {
	constructor(_dim, _pS, _gco = "source-over") {
		super(1, 1, _dim[0], _dim[1]);
		this.canvas = createCanvas(_pS*(2+this.h), _pS*(2+this.v));
		this.brush = new Brush(this.canvas.getContext("2d"), _pS, Math.ceil(_pS/64));
		this.brush.ctx.textAlign = "center";
		this.brush.ctx.textBaseline = "middle";
		this.gco = _gco;
	}

	clearCanvas() {
		this.brush.setFrom(this);
		this.brush.clear();
	}
	async getCanvas() {
		if (arguments[0]) {
			this.clearCanvas();
			await this.paint(...sliceArgs(arguments, 1));
		}
		return this.canvas;
	}
}
//------------------------------------BASE
class BaseLayer extends MapLayer {
	constructor(_dim, _pS) {
		super(_dim, _pS);
		this.brush.scaleFont(1);
	}

	paint() {
		this.brush.ctx.fillStyle = "#000";
		this.brush.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		this.brush.reset();
		this.brush.ctx.fillStyle = "#fff";
		for (const h of [0, this.h + 1]) {
			for (let v = 1; v <= this.v; v++) {
				this.brush.setPos(h, v).write(String.fromCharCode(v + ((v > 26) ? 70 : 64)));
			}
		}
		for (const v of [0, this.v + 1]) {
			for (let h = 1; h <= this.h; h++) {this.brush.setPos(h, v).write(h.toString());}
		}
	}
}
//------------------------------------TOKEN
class TokenLayer extends MapLayer {
	static lastLayer = 0;
	constructor(_dim, _pS, _gco) {
		super(_dim, _pS, _gco);
		this.brush.scaleFont(0.75);
	}

	async paintGroup(_group, _name, _imgUrls) {
		if (_group.willDisplay("token") && _group.tokens.length > 0) {
			let args = {
				colour: _group.colour,
				many: (_group.tokens.length > 1),
				code: _group.code,
				error: _group.displayError
			};

			if (_group.style.token.id === STYLES.token.image.id) {
				if (_imgUrls && _imgUrls.get(_name) !== undefined) {args.img = loadImage(_imgUrls.get(_name));}
				else {args.error = true;}
			}
			for (const [i, token] of _group.tokens.entries()) {
				if (token.visible && !token.removed) {
					args.i = i;
					await _group.style.token(this.brush, token, _group.style.cell, args);
					this.brush.ctx.fillStyle = args.colour;
					await _group.style.name(this.brush, token, args);
				}
			}
			_group.displayError = args.error;
		}
	}

	async paint(_groups, _imgUrls) {
		this.brush.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		let layers = [];
		for (let i=0; i<=TokenLayer.lastLayer+1; i++) {layers.push(new Map());}
		for (const [name, group] of _groups.entries()) {
			layers[(group.layer !== -1) ? group.layer : TokenLayer.lastLayer+1].set(name, group);
		}
		for (const layer of layers) {
			for (const [name, group] of layer) {
				await this.paintGroup(group, name, await _imgUrls);
			}
		}
	}
}
class NameLayer extends TokenLayer {
	async paintGroup(_group, _name, _imgUrls) {
		if (_group.willDisplay("name") && _group.tokens.length > 0) {
			let args = {
				colour: _group.colour,
				many: (_group.tokens.length > 1),
				code: _group.code,
				error: _group.displayError
			};
			let isImage = (_group.style.token.id === STYLES.token.image.id);
			for (const [i, token] of _group.tokens.entries()) {
				if (token.visible && !token.removed) {
					args.i = i;
					await STYLES.token.fill(this.brush, token, STYLES.cell.clear, args);
					this.brush.ctx.fillStyle = (!args.error && isImage) ? "#000" : "#fff";
					await _group.style.name(this.brush, token, args);
				}
			}
		}
	}
}
//------------------------------------LIGHT
class LightLayer extends MapLayer {
	static makeShadowMaker(_hue) {
		let rgb = [];
		for (const x of _hue) {rgb.push((x < 0) ? 0 : ((x > 255) ? 255 : Math.floor(x)));}
		const base = "rgba(" + rgb.join(",") + ",";
		return function(_a) {
			return base + ((_a < 0) ? 0 : ((_a > 1) ? 1 : _a)) + ")";
		};
	}
	static trans = "rgba(0,0,0,0)";

	constructor(_dim, _pS, _ambientOpacity, _shadowHue = [0,0,0]) {
		super(_dim, _pS);
		this.makeShadow = LightLayer.makeShadowMaker(_shadowHue);
		this.ambientOpacity = _ambientOpacity;
	}

	async paintGroup(_group, _invert) {
		let args = {
			shadow: this.makeShadow((_invert) ? 1 - _group.opacity : _group.opacity),
			radius: _group.radius,
			startFade: (_group.startFade !== undefined) ? _group.startFade : ((_invert) ? 0.5 : 0.9)
		};
		for (const token of _group.tokens) {
			if (token.visible && !token.removed) {
				_group.style.light(this.brush, token, args);
			}
		}
	}
	async paint(_groups) {
		this.brush.ctx.globalCompositeOperation = "source-over";
		this.brush.ctx.fillStyle = this.makeShadow(this.ambientOpacity);
		this.brush.setFrom(this).fillRect();
		for (const [name, group] of _groups.entries()) {
			if (group.willDisplay("light") && group.opacity > this.ambientOpacity) {
				this.paintGroup(group, false);
			}
		}

		this.brush.ctx.globalCompositeOperation = "destination-out";
		for (const [name, group] of _groups.entries()) {
			if (group.willDisplay("light") && group.opacity < this.ambientOpacity) {
				this.paintGroup(group, true);
			}
		}
	}
}
//------------------------------------GUIDE
class GuideLayer extends MapLayer {
	constructor(_dim, _pS, _stroke = "#3579") {
		super(_dim, _pS);
		this.brush.ctx.strokeStyle = _stroke;
		this.brush.ctx.lineWidth = _pS;

		this.display = false;
		this.shapes = [];
	}

	async paint() {
		if (this.display) {
			for (const shape of this.shapes) {await shape.draw(this.brush, shape.args);}
			this.shapes = [];
			this.display = false;
		}
	}
}
//--------------------------------------------------------------------FINALIZE
module.exports = {
	MapLayer,
	BaseLayer,
	TokenLayer,
	NameLayer,
	LightLayer,
	GuideLayer
}
