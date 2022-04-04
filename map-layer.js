const {createCanvas} = require("canvas");
const {Rect} = require("./utils");
//--------------------------------------------------------------------CONSTANTS
const FONT_STR = "px Arial";
//--------------------------------------------------------------------HELP
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
	constructor(_dim, _pS, _pM) {
		super(1, 1, _dim[0], _dim[1]);
		this.canvas = createCanvas(_pS*(2+this.h), _pS*(2+this.v));
		this.brush = new Brush(this.canvas.getContext("2d"), _pS, (_pM !== undefined) ? _pM : Math.ceil(_pS/64));
		this.brush.ctx.textAlign = "center";
		this.brush.ctx.textBaseline = "middle";
	}

	clearCanvas() {
		this.brush.setFrom(this);
		this.brush.clear();
	}
	async getCanvas() {
		//if _some_update_flag_
		this.clearCanvas();
		await this.paint(...arguments);
		//endif
		return this.canvas;
	}
}
//------------------------------------BASE
class BaseLayer extends MapLayer {
	constructor(_dim, _pS, _pM) {
		super(_dim, _pS, _pM);
		this.brush.scaleFont(1);
	}

	paint(_helper) {
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
	constructor(_dim, _pS, _pM) {
		super(_dim, _pS, _pM);
		this.brush.scaleFont(0.75);

		this.topLayer = 0;
	}

	async paint(_groups, _imgUrls) {
		this.brush.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		let layers = [];
		for (let i=0; i<=this.topLayer+1; i++) {layers.push(new Map());}
		for (const [name, group] of _groups.entries()) {
			layers[(group.layer !== -1) ? group.layer : this.topLayer+1].set(name, group);
		}
		for (const layer of layers) {
			for (const [name, group] of layer) {
				await group.paintAll(this.brush, await _imgUrls, name);
			}
		}
	}
}
//------------------------------------GUIDE
class GuideLayer extends MapLayer {
	constructor(_dim, _pS, _pM, _stroke = "#3579") {
		super(_dim, _pS, _pM);
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
		super(_dim, _pS, 0);
		this.makeShadow = LightLayer.makeShadowMaker(_shadowHue);
		this.ambientOpacity = _ambientOpacity;
	}

	paintLight(_x, _y, _r, _a, _startFade = 0.5) {
		let shadow = this.makeShadow(_a);
		this.brush.set(_x, _y, _r, _r).alterPos(.5, .5);
		(function(_ctx, _px, _py, _pr) {
			let g = _ctx.createRadialGradient(_px, _py, 0, _px, _py, _pr);
			g.addColorStop(0, shadow);
			if (_startFade > 0) {g.addColorStop(_startFade, shadow);}
			g.addColorStop(1, LightLayer.trans);

			_ctx.fillStyle = g;
		})(this.brush.ctx, this.brush.x, this.brush.y, this.brush.h);
		this.brush.alterPos(-_r/2, -_r/2);
		this.brush.centerStretch(2);
		this.brush.fillRect();
	}
	async paint(_groups) {
		this.brush.ctx.globalCompositeOperation = "source-over";
		this.brush.ctx.fillStyle = this.makeShadow(this.ambientOpacity);
		this.brush.setFrom(this).fillRect();
		for (const [name, group] of _groups.entries()) {
			if (group.opacity && group.opacity > this.ambientOpacity) {
				group.lightAll(this.brush, this.makeShadow, false);
			}
		}

		this.brush.ctx.globalCompositeOperation = "destination-out";
		for (const [name, group] of _groups.entries()) {
			if (group.opacity && group.opacity < this.ambientOpacity) {
				group.lightAll(this.brush, this.makeShadow, true);
			}
		}
	}
}
//--------------------------------------------------------------------FINALIZE
export {
	MapLayer,
	BaseLayer,
	TokenLayer,
	GuideLayer,
	LightLayer
}
