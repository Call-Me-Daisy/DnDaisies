const {createCanvas, loadImage} = require("canvas");
const {Rect} = require("./utils");
const {STYLES} = require("./styles");
const {BaseLayer, TokenLayer, GuideLayer, LightLayer, NameLayer} = require("./map-layer");
//--------------------------------------------------------------------CONSTANTS
const MAX_PH = 1920, MAX_PV = 1080;
//--------------------------------------------------------------------HELP
//--------------------------------------------------------------------MAIN
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
	constructor(_name, _dim, _styles, _colour, _layer) {
		this.dim = _dim;
		this.style = _styles;
		this.colour = _colour;
		this.layer = _layer;

		this.code = TokenGroup.makeCode(_name);
		this.tokens = [];
		this.displayError = false;
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
	willDisplay(_layer) {
		return (this.style[_layer].id !== STYLES.general.none.id);
	}
}
//------------------------------------ARENA
class Arena {
	constructor(_dim, _feedback = console.log, _feedhelp = "USER_ERROR:", _pH = MAX_PH, _pV = MAX_PV) {
		this.feedhelp = _feedhelp;
		this.feedback = _feedback; //void function(_feedhelp, string) => tells user what they did wrong

		this.dim = _dim;
		this.groups = new Map();

		this.base = new BaseLayer(_dim, Math.floor(Math.min(_pH/_dim[0], _pV/_dim[1])));
		this.layers = (function(_pS){
			return {
				token: new TokenLayer(_dim, _pS),
				light: new LightLayer(_dim, _pS, 0.5),
				name: new NameLayer(_dim, _pS, "difference"),
				guide: new GuideLayer(_dim, _pS)
			};
		})(this.base.brush.pS)

		this.newGroup({
			token: STYLES.token.image,
			cell: STYLES.cell.rect,
			name: STYLES.general.none,
			light: STYLES.general.none
		},
			0, "Background", "#000", _dim
		);
		this.addToGroupSplit("Background", [1,1,0]);

		this.shouldUpdate = false;
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
			if (_layer > TokenLayer.lastLayer) {TokenLayer.lastLayer = _layer;}
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
	setGuide(_style, _styleArgs) {
		this.layers.guide.shapes.push({
			draw: _style,
			args: _styleArgs
		});
	}

	async buildMap(_imgUrls) {
		await this.base.paint();

		let ctx = this.base.brush.ctx;
		let paintArea = new Rect().setFrom(this.base.brush.setFrom(this.base));

		for (const [name, group] of this.groups.entries()) {
			group.displayError = false;
		}

		for (const [key, layer] of Object.entries(this.layers)) {
			ctx.globalCompositeOperation = layer.gco;
			ctx.drawImage(
				await layer.getCanvas(this.shouldUpdate, this.groups, _imgUrls),
				paintArea.x, paintArea.y, paintArea.h, paintArea.v,
				paintArea.x, paintArea.y, paintArea.h, paintArea.v
			);
		}

		this.shouldUpdate = false;

		return ctx.canvas.toBuffer("image/png");
	}
}
//--------------------------------------------------------------------FINALIZE
module.exports = {
	Arena
};
