const {loadImage} = require("canvas");

const {Parser, BoolMode, minorUtils} = require("../utils");
const {StackLayer} = require("../arena-layer");
const {Arena} = require("../arena");
//--------------------------------------------------------------------PARSERS
const colourParser = new Parser({
	COLOURS: {
		red: "#f00",
		green: "#0f0",
		blue: "#00f",
		yellow: "#ff0",
		magenta: "#f0f",
		cyan: "#0ff",
		white: "#fff",
		void: "#000",

		enemy: "#800",
		party: "#080",
		ally: "#008",
		neutral: "#642",

		dirt: "#5e4933",
		stone: "#7a7671",
		fire: "#ff7d19",
		ice: "#9aeddb",
		lightning: "#b8ac0d",
		toxic: "#9c37a6"
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
		return `__Team/Type: ${team[0].toUpperCase() + team.slice(1)} (colour: ${_colour})__`;
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

		this.brush.scaleFont(0.8);
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
		//------------------------------------GENERAL
		STYLES.registerCategory("general",
			"Styles that are not specific to any type of layer"
		);

		STYLES.register("general", "null",
			function() {},
			"Has no effect; just for edge cases where a style is required for checks or defaults."
		);
		//------------------------------------CELL
		STYLES.registerCategory("cell",
			"Styles for drawing the repeating unit (generally a filled geometric shape) used in token styles"
		);

		STYLES.register("cell", "rect",
			{
				paint: function(_brush) {_brush.fillRect();},
				clear: function(_brush) {_brush.clearRect();},
				stroke: function(_brush) {_brush.strokeRect();}
			},
			"Cell style which creates unrotated rectangular shapes."
		);
		STYLES.register("cell", "ellipse",
			{
				paint: function(_brush) {_brush.fillEllipse();},
				clear: function(_brush) {_brush.clearEllipse();},
				stroke: function(_brush) {_brush.strokeEllipse();}
			},
			"Cell style which creates unrotated elliptical shapes."
		);

		STYLES.cell.default = STYLES.cell.rect;
		//------------------------------------GUIDE
		STYLES.registerCategory("guide",
			"Styles for drawing the shape (generally a geometric outline) created by calls to CONSOLES.guide"
		);

		STYLES.register("guide", "rect",
			function(_brush, _args) {
				_brush.setPos(..._args.origin).adjustForLineWidth();
				_brush.setDim(...(_args.dim || [_args.pos[0] - _args.origin[0], _args.pos[1] - _args.origin[1]]));
				_brush.ctx.strokeRect(_brush.x, _brush.y, _brush.w, _brush.h);
			},
			"Guide style which outlines an unrotated rectangle"
		);
		STYLES.register("guide", "line",
			function(_brush, _args) {
				_brush.setPos(_args.origin[0], _args.origin[1]).adjustForLineWidth();
				_brush.ctx.beginPath();
				_brush.ctx.moveTo(_brush.x, _brush.y);
				_brush.setPos(_args.pos[0], _args.pos[1]).adjustForLineWidth();
				_brush.ctx.lineTo(_brush.x, _brush.y);
				_brush.ctx.stroke();
			},
			"Guide style which draws a line connecting any two points"
		);
		STYLES.register("guide", "ellipse",
			function(_brush, _args) {
				_brush.setPos(_args.origin[0], _args.origin[1]).adjustForLineWidth();
				_brush.setDim(_args.radii[0], _args.radii[1] || _args.radii[0]);
				_brush.ctx.beginPath();
				_brush.ctx.ellipse(_brush.x, _brush.y, _brush.w, _brush.h, 0, 0, Math.PI*2);
				_brush.ctx.stroke();
			},
			"Guide style which outlines an unrotated ellipse"
		);

		STYLES.guide.default = STYLES.general.null;
		//------------------------------------NAME
		STYLES.registerCategory("name",
			"Styles for drawing a token's identifier (generally 2-3 characters, based on its given name)"
		);

		STYLES.register("name", "center",
			function(_brush, _token, _args) {
				_brush.setFrom(_token);
				_brush.write(NameLayer.fullCode(_args));
			},
			"Name style which draws a high-contrast identifier in the exact center of the token"
		).invert = true;
		STYLES.register("name", "corner",
			function(_brush, _token, _args) {
				const code = NameLayer.fullCode(_args);
				_brush.reset();
				for (const i of [0, 1]) {
					for (const j of [0, 1]) {
						_brush.setPos(_token.x + i*(_token.w - 1), _token.y + j*(_token.h - 1));
						_brush.write(code);
					}
				}
			},
			"Name style which draws a high-contrast identifier in each corner of the token"
		).invert = true;
		STYLES.register("name", "partial",
			function(_brush, _token, _args) {
				if (_args.error) {
					STYLES.name.default(_brush, _token, _args);
				}
				else if (_args.many) {
					_brush.setFrom(_token);
					_brush.write((_args.i).toString());
				}
			},
			"Name style which draws only the index in the center of the token; defaults to name.center if token is not an image"
		).invert = true;

		STYLES.name.default = STYLES.name.center;
		//------------------------------------TOKEN
		STYLES.registerCategory("token",
			"Highly varied and/or complex styles for drawing the token itself"
		);

		STYLES.register("token", "fill",
			function(_brush, _token, _args) {
				_brush.ctx.fillStyle = _args.colour;
				_args.cell.paint(_brush.setFrom(_token));
			},
			"Token style which fills the entire token area with one large cell"
		);
		STYLES.register("token", "grid",
			function(_brush, _token, _args) {
				_brush.ctx.fillStyle = _args.colour;
				_brush.setDim(1, 1);
				for (let y = _token.y; y < _token.y + _token.h; y++) {
					for (let x = _token.x; x < _token.x + _token.w; x++) {
						_args.cell.paint(_brush.setPos(x, y));
					}
				}
			},
			"Token style which fills the entire token area with many 1-1 cells"
		);
		STYLES.register("token", "image",
			async function(_brush, _token, _args) {
				try {
					if (_args.error) {throw "";}
					_brush.setFrom(_token);
					_brush.draw(await _args.img);
				} catch {
					STYLES.token.default(_brush, _token, _args);
					_args.error = true;
				}
			},
			"Token style which fills the entire token area with an image; defaults to token.fill if no image found"
		).loadsImage = true;

		STYLES.token.default = STYLES.token.fill;
		//--------------------------------------------------------------------CONSOLES
		const CONSOLES = _reg.CONSOLES;
		//------------------------------------REDIRECTS
		CONSOLES.registerCategory("arena",
			"Functions to create an arena specialised for a particular TTG.\nA basic arena contains:\n> Width, a positive integer number of cells\n> Height, a positive integer number of cells\n> Layer_Builders, a list of named layers to stack in the order they appear\nSee COMMANDS.tools.arena for more details"
		);

		CONSOLES.registerCategory("newGroup",
			"Functions to create a new group in the current arena.\nA basic group contains:\n> Name, how it is saved and retrieved\n> Colour, how the tokens are filled on the map\n> Dimensions, an overridable default value passed to new tokens on creation\n> Draw_stage, how late the group is drawn to the map (except -1 which is always last)\n> Styles, the functions that actually draw the tokens to the map\nSee CONSOLES.newGroup.(core & [arena_type]) for more details"
		);
		CONSOLES.register("newGroup", _extensionCode,
			function(_arena, _name, _colour, _drawStage, _styles, _rangeCSV, _hiddenStr) {
				const name = _name.toLowerCase();
				const colour = colourParser.fromStr(_colour);
				const seeds = _rangeCSV && seedParser.fromCSV(_rangeCSV, _hiddenStr);
				const dim = (seeds && seeds[0].dim) || [0, 0, 0];

				let styles = _styles;
				if (typeof styles === "string" || styles instanceof String) {
					styles = {};
					for (const descriptor of _styles.split(",")) {
						const layerCheck = descriptor.split(":");
						const [styleType, styleName] = layerCheck[layerCheck.length - 1].split(".");
						styles[(layerCheck.length > 1) ? layerCheck[0] : styleType] = STYLES[styleType][styleName];
					}
				}

				if (!_arena.makeGroup(name, colour, dim, parseInt(_drawStage, 10), styles, seeds)) {
					throw `Group ${_name} already exists`;
				}
				return true;
			},
			"Handles the majority of the required fields of a TokenGroup (see CONSOLES.newGroup); most CONSOLES.newGroup.[arena_type] functions will call this, however they may have different arguments so see their page also."
			+ "\n> name => disregards capitalisation"
			+ "\n> colour => adds shortcuts (see KEYWORDS.colour.shortcuts)"
			+ "\n> drawStage => rounds down to the nearest integer"
			+ "\n> styles => takes a CSV of [layer]:[category].[style] (or [category]:[style], which assumes [layer] = [category]) and sets the group to draw to [layer] with the [category].[style] function"
			+ "\n> seeds => assumes tokens are either all visible or all hidden, so user need only input one string alongside a CSV of ranges"
		);
		//------------------------------------GUIDES
		CONSOLES.registerCategory("guide",
			"Functions to prepare new guide shapes to be drawn to the current arena.\nA CONSOLES.guide.[guide_type] will generally prepare a shape which will be drawn with STYLES.guide.[guide_type], so see that also for further clarification."
		);

		CONSOLES.register("guide", "rect",
			function(_arena, _toParse1, _toParse2) {
				const range = rangeParser.fromStr(_toParse1);
				return [
					STYLES.guide.rect,
					(rangeParser.verify(range))
						? {origin: range[0], dim: range[1]}
						: {origin: coordParser.fromUnknown(_arena, _toParse1), pos: coordParser.fromUnknown(_arena, _toParse2)}
				];
			},
			"Creates an unrotated rectangular outline.\nArgument options (each 'coord' can accept one token):\n> [coord = a_corner] [coord = opposite_corner]\n> [range = a_corner:opposite_corner]"
		);
		CONSOLES.register("guide", "line",
			function(_arena, _coordAtCorner1, _coordAtCorner2) {
				return [STYLES.guide.line, {
					origin: coordParser.fromUnknown(_arena, _coordAtCorner1),
					pos: coordParser.fromUnknown(_arena, _coordAtCorner2)
				}];
			},
			"Creates a line connecting two points.\nArgument options (each 'coord' can accept one token):\n> [coord = start_point] [coord = end_point]\n> [range = start_point:end_point]"
		);
		CONSOLES.register("guide", "ellipse",
			function(_arena, _coordAtOrigin, _radii) {
				return [STYLES.guide.ellipse, {
					origin: coordParser.fromUnknown(_arena, _coordAtOrigin),
					radii: (isNaN(_radii)) ? coordParser.fromStr(_radii) : [parseInt(_radii, 10)]
				}];
			},
			"Creates an unrotated elliptical outline.\nArgument options ('coord = center' can accept one token):\n> [coord = center] [coord = horizontal_radius-vertical_radius]\n> [coord = center] [int = single_radius] *=> makes circle*"
		);
		//--------------------------------------------------------------------COMMANDS
		const COMMANDS = _reg.COMMANDS;
		//------------------------------------ARENA
		COMMANDS.register(_extensionCode, "list",
			function(_holder, _arena, _teamsToList) {
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
			},
			"Create a temporary instruction list that describes the current arena.\nArgument options:\n> {teamCSV = teams_to_list (defaults to all)}"
		).requires = ["holder", "arena"];
		COMMANDS.register(_extensionCode, "distance",
			function(_arena, _toParse1, _toParse2) {
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
			},
			"Measure the distance (in cells) between two points.\nArgument options (each 'coord' can accept one token):\n> [coord = start_point] [coord = end_point]"
		).requires = ["arena"];
		//------------------------------------GROUP
		COMMANDS.register(_extensionCode, "movegroup",
			function(_arena, _name, _rangeCSV, _hiddenMode) {
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
			},
			"Move tokens (& can resize and/or edit whether hidden) in one group in ascending index order; skips removed tokens but not hidden ones.\nArgument options ('desired_positions' can instead be a rangeCSV to also resize tokens):\n> [group_name] [coordCSV = desired_positions] {t/f/! => hide/reveal/flip_whether_hidden}"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "hidegroup",
			function(_arena, _name, _hiddenMode) {
				const hiddenSetter = BoolMode.SWITCH(_hiddenMode, "!");
				if (!hiddenSetter) {return false;}

				for (const token of _arena.requireGroup(_name.toLowerCase()).tokens) {token.hidden = hiddenSetter(token.hidden);}
				_arena.updateGroupLayers();
			},
			"Hide and/or reveal all tokens in one group; skips removed tokens.\nArgument options:\n> [group_name] {t/f/! => hide/reveal/flip_whether_hidden (defaults to !)}"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "removegroup",
			function(_arena, _name) {
				_arena.removeGroup(_name.toLowerCase()) && _arena.updateGroupLayers();
			},
			"Delete a group and all tokens contained within.\nArgument options:\n> [group_name]"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "resizegroup",
			function(_arena, _name, _dim) {
				const group = _arena.requireGroup(_name.toLowerCase());
				const seed = seedParser.fromStr(_dim);

				group.dim = seed.dim || seed.pos;
			},
			"Change the default dimensions of a group (does not affect tokens currently on the map).\nArgument options:\n> [group_name] [coord = width-height]\n> [group_name] [some_range_with_new_dimensions]"
		).requires = ["arena"];
		//------------------------------------TOKEN
		COMMANDS.register(_extensionCode, "newtoken",
			function(_arena, _name, _rangeCSV, _hiddenStr) {
				_arena.makeTokens(_name.toLowerCase(), seedParser.fromCSV(_rangeCSV, _hiddenStr));
			},
			"Add new tokens to a pre-existing group.\nArgument options ('desired_ranges' can instead be a coordCSV to set the tokens' dimensions to the group default):\n> [group_name] [rangeCSV = desired_ranges] {t/f => hidden/visible (defaults to f)}"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "move",
			function(_arena, _tokenCSV, _rangeCSV, _hiddenMode) {
				_arena.moveTokens(...Parser.makeTokenTup(_tokenCSV), rangeParser.fromCSV(_rangeCSV), BoolMode.SWITCH(_hiddenMode, "u"));
			},
			"Move (& optionally resize and/or edit whether hidden) and number of tokens in one group.\nArgument options ('desired_positions' can instead a rangeCSV to also resize the tokens)\n> [group_name]:[indexCSV] [coordCSV = desired_positions], {t/f/! => hide/reveal/flip_whether_hidden}"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "hide",
			function(_arena, _tokenCSV, _hiddenMode) {
				_arena.hideTokens(...Parser.makeTokenTup(_tokenCSV), BoolMode.SWITCH(_hiddenMode, "!"));
			},
			"Hide and/or reveal any number of tokens in one group.\nArgument options:\n> [group_name]:[indexCSV] {t/f/! => hide/reveal/flip_whether_hidden (defaults to !)}"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "remove",
			function(_arena, _tokenCSV, _rangeCSV, _removedMode) {
				_arena.removeTokens(...Parser.makeTokenTup(_tokenCSV), BoolMode.SWITCH(_removedMode, "t"), false);
			},
			"Remove and/or return any number of tokens within the same group; removes the group if completely empties.\nArgument options:\n> [group_name]:[indexCSV] {t/f/! => remove/return/flip_whether_removed (defaults to t)}"
		).requires = ["arena"];
		//------------------------------------ALIAS
		COMMANDS.addAliases(_extensionCode, "list", "tokens");
		COMMANDS.addAliases(_extensionCode, "distance", "separation");

		COMMANDS.addAliases(_extensionCode, "hidegroup", "revealgroup");

		COMMANDS.addAliases(_extensionCode, "newtoken", "copy");
		COMMANDS.addAliases(_extensionCode, "hide", "reveal");
	}
}
