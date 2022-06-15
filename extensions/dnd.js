const {StackLayer} = require("../arena-layer");
const {Arena} = require("../arena");

const {parsers: coreParsers, layers: coreLayers} = require("./core");
//--------------------------------------------------------------------LAYERS
class LightLayer extends StackLayer {
	static isGroupLayer = true;
	static TRANSPARENT = "rgba(0,0,0,0)";

	constructor(_w, _h, _pS, _layerName = "light", _ambientOpacity = 0, _shadowHue = [0,0,0]) {
		super(_w, _h, _pS, _layerName);

		this.ambientOpacity = _ambientOpacity;
		this.shadowHue;

		this.spawnLightEmitter = false;
		this.setShadowHue(_shadowHue);
	}

	setShadowHue(_shadowHue) {
		this.shadowHue = `rgba(${_shadowHue.join(",")},$a)`;
	}
	getShadowHue() {
		return this.shadowHue.split("(")[1].split(",").slice(0, 3);
	}
	makeShadowColour(_a) {
		return this.shadowHue.replace("$a",_a);
	}

	willDisplay(_group) {
		return (super.willDisplay(_group) && (_group.opacity < this.ambientOpacity) === this.spawnLightEmitter);
	}
	async buildArgs(_style, _name, _group, _kwargs) {
		return {
			shadow: this.makeShadowColour((this.spawnLightEmitter) ? 1 - _group.opacity : _group.opacity),
			radius: _group.radius,
			startFade: _group.startFade || ((this.spawnLightEmitter) ? 0.5 : 0.9)
		};
	}
	async paint(_groups, _imgUrls) {
		this.brush.ctx.globalCompositeOperation = "source-over";
		this.brush.ctx.fillStyle = this.makeShadowColour(this.ambientOpacity);
		this.brush.setFrom(this).fillRect();

		this.spawnLightEmitter = false;
		await super.paint(_groups, false);

		this.spawnLightEmitter = true;
		this.brush.ctx.globalCompositeOperation = "destination-out";
		await super.paint(_groups, false);
	}
}
//--------------------------------------------------------------------ARENA
class dnd_Arena extends Arena {
	constructor(_w, _h) {
		super(_w, _h, {
			token: {layer: coreLayers.TokenLayer},
			light: {layer: LightLayer},
			name: {layer: coreLayers.NameLayer},
			guide: {layer: coreLayers.GuideLayer}
		});

		this.canResize = true;
	}

	showGuide() {
		return this.layers.guide.displayShapes();
	}
	clearGuide() {
		return this.layers.guide.emptyShapes();
	}
	addGuide(_draw, _args) {
		return this.layers.guide.addShape(_draw, _args);
	}

	makeCommandList(_w, _h, _dx = 0, _dy = 0) {
		const commands = [];
		commands.push(`arena dnd ${_w || this.w} ${_h || this.h}`);
		commands.push(`ambient ${this.layers.light.getShadowHue().join(",")} ${this.layers.light.ambientOpacity}`);
		for (const [name, group] of this.groups) {
			if (!group.drawStage) {continue;}
			const styles = [];
			for (const [layerName, groupStyle] of Object.entries(group.styles)) {
				styles.push(`${layerName}:${groupStyle.category}.${groupStyle.handle}`);
			}

			const ranges = [];
			const hidden = [];
			const removed = [];
			for (const [i, token] of group.tokens.entries()) {
				ranges.push(coreParsers.rangeParser.toStr(coreParsers.rangeParser.fromToken(token.alterPos(_dx, _dy))));
				token.hidden && hidden.push(i);
				token.removed && removed.push(i);
			}

			if (ranges.length > removed.length) {
				commands.push(`custom ${name} ${group.colour} ${group.drawStage} ${styles.join(",")} ${ranges.join(",")}`);
				(hidden.length > 0) && commands.push(`hide ${name}:${hidden.join(",")} t`);
				(removed.length > 0) && commands.push(`remove ${name}:${removed.join(",")} t`);
				group.styles.light && group.radius && group.opacity !== undefined && commands.push(
					`editlight ${name} ${group.radius} ${group.opacity}` + ((group.startFade) ? ` ${group.startFade}` : "")
				);
			}
		}
		return commands;
	}
	async buildMap(_imgThread) {
		let imgUrls = false;
		if (_imgThread) {
			imgUrls = new Map();
			for (const [key, msg] of (await _imgThread.messages.fetch({limit: 100})).filter(m => m.attachments.size > 0)) {
				imgUrls.set(msg.content.split(" ")[0].toLowerCase(), msg.attachments.entries().next().value[1].url);
			}
		}
		return super.buildMap({imgUrls});
	}
}
//--------------------------------------------------------------------FINALIZE
module.exports = {
	layers: {LightLayer},
	arena: dnd_Arena,

	registerStage: 2,
	registerExtension(_extensionCode, _reg) {
		//--------------------------------------------------------------------STYLES
		const STYLES = _reg.STYLES;
		//------------------------------------LIGHT
		STYLES.registerCategory("light",
			"Styles for drawing light and/or darkness emanating from a token"
		);

		STYLES.register("light", "gradient",
			function(_brush, _token, _args) {
				_brush.set(_token.x, _token.y, _args.radius, _args.radius);
				_brush.alterPos(_token.w/2, _token.h/2).alterAbs(-_brush.pM, -_brush.pM, false, false);

				const g = _brush.ctx.createRadialGradient(_brush.x, _brush.y, 0, _brush.x, _brush.y, _brush.w);
				g.addColorStop(0, _args.shadow);
				(_args.startFade > 0) && g.addColorStop((_args.startFade < 1) ? _args.startFade : 1, _args.shadow);
				g.addColorStop(1, LightLayer.TRANSPARENT);

				_brush.ctx.fillStyle = g;
				_brush.alterPos(-_args.radius/2, -_args.radius/2);
				_brush.centerScale(2.1);//Needs slight overhang bc of margins
				_brush.fillRect();
			},
			"Light style which creates a uniform circle at the center and then blends out into the surroundings using a gradient"
		);

		STYLES.light.default = STYLES.general.null;
		//------------------------------------GUIDE
		STYLES.register("guide", "cone",
			function(_brush, _args) {
				const c = Math.cos(_args.theta), s = Math.sin(_args.theta);

				_brush.setPos(..._args.origin).alterPos(1.1*s, -1.1*c);
				_brush.setDim(_args.radii[0] - 1, _args.radii[1] || _args.radii[0] - 1);
				const shunt = -_brush.ctx.lineWidth/2;
				_brush.alterAbs(shunt, shunt, shunt, shunt);

				const dr0 = [s*_brush.w, -c*_brush.w];
				const dr1 = [c/2*_brush.h, s/2*_brush.h];

				_brush.ctx.beginPath();
				_brush.ctx.moveTo(_brush.x, _brush.y);
				_brush.ctx.lineTo(_brush.x + dr0[0] - dr1[0], _brush.y + dr0[1] - dr1[1]);
				_brush.ctx.lineTo(_brush.x + dr0[0] + dr1[0], _brush.y + dr0[1] + dr1[1]);
				_brush.ctx.closePath();
				_brush.ctx.stroke();

				_brush.reset();
			},
			"Guide style which outlines a rotateable triangle (to mimic a 5e cone spell)"
		);
		STYLES.register("guide", "sundail",
			function(_brush, _args) {
				if (isNaN(_args.radii[0])) {
					STYLES.guide.line(_brush, _args);
					_args.radii = [Math.sqrt((_args.pos[0] - _args.origin[0])**2 + (_args.pos[1] - _args.origin[1])**2)];
					STYLES.guide.ellipse(_brush, _args);
				}
				else {
					STYLES.guide.ellipse(_brush, _args);
					_args.pos = [_args.origin[0] + _args.radii[0], _args.origin[1]];
					STYLES.guide.line(_brush, _args);
				}
			},
			"Guide style which draws a line between two points and outlines the circle of points the same distance away from the first"
		);
		STYLES.register("guide", "spider",
			function(_brush, _args) {
				for (const pos of _args.posLs) {
					_args.pos = pos;
					STYLES.guide.line(_brush, _args);
				}
			},
			"Guide style which draws a series of lines emanating from one point"
		);
		//------------------------------------TOKEN
		STYLES.register("token", "concentric",
			function(_brush, _token, _args) {
				STYLES.token.fill(_brush, _token, _args);
				_brush.ctx.fillStyle = coreLayers.TokenLayer.scaleAlpha(_args.colour, 0.5);
				_args.cell.paint(_brush.centerScale(3));
			},
			"Token style which fills two concentric cells centered on the token; the outer cell being half as opaque as the inner"
		);
		//--------------------------------------------------------------------CONSOLES
		const CONSOLES = _reg.CONSOLES;
		//------------------------------------REDIRECTED
		CONSOLES.register("arena", _extensionCode,
			function(_w, _h) {
				const w = parseInt(_w, 10);
				const h = parseInt(_h, 10);
				const out = new dnd_Arena(w, h);

				out.makeGroup("background", "#0000", [w - 1, h - 1], 0, {
					cell: STYLES.cell.rect,
					token: STYLES.token.image
				}, [{pos: [1, 1], hidden: false}]);

				return out;
			},
			"An Arena specialised for 5e D&D.\nAdds...\n> STYLES.token.concentric\n> STYLES.guide: .cone, .sundail, .spider\nLayers:\n> token; draws the main body of the token\n> light; draws the ambient shadows, and any light/shadows emitted by tokens\n> name; draws identifiers to tokens that should be distinguishable\n> guide; draws free-place geometric guides for easier visualisation of movement, spells, etc."
		);
		CONSOLES.register("newGroup", _extensionCode, CONSOLES.newGroup.core);
		//------------------------------------GUIDES
		CONSOLES.register("guide", "cone",
			function(_arena, _coordAtOrigin, _theta, _heightOfCone, _diameterAtBase) {
				const height = parseFloat(_heightOfCone);
				return [STYLES.guide.cone, {
					origin: coreParsers.coordParser.fromUnknown(_arena, _coordAtOrigin),
					theta: parseInt(_theta, 10) * Math.PI/180,
					radii: [height, (_diameterAtBase) ? parseFloat(_diameterAtBase)/2 : height/2]
				}];
			},
			"Creates a rotatable symmetrical triangle outline.\nArgument options (each 'coord' can accept one token):\n> [coord = origin] [degrees_clockwise_from_straight_up] [height_of_triangle] {base_of_triangle (defaults to height_of_triangle)}"
		);
		CONSOLES.register("guide", "sundail",
			function(_arena, _coordAtOrigin, _posOrRadii) {
				return [STYLES.guide.sundail, {
					origin: coreParsers.coordParser.fromUnknown(_arena, _coordAtOrigin),
					pos: coreParsers.coordParser.fromUnknown(_arena, _posOrRadii),
					radii: [parseInt(_posOrRadii, 10)]
				}];
			},
			"Creates a circlular outline with a radial line to the edge.\nArgument options (each 'coord' can accept one token):\n> [coord = center] [coord = end_of_radial_line]\n> [coord = center] [number = radius]"
		);
		CONSOLES.register("guide", "spider",
			function(_arena, _coordAtOrigin, _coordCSVOrGroupName) {
				const group = _arena.fetchGroup(_coordCSVOrGroupName);
				let posLs;
				if (!group) {posLs = coreParsers.coordParser.fromCSV(_coordCSVOrGroupName);}
				else {
					posLs = [];
					for (const token of group.tokens) {
						!(token.hidden || token.removed) && posLs.push(coreParsers.coordParser.fromToken(token));
					}
				}

				return [STYLES.guide.spider, {
					origin: coreParsers.coordParser.fromUnknown(_arena, _coordAtOrigin),
					posLs
				}];
			},
			"Creates a collection of lines all emanating out from a single point.\nArgument options('coord = origin' can accept one token):\n> [coord = origin] [coordCSV = end_of_lines]\n> [coord = origin] [string = group_name]"
		);
		//--------------------------------------------------------------------COMMANDS
		const COMMANDS = _reg.COMMANDS;
		//------------------------------------ARENA
		COMMANDS.register(_extensionCode, "ambient",
			function(_arena, _r, _g, _b, _opacity) {
				const layer = _arena.layers.light;
				const rgba = [];
				for (const val of [_r, _g, _b, _opacity]) {val && rgba.push(...val.split(","));}
				switch (rgba.length) {
					case 1: layer.ambientOpacity = parseFloat(rgba[0]); break;
					case 3: layer.setShadowHue(rgba); break;
					case 4:
						layer.ambientOpacity = parseFloat(rgba[3]);
						layer.setShadowHue(rgba.slice(0, 3));
						break;

					default: throw `dnd.ambient cannot take ${rgba.length} arguments`;
				}
				layer.shouldUpdate = true;
			},
			"Set the colour and opacity of the ambient shadows in the arena.\nArgument options:\n> [0-1 = opacity (higher is more opaque shadow)]\n> [0-255,0-255,0-255 = red,green,blue (higher is more colourful shadow)] {0-1 = opacity}\n> [0-255 = red] [0-255 = green] [0-255 = blue] {0-1 = opacity}\n> [0-255,0-255,0-255,0-1 = red,green,blue,opacity]"
		).requires = ["arena"];
		//------------------------------------GROUP
		COMMANDS.register(_extensionCode, "editlight",
			function(_arena, _name, _radius, _opacity, _startFade) {
				const group = _arena.requireGroup(_name.toLowerCase());
				if (_radius && _opacity) {
					group.styles.light = STYLES.light.gradient;
					group.radius = parseFloat(_radius);
					group.opacity = parseFloat(_opacity);
					group.startFade = _startFade && parseFloat(_startFade);
				}
				else if (group.hasStyle("light")) {delete group.styles.light;}
				else if (group.radius && group.opacity) {group.styles.light = STYLES.light.gradient;}
				else {
					console.error(`Command 'editlight ${name}...' did nothing`);
					return {suggest: {error: true}};
				}

				_arena.layers.light.shouldUpdate = true;
			},
			"Edit how all tokens in a group affect the shadows in the arena.\nArgument options:\n> [string = name] [number = radius] [0-1 = opacity] {0-1 = proportion of radius that is uniform}\n> [string = name] *=> if group has once affected light, toggle effect on or off*"
		).requires = ["arena"];

		COMMANDS.register(_extensionCode, "army",
			function(_arena, _name, _colour, _rangeCSV) {
				CONSOLES.newGroup[_extensionCode](_arena, _name, _colour, 3,
					{
						cell: STYLES.cell.ellipse,
						token: STYLES.token.grid,
						name: STYLES.name.corner
					},
					_rangeCSV
				)
			},
			"Tokens designed to quickly and easily represent a large group of identical creatures.\nDetails:\n> draw_stage = 3\n> styles = cell.ellipse,token.grid,name.corner"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "concentric",
			function(_arena, _name, _colour, _rangeCSV) {
				CONSOLES.newGroup[_extensionCode](_arena, _name, _colour, 4,
					{
						cell: STYLES.cell.ellipse,
						token: STYLES.token.concentric,
						name: STYLES.name.center
					},
					_rangeCSV
				)
			},
			"Tokens designed to represent 5e's mobile area of effect spells.\nDetails:\n> draw_stage = 4\n> styles = cell.ellipse,token.concentric,name.center"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "creature",
			function(_arena, _name, _colour, _rangeCSV) {
				CONSOLES.newGroup[_extensionCode](_arena, _name, _colour, -1,
					{
						cell: STYLES.cell.ellipse,
						token: STYLES.token.image,
						name: STYLES.name.partial
					},
					_rangeCSV
				)
			},
			"Tokens designed to represent individual entities capable of independant movement.\nDetails:\n> draw_stage = -1 (always drawn last)\n> styles = cell.ellipse,token.image,name.center"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "grid",
			function(_arena, _name, _colour, _rangeCSV) {
				CONSOLES.newGroup[_extensionCode](_arena, _name, _colour, 4,
					{
						cell: STYLES.cell.rect,
						token: STYLES.token.grid,
						name: STYLES.name.center
					},
					_rangeCSV
				)
			},
			"Tokens designed to represent 5e's static area of effect spells.\nDetails:\n> draw_stage = 4\n> styles = cell.rect,token.grid,name.center"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "object",
			function(_arena, _name, _colour, _rangeCSV) {
				CONSOLES.newGroup[_extensionCode](_arena, _name, _colour, 2,
					{
						cell: STYLES.cell.rect,
						token: STYLES.token.image
					},
					_rangeCSV
				)
			},
			"Tokens designed to represent objects which can be interacted with but otherwise have little-to-no agency.\nDetails:\n> draw_stage = 2\n> styles = cell.rect,token.image"
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "static",
			function(_arena, _name, _colour, _rangeCSV) {
				CONSOLES.newGroup[_extensionCode](_arena, _name, _colour, 1,
					{
						cell: STYLES.cell.rect,
						token: STYLES.token.grid
					},
					_rangeCSV
				)
			},
			"Tokens designed to represent large areas of terrain.\nDetails:\n> draw_stage = 1\n> styles = cell.rect,token.grid"
		).requires = ["arena"];

		COMMANDS.register(_extensionCode, "light",
			function(_arena, _name, _rangeCSV, _radius, _opacity, _startFade) {
				CONSOLES.newGroup[_extensionCode](_arena, _name, "v", 1,
					{
						light: STYLES.light.gradient
					},
					_rangeCSV
				);
				COMMANDS[_extensionCode].editlight(_arena, _name, _radius, _opacity, _startFade);
			},
			`Tokens designed to represent extinguishable light/shadow sources that are otherwise static.\nDetails:\n> draw_stage = 1\n> styles = light.gradient\nNotes:\n> These tokens can **never** be visible; use COMMANDS.${_extensionCode}.editlight on a visible group instead`
		).requires = ["arena"];
		COMMANDS.register(_extensionCode, "custom",
			function(_arena, _name, _colour, _drawStage, _styles, _rangeCSV) {
				CONSOLES.newGroup[_extensionCode](_arena, _name, _colour, _drawStage, _styles, _rangeCSV);
			},
			`Combine styles to design specific tokens for any purpose.\nNotes:\n> Directly calls CONSOLES.newGroup.[${_extensionCode}]\n> If a group has a token and/or name style, it **must** also have a cell style`
		).requires = ["arena"];
		//------------------------------------ALIAS
		COMMANDS.addAliases(_extensionCode, "editlight", "editdark");
		COMMANDS.addAliases(_extensionCode, "army", "swarm");
		COMMANDS.addAliases(_extensionCode, "concentric", "spread");
		COMMANDS.addAliases(_extensionCode, "grid", "area");
		COMMANDS.addAliases(_extensionCode, "object", "keyitem");
		COMMANDS.addAliases(_extensionCode, "static", "zone");
		COMMANDS.addAliases(_extensionCode, "light", "dark");
		COMMANDS.addAliases(_extensionCode, "custom", "tailor");
	}
}
