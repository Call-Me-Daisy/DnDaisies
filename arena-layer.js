const {createCanvas} = require("canvas");

const {Rect, Brush} = require("cmdaisy-utils").canvas;
//--------------------------------------------------------------------MAPBRUSH
class MapBrush extends Brush {
	constructor(_ctx, _pS, _pM, _fontStr = "px Arial") {
		super(_ctx);
		this.pS = _pS;
		this.pM = _pM || Math.ceil(this.pS/64);

		this.maxFont = Math.floor(2*(this.pS/3 - 2*this.pM));
		this.fontStr = _fontStr;

		this.ctx.font = this.maxFont + _fontStr;
	}

	adjustForLineWidth() {
		const lw = this.ctx.lineWidth;
		return this.alterAbs(-lw/2, -lw/2);
	}
	reset() {
		return this.setAbs(this.pM, this.pM, this.pS - 2*this.pM, this.pS - 2*this.pM);
	}

	setPos(_x, _y, _margin) {
		const pM = (_margin === undefined) ? this.pM : _margin;
		return super.setPos(_x*this.pS + pM, _y*this.pS + pM);
	}
	setDim(_w, _h, _margin) {
		const pM = (_margin === undefined) ? this.pM : _margin;
		return super.setDim(_w*this.pS - 2*pM, _h*this.pS - 2*pM);
	}
	set(_x, _y, _w, _h, _margin) {
		return this.setPos(_x, _y, _margin).setDim(_w, _h, _margin);
	}
	setFrom(_rect, _margin) {
		return this.set(_rect.x, _rect.y, _rect.w, _rect.h, _margin);
	}

	alterPos(_dx, _dy) {
		return super.alterPos(_dx*this.pS, _dy*this.pS);
	}
	alterDim(_dw, _dh) {
		return super.alterDim(_dw*this.pS, _dh*this.pS);
	}

	centerScale(_r) {
		if (_r <= 0) { throw `Cannot scale brush by ratio of ${_r}`; }
		return this.centerStretch(_r*this.w, _r*this.h);
	}
	scaleFont(_r) {
		if (_r <= 0 || _r > 1) { throw `Cannot scale brush.font by ratio of ${_r}`; }
		this.ctx.font = Math.floor(_r*this.maxFont).toString() + this.fontStr;
	}
}
//--------------------------------------------------------------------ARENALAYER
class ArenaLayer extends Rect {
	constructor(_w, _h, _pS, _brushType = MapBrush) {
		super(0, 0, _w, _h);
		this.canvas = createCanvas(_pS*this.w, _pS*this.h);
		this.brush = new _brushType(this.canvas.getContext("2d"), _pS);
		this.shouldUpdate = false;
	}

	clearCanvas() {
		this.brush.setFrom(this, 0);
		this.brush.clearRect();
	}
	async getCanvas() {
		if (this.shouldUpdate) {
			this.clearCanvas();
			this.shouldUpdate = false;
			await this.paint(...arguments);
		}
		return this.canvas;
	}
}
//------------------------------------BASE
class BaseLayer extends ArenaLayer {
	constructor(_w, _h, _pS, _layerBuilders, _bg = "#000", _txt = "#fff") {
		super(_w + 2, _h + 2, _pS);
		this.set(1, 1, _w, _h);

		this.layers = {};
		for (const [name, builder] of Object.entries(_layerBuilders)) {
			this.layers[name] = new builder.layer(_w, _h, _pS, name, ...(builder.args || []));
			this.layers[name].isGroupLayer = builder.layer.isGroupLayer;
		}

		this.bgColour = _bg;
		this.txtColour = _txt;

		this.paintAxes();

		this.brush.setFrom(this).alterAbs(-this.brush.pM, -this.brush.pM, 2*this.brush.pM, 2*this.brush.pM);
		this.brush.ctx.fillStyle = this.bgColour;
	}

	checkForUpdates() {
		for (const layer of Object.values(this.layers)) {
			if (layer.shouldUpdate) {return this.shouldUpdate = true;}
		}
		return this.shouldUpdate = false;
	}
	updateGroupLayers() {
		for (const layer of Object.values(this.layers)) {
			layer.isGroupLayer && (layer.shouldUpdate = true);
		}
		this.checkForUpdates();
	}
	updateAllLayers() {
		for (const layer of Object.values(this.layers)) {
			layer.shouldUpdate = true;
		}
		return this.checkForUpdates();
	}

	paintAxes() {
		this.brush.ctx.fillStyle = this.bgColour;
		this.brush.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		this.brush.reset();
		this.brush.ctx.fillStyle = this.txtColour;
		for (let x = 1; x <= this.w; x++) {
			for (const y of [0, this.h + 1]) {
				this.brush.setPos(x, y).write(String.fromCharCode(x + ((x > 26) ? 70 : 64)));
			}
		}
		for (let y = 1; y <= this.h; y++) {
			for (const x of [0, this.w + 1]) {
				this.brush.setPos(x, y).write((y).toString());
			}
		}
	}

	clearCanvas() {
		this.brush.fillRect();
	}
	async paint() {
		for (const layer of Object.values(this.layers)) {
			this.brush.ctx.globalCompositeOperation = layer.gco;
			this.brush.draw(await layer.getCanvas(...arguments));
		}
	}
}
//------------------------------------STACK
class StackLayer extends ArenaLayer {
	constructor(_w, _h, _pS, _layerName, _gco = "source-over") {
		if (_layerName === "cell") { throw `Layer cannot be named cell, as that name is reserved.`; }
		super(_w, _h, _pS);
		this.name = _layerName;
		this.gco = _gco;
	}

	willDisplay(_group) {
		return _group.hasStyle(this.name);
	}
	getStyle(_group) {
		return _group.styles[this.name];
	}

	async paintToken(_style, _token, _args) {
		await _style(this.brush, _token, _args);
	}
	async paintGroup(_name, _group, _kwargs) {
		const style = this.getStyle(_group);
		const args = await this.buildArgs(style, _name, _group, _kwargs);

		for (const [i, token] of _group.tokens.entries()) {
			args.i = i;
			!(token.hidden || token.removed) && await this.paintToken(style, token, args);
		}
		_group.displayError = args.error || _group.displayError;
	}
	async paint(_stages, _kwargs) {
		for (const stage of Object.values(_stages)) {
			for (const [name, group] of stage) {
				this.willDisplay(group) && await this.paintGroup(name, group, _kwargs);
			}
		}
	}
}
//--------------------------------------------------------------------FINALIZE
module.exports = {
	ArenaLayer,
	BaseLayer,
	StackLayer
};
