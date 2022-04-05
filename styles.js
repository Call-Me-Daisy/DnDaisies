
//--------------------------------------------------------------------CONSTANTS
const STYLES = {};
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
function fullCode(_args) {
	return _args.code + ((_args.many) ? (_args.i).toString() : "");
}
//--------------------------------------------------------------------OLD
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
//--------------------------------------------------------------------MAIN
class StyleType {
	constructor(_typeName) {
		this.ID_MAKER = 0;
		this.default = undefined;
		STYLES[_typeName] = this;
	}

	addStyle(_styleName, _style) {
		if (_style.id === 0) {this.default = _style;}
		this[_styleName] = _style;
	}
}
class Style extends Function {
	constructor(_type, _name, _onCall) {
		if (STYLES[_type] === undefined) {STYLES[_type] = new StyleType(_type);}
		let type = STYLES[_type];

		function onCall(){return _onCall(...arguments);}
		onCall.id = type.ID_MAKER++;
		Object.setPrototypeOf(onCall, Style.prototype);

		type.addStyle(_name, onCall);
		return onCall;
	}
}
//--------------------------------------------------------------------POPULATE
new Style("cell", "rect", function(_brush){_brush.fillRect();});
new Style("cell", "ellipse", function(_brush){_brush.fillEllipse();});
new Style("cell", "clear", function(_brush){_brush.clear();});

new Style("token", "fill", function(_brush, _token, _cell, _args) {
	_brush.ctx.fillStyle = _args.colour;
	_cell(_brush.setFrom(_token));
});
new Style("token", "grid", function(_brush, _token, _cell, _args) {
	_brush.ctx.fillStyle = _args.colour;
	_brush.setDim(1, 1);
	for (let y = _token.y; y < _token.y + _token.v; y++) {
		for (let x = _token.x; x < _token.x + _token.h; x++) {
			_cell(_brush.setPos(x, y));
		}
	}
});
new Style("token", "layer", function(_brush, _token, _cell, _args) {
	STYLES.token.fill(_brush, _token, _cell, _args);
	_brush.ctx.fillStyle = scaleAlpha(_args.colour, 0.5);
	_cell(_brush.centerStretch(3));
});
new Style("token", "image", async function(_brush, _token, _cell, _args) {
	try {
		if (_args.error) {throw "";}
		_brush.setFrom(_token);
		_brush.draw(await _args.img);
	} catch {
		STYLES.token.default(_brush, _token, _cell, _args);
		_args.error = true;
	}
});

new Style("name", "centerFull", function(_brush, _token, _args) {
	_brush.setFrom(_token);
	_brush.write(fullCode(_args));
});
new Style("name", "cornerFull", function(_brush, _token, _args) {
	let code = fullCode(_args);
	_brush.reset();
	for (const i of [0, 1]) {
		for (const j of [0, 1]) {
			_brush.setPos(_token.x + i*(_token.h - 1), _token.y + j*(_token.v - 1));
			_brush.write(code);
		}
	}
});
new Style("name", "centerPartial", function(_brush, _token, _args) {
	if (_args.error) {
		STYLES.name.default(_brush, _token, _args);
	}
	else if (_args.many) {
		_brush.setFrom(_token);
		_brush.write((_args.i).toString());
	}
});
new Style("name", "none", function(){});

new Style("guide", "rect", function(_brush, _args) {
	_brush.set(_args.origin[0], _args.origin[1], _args.dim[0], _args.dim[1]).adjust();
	_brush.ctx.strokeRect(_brush.x, _brush.y, _brush.h, _brush.v);
});
new Style("guide", "line", function(_brush, _args) {
	_brush.setPos(_args.origin[0], _args.origin[1]).adjust();
	_brush.ctx.beginPath();
	_brush.ctx.moveTo(_brush.x, _brush.y);
	_brush.setPos(_args.pos[0], _args.pos[1]).adjust();
	_brush.ctx.lineTo(_brush.x, _brush.y);
	_brush.ctx.stroke();
});
new Style("guide", "ellipse", function(_brush, _args) {
	_brush.setPos(_args.origin[0], _args.origin[1]).adjust();
	_brush.setDim(_args.radii[0], (_args.radii[1] === undefined) ? _args.radii[0] : _args.radii[1]);
	_brush.ctx.beginPath();
	_brush.ctx.ellipse(_brush.x, _brush.y, _brush.h, _brush.v, 0, 0, Math.PI*2);
	_brush.ctx.stroke();
});
new Style("guide", "cone", function(_brush, _args) {
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
});
new Style("guide", "sundail", function(_brush, _args) {
	if (_args.pos[0] === undefined) {
		STYLES.guide.ellipse(_brush, _args);
		_args.pos = [_args.origin[0] + _args.radii[0], _args.origin[1]];
		STYLES.guide.line(_brush, _args);
	}
	else {
		STYLES.guide.line(_brush, _args);
		_args.radii = [Math.sqrt((_args.pos[0] - _args.origin[0])**2 + (_args.pos[1] - _args.origin[1])**2)];
		STYLES.guide.ellipse(_brush, _args);
	}
});
new Style("guide", "spider", function(_brush, _args) {
	for (const pos of _args.posLs) {
		_args.pos = pos;
		STYLES.guide.line(_brush, _args);
	}
});
//--------------------------------------------------------------------FINALIZE
export {
	STYLES
}
