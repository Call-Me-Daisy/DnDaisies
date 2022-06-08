const {Cube} = require("cmdaisy-utils").canvas;

const {BaseLayer} = require("./arena-layer");
//--------------------------------------------------------------------CONSTANTS
const MAX_PW = 1920, MAX_PH = 1080;
const FONT_STR = "px Arial";
//--------------------------------------------------------------------TOKEN
class Token extends Cube {
	constructor(_pos, _dim, _hidden = false) {
		super();
		this.set(_pos[0], _pos[1], _pos[2], _dim[0], _dim[1], _dim[2]);
		this.hidden = _hidden;
		this.removed = false;
	}

	setPos(_x, _y, _z) {
		return super.setPos((_x - 1|| 0), (_y - 1 || 0), (_z - 1 || 0));
	}
	setDim(_w, _h, _d) {
		return super.setDim((_w + 1 || 1), (_h + 1 || 1), (_d + 1 || 1));
	}

	setPosAry(_pos) {
		return this.setPos(..._pos);
	}
	setDimAry(_dim) {
		return this.setDim(..._dim);
	}
	alterPosAry(_dPos) {
		return this.alterPos(..._dPos);
	}
	alterDimAry(_dDim) {
		return this.alterPos(..._dDim);
	}

	setRange(_range) {
		this.setPosAry(_range[0]);
		(_range[1] !== undefined) && (this.setDimAry(_range[1]));
		return this;
	}
	setSeed(_seed) {
		this.setRange([_seed.pos, _seed.dim]);
		(_seed.hidden !== undefined) && (this.hidden = _seed.hidden);
		return this;
	}

	getPos() {
		return [this.x + 1, this.y + 1, this.z + 1];
	}
	getDim() {
		return [this.w - 1, this.h - 1, this.d - 1];
	}
}
//--------------------------------------------------------------------GROUP
class TokenGroup {
	static makeCode(_name) {
		return _name[0].toUpperCase() + _name[_name.length - 1].toLowerCase();
	}

	constructor(_name, _colour, _dim, _drawStage, _styles, _seeds = false) {
		this.code = TokenGroup.makeCode(_name);
		this.colour = _colour;
		this.dim = _dim;
		this.drawStage = _drawStage;
		this.styles = _styles;
		this.tokens = [];

		_seeds && this.addMany(_seeds);
	}

	add(_seed) {
		this.tokens.push(new Token(_seed.pos, _seed.dim || this.dim, _seed.hidden));
	}
	addMany(_seeds) {
		for (const seed of _seeds) {this.add(seed);}
	}

	isEmpty() {
		return (this.tokens.length > 0);
	}
	allRemoved() {
		for (const token of this.tokens) {
			if (!token.removed) {return false;}
		}
		return true;
	}
	hasStyle(_layer) {
		return (this.styles[_layer]);
	}
}
//--------------------------------------------------------------------ARENA
class Arena extends BaseLayer {
	constructor(_w, _h, _layerBuilders) {
		super(_w, _h, Math.floor(Math.min(MAX_PW/_w, MAX_PH/_h)), _layerBuilders);

		this.lastStage = 0;
		this.groups = new Map();
	}

	fetchGroup(_name) {
		return this.groups.get(_name);
	}
	requireGroup(_name) {
		const out = this.fetchGroup(_name);
		if (out === undefined) { throw `Required Group, ${_name}, is undefined`;}
		return out;
	}

	setGroup(_name, _group) {
		this.updateGroupLayers();
		this.groups.set(_name, _group);
		(_group.drawStage > this.lastStage) && (this.lastStage = _group.drawStage);
		return this;
	}
	makeGroup(_name, _colour, _dim, _drawStage, _styles, _tokenSeeds = false, _override = false) {
		if (_override || this.groups.get(_name) === undefined) {
			this.setGroup(_name, new TokenGroup(_name, _colour, _dim, _drawStage, _styles, _tokenSeeds));
			return true;
		}
		return false;
	}
	removeGroup(_name) {
		this.updateGroupLayers();
		return this.groups.delete(_name);
	}

	fetchTokens(_name, _iAry) {
		const tokens = this.requireGroup(_name).tokens;
		if (tokens.length === 1) {return tokens;}

		const out = [];
		for (const i of (_iAry.length) ? _iAry : [_iAry]) {
			if (i >= tokens.length) {return out;}
			out.push(tokens[i]);
		}
		return out;
	}
	requireToken(_name, _i) {
		const out = fetchTokens(_name, [_i]);
		if (out[0] === undefined) { throw `Required Token, ${_name}:${_i}, is undefined`; }
		return out;
	}

	makeTokens(_name, _tokenSeeds) {
		const tokenSeeds = (_tokenSeeds.length) ? _tokenSeeds : [_tokenSeeds];
		this.updateGroupLayers();
		return this.requireGroup(_name).addMany(tokenSeeds);
	}
	moveTokens(_name, _iAry, _ranges, _changeHidden = false) {
		if (!_ranges.length) {return false;}
		this.updateGroupLayers();

		for (const [j, token] of this.fetchTokens(_name, _iAry).entries()) {
			token.setRange(_ranges[j]);
			_changeHidden && (token.hidden = _changeHidden(token.hidden));
		}
		return true;
	}
	hideTokens(_name, _iAry, _changeHidden) {
		if (!_changeHidden) {return false;}
		this.updateGroupLayers();
		for (const token of this.fetchTokens(_name, _iAry)) {token.hidden = _changeHidden(token.hidden);}
		return true;
	}
	removeTokens(_name, _iAry, _changeRemoved, _andGroupIfAllRemoved = true) {
		if (!_changeRemoved) {return false;}
		this.updateGroupLayers();
		for (const token of this.fetchTokens(_name, _iAry)) {token.removed = _changeRemoved(token.removed);}
		return _andGroupIfAllRemoved && this.fetchGroup(_name).allRemoved() && this.removeGroup(_name);
	}

	makeCommandList() {
		return false;
	}
	async buildMap() {
		const stages = {};
		if (this.checkForUpdates()) {
			for (const [name, group] of this.groups.entries()) {
				group.displayError = false;
				(stages[group.drawStage] || (stages[group.drawStage] = [])).push([name, group]);
			}
		}

		return this.getCanvas(stages, ...arguments)
			.then((_canvas) => {
				return _canvas.toBuffer("image/png");
			})
			.catch((_e) => { throw _e; })
		;
	}
}
//--------------------------------------------------------------------FINALIZE
module.exports = {
	Arena,
	TokenGroup,
	Token
};
