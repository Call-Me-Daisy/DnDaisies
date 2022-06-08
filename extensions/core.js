const {loadImage} = require("canvas");

const {Parser, BoolMode, minorUtils} = require("../utils");
const {StackLayer} = require("../arena-layer");
const {Arena} = require("../arena");
//--------------------------------------------------------------------PARSERS
const colourParser = new Parser({
	COLOURS: {
		ally: "#38e",
		enemy: "#e22",
		ground: "#a38b53",
		neutral: "#640",
		object: "#848b94",
		party: "#2e3",
		wall: "#000"
	},
	SHORTCUTS: {},
	BACKWALK: {},
	init() {
		for (const [key, val] of Object.entries(this.COLOURS)) {
			this.SHORTCUTS[key[0]] = key;
			this.BACKWALK[val] = key;
		}
	},
	forList(_colour) {
		const team = this.BACKWALK[_colour] || "unafilliated";
		return `__Team: ${team} (colour: ${_colour})__`;
	},

	fromStr(_colourStr) {
		const colourStr = _colourStr.toLowerCase();
		let out;

		if (colourStr[0] === "#") {return colourStr;}
		else if (out = this.COLOURS[colourStr]) {}
		else if (out = this.COLOURS[this.SHORTCUTS[colourStr]]) {}
		else { throw `Could not parse Colour: ${_colourStr}`; }

		return out;
	},
	toStr(_colour) {
		return _colour;
	}
});
const coordParser = new Parser({
	verify(_coord) {
		if (!(_coord && _coord.length) || _coord[0].length) {return false;}
		for (const val of _coord) {
			if (isNaN(val)) {return false;}
		}
		return true;
	},
	fromToken(_token) {return _token.getPos();},
	fromStr(_coordStr) {
		const out = [];
		for (const str of _coordStr.split("-")) {
			const charCode = str.charCodeAt(0);
			(charCode > 64)
				? out.push(...[charCode - ((charCode > 96) ? 70 : 64), parseInt(str.slice(1), 10)])
				: out.push(parseInt(str, 10))
			;
		}
		return out;
	},
	toStr(_coord) {
		return _coord.join("-");
	}
});
const rangeParser = new Parser({
	verify(_range) {
		if (!(_range && _range.length)) {return false;}
		for (const vector of _range) {
			if (!coordParser.verify(vector)) {return false;}
		}
		return true;
	},
	fromToken(_token) {return [coordParser.fromToken(_token), _token.getDim()];},
	fromStr(_rangeStr) {
		const out = [];
		let lastCorner = [];
		for (const coordStr of _rangeStr.split(":")) {
			const corner = coordParser.fromStr(coordStr);
			const vector = [];
			for (const [j, val] of corner.entries()) {vector.push(val - (lastCorner[j] || 0));}
			out.push(vector);
			lastCorner = corner;
		}
		return out;
	},
	toStr(_range) {
		const corners = [];
		let lastCorner = [];
		for (const vector of _range) {
			const corner = [];
			for (const [j, val] of vector.entries()) {corner.push(val + (lastCorner[j] || 0));}
			corners.push(coordParser.toStr(corner));
			lastCorner = corner;
		}
		return corners.join(":");
	}
});
const seedParser = new Parser({
	fromRange(_range, _hidden = false) {return {pos: _range[0], dim: _range[1], hidden: _hidden};},
	parseHiddenStr(_hiddenStr) {return _hiddenStr && _hiddenStr[0].toLowerCase() === "t";},

	fromToken(_token) {return this.fromRange(rangeParser.fromToken(_token), _token.hidden);},
	fromStr(_rangeStr, _hiddenStr) {
		return this.fromRange(rangeParser.fromStr(_rangeStr), this.parseHiddenStr(_hiddenStr));
	},

	fromCSV(_rangeCSV, _hiddenStr) {
		const hidden = this.parseHiddenStr(_hiddenStr);
		const out = [];
		for (const rangeStr of _rangeCSV.split(",")) {
			const seed = this.fromStr(rangeStr);
			seed.hidden = hidden;
			out.push(seed);
		}
		return out;
	}
});
//--------------------------------------------------------------------LAYERS
class GuideLayer extends StackLayer {
	constructor(_w, _h, _pS, _layerName = "guide", _stroke = "#3579") {
		super(_w, _h, _pS, _layerName);
		this.brush.ctx.strokeStyle = _stroke;

		this.brush.ctx.lineWidth = _pS;
		this.display = false;
		this.shapes = [];
	}

	hasShape() {
		return this.shapes.length > 0;
	}
	displayShapes() {
		this.shouldUpdate = true;
		this.display = true;
		return this;
	}
	emptyShapes() {
		this.shouldUpdate = (this.shapes.length > 0);
		this.shapes = [];
		return this;
	}
	addShape(_draw, _args) {
		this.shapes.push({draw: _draw, args: _args});
		return this.displayShapes();
	}

	async paintToken() {
		throw "core_GuideLayer is not a group layer";
	}
	async paintGroup() {
		throw "core_GuideLayer is not a group layer";
	}
	async paint() {
		if (this.display) {
			for (const shape of this.shapes) {await shape.draw(this.brush, shape.args);}
			this.display = false;
			this.shouldUpdate = true;
		}
	}
}
class NameLayer extends StackLayer {
	static isGroupLayer = true;
	static fullCode(_args) {
		return _args.code + ((_args.many) ? (_args.i).toString() : "");
	}

	constructor(_w, _h, _pS, _layerName = "name") {
		super(_w, _h, _pS, _layerName);

		this.brush.scaleFont(0.75);
	}

	async buildArgs(_style, _name, _group, _kwargs) {
		return {
			error: _group.displayError,
			code: _group.code,
			many: _group.tokens.length > 1,
			cell: _group.styles.cell,
			colour: _group.nameColour || _group.colour,
			isImage: !!(_kwargs.imgUrls && await _kwargs.imgUrls.get(_name))
		};
	}
	async paintToken(_style, _token, _args) {
		this.brush.setFrom(_token);
		_args.cell.clear(this.brush);

		this.brush.ctx.globalCompositeOperation = "source-over";
		this.brush.ctx.fillStyle = _args.colour;
		await _style(this.brush, _token, _args);

		if (_style.invert && (!_args.isImage || _args.error)) {
			this.brush.ctx.globalCompositeOperation = "difference";
			this.brush.ctx.fillStyle = "#fff";
			await _style(this.brush, _token, _args);
		}
	}
}
class TokenLayer extends StackLayer {
	static isGroupLayer = true;
	static scaleAlpha(_colStr, _r = 0.5) {
		const len = _colStr.length - 1;
		switch (len % 4) {
			case 3: return _colStr + (255*_r).toString(16)[0];
			case 2: return _colStr + (255*_r).toString(16);
			case 0:
				const n = Math.floor(len/3) - 1;
				const a = parseInt(_colStr.slice(len - n), 16);
				return _colStr.slice(0, len - n) + (a*_r).toString(16);
		}
	}

	constructor(_w, _h, _pS, _layerName = "token") {
		super(_w, _h, _pS, _layerName);
	}

	async buildArgs(_style, _name, _group, _kwargs) {
		const out = {
			error: _group.displayError,
			code: _group.code,
			many: _group.tokens.length > 1,
			colour: _group.colour,
			cell: _group.styles.cell
		}
		if (_style.loadsImage) {
			const imgUrl = _kwargs.imgUrls && _kwargs.imgUrls.get(_name);
			(imgUrl) ? out.img = await loadImage(imgUrl) : out.error = true;
		}
		return out;
	}
}
//--------------------------------------------------------------------FINALIZE
module.exports = {
	parsers: {colourParser, coordParser, rangeParser, seedParser},
	layers: {GuideLayer, NameLayer, TokenLayer},

	registerStage: 0,
	registerExtension(_extensionCode, _reg) {
		//--------------------------------------------------------------------STYLES
		const STYLES = _reg.STYLES;
		STYLES.register("general", "null", function() {});
		//------------------------------------CELL
		STYLES.register("cell", "rect", {
			paint: function(_brush) {_brush.fillRect();},
			clear: function(_brush) {_brush.clearRect();},
			stroke: function(_brush) {_brush.strokeRect();}
		});
		STYLES.register("cell", "ellipse", {
			paint: function(_brush) {_brush.fillEllipse();},
			clear: function(_brush) {_brush.clearEllipse();},
			stroke: function(_brush) {_brush.strokeEllipse();}
		});

		STYLES.cell.default = STYLES.cell.rect;
		//------------------------------------GUIDE
		STYLES.register("guide", "rect", function(_brush, _args) {
			_brush.setPos(..._args.origin).adjustForLineWidth();
			_brush.setDim(...(_args.dim || [_args.pos[0] - _args.origin[0], _args.pos[1] - _args.origin[1]]));
			_brush.ctx.strokeRect(_brush.x, _brush.y, _brush.w, _brush.h);
		});
		STYLES.register("guide", "line", function(_brush, _args) {
			_brush.setPos(_args.origin[0], _args.origin[1]).adjustForLineWidth();
			_brush.ctx.beginPath();
			_brush.ctx.moveTo(_brush.x, _brush.y);
			_brush.setPos(_args.pos[0], _args.pos[1]).adjustForLineWidth();
			_brush.ctx.lineTo(_brush.x, _brush.y);
			_brush.ctx.stroke();
		});
		STYLES.register("guide", "ellipse", function(_brush, _args) {
			_brush.setPos(_args.origin[0], _args.origin[1]).adjustForLineWidth();
			_brush.setDim(_args.radii[0], _args.radii[1] || _args.radii[0]);
			_brush.ctx.beginPath();
			_brush.ctx.ellipse(_brush.x, _brush.y, _brush.w, _brush.h, 0, 0, Math.PI*2);
			_brush.ctx.stroke();
		});

		STYLES.guide.default = STYLES.general.null;
		//------------------------------------NAME
		STYLES.register("name", "center", function(_brush, _token, _args) {
			_brush.setFrom(_token);
			_brush.write(NameLayer.fullCode(_args));
		}).invert = true;
		STYLES.register("name", "corner", function(_brush, _token, _args) {
			const code = NameLayer.fullCode(_args);
			_brush.reset();
			for (const i of [0, 1]) {
				for (const j of [0, 1]) {
					_brush.setPos(_token.x + i*(_token.w - 1), _token.y + j*(_token.h - 1));
					_brush.write(code);
				}
			}
		}).invert = true;
		STYLES.register("name", "partial", function(_brush, _token, _args) {
			if (_args.error) {
				STYLES.name.default(_brush, _token, _args);
			}
			else if (_args.many) {
				_brush.setFrom(_token);
				_brush.write((_args.i).toString());
			}
		}).invert = true;

		STYLES.name.default = STYLES.name.center;
		//------------------------------------TOKEN
		STYLES.register("token", "fill", function(_brush, _token, _args) {
			_brush.ctx.fillStyle = _args.colour;
			_args.cell.paint(_brush.setFrom(_token));
		});
		STYLES.register("token", "grid", function(_brush, _token, _args) {
			_brush.ctx.fillStyle = _args.colour;
			_brush.setDim(1, 1);
			for (let y = _token.y; y < _token.y + _token.h; y++) {
				for (let x = _token.x; x < _token.x + _token.w; x++) {
					_args.cell.paint(_brush.setPos(x, y));
				}
			}
		});
		STYLES.register("token", "image", async function(_brush, _token, _args) {
			try {
				if (_args.error) {throw "";}
				_brush.setFrom(_token);
				_brush.draw(await _args.img);
			} catch {
				STYLES.token.default(_brush, _token, _args);
				_args.error = true;
			}
		}).loadsImage = true;

		STYLES.token.default = STYLES.token.fill;
		//--------------------------------------------------------------------CONSOLES
		const CONSOLES = _reg.CONSOLES;
		//------------------------------------GUIDES
		CONSOLES.register("guide", "rect", function(_arena, _toParse1, _toParse2) {
			const range = rangeParser.fromStr(_toParse1);
			return [
				STYLES.guide.rect,
				(rangeParser.verify(range))
					? {origin: range[0], dim: range[1]}
					: {origin: coordParser.fromUnknown(_arena, _toParse1), pos: coordParser.fromUnknown(_arena, _toParse2)}
			];
		});
		CONSOLES.register("guide", "line", function(_arena, _coordAtCorner1, _coordAtCorner2) {
			return [STYLES.guide.line, {
				origin: coordParser.fromUnknown(_arena, _coordAtCorner1),
				pos: coordParser.fromUnknown(_arena, _coordAtCorner2)
			}];
		});
		CONSOLES.register("guide", "ellipse", function(_arena, _coordAtOrigin, _radii) {
			return [STYLES.guide.ellipse, {
				origin: coordParser.fromUnknown(_arena, _coordAtOrigin),
				radii: (isNaN(_radii)) ? coordParser.fromStr(_radii) : [parseInt(_radii, 10)]
			}];
		});
		//--------------------------------------------------------------------COMMANDS
		const COMMANDS = _reg.COMMANDS;
		//------------------------------------GROUP
		COMMANDS.register(_extensionCode, "movegroup", function(_arena, _name, _rangeCSV, _hiddenMode) {
			const tokens = _arena.requireGroup(_name.toLowerCase()).tokens;
			const hiddenSetter = BoolMode.SWITCH(_hiddenMode);
			if (!_rangeCSV) {return;}

			let tokenInd = -1;
			for (const range of rangeParser.fromCSV(_rangeCSV)) {
				while(++tokenInd < tokens.length && tokens[tokenInd].removed) {}
				if (tokenInd >= tokens.length) {return;}
				const token = tokens[tokenInd];
				token.setRange(range);
				hiddenSetter && (token.hidden = hiddenSetter(token.hidden));
			}
			_arena.updateGroupLayers();
		}).requires = ["arena"];
		COMMANDS.register(_extensionCode, "hidegroup", function(_arena, _name, _hiddenMode) {
			const hiddenSetter = BoolMode.SWITCH(_hiddenMode, "!");
			if (!hiddenSetter) {return false;}

			for (const token of _arena.requireGroup(_name.toLowerCase()).tokens) {token.hidden = hiddenSetter(token.hidden);}
			_arena.updateGroupLayers();
		}).requires = ["arena"];
		COMMANDS.register(_extensionCode, "removegroup", function(_arena, _name) {
			_arena.removeGroup(_name.toLowerCase()) && _arena.updateGroupLayers();
		}).requires = ["arena"];
		COMMANDS.register(_extensionCode, "resizegroup", function(_arena, _name, _dim) {
			const group = _arena.requireGroup(_name.toLowerCase());
			const seed = seedParser.fromStr(_dim);

			group.dim = seed.dim || seed.pos;
		}).requires = ["arena"];
		//------------------------------------TOKEN
		COMMANDS.register(_extensionCode, "newtoken", function(_arena, _name, _rangeCSV, _hiddenStr) {
			_arena.makeTokens(_name.toLowerCase(), seedParser.fromCSV(_rangeCSV, _hiddenStr));
		}).requires = ["arena"];
		COMMANDS.register(_extensionCode, "move", function(_arena, _tokenCSV, _rangeCSV, _hiddenMode) {
			_arena.moveTokens(...Parser.makeTokenTup(_tokenCSV), rangeParser.fromCSV(_rangeCSV), BoolMode.SWITCH(_hiddenMode, "u"));
		}).requires = ["arena"];
		COMMANDS.register(_extensionCode, "hide", function(_arena, _tokenCSV, _hiddenMode) {
			_arena.hideTokens(...Parser.makeTokenTup(_tokenCSV), BoolMode.SWITCH(_hiddenMode, "!"));
		}).requires = ["arena"];
		COMMANDS.register(_extensionCode, "remove", function(_arena, _tokenCSV, _rangeCSV, _removedMode) {
			_arena.removeTokens(...Parser.makeTokenTup(_tokenCSV), BoolMode.SWITCH(_removedMode, "t"), false);
		}).requires = ["arena"];
		//------------------------------------MISC
		COMMANDS.register(_extensionCode, "distance", function(_holder, _arena, _toParse1, _toParse2) {
			const parsed1 = coordParser.fromUnknown(_arena, _toParse1);
			const parsed2 = coordParser.fromUnknown(_arena, _toParse2);

			let out = 0;
			for (let i =0; i< Math.max(parsed1.length, parsed2.length); i++) {
				out += ((parsed1[i] || 0) - (parsed2[i] || 0))**2;
			}
			minorUtils.makeTemp(
				_holder.channel.send(`Distance( ${_toParse1} <-> ${_toParse2} ) = ${Math.sqrt(out).toFixed(2)} cells`), 0.5
			);

			return {suggest: {display: false}};
		}).requires = ["holder", "arena"];
		COMMANDS.register(_extensionCode, "instructions", function(_holder, _arena) {
			const instructions = _holder.makeInstructionList();
			if (!instructions) {
				console.error(`Call to ${holder.arenaType}.makeInstructionList returned false`);
				return {suggest: {error: true}};
			}
			_holder.channel.send(instructions);
			return {suggest: {display: false, timer: false}};
		}).requires = ["holder", "arena"];
		COMMANDS.register(_extensionCode, "list", function(_holder, _arena, _teamsToList) {
			const teams = {};
			for (const [name, group] of _arena.groups) {
				if (group.styles.name) {
					(teams[group.colour] || (teams[group.colour] = [colourParser.forList(group.colour)])).push(
						`Token: ${group.code} => Name: ${name[0].toUpperCase() + name.slice(1)}`
					);
				}
			}
			if (Object.keys(teams).length < 1) { throw `No teams to list in channel ${_holder.channel.id}`; }

			const msg = [];
			const teamsToList = {};
			if (_teamsToList) {
				for (const team of _teamsToList.split(",")) {teamsToList[team] = true;}
			}
			else {teamsToList.all = true;}

			for (const [colour, ls] of Object.entries(teams)) {
				(teamsToList.all || teamsToList[team]) && msg.push(ls.join("\n"));
			}

			minorUtils.makeTemp(_holder.channel.send(msg.join("\n\n")));
			return {suggest: {display: false}};
		}).requires = ["holder", "arena"];
		COMMANDS.register(_extensionCode, "ping", function(_bot, _msg) {
			const msgPing = Math.abs(Date.now() - _msg.createdTimestamp);
			const botPing = Math.abs(_bot.ws.ping);

			minorUtils.makeTemp(_msg.channel.send(
				`Pong!\n> Total Ping: ${msgPing + botPing}ms\n> From Message: ${msgPing}ms\n> From Bot: ${botPing}ms`
			));
			return {suggest: {display: false}};
		}).requires = ["bot", "message"];
		//------------------------------------ALIAS

		COMMANDS.addAliases(_extensionCode, "hidegroup", "revealgroup");

		COMMANDS.addAliases(_extensionCode, "newtoken", "copy");
		COMMANDS.addAliases(_extensionCode, "hide", "reveal");

		COMMANDS.addAliases(_extensionCode, "list", "tokens");
		COMMANDS.addAliases(_extensionCode, "distance", "separation");
		COMMANDS.addAliases(_extensionCode, "instructions", "collapse");
	}
}
