const STYLES = module.exports = {};

STYLES.general = {
	null: () => {}
};
STYLES.general.default = STYLES.general.null;

STYLES.cell = {
	rect: {
		paint: (_brush) => { _brush.fillRect(); },
		clear: (_brush) => { _brush.clearRect(); },
		stroke: (_brush) => { _brush.strokeRect(); }
	},
	ellipse: {
		paint: (_brush) => { _brush.fillEllipse(); },
		clear: (_brush) => { _brush.clearEllipse(); },
		stroke: (_brush) => { _brush.strokeEllipse(); }
	}
};
STYLES.cell.default = STYLES.cell.rect;

function decreaseAlpha(_fill) {
	switch (_fill.length) {
		case 4: //#rgb
			return _fill + "5";
		case 7: //#rrggbb
			return _fill + "55";
		case 5: //#rgba
			return _fill.slice(0, 4) + Math.ceil(parseInt(_fill.slice(4), 16)/3).toString(16)[0];
		case 9: //rrggbbaa
			return _fill.slice(0, 7) + Math.ceil(parseInt(_fill.slice(7), 16)/3).toString(16);
	}
}
STYLES.token = {
	fill: (_brush, _cell, _token, _kwargs) => {
		_brush.ctx.fillStyle = _kwargs.colour.fill;
		_cell.paint(_brush.setFrom(_token));
	},
	grid: (_brush, _cell, _token, _kwargs) => {
		_brush.ctx.fillStyle = _kwargs.colour.fill;
		_brush.setSpan(1, 1);
		for (let x = _token.x; x < _token.x + _token.w; x++) {
			for (let y = _token.y; y < _token.y + _token.h; y++) {
				_cell.paint(_brush.setPos(x, y));
			}
		}
	},
	aoe: (_brush, _cell, _token, _kwargs) => {
		_brush.ctx.fillStyle = decreaseAlpha(_kwargs.colour.fill);
		_cell.paint(_brush.setFrom(_token));
		_cell.paint(_brush.centerStretch(1, 1));
	},
	concentric: (_brush, _cell, _token, _kwargs) => {
		_brush.ctx.fillStyle = decreaseAlpha(_kwargs.colour.fill);
		_cell.paint(_brush.setFrom(_token));
		_cell.paint(_brush.centerStretch(3*_token.w, 3*_token.h));
	}
};
STYLES.token.default = STYLES.token.fill;

function getDisplayCode(_kwargs) {
	return _kwargs.code + ((_kwargs.single) ? "" : _kwargs.i);
}
STYLES.name = {
	center: (_brush, _cell, _token, _kwargs) => {
		_brush.ctx.fillStyle = _kwargs.colour.name;
		_cell.clear(_brush.setFrom(_token));
		_brush.write(getDisplayCode(_kwargs));
	},
	corners: (_brush, _cell, _token, _kwargs) => {
		_brush.ctx.fillStyle = _kwargs.colour.name;
		const code = getDisplayCode(_kwargs);
		_brush.setSpan(1, 1);
		for (const i of [0, 1]) {
			for (const j of [0, 1]) {
				_cell.clear(_brush.setPos(_token.x + i*(_token.w - 1), _token.y + j*(_token.h - 1)));
				_brush.write(code);
			}
		}
	}
};
STYLES.name.default = STYLES.name.center;

STYLES.light = {

};
STYLES.light.default = STYLES.general.null;

STYLES.guide = {
	rect: (_brush, {rect}) => {
		_brush.setFrom(rect).strokeRect();
	}
};
STYLES.guide.default = STYLES.general.null;
