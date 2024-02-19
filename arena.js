const { createCanvas, loadImage } = require("canvas");

const STYLES = require("./styles");

const { fetchFromUrl, buildChoices } = require("./utils");
//--------------------------------------------------------------------GLOBAL
const DEFAULT_WIDTH = 1920, DEFAULT_HEIGHT = 1080;
const DEFAULT_FONT = "px Arial";

//--------------------------------------------------------------------MAIN
//-----------------------------------UTILS
class Rect {
	constructor() {
		this.x = 0;
		this.y = 0;
		this.w = 1;
		this.h = 1;
		[...arguments].length > 0 && this.setAbs(...arguments);
	}

	setAbs(_x, _y, _w, _h) {
		Number.isFinite(_x) && (this.x = _x);
		Number.isFinite(_y) && (this.y = _y);
		Number.isFinite(_w) && _w > 0 && (this.w = _w);
		Number.isFinite(_h) && _h > 0 && (this.h = _h);
		return this;
	}
	alterAbs(_dx, _dy, _dw, _dh) {
		Number.isFinite(_dx) && (this.x += _dx);
		Number.isFinite(_dy) && (this.y += _dy);
		Number.isFinite(_dw) && ((_dw >= -this.w) ? this.w += _dw : this.w = 1);
		Number.isFinite(_dh) && ((_dh >= -this.h) ? this.h += _dh : this.h = 1);
		return this;
	}

	setPos(_x, _y) {
		return this.setAbs(_x, _y, undefined, undefined);
	}
	setSpan(_w, _h) {
		return this.setAbs(undefined, undefined, _w, _h);
	}
	alterPos(_dx, _dy) {
		return this.alterAbs(_dx, _dy, undefined, undefined);
	}
	alterSpan(_dw, _dh) {
		return this.alterAbs(undefined, undefined, _dw, _dh);
	}

	set(_x, _y, _w, _h) {
		const extraArgs = [...arguments].slice(4);
		return this.setSpan(_w, _h, ...extraArgs).setPos(_x, _y, ...extraArgs);
	}
	alter(_dx, _dy, _dw, _dh) {
		const extraArgs = [...arguments].slice(4);
		return this.alterSpan(_dw, _dh, ...extraArgs).alterPos(_dx, _dy, ...extraArgs);
	}

	setFrom(_that) {
		return this.set(_that.x, _that.y, _that.w, _that.h, ...[...arguments].slice(1));
	}
	alterBy(_that) {
		return this.alter(_that.x, _that.y, _that.w, _that.h, ...[...arguments].slice(1));
	}

	centerStretch(_w, _h) {
		return this.setAbs(this.x + (this.w - _w)/2, this.y + (this.h - _h)/2, _w, _h);
	}
	getCenter() {
		return {x: Math.floor(this.x + this.w/2), y: Math.floor(this.y + this.h/2)};
	}
	collapse() {
		const {x, y, w, h} = this;
		return {x, y, w, h};
	}
}
class Cube {
	constructor() {
		this.x = 0;
		this.y = 0;
		this.z = 0;
		this.w = 1;
		this.h = 1;
		this.d = 1;
		this.setAbs(...arguments);
	}

	setAbs(_x, _y, _z, _w, _h, _d) {
		Number.isFinite(_x) && (this.x = _x);
		Number.isFinite(_y) && (this.y = _y);
		Number.isFinite(_z) && (this.z = _z);
		Number.isFinite(_w) && _w >= 0 && (this.w = _w);
		Number.isFinite(_h) && _h >= 0 && (this.h = _h);
		Number.isFinite(_d) && _d >= 0 && (this.d = _d);
		return this;
	}
	alterAbs(_dx, _dy, _dz, _dw, _dh, _dd) {
		Number.isFinite(_dx) && (this.x += _dx);
		Number.isFinite(_dy) && (this.y += _dy);
		Number.isFinite(_dz) && (this.z += _dz);
		Number.isFinite(_dw) && ((_dw >= -this.w) ? this.w += _dw : this.w = 1);
		Number.isFinite(_dh) && ((_dh >= -this.h) ? this.h += _dh : this.h = 1);
		Number.isFinite(_dd) && ((_dd >= -this.d) ? this.d += _dd : this.d = 1);
		return this;
	}

	setPos(_x, _y, _z) {
		return this.setAbs(_x, _y, _z, undefined, undefined, undefined);
	}
	setSpan(_w, _h, _d) {
		return this.setAbs(undefined, undefined, undefined, _w, _h, _d);
	}
	alterPos(_dx, _dy, _dz) {
		return this.alterAbs(_dx, _dy, _dz, undefined, undefined, undefined);
	}
	alterSpan(_dw, _dh, _dd) {
		return this.alterAbs(undefined, undefined, undefined, _dw, _dh, _dd);
	}

	set(_x, _y, _z, _w, _h, _d) {
		const extraArgs = [...arguments].slice(6);
		return this.setSpan(_w, _h, _d, ...extraArgs).setPos(_x, _y, _z, ...extraArgs);
	}
	alter(_dx, _dy, _dz, _dw, _dh, _dd) {
		const extraArgs = [...arguments].slice(6);
		return this.alterSpan(_dw, _dh, _dd, ...extraArgs).alterPos(_dx, _dy, _dz, ...extraArgs);
	}

	setFrom(_that) {
		return this.set(_that.x, _that.y, _that.z, _that.w, _that.h, _that.d, ...[...arguments].slice(1));
	}
	alterBy(_that) {
		return this.alter(_that.x, _that.y, _that.z, _that.w, _that.h, _that.d, ...[...arguments].slice(1));
	}

	centerStretch(_w, _h, _d) {
		return this.setAbs(this.x + (this.w - _w)/2, this.y + (this.h - _h)/2, this.z + (this.d - _d)/2, _w, _h, _d);
	}
	getCenter() {
		return {x: this.x + Math.floor(this.w/2), y: this.y + Math.floor(this.h/2), z: this.z + Math.floor(this.d/2)};
	}
	collapse() {
		const {x, y, z, w, h, d} = this;
		return {x, y, z, w, h, d};
	}
}

//-----------------------------------TOKEN
const TOKEN_SPECS = {
	top_left:		[0,	0,		0],
	top:				[0.5,	0,		0],
	top_right:		[1,	0,		0],
	left:				[0,	0.5,	0],
	center:			[0.5,	0.5,	0],
	right:			[1,	0.5,	0],
	bottom_left:	[0,	1,		0],
	bottom:			[0.5,	1,		0],
	bottom_right:	[1,	1,		0]
};
const GROUP_SPECS = {
	static:		{stage: 1,	styles:	{cell: STYLES.cell.rect, token: STYLES.token.grid}},
	object:		{stage: 3,	styles:	{cell: STYLES.cell.rect, token: STYLES.token.fill, name: STYLES.name.center}},
	creature:	{stage: -1,	styles:	{cell: STYLES.cell.ellipse, token: STYLES.token.fill, name: STYLES.name.center}},
	army:			{stage: 2,	styles:	{cell: STYLES.cell.ellipse, token: STYLES.token.grid, name: STYLES.name.corners}},
	aoe_rect:	{stage: 4,	styles:	{cell: STYLES.cell.rect, token: STYLES.token.aoe, name: STYLES.name.center}},
	aoe_circle:	{stage: 4,	styles:	{cell: STYLES.cell.ellipse, token: STYLES.token.aoe, name: STYLES.name.center}},
	light:		{stage: 1,	styles:	{cell: STYLES.cell.ellipse}}
};

class Token extends Cube {
	constructor(_defaultSpan, _hidden = false) {
		super();
		this.setSpan(..._defaultSpan);
		this.hidden = _hidden;
		this.removed = false;
	}

	setPos(_x, _y, _z, _origin) {
		const [dx, dy, dz] = TOKEN_SPECS[_origin] || TOKEN_SPECS.top_left;
		return super.setPos(Math.ceil(_x - dx*this.w), Math.ceil(_y - dy*this.h), Math.ceil(_z * dz*this.d));
	}
	setSpan(_w, _h, _d, _origin) {
		this.setPos(this.x, this.y, this.z, _origin);
		return super.setSpan(_w, _h, _d);
	}

	setFrom(_range, _origin) {
		return super.setFrom(_range, (_range.w || _range.h) && "top_left" || _origin || "center");
	}
}
class TokenGroup {
	static makeCode(_name) {
		return _name[0].toUpperCase() + _name[_name.length - 1].toLowerCase();
	}

	constructor(_stage, _styles, _name, _presetKey, _colours, _span = [1, 1, 1], _seeds = []) {
		this.stage = _stage;
		this.styles = _styles;

		this.code = TokenGroup.makeCode(_name);
		this.presetKey = _presetKey;
		this.colour = _colours;
		this.span = _span;
		this.tokens = [];

		for (const seed of _seeds) { this.add(seed, seed.hidden); }
	}

	add(_range, _hidden, _origin) {
		this.tokens.push(new Token(this.span, _hidden).setFrom(_range, _origin));
	}
	addMany(_ranges, _hidden, _origin) {
		for (const range of _ranges) { this.add(range, _hidden, _origin); }
	}

	requireToken(_idStr) {
		const id = (this.tokens.length > 1) ? parseInt(_idStr, 10) : 0;
		if (!Number.isFinite(id)) { throw `Group, ${this.code}, received invalid token id, ${_idStr}`; }

		const out = this.tokens[id];
		if (!out) { throw `Group, ${this.code}, does not contain token with id, ${id}`; }
		return out;
	}

	isEmpty() {
		return this.tokens.length === 0;
	}
	allRemoved() {
		for (const token of this.tokens) {
			if (!token.removed) { return false; }
		}
		return true;
	}
	getStyle(_key) {
		return this.styles[_key];
	}
}

//-----------------------------------LAYER
class Brush extends Rect {
	constructor(_canvas, _side, _margin, _fontStr = DEFAULT_FONT) {
		super();
		this.fontStr = (_fontStr.startsWith("px ")) ? _fontStr : "px " + _fontStr;
		this.newCanvas(_canvas, _side, _margin);
	}
	newCanvas(_canvas, _side, _margin) {
		this.side = Number.isFinite(_side) && _side || 100;
		this.margin = Number.isFinite(_margin) && _margin || Math.ceil(this.side/64);
		this.maxFont = Math.floor(2*this.side/3 - 2*this.margin);

		delete this.ctx;
		this.ctx = _canvas.getContext("2d");
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";
		this.scaleFont(0.6);
	}
	scaleFont(_r = 1) {
		if (_r <= 0 || _r > 1) { throw `Invalid scale for brush.font, ${_r}; requires: 0 < scale <= 1`; }
		this.ctx.font = Math.floor(_r*this.maxFont) + this.fontStr;
	}
	reset() {
		return this.set(0, 0, 1, 1);
	}
	updateColour(_colour) {
		_colour && (this.ctx.fillStyle = _colour);
	}

	getMargin(_margin) {
		return (_margin === undefined) ? this.margin : _margin;
	}
	pixelPos(_cellPos, _margin) {
		return _cellPos*this.side + _margin;
	}
	pixelSpan(_cellSpan, _margin) {
		return _cellSpan*this.side - _margin*2;
	}
	adjustForLineWidth() {
		const adjust = Math.ceil(this.ctx.lineWidth/2);
		this.alterAbs(adjust - 1, adjust - 1, 2 - 2*adjust, 2 - 2*adjust);
		return this;
	}

	setPos(_x, _y, _margin) {
		const margin = this.getMargin(_margin);
		return super.setPos(this.pixelPos(_x, margin), this.pixelPos(_y, margin));
	}
	setSpan(_w, _h, _margin) {
		const margin = this.getMargin(_margin);
		return super.setSpan(this.pixelSpan(_w, margin), this.pixelSpan(_h, margin));
	}

	alterPos(_dx, _dy) {
		return super.alterPos(_dx*this.side, _dy*this.side);
	}
	alterSpan(_dw, _dh) {
		return super.alterSpan(_dw*this.side, _dh*this.side);
	}

	centerStretch(_w, _h, _margin) {
		const margin = this.getMargin(_margin);
		return super.centerStretch(this.pixelSpan(_w, margin), this.pixelSpan(_h, margin));
	}

	fillRect(_colour) {
		this.updateColour(_colour);
		this.ctx.fillRect(this.x, this.y, this.w, this.h);
	}
	strokeRect(_colour) {
		this.updateColour(_colour);
		this.ctx.strokeRect(this.x, this.y, this.w, this.h);
	}
	clearRect() {
		this.ctx.clearRect(this.x, this.y, this.w, this.h);
	}

	ellipsePath() {
		this.ctx.beginPath();
		this.ctx.ellipse(this.x + this.w/2, this.y + this.h/2, this.w/2, this.h/2, 0, 0, Math.PI*2);
	}
	fillEllipse(_colour) {
		this.updateColour(_colour);
		this.ellipsePath();
		this.ctx.fill()
	}
	strokeEllipse(_colour) {
		this.updateColour(_colour);
		this.ellipsePath();
		this.ctx.stroke();
	}
	clearEllipse() {
		const gco = this.ctx.globalCompositeOperation;
		const colour = this.ctx.fillStyle;
		this.ctx.globalCompositeOperation = "destination-out";
		this.fillEllipse("#000");
		this.ctx.globalCompositeOperation = gco;
		this.ctx.fillStyle = colour;
	}

	write(_txt) {
		const center = this.getCenter();
		this.ctx.fillText(_txt, center.x, center.y);
	}
	draw(_img) {
		this.ctx.drawImage(_img, this.x, this.y, this.w, this.h);
	}
}

class ArenaLayer extends Rect {
	constructor(_w, _h, _side, _kwargs = {}) {
		super(0, 0, _w, _h);
		this.bgColour = _kwargs.bgColour;

		this.canvas = createCanvas(_side*this.w, _side*this.h);
		this.brush = new Brush(this.canvas, _side);

		this.shouldUpdate = true;
	}

	verifyResize(_w, _h, _side) {
		const span = new Rect().setSpan(_w, _h);

		return this.w !== span.w || this.h !== span.h || Math.abs(side) && this.brush.side !== Math.abs(side);
	}
	enactResize(_w, _h, _side) {
		(_w || _h) && this.setSpan(_w, _h);
		(this.x || this.y) && this.alterSpan(2*this.x, 2*this.y);
		const side = Math.abs(_side) || this.brush.side;

		delete this.canvas;
		this.canvas = createCanvas(side*this.w, side*this.h);
		this.brush.newCanvas(this.canvas, side);

		(this.x || this.y) && this.alterSpan(-2*this.x, -2*this.y);
		this.shouldUpdate = true;
		this.targetDrawArea();
	}
	resizeLayer(_w, _h, _side) {
		if (!this.verifyResize(_w, _h, _side)) { return false; }

		this.enactResize(_w, _h, _side);
		return true;
	}

	clearBrushArea() {
		this.brush.clearRect();
		this.bgColour && this.brush.fillRect(this.bgColour);
	}
	targetDrawArea() {
		this.brush.setFrom(this, 0);
	}

	checkForUpdate() {
		return this.shouldUpdate;
	}
	markForUpdate() {
		return this.shouldUpdate = true;
	}
	updateLayerType(_layerType = ArenaLayer) {
		return this instanceof _layerType && this.markForUpdate();
	}

	async clearLayer() {
		this.targetDrawArea();
		this.clearBrushArea();
	}
	async paintLayer() {
		throw `DefinitionError: ArenaLayer of type ${this.constructor.name} does not define paintLayer`;
	}
	async fetchCanvas() {
		if (this.checkForUpdate()) {
			await this.clearLayer();
			await this.paintLayer(...arguments);
			this.shouldUpdate = false;
		}
		return this.canvas;
	}
}
class StackLayer extends ArenaLayer {
	constructor(_w, _h, _side, _name, _kwargs = {}) {
		super(_w, _h, _side, _kwargs);
		this.name = _name;
		this.gco = _kwargs.gco || "source-over";
	}

	async paintLayer() {;}
}
class MultiLayer extends StackLayer {
	constructor(_w, _h, _side, _layerName, _kwargs = {}) {
		super(...arguments);

		this.layers = {};
		for (const [name, builder] of Object.entries(_kwargs.builders || {})) {
			this.layers[name] = new builder.layer(this.w, this.h, this.brush.side, name, builder.kwargs);
		}

		this.targetDrawArea();
	}

	enactResize(_w, _h, _side) {
		super.enactResize(_w, _h, _side);

		for (const layer of Object.values(this.layers)) {
			layer.enactResize(this.w, this.h, this.brush.side);
		}
	}

	checkForUpdate() {
		if (super.checkForUpdate()) { return true; }
		for (const layer of Object.values(this.layers)) {
			if (layer.checkForUpdate()) { return true;}
		}
		return false;
	}
	updateLayerType(_layerType) {
		for (const layer of Object.values(this.layers)) { layer.updateLayerType(_layerType) && this.markForUpdate(); }
		return this.shouldUpdate;
	}

	async clearLayer() {
		this.clearBrushArea();
	}
	async paintLayer() {
		for (const layer of Object.values(this.layers)) {
			this.brush.ctx.globalCompositeOperation = layer.gco || "source-over";
			this.brush.draw(await layer.fetchCanvas(...arguments));
		}
	}
}

class ImageLayer extends StackLayer {
	constructor(_w, _h, _side, _layerName, _kwargs = {}) {
		super(...arguments);

		this.imgUrl = _kwargs.imgUrl;

		this.targetDrawArea();
	}

	setImage(_imgUrl) {
		this.imgUrl = _imgUrl;
		this.shouldUpdate = true;
	}

	async clearLayer() {
		this.clearBrushArea();
	}
	async paintLayer() {
		if (!this.imgUrl) { return; }
		const image = await loadImage(this.imgUrl).catch((error) => {
			log.error(error);
			return false;
		});
		if (!image) { return; }
		this.brush.draw(image);
	}
}
class GuideLayer extends StackLayer {
	constructor(_w, _h, _side, _layerName, _kwargs = {}) {
		super(...arguments);

		this.brush.ctx.strokeStyle = _kwargs.stroke || "#3579";
		this.brush.ctx.lineWidth = Math.floor(this.brush.pixelSpan(0.8, 1));

		this.shapes = [];
		this.display = undefined;
	}

	async paintLayer() {
		if (!this.display) { return; }
		for (const {style, kwargs} of this.shapes) {
			style(this.brush, kwargs);
		}
	}
}
class GroupLayer extends StackLayer {
	async paintGroup(_group, _style, _cell, _kwargs) {
		if (!(_style && _cell)) { return; }
		for (const [i, token] of _group.tokens.entries()) {
			_kwargs.i = i;
			!token.removed && !token.hidden && _style(this.brush, _cell, token, _kwargs);
		}
	}
	async paintLayer(_stages) {
		for (const stage of Object.values(_stages)) {
			for (const {name, group, kwargs} of stage) {
				kwargs.single = group.tokens.length <= 1;
				await this.paintGroup(group, group.styles[this.name], group.styles.cell, kwargs);
			}
		}
	}
}

//-----------------------------------ARENA
const ARENA_SPECS = {
	dnd: {
		groups: {
			layer: MultiLayer,
			kwargs: {
				bgColour: "#fff2",
				builders: {
					token: {layer: GroupLayer},
					name: {layer: GroupLayer}
				}
			}
		},
		light: {layer: StackLayer, kwargs: {bgColour: "#0002"}},
		guide: {layer: GuideLayer}
	}
};

class Arena extends ArenaLayer {
	static calculateSide(_w, _h) {
		return Math.floor(Math.min(DEFAULT_WIDTH/(_w + 2), DEFAULT_HEIGHT/(_h + 2)));
	}
	static unpack(_pack) {
		const out = new Arena(_pack.w, _pack.h);
		out.background.setImage(_pack.imgUrl);
		for (const [name, groupPack] of Object.entries(_pack.groups)) { out.createGroup(name, ...groupPack); }
		return out;
	}

	constructor(_w, _h, _builders = ARENA_SPECS.dnd, _axesColour = "#fff") {
		super(_w + 2, _h + 2, Arena.calculateSide(_w, _h), {bgColour: "#000"});
		this.set(1, 1, _w, _h);
		this.defaultAxes = _axesColour;
		this.brush.scaleFont(0.8);
		this.paintAxes();

		this.lastStage = 0;
		this.groups = {};
		this.background = new ImageLayer(this.w, this.h, this.brush.side, null);
		this.stack = new MultiLayer(this.w, this.h, this.brush.side, null, {builders: _builders});
	}
	paintAxes(_axesColour) {
		this.brush.set(0, 0, this.w + 2, this.h + 2, 0);
		this.clearBrushArea();

		this.brush.reset();
		this.brush.ctx.fillStyle = _axesColour || this.defaultAxes;
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

		this.brush.ctx.fillStyle = this.bgColour;
		this.targetDrawArea();
	}

	checkForUpdate() {
		return this.background.checkForUpdate() || this.stack.checkForUpdate();
	}

	async clearLayer() {
		this.clearBrushArea();
	}
	async paintLayer() {
		this.background.imgUrl && this.brush.draw(await this.background.fetchCanvas(...arguments));

		const groupStages = {};
		for (const [name, group] of Object.entries(this.groups)) {
			(groupStages[group.stage] || (groupStages[group.stage] = [])).push({
				name,
				group,
				kwargs: {
					code: group.code,
					colour: group.colour,
					url: null
				}
			});
		}
		this.brush.draw(await this.stack.fetchCanvas(groupStages, ...arguments));
	}
	async fetchMap() {
		return (await this.fetchCanvas(...arguments)).toBuffer("image/png");
	}

	createGroup(_name, _presetKey) {
		const preset = GROUP_SPECS[_presetKey];
		preset.stage > this.lastStage && (this.lastStage = preset.stage);
		this.groups[_name] = new TokenGroup(preset.stage, preset.styles, ...arguments);
	}
	requireGroup(_name) {
		const out = this.groups[_name];
		if (!out) { throw `Required group, ${_name}, does not exist`; }
		return out;
	}
	requireToken(_identifier) {
		const [name, idStr] = _identifier.split(":");

		return this.requireGroup(name).requireToken(idStr);
	}

	enactResize(_w, _h) {
		this.setSpan(_w, _h);
		const side = Arena.calculateSide(this.w, this.h);

		super.enactResize(undefined, undefined, side);
		this.paintAxes();
		this.stack.enactResize(this.w, this.h, this.brush.side);
	}
	pack() {
		const groups = {};
		for (const [name, group] of Object.entries(this.groups)) {
			const tokens = [];
			for (const token of group.tokens) { token.removed || tokens.push(token); }
			tokens.length > 0 && (groups[name] = [group.presetKey, group.colour, group.span, tokens]);
		}
		return {w: this.w, h: this.h, imgUrl: this.background.imgUrl, groups};
	}
}

//--------------------------------------------------------------------FINALIZE
module.exports = {
	tokenChoices: buildChoices(TOKEN_SPECS),
	groupChoices: buildChoices(GROUP_SPECS),
	arenaChoices: buildChoices(ARENA_SPECS),
	Rect, Cube,
	ArenaLayer, StackLayer, MultiLayer,
	ImageLayer, GuideLayer, GroupLayer,
	Arena,
	updateHelper: {
		image: ImageLayer,
		group: GroupLayer,
		guide: GuideLayer
	},
	createArena: (_w, _h) => {
		return new Arena(_w, _h);
	}
}
