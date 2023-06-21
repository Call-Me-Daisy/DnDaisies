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
		_brush.setFrom(rect).adjustForLineWidth().strokeRect();
	},
	ellipse: (_brush, {rect}) => {
		_brush.setFrom(rect).adjustForLineWidth().strokeEllipse();
	},
	line: (_brush, {r1, r2}) => {
		_brush.setSpan(1, 1);
		_brush.ctx.beginPath();
		_brush.ctx.moveTo(...Object.values(_brush.setPos(r1.x, r1.y).getCenter()));
		_brush.ctx.lineTo(...Object.values(_brush.setPos(r2.x, r2.y).getCenter()));
		_brush.ctx.stroke();
	},
	cone: (_brush, {rect, theta}) => {
		const [sin, cos] = [Math.sin(theta), Math.cos(theta)].map(x => Math.floor(x*1e6)/1e6);
		const {x, y, w, h} = _brush.setFrom(rect, 0).alter(0.5 + sin, 0.5 - cos, 0, -.25);
		const [x1, y1] = [x + sin*w, y - cos*w];
		const [dx, dy] = [cos/2*h, sin/2*h];

		_brush.ctx.beginPath();
		_brush.ctx.moveTo(x, y);
		_brush.ctx.lineTo(x1 - dx, y1 - dy);
		_brush.ctx.lineTo(x1 + dx, y1 + dy);
		_brush.ctx.closePath();
		_brush.ctx.stroke();
	},
	sundail: (_brush, {rect, r1, r2}) => {
		STYLES.guide.ellipse(_brush, {rect});
		STYLES.guide.line(_brush, {r1, r2});
	},
	spider: (_brush, {r1, rs}) => {
		for (const r2 of rs) {
			STYLES.guide.line(_brush, {r1, r2});
		}
	}
};
STYLES.guide.default = STYLES.general.null;
